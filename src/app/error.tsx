"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="invite-page">
      <h1>这一页暂时没有打开</h1>
      <p>请检查网络和 Supabase 配置，然后重试。</p>
      <button className="button primary mt-6" onClick={reset}>
        重新加载
      </button>
    </main>
  );
}
