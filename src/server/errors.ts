import { NextResponse } from "next/server";
import { ZodError } from "zod";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function check(error: { message: string; code?: string } | null) {
  if (!error) return;
  const known: Record<string, [number, string]> = {
    AUTH_REQUIRED: [401, "请先登录"],
    NOT_MEMBER: [403, "请先创建或加入双人空间"],
    ALREADY_MEMBER: [409, "每个账号只能加入一个空间"],
    SPACE_FULL: [409, "这个空间已有两位成员"],
    INVITATION_INVALID: [410, "邀请不存在、已使用、已撤销或已过期"],
    NOT_FOUND: [404, "记录不存在或无访问权限"],
    PHOTO_LIMIT: [409, "每次见面最多保存 10 张照片"],
  };
  for (const [key, [status, message]] of Object.entries(known))
    if (error.message.includes(key)) throw new ApiError(status, message);
  if (error.code === "23505")
    throw new ApiError(409, "数据已存在，请刷新后重试");
  if (error.code === "42501") throw new ApiError(403, "没有权限执行此操作");
  console.error("Supabase request failed:", error.code || "unknown");
  throw new ApiError(500, "数据操作失败，请检查数据库迁移或稍后重试");
}
export function errorResponse(error: unknown) {
  if (error instanceof ApiError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  if (error instanceof ZodError)
    return NextResponse.json(
      { error: error.issues[0]?.message || "参数无效" },
      { status: 400 },
    );
  console.error(
    "Unhandled API error:",
    error instanceof Error ? error.name : "unknown",
  );
  return NextResponse.json(
    { error: "服务暂时不可用，请稍后重试" },
    { status: 500 },
  );
}
