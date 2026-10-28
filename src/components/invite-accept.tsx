"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MailOpen, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
export function InviteAccept({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function accept() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api("invitations/accept", "POST", { token });
      router.replace("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "加入失败");
      setBusy(false);
    }
  }
  return (
    <main className="invite-page">
      <MailOpen size={54} strokeWidth={1} />
      <p className="eyebrow mt-6">A PLACE FOR US</p>
      <h1>一起，写下小日子</h1>
      <p className="muted">
        接受邀请后，你们可以共同查看与编辑同一个空间。
        <br />
        邀请在生成后 48 小时内有效，仅可使用一次。
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button className="button primary mt-6" onClick={accept} disabled={busy}>
        {busy ? "正在加入…" : "接受邀请，加入空间"}
        <ArrowRight size={16} />
      </button>
      <Link className="text-link mt-4" href="/">
        返回首页
      </Link>
    </main>
  );
}
