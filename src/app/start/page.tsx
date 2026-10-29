import type { Metadata } from "next";
import { ArrowUpRight, BookOpen, Sparkles } from "lucide-react";
import { EntryLink } from "@/components/heart-fair/entry-link";

export const metadata: Metadata = {
  title: "选择入口 · 我们的小空间",
  robots: { index: false, follow: false },
};

const entries = [
  { href: "/heart-fair", title: "冰雪的心动游园会", text: "翻开这本手绘纪念册，一站一站，走近我的心意。", note: "直接进入", icon: Sparkles, color: "bg-[#efedff] text-[#234bab]" },
  { href: "/", title: "我们的小日子", text: "收藏见面、照片和回忆，安排下一次一起做的事。", note: "登录后进入双人空间", icon: BookOpen, color: "bg-[#edf0e7] text-[#596b53]" },
];

export default function StartPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#f5f2fc] px-5 py-12 text-[#41465c]">
      <div className="w-full max-w-2xl">
        <p className="mb-3 text-sm tracking-[0.25em] text-[#88809f]">松松 × 冰雪</p>
        <h1 className="text-3xl sm:text-4xl">今天，想打开哪一页？</h1>
        <p className="mt-3 text-base text-[#858095]">两个入口，收藏不同的小心意。</p>
        <nav aria-label="选择页面" className="mt-8 grid gap-5 sm:grid-cols-2">
          {entries.map(({ href, title, text, note, icon: Icon, color }) => (
            <EntryLink key={href} href={href} prime={href === "/heart-fair"} className="group rounded-3xl border border-white bg-white/85 p-6 shadow-sm outline-offset-4 focus-visible:outline-2 focus-visible:outline-[#5976bb]">
              <span className={`mb-6 inline-flex rounded-2xl p-3 ${color}`}><Icon size={26} aria-hidden="true" /></span>
              <h2 className="text-xl">{title}</h2>
              <p className="mt-3 text-base leading-7 text-[#807c8b]">{text}</p>
              <span className="mt-7 flex items-center justify-between text-sm text-[#546ca0]">{note}<ArrowUpRight size={20} aria-hidden="true" /></span>
            </EntryLink>
          ))}
        </nav>
      </div>
    </main>
  );
}
