export type Profile = {
  id: string;
  nickname: string;
  avatar_path: string | null;
  avatar_url?: string | null;
};
export type Member = {
  id: string;
  user_id: string;
  space_id: string;
  city: string;
};
export type Space = {
  id: string;
  name: string;
  met_on: string | null;
  anniversary: string | null;
};
export type Photo = {
  id: string;
  meeting_id: string;
  space_id: string;
  path: string;
  original_name: string;
  size_bytes: number;
  status: "pending" | "ready" | "deleting";
  created_at: string;
  cleanup_error: string | null;
  cleanup_checked_at: string | null;
  url?: string | null;
};
export type Meeting = {
  id: string;
  space_id: string;
  date: string;
  title: string;
  location: string;
  notes: string;
  status: "planned" | "completed";
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  meeting_activities: { id: string; title: string; position: number }[];
};
export type Wish = {
  id: string;
  title: string;
  description: string;
  planned_date: string | null;
  category: "place" | "experience" | "routine" | "other";
  completed_at: string | null;
  created_by: string;
  updated_at: string;
};
export type Bootstrap = {
  user_id: string;
  profile: Profile;
  space: Space | null;
  members: Member[];
  profiles: Profile[];
  meetings: Meeting[];
  photos: Photo[];
  wishes: Wish[];
  media_warning?: string;
};
export const categories = {
  place: "想去的地方",
  experience: "想做的事",
  routine: "日常安排",
  other: "其他",
} as const;
