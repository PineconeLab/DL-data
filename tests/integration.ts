/** Opt-in only, against a dedicated Supabase project. Never uses production app env. */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import assert from "node:assert/strict";
import sharp from "sharp";
const url = process.env.TEST_SUPABASE_URL,
  anon = process.env.TEST_SUPABASE_ANON_KEY,
  admin = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anon || !admin)
  throw new Error(
    "请设置 .env.test 中全部 TEST_SUPABASE_* 配置，仅使用专用测试项目",
  );
if (
  !["127.0.0.1", "localhost"].includes(new URL(url).hostname) &&
  process.env.TEST_ALLOW_REMOTE !== "true"
)
  throw new Error(
    "远程测试需明确设置 TEST_ALLOW_REMOTE=true；只使用专用可清理测试项目",
  );
const service = createClient(url, admin, {
    auth: { persistSession: false, autoRefreshToken: false },
  }),
  users: string[] = [],
  clients: SupabaseClient[] = [];
let spaceId: string | undefined;
const ensure = (e: unknown) => {
  if (e) throw e;
};
try {
  for (let i = 0; i < 3; i++) {
    const email = `test-${randomBytes(8).toString("hex")}@example.com`,
      password = randomBytes(24).toString("hex");
    const result = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    ensure(result.error);
    const id = result.data.user!.id;
    users.push(id);
    const client = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    ensure((await client.auth.signInWithPassword({ email, password })).error);
    clients.push(client);
  }
  const [a, b, c] = clients;
  const created = await a.rpc("create_space", { p_name: "集成测试空间" });
  ensure(created.error);
  spaceId = created.data;
  const hash = randomBytes(32).toString("hex");
  ensure((await a.rpc("issue_invitation", { p_hash: hash })).error);
  const attempts = await Promise.all([
    b.rpc("accept_invitation", { p_hash: hash }),
    c.rpc("accept_invitation", { p_hash: hash }),
  ]);
  assert.equal(
    attempts.filter((x) => !x.error).length,
    1,
    "并发接受只允许一个账号加入",
  );
  const partner = attempts[0].error ? c : b,
    outsider = attempts[0].error ? b : c;
  const members = await a.from("space_members").select("*");
  ensure(members.error);
  assert.equal(members.data!.length, 2);
  assert.ok(
    (await outsider.rpc("accept_invitation", { p_hash: hash })).error,
    "邀请不能复用",
  );
  const record = await a.rpc("save_meeting", {
    p_id: null,
    p_date: "2026-10-28",
    p_title: "真实测试见面",
    p_location: "",
    p_notes: "",
    p_status: "completed",
    p_activities: ["散步"],
  });
  ensure(record.error);
  const mid = record.data;
  const shared = await partner
    .from("meetings")
    .select("*")
    .eq("id", mid)
    .single();
  ensure(shared.error);
  assert.equal(shared.data.date, "2026-10-28");
  assert.equal((await outsider.from("meetings").select("*")).data?.length, 0);
  assert.equal((await outsider.from("profiles").select("*")).data?.length, 1);
  ensure(
    (
      await partner.rpc("save_meeting", {
        p_id: mid,
        p_date: "2026-10-29",
        p_title: "对方编辑",
        p_location: "",
        p_notes: "",
        p_status: "completed",
        p_activities: ["散步", "吃饭"],
      })
    ).error,
  );
  assert.equal(
    (await a.from("meetings").select("title").eq("id", mid).single()).data
      ?.title,
    "对方编辑",
  );
  const reserved = await a.rpc("reserve_photo", {
    p_meeting: mid,
    p_name: "test.webp",
  });
  ensure(reserved.error);
  const photo = reserved.data;
  const image = await sharp({
    create: { width: 12, height: 12, channels: 3, background: "#eee" },
  })
    .webp()
    .toBuffer();
  ensure(
    (
      await a.storage
        .from("couple-private")
        .upload(photo.path, image, { contentType: "image/webp" })
    ).error,
  );
  ensure(
    (
      await a.rpc("finish_photo", {
        p_id: photo.id,
        p_size: image.length,
        p_width: 12,
        p_height: 12,
      })
    ).error,
  );
  assert.ok(
    (await partner.storage.from("couple-private").download(photo.path)).data,
    "同空间可鉴权读取照片",
  );
  assert.ok(
    (await outsider.storage.from("couple-private").download(photo.path)).error,
    "第三方不能读取照片",
  );
  const anonymous = createClient(url, anon, {
    auth: { persistSession: false },
  });
  assert.ok(
    (await anonymous.storage.from("couple-private").download(photo.path)).error,
    "匿名不能读取照片",
  );
  const signed = await partner.storage
    .from("couple-private")
    .createSignedUrl(photo.path, 30);
  ensure(signed.error);
  assert.ok(signed.data?.signedUrl);
  ensure((await a.rpc("delete_meeting", { p_id: mid })).error);
  ensure((await a.storage.from("couple-private").remove([photo.path])).error);
  assert.equal(
    (await partner.from("meetings").select("*").eq("id", mid)).data?.length,
    0,
  );
  console.log(
    "通过：并发邀请/两人上限、双人共享/编辑、第三方隔离、date、私有 Storage、匿名拒绝、删除。",
  );
} finally {
  // Remove Storage before metadata. Never runs unless this script explicitly created these IDs.
  if (spaceId) {
    const { data } = await service
      .from("meeting_photos")
      .select("path")
      .eq("space_id", spaceId);
    if (data?.length)
      ensure(
        (
          await service.storage
            .from("couple-private")
            .remove(data.map((p) => p.path))
        ).error,
      );
    ensure((await service.from("spaces").delete().eq("id", spaceId)).error);
  }
  for (const id of users)
    ensure((await service.auth.admin.deleteUser(id)).error);
}
