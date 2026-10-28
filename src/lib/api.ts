export async function api<T = Record<string, unknown>>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch("/api/" + path, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "请求失败，请重试");
  return data as T;
}
export async function compressImage(file: File, avatar = false): Promise<Blob> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("仅支持 JPG、PNG、WebP");
  if (file.size > 20 * 1024 * 1024) throw new Error("原图最多 20MB，请先缩小");
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 40000000)
      throw new Error("图片像素过大，请先缩小");
    const ratio = Math.min(
        1,
        (avatar ? 512 : 2000) / Math.max(bitmap.width, bitmap.height),
      ),
      canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * ratio);
    canvas.height = Math.round(bitmap.height * ratio);
    canvas
      .getContext("2d")!
      .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("图片压缩失败"))),
        "image/webp",
        0.82,
      ),
    );
    if (blob.size > 5 * 1024 * 1024)
      throw new Error("压缩后图片超过 5MB，请更换图片");
    return blob;
  } finally {
    bitmap.close();
  }
}
export function uploadImage(
  path: string,
  blob: Blob,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", "/api/" + path);
    xhr.withCredentials = true;
    xhr.timeout = 60000;
    xhr.setRequestHeader("Content-Type", blob.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        onProgress(Math.min(95, Math.round((e.loaded / e.total) * 95)));
    };
    xhr.onerror = () => reject(new Error("网络错误，请重试"));
    xhr.ontimeout = () => reject(new Error("上传超时，请重试"));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
      } else {
        try {
          reject(new Error(JSON.parse(xhr.responseText).error || "上传失败"));
        } catch {
          reject(new Error("上传失败，请重试"));
        }
      }
    };
    xhr.send(blob);
  });
}
