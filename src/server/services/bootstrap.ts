import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Bootstrap,
  Meeting,
  Photo,
  Profile,
  Wish,
  Member,
  Space,
} from "@/lib/types";
import { check, ApiError } from "@/server/errors";
import { signPath } from "./photos";
// Fetch every page; Supabase's default 1000-row cap must not silently truncate exports.
async function allRows<T>(
  fetchPage: (
    from: number,
    to: number,
  ) => PromiseLike<{
    data: unknown[] | null;
    error: { message: string; code?: string } | null;
  }>,
) {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await fetchPage(from, from + 499);
    check(error);
    rows.push(...((data || []) as T[]));
    if (!data || data.length < 500) return rows;
  }
}
export async function loadData(
  db: SupabaseClient,
  userId: string,
  sign = true,
): Promise<Bootstrap> {
  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("id,nickname,avatar_path")
    .eq("id", userId)
    .single();
  check(profileError);
  if (!profile)
    throw new ApiError(500, "个人资料尚未初始化，请先执行数据库迁移");
  const { data: member, error: memberError } = await db
    .from("space_members")
    .select("space_id")
    .eq("user_id", userId)
    .maybeSingle();
  check(memberError);
  if (!member)
    return {
      user_id: userId,
      profile,
      space: null,
      members: [],
      profiles: [profile],
      meetings: [],
      photos: [],
      wishes: [],
    };
  const sid = member.space_id;
  const results = await Promise.all([
    db
      .from("spaces")
      .select("id,name,met_on,anniversary")
      .eq("id", sid)
      .single(),
    db
      .from("space_members")
      .select("id,user_id,space_id,city")
      .eq("space_id", sid)
      .order("joined_at"),
    allRows<Meeting>((from, to) =>
      db
        .from("meetings")
        .select("*,meeting_activities(id,title,position)")
        .eq("space_id", sid)
        .is("deleted_at", null)
        .order("date", { ascending: false })
        .order("id")
        .range(from, to),
    ),
    allRows<Photo>((from, to) =>
      db
        .from("meeting_photos")
        .select("*")
        .eq("space_id", sid)
        .order("id")
        .range(from, to),
    ),
    allRows<Wish>((from, to) =>
      db
        .from("wishes")
        .select("*")
        .eq("space_id", sid)
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to),
    ),
  ]);
  const [spaceResult, membersResult, meetings, photos, wishes] = results;
  check(spaceResult.error);
  check(membersResult.error);
  const members = membersResult.data as Member[];
  const { data: profiles, error } = await db
    .from("profiles")
    .select("id,nickname,avatar_path")
    .in(
      "id",
      members.map((m) => m.user_id),
    );
  check(error);
  const signedProfiles = await Promise.all(
    (profiles as Profile[]).map(async (p) => ({
      ...p,
      avatar_url: sign ? await signPath(db, p.avatar_path) : undefined,
    })),
  );
  const signedPhotos = await Promise.all(
    photos.map(async (p) => ({
      ...p,
      url:
        sign && p.status === "ready" ? await signPath(db, p.path) : undefined,
    })),
  );
  return {
    user_id: userId,
    profile: signedProfiles.find((p) => p.id === userId)!,
    space: spaceResult.data as Space,
    members,
    profiles: signedProfiles,
    meetings,
    photos: signedPhotos,
    wishes,
    media_warning:
      sign && signedPhotos.some((p) => p.status === "ready" && !p.url)
        ? "部分照片暂时无法加载，请刷新或检查 Storage 配置"
        : undefined,
  };
}
