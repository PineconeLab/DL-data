import { ApiError } from "@/server/errors";
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = new URL(process.env.APP_URL || request.url).origin;
  if (!origin || origin !== expected)
    throw new ApiError(403, "请求来源无效，请从本站重新提交");
}
export async function readBytes(request: Request, max: number) {
  if (Number(request.headers.get("content-length")) > max)
    throw new ApiError(413, "文件或请求过大");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "请求内容为空");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel();
        throw new ApiError(413, "文件或请求过大");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}
export async function readJson(request: Request) {
  try {
    return JSON.parse(
      (await readBytes(request, 64 * 1024)).toString("utf8"),
    ) as unknown;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(400, "请求必须是有效 JSON");
  }
}
