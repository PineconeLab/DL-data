import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { validateImage } from "@/server/services/photos";
describe("服务端图片验证", () => {
  it("不相信声明的文件类型，拒绝伪装图片和视频", async () => {
    await expect(
      validateImage(Buffer.from("not an image"), "image/webp"),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      validateImage(Buffer.from("video"), "video/mp4"),
    ).rejects.toMatchObject({ status: 415 });
  });
  it("重新编码、限制尺寸，不保留原始 EXIF", async () => {
    const bytes = await sharp({
      create: { width: 2400, height: 600, channels: 3, background: "#eee" },
    })
      .jpeg()
      .toBuffer();
    const result = await validateImage(bytes, "image/jpeg");
    expect(result.info.width).toBe(2000);
    expect(result.info.format).toBe("webp");
    expect((await sharp(result.data).metadata()).exif).toBeUndefined();
  });
});
