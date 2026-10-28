import { ApiError, check } from "@/server/errors";
import type { SupabaseClient } from "@supabase/supabase-js";
export async function requireUser(db: SupabaseClient) {
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) throw new ApiError(401, "请先登录");
  return user;
}
export async function requireMembership(db: SupabaseClient, userId: string) {
  const { data, error } = await db
    .from("space_members")
    .select("id,space_id,user_id,city")
    .eq("user_id", userId)
    .maybeSingle();
  check(error);
  if (!data) throw new ApiError(403, "请先创建或加入双人空间");
  return data as {
    id: string;
    space_id: string;
    user_id: string;
    city: string;
  };
}
