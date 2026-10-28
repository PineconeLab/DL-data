import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError, check } from "@/server/errors";
export const BUCKET = "couple-private";
export async function validateImage(
  bytes: Buffer,
  type: string,
  avatar = false,
) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(type))
    throw new ApiError(415, "只支持 JPG、PNG、WebP 图片");
  if (bytes.length > 5 * 1024 * 1024)
    throw new ApiError(413, "每张图片最多 5MB");
  try {
    const image = sharp(bytes, {
      limitInputPixels: 40000000,
      animated: false,
      failOn: "error",
    });
    const meta = await image.metadata();
    if (
      !["jpeg", "png", "webp"].includes(meta.format || "") ||
      !meta.width ||
      !meta.height ||
      (meta.pages && meta.pages > 1)
    )
      throw new Error("invalid");
    const output = await image
      .rotate()
      .resize(avatar ? 512 : 2000, avatar ? 512 : 2000, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    return output;
  } catch {
    throw new ApiError(400, "图片内容无效、过大或无法解码，请更换图片");
  }
}
export async function cleanupPhotos(db: SupabaseClient, spaceId: string) {
  const { data: photos, error } = await db
    .from("meeting_photos")
    .select("id,path")
    .eq("space_id", spaceId)
    .eq("status", "deleting");
  check(error);
  let failed = 0;
  for (const p of photos || []) {
    const { error: removeError } = await db.storage
      .from(BUCKET)
      .remove([p.path]);
    const { error: recordError } = await db.rpc("record_cleanup", {
      p_id: p.id,
      p_error: removeError ? "照片清理失败，请重试" : null,
    });
    if (removeError || recordError) failed++;
  }
  return { attempted: photos?.length || 0, failed };
}
export async function signPath(db: SupabaseClient, path: string | null) {
  if (!path) return null;
  const { data, error } = await db.storage
    .from(BUCKET)
    .createSignedUrl(path, 120);
  if (error) return null;
  return data.signedUrl;
}
