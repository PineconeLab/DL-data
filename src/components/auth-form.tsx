"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen } from "lucide-react";
import { browserClient } from "@/lib/supabase/client";
import { authInput } from "@/lib/validations";
export function AuthForm({
  next = "/",
  callbackError = false,
}: {
  next?: string;
  callbackError?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login"),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(
      callbackError ? "确认链接无效或已过期，请重新登录或注册确认。" : "",
    ),
    [success, setSuccess] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    setSuccess(false);
    try {
      const form = new FormData(e.currentTarget),
        input = authInput.safeParse({
          email: form.get("email"),
          password: form.get("password"),
        });
      if (!input.success) throw new Error(input.error.issues[0].message);
      const db = browserClient();
      if (mode === "signup") {
        const { data, error } = await db.auth.signUp({
          ...input.data,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        if (error)
          throw new Error("注册暂未完成，请检查邮箱、密码要求或稍后再试。");
        if (!data.session) {
          setSuccess(true);
          setMessage(
            "如果此邮箱可以注册，确认邮件已发送。请查看收件箱并完成确认；已有账号请直接登录。",
          );
          return;
        }
      } else {
        const { error } = await db.auth.signInWithPassword(input.data);
        if (error)
          throw new Error("登录失败，请检查邮箱、密码及邮箱确认状态。");
      }
      router.replace(next);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败，请重试");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="welcome">
      <div className="welcome-art">
        <Link href="/" className="eyebrow">
          OUR LITTLE DAYS
        </Link>
        <h1>
          我们的小日子
          <span>
            把平凡的日常，
            <br />
            留在彼此身旁。
          </span>
        </h1>
        <p>
          一个属于两个人的小空间。
          <br />
          收藏见面，记录回忆，也慢慢实现愿望。
        </p>
        <div className="still-life">
          <BookOpen size={110} strokeWidth={0.7} />
          <span>没有预设的故事，只写你们的生活。</span>
        </div>
      </div>
      <div className="welcome-form">
        <span className="eyebrow">WELCOME HOME</span>
        <h2>{mode === "login" ? "欢迎回来" : "从第一天开始记录"}</h2>
        <p className="muted">
          {next.startsWith("/invite/")
            ? "登录后即可接受对方的空间邀请。"
            : "登录后，才能打开你们的私人记录。"}
        </p>
        <div className="segmented mt-7">
          <button
            type="button"
            aria-pressed={mode === "login"}
            onClick={() => {
              setMode("login");
              setMessage("");
            }}
          >
            登录
          </button>
          <button
            type="button"
            aria-pressed={mode === "signup"}
            onClick={() => {
              setMode("signup");
              setMessage("");
            }}
          >
            注册账号
          </button>
        </div>
        <form onSubmit={submit} className="form-stack">
          <label>
            邮箱
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="你的邮箱"
              maxLength={254}
            />
          </label>
          <label>
            密码
            <input
              name="password"
              type="password"
              minLength={8}
              maxLength={128}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              required
              placeholder="至少 8 位"
            />
          </label>
          {message && (
            <p
              role={success ? "status" : "alert"}
              className={success ? "notice" : "error"}
            >
              {message}
            </p>
          )}
          <button className="button primary" disabled={busy}>
            {busy
              ? "正在处理…"
              : mode === "login"
                ? "登录，回到小日子"
                : "创建账号"}
            <ArrowRight size={16} />
          </button>
        </form>
        <p className="hint mt-6">
          邮箱仅用于登录，不会展示给其他空间。每个账号只能加入一个双人空间。
        </p>
      </div>
    </main>
  );
}
