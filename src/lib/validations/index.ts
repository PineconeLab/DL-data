import { z } from "zod";
import { isDateOnly } from "@/lib/dates";
export const dateOnly = z
  .string()
  .refine(isDateOnly, "请选择有效日期（1900—2199）");
export const optionalDate = dateOnly.nullable();
export const uuid = z.uuid();
export const meetingInput = z
  .object({
    date: dateOnly,
    title: z.string().trim().min(1, "请填写标题").max(120),
    location: z.string().trim().max(160).default(""),
    notes: z.string().max(10000).default(""),
    status: z.enum(["planned", "completed"]),
    activities: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  })
  .strict();
export const wishInput = z
  .object({
    title: z.string().trim().min(1, "请填写标题").max(120),
    description: z.string().max(5000).default(""),
    planned_date: optionalDate.default(null),
    category: z.enum(["place", "experience", "routine", "other"]),
    completed: z.boolean().default(false),
  })
  .strict();
export const spaceInput = z
  .object({ name: z.string().trim().min(1).max(60) })
  .strict();
export const settingsInput = z
  .object({
    name: z.string().trim().min(1).max(60),
    met_on: optionalDate,
    anniversary: optionalDate,
    cities: z
      .array(
        z.object({ member_id: uuid, city: z.string().trim().max(80) }).strict(),
      )
      .max(2),
  })
  .strict();
export const profileInput = z
  .object({ nickname: z.string().trim().max(40) })
  .strict();
export const invitationInput = z
  .object({ token: z.string().regex(/^[a-f0-9]{64}$/) })
  .strict();
export const reserveInput = z
  .object({ meeting_id: uuid, original_name: z.string().max(200) })
  .strict();
export const authInput = z.object({
  email: z.email("请输入有效邮箱"),
  password: z.string().min(8, "密码至少 8 位").max(128),
});
export type MeetingInput = z.infer<typeof meetingInput>;
export type WishInput = z.infer<typeof wishInput>;
