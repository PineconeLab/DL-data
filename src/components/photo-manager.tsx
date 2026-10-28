"use client";
import { useRef, useState, useEffect } from "react";
import { Upload, RotateCcw, Trash2, ImagePlus } from "lucide-react";
import { api, compressImage, uploadImage } from "@/lib/api";
import type { Photo } from "@/lib/types";
type Item = {
  key: string;
  file: File;
  preview: string;
  photoId?: string;
  progress: number;
  status: "waiting" | "uploading" | "failed" | "done";
  error?: string;
};
export function PhotoManager({
  meetingId,
  photos,
  refresh,
  notify,
}: {
  meetingId: string;
  photos: Photo[];
  refresh: () => Promise<void>;
  notify: (text: string) => void;
}) {
  const [items, setItems] = useState<Item[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const itemsRef = useRef<Item[]>([]),
    active = useRef(false),
    input = useRef<HTMLInputElement>(null),
    retryPhoto = useRef<string | undefined>(undefined);
  const visible = photos.filter((p) => p.status !== "deleting");
  useEffect(
    () => () => {
      itemsRef.current.forEach((i) => URL.revokeObjectURL(i.preview));
    },
    [],
  );
  function update(key: string, patch: Partial<Item>) {
    setItems((old) => {
      const next = old.map((i) => (i.key === key ? { ...i, ...patch } : i));
      itemsRef.current = next;
      return next;
    });
  }
  async function send(item: Item) {
    update(item.key, { status: "uploading", error: undefined });
    try {
      const blob = await compressImage(item.file);
      let id = item.photoId;
      if (!id) {
        const photo = await api<Photo>("photos", "POST", {
          meeting_id: meetingId,
          original_name: item.file.name.slice(0, 200),
        });
        id = photo.id;
        item.photoId = id;
        update(item.key, { photoId: id });
      }
      await uploadImage("photos/" + id, blob, (p) =>
        update(item.key, { progress: p }),
      );
      update(item.key, { status: "done" });
    } catch (e) {
      update(item.key, {
        status: "failed",
        error: e instanceof Error ? e.message : "上传失败",
      });
    }
  }
  async function choose(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length || active.current) return;
    const retryId = retryPhoto.current;
    retryPhoto.current = undefined;
    if (!retryId && visible.length + files.length > 10) {
      setError("每次见面最多 10 张照片，请减少选择或删除旧照片");
      return;
    }
    setError("");
    const added = files.map((file) => ({
      key: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      photoId: retryId,
      progress: 0,
      status: "waiting" as const,
    }));
    setItems((old) => {
      const next = [...old, ...added];
      itemsRef.current = next;
      return next;
    });
    active.current = true;
    setBusy(true);
    for (const item of added) await send(item);
    try {
      await refresh();
    } catch {
      setError("上传已处理，但列表刷新失败，请手动刷新");
    }
    active.current = false;
    setBusy(false);
  }
  async function retry(item: Item) {
    if (active.current) return;
    active.current = true;
    setBusy(true);
    await send(item);
    try {
      await refresh();
    } catch {
      setError("请刷新照片列表");
    }
    active.current = false;
    setBusy(false);
  }
  async function remove(p: Photo) {
    if (!confirm("删除这张照片？存储清理失败时会保留重试入口。")) return;
    setBusy(true);
    try {
      const result = await api<{ cleanup: { failed: number } }>(
        "photos/" + p.id,
        "DELETE",
      );
      await refresh();
      notify(
        result.cleanup.failed
          ? "已移除照片，存储清理未完成，请重试清理"
          : "照片已删除",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
    } finally {
      setBusy(false);
    }
  }
  async function discard(item: Item) {
    if (
      active.current ||
      !confirm("取消这张照片的上传，并释放已预留的照片名额？")
    )
      return;
    active.current = true;
    setBusy(true);
    try {
      if (item.photoId) {
        const result = await api<{ cleanup: { failed: number } }>(
          "photos/" + item.photoId,
          "DELETE",
        );
        if (result.cleanup.failed) notify("已取消上传，存储清理仍需在首页重试");
      }
      URL.revokeObjectURL(item.preview);
      setItems((old) => {
        const next = old.filter((i) => i.key !== item.key);
        itemsRef.current = next;
        return next;
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "取消失败，请重试");
    } finally {
      active.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="photo-manager">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3>这次见面的照片</h3>
          <p className="hint">
            最多 10 张 · JPG / PNG / WebP · 原图 ≤20MB，压缩后 ≤5MB
          </p>
        </div>
        <button
          type="button"
          className="button secondary compact"
          disabled={busy}
          onClick={() => {
            retryPhoto.current = undefined;
            if (input.current) {
              input.current.multiple = true;
              input.current.click();
            }
          }}
        >
          <Upload size={15} />
          添加
        </button>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={choose}
      />
      <p className="hint mt-2">
        上传前压缩并在服务端重新校验；私有存储，短期授权访问。上传失败可重试，关闭后也能重新选择原图继续。
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="upload-grid">
        {visible
          .filter(
            (p) =>
              !items.some((i) => i.photoId === p.id && i.status !== "done"),
          )
          .map((p) => (
            <div className="upload-card" key={p.id}>
              {p.url ? (
                <img src={p.url} alt={p.original_name || "见面照片"} />
              ) : (
                <div className="upload-placeholder">
                  <ImagePlus size={25} />
                  <span>
                    {p.status === "pending"
                      ? "尚未完成上传"
                      : "链接过期，请刷新"}
                  </span>
                </div>
              )}
              <div className="upload-tools">
                <small>{p.status === "ready" ? "已保存" : "等待上传"}</small>
                {p.status === "pending" && (
                  <button
                    type="button"
                    disabled={busy}
                    className="icon-button"
                    aria-label="重新选择照片上传"
                    onClick={() => {
                      retryPhoto.current = p.id;
                      if (input.current) {
                        input.current.multiple = false;
                        input.current.click();
                      }
                    }}
                  >
                    <RotateCcw size={15} />
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  className="icon-button danger"
                  aria-label="删除照片"
                  onClick={() => void remove(p)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        {items
          .filter((i) => i.status !== "done")
          .map((item) => (
            <div className="upload-card" key={item.key}>
              <img src={item.preview} alt="待上传照片预览" />
              <div className="p-3">
                <small>
                  {item.status === "failed"
                    ? item.error
                    : item.status === "waiting"
                      ? "等待上传"
                      : item.progress >= 95
                        ? "服务端验证与保存中…"
                        : `正在上传 ${item.progress}%`}
                </small>
                <progress
                  max={100}
                  value={item.progress}
                  aria-label="照片上传进度"
                />
                {item.status === "failed" && (
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={busy}
                      className="text-link"
                      onClick={() => void retry(item)}
                    >
                      <RotateCcw size={13} />
                      重试上传
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className="text-link danger"
                      onClick={() => void discard(item)}
                    >
                      <Trash2 size={13} />
                      取消上传
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
      </div>
      {!visible.length && !items.length && (
        <div className="empty small">
          <ImagePlus size={28} />
          <p>还没有照片，留一张这一天的画面。</p>
        </div>
      )}
    </div>
  );
}
