"use client";
import { useState } from "react";
import { Trash2, Check, Plus, X, Upload } from "lucide-react";
import { api, compressImage, uploadImage } from "@/lib/api";
import { meetingInput, wishInput, settingsInput } from "@/lib/validations";
import { shanghaiToday } from "@/lib/dates";
import {
  categories,
  type Meeting,
  type Wish,
  type Bootstrap,
} from "@/lib/types";
import { Modal } from "./modal";
import { PhotoManager } from "./photo-manager";
type Common = {
  onClose: () => void;
  refresh: () => Promise<void>;
  notify: (text: string) => void;
};
export function MeetingEditor({
  meeting,
  date,
  data,
  onSaved,
  ...common
}: Common & {
  meeting?: Meeting;
  date?: string;
  data: Bootstrap;
  onSaved: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [activities, setActivities] = useState(
      meeting?.meeting_activities
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((a) => a.title) || [],
    ),
    [custom, setCustom] = useState("");
  function add(value: string) {
    const title = value.trim();
    if (title && activities.length < 20 && !activities.includes(title)) {
      setActivities([...activities, title]);
      setCustom("");
    }
  }
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const f = new FormData(e.currentTarget);
      const parsed = meetingInput.safeParse({
        date: f.get("date"),
        title: f.get("title"),
        location: f.get("location"),
        notes: f.get("notes"),
        status: f.get("status"),
        activities,
      });
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      const saved = await api<{ id: string }>(
        "meetings" + (meeting ? "/" + meeting.id : ""),
        meeting ? "PATCH" : "POST",
        parsed.data,
      );
      await common.refresh();
      common.notify(
        meeting ? "见面记录已更新" : "见面记录已保存，现在可以添加照片",
      );
      onSaved(saved.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (
      !meeting ||
      !confirm(
        "确定删除这次见面及关联照片吗？文字删除后无法恢复；照片清理失败可重试。",
      )
    )
      return;
    setBusy(true);
    try {
      const result = await api<{ cleanup: { failed: number } }>(
        "meetings/" + meeting.id,
        "DELETE",
      );
      await common.refresh();
      common.notify(
        result.cleanup.failed
          ? "记录已删除，有照片等待重新清理"
          : "记录及关联照片已删除",
      );
      common.onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={meeting ? "翻看这一天" : "记下一次见面"}
      onClose={common.onClose}
      wide
    >
      <form onSubmit={save} className="form-stack">
        <div className="form-grid">
          <label>
            见面日期
            <input
              type="date"
              name="date"
              required
              min="1900-01-01"
              max="2199-12-31"
              defaultValue={meeting?.date || date || shanghaiToday()}
            />
          </label>
          <label>
            记录状态
            <select name="status" defaultValue={meeting?.status || "planned"}>
              <option value="planned">计划见面</option>
              <option value="completed">已经见面</option>
            </select>
          </label>
        </div>
        <p className="hint -mt-2">
          是否已见面由你们确认，不会根据日期自动改变。
        </p>
        <label>
          标题
          <input
            name="title"
            required
            maxLength={120}
            defaultValue={meeting?.title}
            placeholder="给这一天起个名字"
          />
        </label>
        <label>
          城市或地点
          <input
            name="location"
            maxLength={160}
            defaultValue={meeting?.location}
            placeholder="在哪里一起度过？无需填写具体住址"
          />
        </label>
        <fieldset>
          <legend>
            一起做的事 <span className="hint">（可多选，也可自定义）</span>
          </legend>
          <div className="activity-options">
            {["吃饭", "散步", "看电影", "逛展", "徒步", "做饭"].map((a) => (
              <button
                type="button"
                key={a}
                aria-pressed={activities.includes(a)}
                className={activities.includes(a) ? "chip selected" : "chip"}
                onClick={() =>
                  activities.includes(a)
                    ? setActivities(activities.filter((x) => x !== a))
                    : add(a)
                }
              >
                {activities.includes(a) && <Check size={12} />} {a}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <input
              aria-label="自定义活动"
              value={custom}
              maxLength={80}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add(custom);
                }
              }}
              placeholder="再加一件小事…"
            />
            <button
              type="button"
              className="icon-button"
              disabled={!custom.trim() || activities.length >= 20}
              aria-label="添加自定义活动"
              onClick={() => add(custom)}
            >
              <Plus size={18} />
            </button>
          </div>
          {activities.length > 0 && (
            <div className="activity-options mt-3">
              {activities.map((a, i) => (
                <button
                  type="button"
                  key={i}
                  className="chip selected"
                  onClick={() =>
                    setActivities(activities.filter((_, index) => index !== i))
                  }
                  aria-label={"移除活动 " + a}
                >
                  {a}
                  <X size={12} />
                </button>
              ))}
            </div>
          )}
        </fieldset>
        <label>
          想记住的细节
          <textarea
            name="notes"
            maxLength={10000}
            rows={4}
            defaultValue={meeting?.notes}
            placeholder="这一刻，发生了什么？由你们亲自写下。"
          />
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="form-actions">
          {meeting && (
            <button
              type="button"
              className="button danger ghost"
              disabled={busy}
              onClick={() => void remove()}
            >
              <Trash2 size={15} />
              删除记录
            </button>
          )}
          <button className="button primary" disabled={busy}>
            {busy ? "正在保存…" : meeting ? "保存修改" : "保存，继续添加照片"}
          </button>
        </div>
      </form>
      {meeting && (
        <PhotoManager
          meetingId={meeting.id}
          photos={data.photos.filter((p) => p.meeting_id === meeting.id)}
          refresh={common.refresh}
          notify={common.notify}
        />
      )}
    </Modal>
  );
}
export function WishEditor({ wish, ...common }: Common & { wish?: Wish }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const f = new FormData(e.currentTarget),
        input = wishInput.safeParse({
          title: f.get("title"),
          description: f.get("description"),
          planned_date: f.get("planned_date") || null,
          category: f.get("category"),
          completed: f.get("completed") === "on",
        });
      if (!input.success) throw new Error(input.error.issues[0].message);
      await api(
        "wishes" + (wish ? "/" + wish.id : ""),
        wish ? "PATCH" : "POST",
        input.data,
      );
      await common.refresh();
      common.notify("共同事项已保存");
      common.onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!wish || !confirm("确定删除这个事项吗？删除后无法恢复。")) return;
    setBusy(true);
    try {
      await api("wishes/" + wish.id, "DELETE");
      await common.refresh();
      common.notify("事项已删除");
      common.onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={wish ? "编辑共同事项" : "留一个小小的期待"}
      onClose={common.onClose}
    >
      <form className="form-stack" onSubmit={save}>
        <label>
          标题
          <input
            name="title"
            required
            maxLength={120}
            defaultValue={wish?.title}
            placeholder="想一起去哪里，或做什么？"
          />
        </label>
        <label>
          描述
          <textarea
            name="description"
            rows={3}
            maxLength={5000}
            defaultValue={wish?.description}
            placeholder="可选，补充一点想法"
          />
        </label>
        <div className="form-grid">
          <label>
            分类
            <select
              name="category"
              defaultValue={wish?.category || "experience"}
            >
              {Object.entries(categories).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            计划日期（选填）
            <input
              type="date"
              name="planned_date"
              defaultValue={wish?.planned_date || ""}
              min="1900-01-01"
              max="2199-12-31"
            />
          </label>
        </div>
        <label className="checkbox-label">
          <input
            type="checkbox"
            name="completed"
            defaultChecked={!!wish?.completed_at}
          />
          这件事，我们已经完成了
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="form-actions">
          {wish && (
            <button
              type="button"
              disabled={busy}
              className="button danger ghost"
              onClick={() => void remove()}
            >
              <Trash2 size={15} />
              删除事项
            </button>
          )}
          <button className="button primary" disabled={busy}>
            {busy ? "正在保存…" : "保存事项"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function SettingsEditor({
  data,
  ...common
}: Common & { data: Bootstrap }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [progress, setProgress] = useState(0);
  async function profile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData(e.currentTarget);
      await api("profile", "PATCH", { nickname: form.get("nickname") });
      await common.refresh();
      common.notify("个人资料已保存");
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }
  async function settings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const f = new FormData(e.currentTarget),
        input = settingsInput.safeParse({
          name: f.get("name"),
          met_on: f.get("met_on") || null,
          anniversary: f.get("anniversary") || null,
          cities: data.members.map((m) => ({
            member_id: m.id,
            city: f.get("city-" + m.id) || "",
          })),
        });
      if (!input.success) throw new Error(input.error.issues[0].message);
      await api("settings", "PATCH", input.data);
      await common.refresh();
      common.notify("空间设置已保存");
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }
  async function avatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    setProgress(0);
    try {
      await uploadImage(
        "profile/avatar",
        await compressImage(file, true),
        setProgress,
      );
      await common.refresh();
      common.notify("头像已更新");
    } catch (e) {
      setError(e instanceof Error ? e.message : "上传失败，请重新选择图片重试");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="把这里变成你们的样子" onClose={common.onClose} wide>
      <form className="form-stack" onSubmit={profile}>
        <h3>我的资料</h3>
        <label>
          昵称
          <input
            name="nickname"
            maxLength={40}
            defaultValue={data.profile.nickname}
            placeholder="希望对方怎样称呼你"
          />
        </label>
        <label className="upload-label">
          <Upload size={16} />
          上传或更换我的头像
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={avatar}
          />
        </label>
        {busy && progress > 0 && (
          <progress value={progress} max={100} aria-label="头像上传进度" />
        )}
        <p className="hint">
          头像限 JPG / PNG / WebP；原图 ≤20MB，压缩后 ≤5MB，保存为最长边 512px。
        </p>
        <button className="button secondary" disabled={busy}>
          保存个人资料
        </button>
      </form>
      <hr />
      <form className="form-stack" onSubmit={settings}>
        <h3>共同空间</h3>
        <label>
          空间名称
          <input
            name="name"
            required
            maxLength={60}
            defaultValue={data.space?.name}
          />
        </label>
        <div className="form-grid">
          {data.members.map((m) => (
            <label key={m.id}>
              {data.profiles.find((p) => p.id === m.user_id)?.nickname ||
                (m.user_id === data.user_id ? "我" : "对方")}
              的城市
              <input
                name={"city-" + m.id}
                defaultValue={m.city}
                maxLength={80}
                placeholder="城市待填写"
              />
            </label>
          ))}
        </div>
        <div className="form-grid">
          <label>
            相识日期（选填）
            <input
              type="date"
              name="met_on"
              min="1900-01-01"
              max="2199-12-31"
              defaultValue={data.space?.met_on || ""}
            />
          </label>
          <label>
            恋爱纪念日（选填）
            <input
              type="date"
              name="anniversary"
              min="1900-01-01"
              max="2199-12-31"
              defaultValue={data.space?.anniversary || ""}
            />
          </label>
        </div>
        <p className="hint">
          “在一起的天数”按上海自然日计算：纪念日当天为第 1
          天。未来日期不计天数；未设置不显示天数。
        </p>
        <button className="button primary" disabled={busy}>
          {busy ? "正在保存…" : "保存空间设置"}
        </button>
      </form>
      {error && (
        <p role="alert" className="error mt-4">
          {error}
        </p>
      )}
      <hr />
      <h3>数据与照片备份</h3>
      <p className="hint mt-2">
        JSON 只包含共享文字和照片路径等元数据，不包含照片原文件。照片需在
        Supabase 私有 Storage 单独下载备份；两个成员都可导出共享文字。
      </p>
      <a className="button secondary mt-4" href="/api/export" download>
        导出共享文字 JSON ↓
      </a>
    </Modal>
  );
}
