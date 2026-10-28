import { NextResponse, type NextRequest } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { serverClient } from "@/lib/supabase/server";
import { configured } from "@/lib/config";
import { requireUser, requireMembership } from "@/server/services/access";
import { loadData } from "@/server/services/bootstrap";
import { saveMeeting, saveWish } from "@/server/services/records";
import { cleanupPhotos, validateImage, BUCKET } from "@/server/services/photos";
import { ApiError, check, errorResponse } from "@/server/errors";
import { assertSameOrigin, readJson, readBytes } from "@/server/http";
import {
  uuid,
  spaceInput,
  invitationInput,
  meetingInput,
  wishInput,
  settingsInput,
  profileInput,
  reserveInput,
} from "@/lib/validations";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
type Context = { params: Promise<{ path: string[] }> };
async function handle(req: NextRequest, ctx: Context) {
  try {
    if (!configured())
      throw new ApiError(
        503,
        "请先在 .env.local 配置 Supabase，并执行数据库迁移。当前没有保存任何内容。",
      );
    if (req.method !== "GET") assertSameOrigin(req);
    const db = await serverClient(),
      user = await requireUser(db),
      { path } = await ctx.params;
    const [area, id, action] = path,
      method = req.method;
    const json = (data: unknown, status = 200) =>
      NextResponse.json(data, {
        status,
        headers: { "Cache-Control": "private, no-store" },
      });
    if (area === "bootstrap" && method === "GET" && path.length === 1)
      return json(await loadData(db, user.id));
    if (area === "spaces" && method === "POST" && path.length === 1) {
      const input = spaceInput.parse(await readJson(req));
      const { data, error } = await db.rpc("create_space", {
        p_name: input.name,
      });
      check(error);
      return json({ id: data }, 201);
    }
    if (area === "invitations" && id === "accept" && method === "POST") {
      const { token } = invitationInput.parse(await readJson(req));
      const { data, error } = await db.rpc("accept_invitation", {
        p_hash: createHash("sha256").update(token).digest("hex"),
      });
      check(error);
      return json({ id: data });
    }
    const member = await requireMembership(db, user.id),
      sid = member.space_id;
    if (area === "invitations" && !id && method === "POST") {
      const token = randomBytes(32).toString("hex");
      const { data, error } = await db.rpc("issue_invitation", {
        p_hash: createHash("sha256").update(token).digest("hex"),
      });
      check(error);
      const origin = new URL(process.env.APP_URL || req.url).origin;
      return json({ url: `${origin}/invite/${token}`, expires_at: data }, 201);
    }
    if (area === "meetings" && !id && method === "POST")
      return json(
        await saveMeeting(db, meetingInput.parse(await readJson(req)), null),
        201,
      );
    if (area === "meetings" && id && path.length === 2) {
      uuid.parse(id);
      if (method === "PATCH")
        return json(
          await saveMeeting(db, meetingInput.parse(await readJson(req)), id),
        );
      if (method === "DELETE") {
        const { error } = await db.rpc("delete_meeting", { p_id: id });
        check(error);
        return json({ deleted: true, cleanup: await cleanupPhotos(db, sid) });
      }
    }
    if (area === "wishes" && !id && method === "POST")
      return json(
        await saveWish(
          db,
          wishInput.parse(await readJson(req)),
          user.id,
          sid,
          null,
        ),
        201,
      );
    if (area === "wishes" && id && path.length === 2) {
      uuid.parse(id);
      if (method === "PATCH")
        return json(
          await saveWish(
            db,
            wishInput.parse(await readJson(req)),
            user.id,
            sid,
            id,
          ),
        );
      if (method === "DELETE") {
        const { data, error } = await db
          .from("wishes")
          .delete()
          .eq("id", id)
          .eq("space_id", sid)
          .select("id")
          .maybeSingle();
        check(error);
        if (!data) throw new ApiError(404, "事项不存在");
        return json({ deleted: true });
      }
    }
    if (area === "settings" && !id && method === "PATCH") {
      const input = settingsInput.parse(await readJson(req));
      const { error } = await db.rpc("save_settings", {
        p_name: input.name,
        p_met_on: input.met_on,
        p_anniversary: input.anniversary,
        p_cities: input.cities,
      });
      check(error);
      return json({ saved: true });
    }
    if (area === "profile" && !id && method === "PATCH") {
      const input = profileInput.parse(await readJson(req));
      const { error } = await db
        .from("profiles")
        .update(input)
        .eq("id", user.id);
      check(error);
      return json({ saved: true });
    }
    if (area === "profile" && id === "avatar" && method === "PUT") {
      const output = await validateImage(
        await readBytes(req, 5 * 1024 * 1024),
        req.headers.get("content-type") || "",
        true,
      );
      const path = `avatars/${user.id}/avatar.webp`;
      const { error } = await db.storage
        .from(BUCKET)
        .upload(path, output.data, {
          contentType: "image/webp",
          upsert: true,
          cacheControl: "0",
        });
      check(error);
      const { error: profileError } = await db
        .from("profiles")
        .update({ avatar_path: path })
        .eq("id", user.id);
      check(profileError);
      return json({ saved: true });
    }
    if (area === "photos" && !id && method === "POST") {
      const input = reserveInput.parse(await readJson(req));
      const { data, error } = await db.rpc("reserve_photo", {
        p_meeting: input.meeting_id,
        p_name: input.original_name,
      });
      check(error);
      return json(data, 201);
    }
    if (area === "photos" && id && path.length === 2) {
      uuid.parse(id);
      if (method === "DELETE") {
        const { error } = await db.rpc("delete_photo", { p_id: id });
        check(error);
        return json({ deleted: true, cleanup: await cleanupPhotos(db, sid) });
      }
      if (method === "PUT") {
        const { data: photo, error } = await db
          .from("meeting_photos")
          .select("*")
          .eq("id", id)
          .eq("space_id", sid)
          .maybeSingle();
        check(error);
        if (!photo || photo.status === "deleting")
          throw new ApiError(404, "照片不存在或已删除");
        if (photo.status === "ready") return json({ saved: true });
        const output = await validateImage(
          await readBytes(req, 5 * 1024 * 1024),
          req.headers.get("content-type") || "",
        );
        const { error: uploadError } = await db.storage
          .from(BUCKET)
          .upload(photo.path, output.data, {
            contentType: "image/webp",
            upsert: false,
            cacheControl: "0",
          });
        let info = output.info,
          size = output.data.length;
        if (uploadError) {
          if (
            !["409", "Duplicate"].includes(String(uploadError.statusCode)) &&
            !uploadError.message.includes("already exists")
          )
            check(uploadError);
          const { data: existing, error: downloadError } = await db.storage
            .from(BUCKET)
            .download(photo.path);
          check(downloadError);
          if (!existing) throw new ApiError(500, "无法恢复上传，请重试");
          const validated = await validateImage(
            Buffer.from(await existing.arrayBuffer()),
            "image/webp",
          );
          info = validated.info;
          size = existing.size;
        }
        const { error: finishError } = await db.rpc("finish_photo", {
          p_id: id,
          p_size: size,
          p_width: info.width,
          p_height: info.height,
        });
        if (finishError) {
          await db.storage.from(BUCKET).remove([photo.path]);
          check(finishError);
        }
        return json({ saved: true });
      }
    }
    if (area === "cleanup" && !id && method === "POST")
      return json(await cleanupPhotos(db, sid));
    if (area === "export" && !id && method === "GET") {
      const data = await loadData(db, user.id, false);
      return new NextResponse(
        JSON.stringify(
          {
            format: "our-little-days",
            version: 1,
            exported_at: new Date().toISOString(),
            note: "仅包含共享文字和照片路径元数据，不包含照片原文件，也不包含账号凭据。删除的照片墓碑记录用于清理重试。",
            space: data.space,
            members: data.members,
            profiles: data.profiles,
            meetings: data.meetings,
            photos: data.photos,
            wishes: data.wishes,
          },
          null,
          2,
        ),
        {
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Disposition":
              'attachment; filename="our-little-days.json"',
            "Cache-Control": "private, no-store",
          },
        },
      );
    }
    void action;
    throw new ApiError(404, "接口不存在");
  } catch (error) {
    return errorResponse(error);
  }
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;
