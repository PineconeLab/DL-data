import type { SupabaseClient } from "@supabase/supabase-js";
import type { MeetingInput, WishInput } from "@/lib/validations";
import { check, ApiError } from "@/server/errors";
export async function saveMeeting(
  db: SupabaseClient,
  input: MeetingInput,
  id: string | null,
) {
  const { data, error } = await db.rpc("save_meeting", {
    p_id: id,
    p_date: input.date,
    p_title: input.title,
    p_location: input.location,
    p_notes: input.notes,
    p_status: input.status,
    p_activities: input.activities,
  });
  check(error);
  return { id: data as string };
}
export async function saveWish(
  db: SupabaseClient,
  input: WishInput,
  userId: string,
  spaceId: string,
  id: string | null,
) {
  let completedAt: string | null = null;
  if (input.completed) {
    if (id) {
      const { data, error } = await db
        .from("wishes")
        .select("completed_at")
        .eq("id", id)
        .eq("space_id", spaceId)
        .maybeSingle();
      check(error);
      if (!data) throw new ApiError(404, "事项不存在");
      completedAt = data.completed_at;
    }
    completedAt ||= new Date().toISOString();
  }
  const values = {
    title: input.title,
    description: input.description,
    planned_date: input.planned_date,
    category: input.category,
    completed_at: completedAt,
    updated_by: userId,
  };
  const query = id
    ? db.from("wishes").update(values).eq("id", id).eq("space_id", spaceId)
    : db
        .from("wishes")
        .insert({ ...values, space_id: spaceId, created_by: userId });
  const { data, error } = await query.select("id").maybeSingle();
  check(error);
  if (!data) throw new ApiError(404, "事项不存在或无访问权限");
  return data;
}
