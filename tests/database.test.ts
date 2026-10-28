import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
let db: PGlite;
const a = "00000000-0000-4000-8000-000000000001",
  b = "00000000-0000-4000-8000-000000000002",
  c = "00000000-0000-4000-8000-000000000003";
let sid: string, mid: string;
const token = "a".repeat(64);
async function actor(uid: string | null) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    uid || "",
  ]);
  await db.exec("set role " + (uid ? "authenticated" : "anon"));
}
async function rpc<T>(sql: string, args: unknown[] = []) {
  return db.query<T>(sql, args);
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon; create role authenticated; create schema auth; create schema storage; create schema extensions; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema public,auth,storage to anon,authenticated; grant execute on function auth.uid() to anon,authenticated; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]); create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text); alter table storage.objects enable row level security; grant select,insert,update,delete on storage.objects to authenticated;`,
  );
  for (const name of [
    "202610280001_initial.sql",
    "202610280002_settings.sql",
  ]) {
    const sql = await readFile(
      new URL("../supabase/migrations/" + name, import.meta.url),
      "utf8",
    );
    await db.exec(
      sql.replace(
        "create extension if not exists pgcrypto with schema extensions;",
        "-- pgcrypto is provisioned by Supabase; PGlite uses built-in gen_random_uuid.",
      ),
    );
  }
  await db.query("insert into auth.users(id) values($1),($2),($3)", [a, b, c]);
}, 30000);
afterAll(async () => {
  await db?.close();
});
describe("真实 PostgreSQL 引擎上的迁移、事务和 RLS（本地 PGlite）", () => {
  it("未登录不能读业务表或调用创建函数", async () => {
    await actor(null);
    await expect(db.query("select * from public.meetings")).rejects.toThrow(
      /permission denied/,
    );
    await expect(
      db.query("select public.create_space('私密空间')"),
    ).rejects.toThrow(/permission denied/);
  });
  it("创建空间，账号不能加入多个空间", async () => {
    await actor(a);
    const result = await rpc<{ id: string }>(
      "select public.create_space('我们的小日子') as id",
    );
    sid = result.rows[0].id;
    await expect(
      db.query("select public.create_space('第二个空间')"),
    ).rejects.toThrow("ALREADY_MEMBER");
    const count = await db.query<{ count: number }>(
      "select count(*)::int as count from public.space_members",
    );
    expect(count.rows[0].count).toBe(1);
  });
  it("邀请表及令牌不能被普通用户列举", async () => {
    await actor(a);
    await db.query("select public.issue_invitation($1)", [token]);
    await expect(
      db.query("select token_hash from public.space_invitations"),
    ).rejects.toThrow(/permission denied/);
  });
  it("第二个账号可以接受一次性邀请，第三个不能重复使用", async () => {
    await actor(b);
    await db.query("select public.accept_invitation($1)", [token]);
    const count = await db.query<{ count: number }>(
      "select count(*)::int as count from public.space_members",
    );
    expect(count.rows[0].count).toBe(2);
    await actor(c);
    await expect(
      db.query("select public.accept_invitation($1)", [token]),
    ).rejects.toThrow("INVITATION_INVALID");
  });
  it("已满空间不能再发邀请，直接插入成员也没有权限", async () => {
    await actor(a);
    await expect(
      db.query("select public.issue_invitation($1)", ["b".repeat(64)]),
    ).rejects.toThrow("SPACE_FULL");
    await actor(c);
    await expect(
      db.query(
        "insert into public.space_members(space_id,user_id) values($1,$2)",
        [sid, c],
      ),
    ).rejects.toThrow(/permission denied/);
  });
  it("新增和编辑见面/活动是原子操作，双方可读", async () => {
    await actor(a);
    const res = await rpc<{ id: string }>(
      "select public.save_meeting(null,'2026-10-28','见面','','','planned',array['散步']) as id",
    );
    mid = res.rows[0].id;
    await actor(b);
    let rows = await db.query<{ title: string; date: string }>(
      "select title,date::text from public.meetings where id=$1",
      [mid],
    );
    expect(rows.rows[0]).toEqual({ title: "见面", date: "2026-10-28" });
    await db.query(
      "select public.save_meeting($1,'2026-10-28','已经见面','南京','记录','completed',array['吃饭','散步'])",
      [mid],
    );
    await expect(
      db.query(
        "select public.save_meeting($1,'2026-10-28','不应保存','','','completed',array[''])",
        [mid],
      ),
    ).rejects.toThrow();
    rows = await db.query("select title from public.meetings where id=$1", [
      mid,
    ]);
    expect(rows.rows[0].title).toBe("已经见面");
    expect(
      (
        await db.query(
          "select * from public.meeting_activities where meeting_id=$1",
          [mid],
        )
      ).rows,
    ).toHaveLength(2);
  });
  it("第三个账号不能读取/编辑其他空间及个人资料", async () => {
    await actor(c);
    expect((await db.query("select * from public.meetings")).rows).toHaveLength(
      0,
    );
    expect((await db.query("select * from public.spaces")).rows).toHaveLength(
      0,
    );
    expect((await db.query("select * from public.profiles")).rows).toHaveLength(
      1,
    );
    await expect(
      db.query(
        "select public.save_meeting($1,'2026-10-28','篡改','','','completed',array[]::text[])",
        [mid],
      ),
    ).rejects.toThrow("NOT_MEMBER");
  });
  it("私有 Storage 校验路径对应成员资格和照片状态", async () => {
    await actor(a);
    const reserved = await db.query<{ photo: { id: string; path: string } }>(
      "select row_to_json(public.reserve_photo($1,'test.webp')) as photo",
      [mid],
    );
    const photo = reserved.rows[0].photo;
    await db.query(
      "insert into storage.objects(bucket_id,name) values('couple-private',$1)",
      [photo.path],
    );
    await db.query("select public.finish_photo($1,100,100,100)", [photo.id]);
    await actor(b);
    expect(
      (await db.query("select name from storage.objects")).rows,
    ).toHaveLength(1);
    await actor(c);
    expect(
      (await db.query("select name from storage.objects")).rows,
    ).toHaveLength(0);
    await expect(
      db.query(
        "insert into storage.objects(bucket_id,name) values('couple-private',$1)",
        [photo.path],
      ),
    ).rejects.toThrow();
    await actor(b);
    await db.query("select public.delete_photo($1)", [photo.id]);
    await db.query("select public.record_cleanup($1,$2)", [
      photo.id,
      "模拟清理失败",
    ]);
    expect(
      (
        await db.query<{ cleanup_error: string }>(
          "select cleanup_error from public.meeting_photos where id=$1",
          [photo.id],
        )
      ).rows[0].cleanup_error,
    ).toBe("模拟清理失败");
  });
  it("空间设置事务不会更新外部成员；失效邀请拒绝", async () => {
    await actor(a);
    await expect(
      db.query("select public.save_settings('错误名称',null,null,$1::jsonb)", [
        JSON.stringify([{ member_id: c, city: "篡改" }]),
      ]),
    ).rejects.toThrow("NOT_MEMBER");
    expect(
      (await db.query<{ name: string }>("select name from public.spaces"))
        .rows[0].name,
    ).toBe("我们的小日子");
    await actor(c);
    await expect(
      db.query("select public.accept_invitation($1)", ["f".repeat(64)]),
    ).rejects.toThrow("INVITATION_INVALID");
  });
  it("照片名额在数据库校验，超出十张被拒绝", async () => {
    await actor(a);
    for (let i = 0; i < 10; i++)
      await db.query("select public.reserve_photo($1,$2)", [mid, "photo.webp"]);
    await expect(
      db.query("select public.reserve_photo($1,$2)", [mid, "extra.webp"]),
    ).rejects.toThrow("PHOTO_LIMIT");
  });
  it("过期和被新邀请撤销的令牌不能使用", async () => {
    const d = "00000000-0000-4000-8000-000000000004";
    await db.exec("reset role");
    await db.query("insert into auth.users(id) values($1)", [d]);
    await actor(c);
    const created = await db.query<{ id: string }>(
      "select public.create_space('另一个测试空间') as id",
    );
    const otherSid = created.rows[0].id;
    const expired = "e".repeat(64),
      old = "d".repeat(64),
      fresh = "c".repeat(64);
    await db.query("select public.issue_invitation($1)", [expired]);
    await db.exec("reset role");
    await db.query(
      "update public.space_invitations set created_at=now()-interval '4 days',expires_at=now()-interval '2 days' where token_hash=$1",
      [expired],
    );
    await actor(d);
    await expect(
      db.query("select public.accept_invitation($1)", [expired]),
    ).rejects.toThrow("INVITATION_INVALID");
    await actor(c);
    await db.query("select public.issue_invitation($1)", [old]);
    await db.query("select public.issue_invitation($1)", [fresh]);
    await actor(d);
    await expect(
      db.query("select public.accept_invitation($1)", [old]),
    ).rejects.toThrow("INVITATION_INVALID");
    await db.query("select public.accept_invitation($1)", [fresh]);
    await db.exec("reset role");
    await expect(
      db.query(
        "insert into public.space_members(space_id,user_id) values($1,$2)",
        [otherSid, a],
      ),
    ).rejects.toThrow("SPACE_FULL");
  });
  it("删除见面后不可读，照片保留可重试清理的墓碑状态", async () => {
    await actor(a);
    await db.query("select public.delete_meeting($1)", [mid]);
    expect((await db.query("select * from public.meetings")).rows).toHaveLength(
      0,
    );
    expect(
      (await db.query("select * from public.meeting_activities")).rows,
    ).toHaveLength(0);
    expect(
      (
        await db.query<{ status: string }>(
          "select status from public.meeting_photos",
        )
      ).rows[0].status,
    ).toBe("deleting");
  });
});
