"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  House,
  CalendarDays,
  BookOpen,
  CheckCheck,
  Settings,
  Plus,
  ArrowUpRight,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Camera,
  Mail,
  LogOut,
  RefreshCw,
  Leaf,
  Check,
  Clock,
  Copy,
} from "lucide-react";
import { api } from "@/lib/api";
import { browserClient } from "@/lib/supabase/client";
import {
  daysTogether,
  shanghaiToday,
  displayDate,
  displayTime,
  monthGrid,
  shiftMonth,
} from "@/lib/dates";
import {
  categories,
  type Bootstrap,
  type Meeting,
  type Wish,
  type Photo,
} from "@/lib/types";
import { MeetingEditor, WishEditor, SettingsEditor } from "./editors";
import { Modal } from "./modal";
type View = "home" | "calendar" | "memories" | "wishes";
type Editor =
  | { type: "meeting"; id?: string; date?: string }
  | { type: "wish"; id?: string }
  | { type: "settings" }
  | null;
const views = [
  { id: "home", label: "小日子", icon: House },
  { id: "calendar", label: "见面日历", icon: CalendarDays },
  { id: "memories", label: "回忆手记", icon: BookOpen },
  { id: "wishes", label: "共同事项", icon: CheckCheck },
] as const;
export function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<Bootstrap | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [view, setView] = useState<View>("home"),
    [editor, setEditor] = useState<Editor>(null),
    [busy, setBusy] = useState(""),
    [toast, setToast] = useState(""),
    [invite, setInvite] = useState<{ url: string; expires_at: string } | null>(
      null,
    ),
    [lightbox, setLightbox] = useState<Photo | null>(null);
  const refresh = useCallback(async () => {
    const next = await api<Bootstrap>("bootstrap");
    setData(next);
    setError("");
  }, []);
  useEffect(() => {
    let mounted = true;
    void api<Bootstrap>("bootstrap")
      .then((d) => {
        if (mounted) setData(d);
      })
      .catch((e) => {
        if (mounted) setError(e.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    const timer = setInterval(() => {
      if (document.visibilityState === "visible")
        void refresh().catch(() =>
          setError("同步暂时失败，保留当前画面；请刷新重试"),
        );
    }, 60000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [refresh]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  async function command(key: string, fn: () => Promise<void>) {
    if (busy) return;
    setBusy(key);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    } finally {
      setBusy("");
    }
  }
  async function issue() {
    await command("invite", async () => {
      setInvite(await api("invitations", "POST"));
    });
  }
  async function toggleWish(wish: Wish) {
    await command(wish.id, async () => {
      await api("wishes/" + wish.id, "PATCH", {
        title: wish.title,
        description: wish.description,
        planned_date: wish.planned_date,
        category: wish.category,
        completed: !wish.completed_at,
      });
      await refresh();
      setToast(wish.completed_at ? "已恢复待完成" : "已记下这次完成");
    });
  }
  async function signOut() {
    await command("logout", async () => {
      const { error } = await browserClient().auth.signOut();
      if (error) throw new Error("退出失败，请重试");
      router.replace("/login");
      router.refresh();
    });
  }
  if (loading)
    return (
      <main className="invite-page" role="status">
        <BookOpen size={42} strokeWidth={1} />
        <h2>正在翻开小日子…</h2>
      </main>
    );
  if (!data)
    return (
      <main className="invite-page">
        <h2>暂时没有打开这页手记</h2>
        <p className="error" role="alert">
          {error}
        </p>
        <p className="hint">
          请确认已执行全部 SQL migration，且 Supabase 连接配置正确。
        </p>
        <div className="flex gap-3 mt-6">
          <button
            className="button primary"
            disabled={!!busy}
            onClick={() => void command("reload", refresh)}
          >
            重试加载
          </button>
          <button
            className="button secondary"
            disabled={!!busy}
            onClick={() => void signOut()}
          >
            返回登录
          </button>
        </div>
      </main>
    );
  if (!data.space)
    return (
      <div className="onboarding">
        <header className="simple-header">
          <Brand />
          <button
            className="text-link"
            onClick={() => void signOut()}
            disabled={!!busy}
          >
            <LogOut size={15} />
            退出
          </button>
        </header>
        <main className="invite-page">
          <span className="eyebrow">ONE SPACE, TWO PEOPLE</span>
          <h1>从“我们”开始</h1>
          <p className="muted">
            创建一个空间，再邀请对方加入。
            <br />
            如果对方已经建好，请打开对方发来的邀请链接。
          </p>
          <form
            className="form-stack text-left w-full max-w-sm mt-8"
            onSubmit={(e) => {
              e.preventDefault();
              const name = new FormData(e.currentTarget).get("name");
              void command("create", async () => {
                await api("spaces", "POST", { name });
                await refresh();
                setToast("空间已创建，现在可以邀请对方");
              });
            }}
          >
            <label>
              给小空间起个名字
              <input
                name="name"
                defaultValue="我们的小日子"
                maxLength={60}
                required
              />
            </label>
            <button className="button primary" disabled={!!busy}>
              {busy ? "正在创建…" : "创建我们的空间"}
              <ArrowRight size={16} />
            </button>
          </form>
          {error && (
            <p className="error mt-6" role="alert">
              {error}
            </p>
          )}
          <p className="hint mt-8">
            每个空间最多两人，每个账号仅加入一个空间。
          </p>
        </main>
      </div>
    );
  const nameOf = (id: string) =>
    data.profiles.find((p) => p.id === id)?.nickname ||
    (id === data.user_id ? "我" : "对方");
  const completed = data.meetings.filter((m) => m.status === "completed"),
    nextMeeting = data.meetings
      .filter((m) => m.status === "planned" && m.date >= shanghaiToday())
      .sort((a, b) => a.date.localeCompare(b.date))[0],
    openWishes = data.wishes.filter((w) => !w.completed_at),
    dayCount = data.space.anniversary
      ? daysTogether(data.space.anniversary)
      : null,
    cleanupPending = data.photos.filter(
      (p) => p.status === "deleting" && p.cleanup_error,
    );
  const activeMeeting =
    editor?.type === "meeting"
      ? data.meetings.find((m) => m.id === editor.id)
      : undefined;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <span className="eyebrow sidebar-title">两个人的生活手记</span>
        <nav aria-label="主导航">
          {views.map((v) => (
            <button
              key={v.id}
              aria-current={view === v.id ? "page" : undefined}
              onClick={() => setView(v.id)}
            >
              <v.icon size={18} strokeWidth={1.5} />
              {v.label}
              <span>0{views.indexOf(v) + 1}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Leaf size={24} strokeWidth={1} />
            <p>
              不必特别，
              <br />
              日常也值得收藏。
            </p>
          </div>
          <button onClick={() => setEditor({ type: "settings" })}>
            <Settings size={17} />
            空间设置
          </button>
          <button onClick={() => void signOut()} disabled={!!busy}>
            <LogOut size={17} />
            退出登录
          </button>
          <small>PRIVATE SPACE · FOR TWO</small>
        </div>
      </aside>
      <div className="app-main">
        <header className="app-header">
          <div>
            <span className="eyebrow">OUR LITTLE DAYS</span>
            <p>{data.space.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="icon-button"
              disabled={!!busy}
              aria-label="刷新共享数据"
              onClick={() =>
                void command("refresh", async () => {
                  await refresh();
                  setToast("已获取最新共享数据");
                })
              }
            >
              <RefreshCw
                size={17}
                className={busy === "refresh" ? "spin" : ""}
              />
            </button>
            <button
              className="profile-button"
              onClick={() => setEditor({ type: "settings" })}
            >
              <Avatar profile={data.profile} />
              <span>{data.profile.nickname || "设置我的昵称"}</span>
            </button>
          </div>
        </header>
        <main className="content">
          {error && (
            <div role="alert" className="error banner">
              {error}
              <button className="text-link" onClick={() => setError("")}>
                关闭提示
              </button>
            </div>
          )}
          {data.media_warning && (
            <div className="notice mb-4">{data.media_warning}</div>
          )}
          {cleanupPending.length > 0 && (
            <div className="notice mb-5 flex flex-wrap gap-3 items-center justify-between">
              <span>
                有 {cleanupPending.length}{" "}
                张照片等待存储清理，私人记录中已隐藏。
              </span>
              <button
                className="text-link"
                disabled={!!busy}
                onClick={() =>
                  void command("cleanup", async () => {
                    const r = await api<{ failed: number }>("cleanup", "POST");
                    await refresh();
                    setToast(
                      r.failed
                        ? "部分清理仍失败，请稍后重试"
                        : "照片存储已清理",
                    );
                  })
                }
              >
                重试清理 ↻
              </button>
            </div>
          )}
          {view === "home" && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">THE ORDINARY, MADE OURS</p>
                  <h1>
                    在一起的，小日子
                    <span className="hand-mark">慢慢记，慢慢来。</span>
                  </h1>
                  <p>收藏见面的片刻，也留一点期待给明天。</p>
                </div>
                <button
                  className="button primary"
                  onClick={() => setEditor({ type: "meeting" })}
                >
                  <Plus size={16} />
                  记录见面
                </button>
              </div>
              <section className="together-card">
                <div className="together-copy">
                  <span className="eyebrow">THIS IS OUR STORY</span>
                  <div className="couple-avatars">
                    {data.members.map((m) => {
                      const p = data.profiles.find((p) => p.id === m.user_id);
                      return p?.avatar_url ? (
                        <img
                          key={m.id}
                          className="avatar"
                          src={p.avatar_url}
                          alt={nameOf(m.user_id) + "的头像"}
                        />
                      ) : (
                        <span
                          key={m.id}
                          className="avatar avatar-empty"
                          aria-label={nameOf(m.user_id) + "尚未设置头像"}
                        >
                          {nameOf(m.user_id).slice(0, 1)}
                        </span>
                      );
                    })}
                  </div>
                  <div className="couple-names">
                    {data.members.map((m, i) => (
                      <span key={m.id}>
                        {i > 0 && <i>&</i>}
                        {nameOf(m.user_id)}
                      </span>
                    ))}
                    {data.members.length === 1 && (
                      <span>
                        <i>&</i>
                        <em>等你加入</em>
                      </span>
                    )}
                  </div>
                  <p className="city-line">
                    {data.members.map((m, i) => (
                      <span key={m.id}>
                        {i > 0 && <span className="city-dash">·······</span>}
                        {m.city || "城市待填写"}
                      </span>
                    ))}
                  </p>
                  {(data.space.met_on || data.space.anniversary) && (
                    <div className="anniversary-dates">
                      {data.space.met_on && (
                        <span>相识于 {displayDate(data.space.met_on)}</span>
                      )}
                      {data.space.anniversary && (
                        <span>
                          恋爱纪念日 {displayDate(data.space.anniversary)}
                        </span>
                      )}
                    </div>
                  )}
                  {dayCount !== null ? (
                    <p className="day-count">
                      在一起的第 <strong>{dayCount}</strong> 天{" "}
                      <small>
                        从 {displayDate(data.space.anniversary!)} 开始
                      </small>
                    </p>
                  ) : (
                    <p className="muted">
                      {data.space.anniversary
                        ? "纪念日已设置，期待那一天。"
                        : "纪念日还未写下，不急，慢慢补充。"}
                    </p>
                  )}
                  <button
                    className="text-link mt-5"
                    onClick={() => setEditor({ type: "settings" })}
                  >
                    编辑我们的资料 <ArrowUpRight size={14} />
                  </button>
                </div>
                <div className="book-art" aria-hidden="true">
                  <div className="book-sheet back"></div>
                  <div className="book-sheet front">
                    <Leaf size={48} strokeWidth={0.7} />
                    <span>
                      our
                      <br />
                      little days
                    </span>
                    <small>生活的边角，也有光。</small>
                  </div>
                  <span className="art-stamp">
                    TWO PEOPLE
                    <br />
                    ONE STORY
                  </span>
                </div>
              </section>
              {data.members.length === 1 && (
                <div className="invite-strip">
                  <Mail size={22} strokeWidth={1.2} />
                  <div>
                    <h3>给另一个人，留一个位置</h3>
                    <p>生成一次性邀请链接，和对方共同维护这个小空间。</p>
                  </div>
                  <button
                    className="button secondary compact"
                    disabled={!!busy}
                    onClick={() => void issue()}
                  >
                    邀请对方
                    <ArrowUpRight size={14} />
                  </button>
                </div>
              )}
              <div className="home-columns">
                <section>
                  <SectionTitle
                    number="01"
                    title="下一次见面"
                    action="查看日历"
                    onAction={() => setView("calendar")}
                  />
                  {nextMeeting ? (
                    <button
                      className="next-meeting"
                      onClick={() =>
                        setEditor({ type: "meeting", id: nextMeeting.id })
                      }
                    >
                      <CalendarDays size={28} strokeWidth={1} />
                      <span className="eyebrow">
                        {displayDate(nextMeeting.date)} · 计划见面
                      </span>
                      <h3>{nextMeeting.title}</h3>
                      <p>
                        <MapPin size={13} />
                        {nextMeeting.location || "地点待填写"}
                      </p>
                      <span className="text-link mt-5">
                        看看这次的计划
                        <ArrowUpRight size={14} />
                      </span>
                    </button>
                  ) : (
                    <Empty
                      icon={<CalendarDays size={30} strokeWidth={1} />}
                      title="一起安排下一次见面"
                      text="还没有未来的见面计划，给日历留一点期待。"
                      action="写下见面计划"
                      onClick={() => setEditor({ type: "meeting" })}
                    />
                  )}
                </section>
                <section>
                  <SectionTitle
                    number="02"
                    title="那些小小的期待"
                    action="查看全部"
                    onAction={() => setView("wishes")}
                  />
                  {openWishes.length ? (
                    <div className="home-wishes">
                      {openWishes.slice(0, 3).map((w) => (
                        <WishRow
                          key={w.id}
                          wish={w}
                          onToggle={() => void toggleWish(w)}
                          onEdit={() => setEditor({ type: "wish", id: w.id })}
                          disabled={!!busy}
                        />
                      ))}
                      <button
                        className="text-link mt-5"
                        onClick={() => setEditor({ type: "wish" })}
                      >
                        <Plus size={14} />
                        再添一件小事
                      </button>
                    </div>
                  ) : (
                    <Empty
                      icon={<CheckCheck size={30} strokeWidth={1} />}
                      title="留一个共同的小愿望"
                      text="想去的地方，想做的事，或下周的晚餐。"
                      action="添加事项"
                      onClick={() => setEditor({ type: "wish" })}
                    />
                  )}
                </section>
              </div>
              <section className="recent-section">
                <SectionTitle
                  number="03"
                  title="最近的一页回忆"
                  action="翻看回忆"
                  onAction={() => setView("memories")}
                />
                {completed.length ? (
                  <MeetingCard
                    meeting={completed[0]}
                    data={data}
                    onClick={() =>
                      setEditor({ type: "meeting", id: completed[0].id })
                    }
                    nameOf={nameOf}
                  />
                ) : (
                  <Empty
                    icon={<BookOpen size={30} strokeWidth={1} />}
                    title="故事，等你们亲手写下"
                    text="将一次见面标记为“已经见面”，它就会留在回忆手记里。"
                    action="记录第一段回忆"
                    onClick={() => setEditor({ type: "meeting" })}
                  />
                )}
              </section>
              {(completed.length > 0 || data.wishes.length > 0) && (
                <div className="real-stats">
                  {completed.length > 0 && (
                    <span>
                      已收藏 <b>{completed.length}</b> 次见面
                    </span>
                  )}
                  {data.wishes.some((w) => w.completed_at) && (
                    <span>
                      已共同完成{" "}
                      <b>{data.wishes.filter((w) => w.completed_at).length}</b>{" "}
                      件事
                    </span>
                  )}
                  <span>每一页，都来自你们真实的记录。</span>
                </div>
              )}
            </>
          )}
          {view === "calendar" && (
            <CalendarView
              data={data}
              onEdit={(m) => setEditor({ type: "meeting", id: m.id })}
              onNew={(date) => setEditor({ type: "meeting", date })}
              nameOf={nameOf}
            />
          )}
          {view === "memories" && (
            <MemoriesView
              data={data}
              onEdit={(m) => setEditor({ type: "meeting", id: m.id })}
              onPhoto={setLightbox}
              nameOf={nameOf}
            />
          )}
          {view === "wishes" && (
            <WishesView
              data={data}
              busy={!!busy}
              onNew={() => setEditor({ type: "wish" })}
              onEdit={(w) => setEditor({ type: "wish", id: w.id })}
              onToggle={(w) => void toggleWish(w)}
            />
          )}
          <footer className="content-footer">
            <span>我们的日子，不用赶路。</span>
            <small>数据存于你配置的 Supabase · 按上海时间显示</small>
          </footer>
        </main>
      </div>
      {editor?.type === "meeting" && (
        <MeetingEditor
          key={editor.id || editor.date || "new"}
          meeting={activeMeeting}
          date={editor.date}
          data={data}
          onClose={() => setEditor(null)}
          refresh={refresh}
          notify={setToast}
          onSaved={(id) => setEditor({ type: "meeting", id })}
        />
      )}
      {editor?.type === "wish" && (
        <WishEditor
          wish={data.wishes.find((w) => w.id === editor.id)}
          onClose={() => setEditor(null)}
          refresh={refresh}
          notify={setToast}
        />
      )}
      {editor?.type === "settings" && (
        <SettingsEditor
          data={data}
          onClose={() => setEditor(null)}
          refresh={refresh}
          notify={setToast}
        />
      )}
      {invite && (
        <Modal title="一个位置，留给对方" onClose={() => setInvite(null)}>
          <p className="muted">
            请私下把链接发给对方。对方登录后可接受邀请。生成新链接会撤销旧的未使用邀请。
          </p>
          <label className="block mt-5">
            一次性邀请链接
            <input
              readOnly
              value={invite.url}
              onFocus={(e) => e.target.select()}
            />
          </label>
          <p className="hint mt-3">
            有效期至 {displayTime(invite.expires_at)}（上海时间）· 仅一次有效
          </p>
          <p className="notice mt-4">
            本地地址只能在当前电脑访问。另一位可在本机的另一个浏览器登录测试；远程使用需要你之后自行部署或配置受控网络。
          </p>
          <button
            className="button primary mt-5"
            onClick={() =>
              void navigator.clipboard
                .writeText(invite.url)
                .then(() => setToast("邀请链接已复制"))
                .catch(() => setToast("复制失败，请手动选中链接复制"))
            }
          >
            <Copy size={15} />
            复制链接
          </button>
        </Modal>
      )}
      {lightbox && (
        <Modal title="这一天的画面" wide onClose={() => setLightbox(null)}>
          {data.photos.find((p) => p.id === lightbox.id)?.url ? (
            <img
              className="lightbox-image"
              src={data.photos.find((p) => p.id === lightbox.id)!.url!}
              alt={lightbox.original_name || "见面照片"}
            />
          ) : (
            <p>照片链接已过期，请关闭后刷新。</p>
          )}
          <p className="hint mt-3">照片为短期授权访问，不生成永久公开地址。</p>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
        </div>
      )}
    </div>
  );
}
function Brand() {
  return (
    <div className="brand">
      <BookOpen size={27} strokeWidth={1.1} />
      <span>
        我们的小日子<small>OUR LITTLE DAYS</small>
      </span>
    </div>
  );
}
function Avatar({ profile }: { profile: Bootstrap["profile"] }) {
  return profile.avatar_url ? (
    <img className="avatar" src={profile.avatar_url} alt="我的头像" />
  ) : (
    <span className="avatar avatar-empty">
      {profile.nickname?.slice(0, 1) || "我"}
    </span>
  );
}
function SectionTitle({
  number,
  title,
  action,
  onAction,
}: {
  number: string;
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="section-title">
      <h2>
        <small>{number}</small>
        {title}
      </h2>
      {action && (
        <button className="text-link" onClick={onAction}>
          {action}
          <ArrowUpRight size={13} />
        </button>
      )}
    </div>
  );
}
function Empty({
  icon,
  title,
  text,
  action,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  action?: string;
  onClick?: () => void;
}) {
  return (
    <div className="empty">
      {icon}
      <h3>{title}</h3>
      <p>{text}</p>
      {action && (
        <button className="text-link" onClick={onClick}>
          {action}
          <ArrowUpRight size={14} />
        </button>
      )}
    </div>
  );
}
function MeetingCard({
  meeting: m,
  data,
  onClick,
  nameOf,
}: {
  meeting: Meeting;
  data: Bootstrap;
  onClick: () => void;
  nameOf: (id: string) => string;
}) {
  const photo = data.photos.find(
    (p) => p.meeting_id === m.id && p.status === "ready",
  );
  return (
    <button className="meeting-card" onClick={onClick}>
      <div className="meeting-date">
        <b>{m.date.slice(8)}</b>
        <small>{m.date.slice(0, 7).replace("-", " / ")}</small>
      </div>
      <div className="meeting-summary">
        <div className="flex gap-2 items-center">
          <span className={"tag " + (m.status === "planned" ? "blue" : "")}>
            {m.status === "planned" ? "计划见面" : "已经见面"}
          </span>
        </div>
        <h3>{m.title}</h3>
        {m.location && (
          <p>
            <MapPin size={12} />
            {m.location}
          </p>
        )}
        <div className="activity-options">
          {m.meeting_activities.slice(0, 5).map((a) => (
            <span className="chip" key={a.id}>
              {a.title}
            </span>
          ))}
        </div>
        <small className="muted">
          {nameOf(m.created_by)}记录 · {displayTime(m.updated_at)}更新
        </small>
      </div>
      {photo?.url && (
        <img
          src={photo.url}
          alt={m.title + "的照片"}
          className="meeting-thumb"
        />
      )}
      <ArrowUpRight className="meeting-arrow" size={17} />
    </button>
  );
}
function WishRow({
  wish: w,
  onToggle,
  onEdit,
  disabled,
}: {
  wish: Wish;
  onToggle: () => void;
  onEdit: () => void;
  disabled: boolean;
}) {
  return (
    <div className={"wish-row " + (w.completed_at ? "done" : "")}>
      <button
        className="wish-check"
        role="checkbox"
        aria-checked={!!w.completed_at}
        aria-label={(w.completed_at ? "恢复待完成：" : "完成事项：") + w.title}
        onClick={onToggle}
        disabled={disabled}
      >
        {w.completed_at && <Check size={14} />}
      </button>
      <button className="wish-content" onClick={onEdit}>
        <h3>{w.title}</h3>
        <small>
          {categories[w.category]}
          {w.planned_date ? " · " + displayDate(w.planned_date) : ""}
        </small>
        {w.description && <p>{w.description}</p>}
        {w.completed_at && <small>完成于 {displayTime(w.completed_at)}</small>}
      </button>
      <button
        className="icon-button"
        aria-label={"编辑事项 " + w.title}
        onClick={onEdit}
      >
        <ArrowUpRight size={15} />
      </button>
    </div>
  );
}
function CalendarView({
  data,
  onEdit,
  onNew,
  nameOf,
}: {
  data: Bootstrap;
  onEdit: (m: Meeting) => void;
  onNew: (date: string) => void;
  nameOf: (id: string) => string;
}) {
  const [month, setMonth] = useState(shanghaiToday().slice(0, 7)),
    [selected, setSelected] = useState(shanghaiToday());
  const records = data.meetings.filter((m) => m.date === selected);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">DAYS TO LOOK FORWARD TO</p>
          <h1>见面日历</h1>
          <p>把期待放进日历，把发生的事慢慢留下。</p>
        </div>
        <button className="button primary" onClick={() => onNew(selected)}>
          <Plus size={16} />
          记录见面
        </button>
      </div>
      <div className="calendar-layout">
        <section className="calendar-paper">
          <div className="calendar-controls">
            <h2>
              {month.slice(0, 4)} 年 <b>{Number(month.slice(5))}</b> 月
            </h2>
            <div className="flex gap-2">
              <button
                className="text-link"
                onClick={() => {
                  setMonth(shanghaiToday().slice(0, 7));
                  setSelected(shanghaiToday());
                }}
              >
                今天
              </button>
              <button
                className="icon-button"
                aria-label="上个月"
                disabled={month <= "1900-01"}
                onClick={() => {
                  const m = shiftMonth(month, -1);
                  setMonth(m);
                  setSelected(m + "-01");
                }}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                className="icon-button"
                aria-label="下个月"
                disabled={month >= "2199-12"}
                onClick={() => {
                  const m = shiftMonth(month, 1);
                  setMonth(m);
                  setSelected(m + "-01");
                }}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          <div className="calendar-week">
            {"一二三四五六日".split("").map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {monthGrid(month).map((date, i) =>
              date ? (
                <button
                  key={date}
                  aria-label={
                    date +
                    (data.meetings.some((m) => m.date === date)
                      ? " 有见面记录"
                      : "")
                  }
                  aria-pressed={selected === date}
                  className={
                    (date === selected ? "selected " : "") +
                    (date === shanghaiToday() ? "today" : "")
                  }
                  onClick={() => setSelected(date)}
                >
                  <span>{Number(date.slice(8))}</span>
                  <div className="dots">
                    {data.meetings.some(
                      (m) => m.date === date && m.status === "planned",
                    ) && <i className="planned" />}
                    {data.meetings.some(
                      (m) => m.date === date && m.status === "completed",
                    ) && <i className="completed" />}
                  </div>
                </button>
              ) : (
                <span key={"blank" + i} />
              ),
            )}
          </div>
          <div className="calendar-legend">
            <span>
              <i className="planned" />
              计划见面
            </span>
            <span>
              <i className="completed" />
              已经见面
            </span>
          </div>
        </section>
        <section className="day-detail">
          <span className="eyebrow">A PAGE FOR THIS DAY</span>
          <h2>{displayDate(selected)}</h2>
          {records.length ? (
            records.map((m) => (
              <MeetingCard
                key={m.id}
                meeting={m}
                data={data}
                onClick={() => onEdit(m)}
                nameOf={nameOf}
              />
            ))
          ) : (
            <Empty
              icon={<CalendarDays size={27} strokeWidth={1} />}
              title="这一天，还是空白"
              text="可以安排见面，也可以补记一段已经发生的日常。"
            />
          )}
          <button
            className="button secondary mt-5 w-full"
            onClick={() => onNew(selected)}
          >
            <Plus size={15} />
            为这一天添加记录
          </button>
        </section>
      </div>
    </>
  );
}
function MemoriesView({
  data,
  onEdit,
  onPhoto,
  nameOf,
}: {
  data: Bootstrap;
  onEdit: (m: Meeting) => void;
  onPhoto: (p: Photo) => void;
  nameOf: (id: string) => string;
}) {
  const [month, setMonth] = useState("");
  const meetings = data.meetings.filter(
    (m) => m.status === "completed" && (!month || m.date.startsWith(month)),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">THE MOMENTS WE KEEP</p>
          <h1>回忆手记</h1>
          <p>只收藏你们确认已经发生的见面，按日期倒序排列。</p>
        </div>
        <label className="month-filter">
          按月份筛选
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
          {month && (
            <button className="text-link" onClick={() => setMonth("")}>
              清除筛选
            </button>
          )}
        </label>
      </div>
      {meetings.length ? (
        <div className="timeline">
          {meetings.map((m) => (
            <article key={m.id} className="timeline-entry">
              <div className="timeline-label">
                <span>{displayDate(m.date)}</span>
                <i />
              </div>
              <div className="timeline-body">
                <span className="eyebrow">{nameOf(m.created_by)}记录</span>
                <button className="timeline-title" onClick={() => onEdit(m)}>
                  <h2>{m.title}</h2>
                  <ArrowUpRight size={18} />
                </button>
                {m.location && (
                  <p className="location">
                    <MapPin size={14} />
                    {m.location}
                  </p>
                )}
                <div className="activity-options mt-3">
                  {m.meeting_activities
                    .slice()
                    .sort((a, b) => a.position - b.position)
                    .map((a) => (
                      <span className="chip" key={a.id}>
                        {a.title}
                      </span>
                    ))}
                </div>
                {m.notes && <p className="memory-notes">{m.notes}</p>}
                <div className="memory-photos">
                  {data.photos
                    .filter(
                      (p) => p.meeting_id === m.id && p.status === "ready",
                    )
                    .map((p) => (
                      <button
                        key={p.id}
                        onClick={() => onPhoto(p)}
                        aria-label={"放大照片 " + (p.original_name || m.title)}
                      >
                        {p.url ? (
                          <img src={p.url} alt={p.original_name || m.title} />
                        ) : (
                          <span>
                            <Camera size={25} />
                            照片暂时无法加载
                          </span>
                        )}
                      </button>
                    ))}
                </div>
                <p className="hint mt-5">
                  由 {nameOf(m.updated_by)} 于 {displayTime(m.updated_at)} 更新
                </p>
                <button className="text-link mt-3" onClick={() => onEdit(m)}>
                  查看与编辑这一天 <ArrowUpRight size={14} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          icon={<BookOpen size={40} strokeWidth={1} />}
          title={month ? "这个月，还没有留下回忆" : "第一页，等你们亲手写下"}
          text="在见面日历中添加记录，并将状态设为“已经见面”，就会出现在这里。"
        />
      )}
    </>
  );
}
function WishesView({
  data,
  busy,
  onNew,
  onEdit,
  onToggle,
}: {
  data: Bootstrap;
  busy: boolean;
  onNew: () => void;
  onEdit: (w: Wish) => void;
  onToggle: (w: Wish) => void;
}) {
  const [filter, setFilter] = useState<"pending" | "completed" | "all">(
      "pending",
    ),
    [category, setCategory] = useState("all");
  const wishes = data.wishes.filter(
    (w) =>
      (filter === "all" ||
        (filter === "completed" ? !!w.completed_at : !w.completed_at)) &&
      (category === "all" || w.category === category),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">SOMEDAY, TOGETHER</p>
          <h1>共同的小小期待</h1>
          <p>没有排名，没有催促。想起来，就一起完成。</p>
        </div>
        <button className="button primary" onClick={onNew}>
          <Plus size={16} />
          添加事项
        </button>
      </div>
      <div className="list-filters">
        <div className="segmented">
          {(
            [
              ["pending", "待完成"],
              ["completed", "已完成"],
              ["all", "全部"],
            ] as const
          ).map(([k, v]) => (
            <button
              key={k}
              aria-pressed={filter === k}
              onClick={() => setFilter(k)}
            >
              {v}
            </button>
          ))}
        </div>
        <label className="category-filter">
          <span className="sr-only">按分类筛选</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">所有分类</option>
            {Object.entries(categories).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="wish-paper">
        {wishes.length ? (
          wishes.map((w) => (
            <WishRow
              key={w.id}
              wish={w}
              disabled={busy}
              onEdit={() => onEdit(w)}
              onToggle={() => onToggle(w)}
            />
          ))
        ) : (
          <Empty
            icon={<Clock size={35} strokeWidth={1} />}
            title="清单还空着，也没关系"
            text="想去的地方、想做的事、日常安排，都可以从一件小事开始。"
            action="写下第一件事"
            onClick={onNew}
          />
        )}
      </div>
    </>
  );
}
