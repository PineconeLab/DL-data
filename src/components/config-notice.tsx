import { BookOpen, ArrowUpRight, Leaf } from "lucide-react";
export function ConfigNotice() {
  return (
    <main className="welcome">
      <div className="welcome-art">
        <span className="eyebrow">A LITTLE SPACE FOR TWO</span>
        <h1>
          我们的小日子
          <span>
            等你们，
            <br />
            从这里开始。
          </span>
        </h1>
        <p>
          见面、散步、一个想去的地方。
          <br />
          让日子有迹可循，也让期待有所安放。
        </p>
        <div className="still-life">
          <BookOpen size={100} strokeWidth={0.7} />
          <Leaf size={55} strokeWidth={0.8} />
          <span>未写下的每一天，都留给真实的你们。</span>
        </div>
      </div>
      <div className="welcome-form">
        <span className="tag">本地开发 · 尚未连接数据</span>
        <h2>先为小日子安一个家</h2>
        <p className="muted">
          页面已就绪。连接你自己的 Supabase
          后，就能注册账号、邀请对方并共同记录。
        </p>
        <ol className="setup-list">
          <li>
            <b>01</b>
            <span>
              复制 <code>.env.example</code> 为 <code>.env.local</code>
              ，填写项目 URL 和 Publishable Key。
            </span>
          </li>
          <li>
            <b>02</b>
            <span>
              在 Supabase 执行 <code>supabase/migrations</code> 中的 SQL 文件。
            </span>
          </li>
          <li>
            <b>03</b>
            <span>
              设置 Auth 回调地址，重启本地服务，然后注册两个人的账号。
            </span>
          </li>
        </ol>
        <p className="notice">
          现在没有连接真实数据库，也没有保存任何内容。此页面没有演示数据。
        </p>
        <a
          className="button secondary"
          href="https://supabase.com/dashboard"
          target="_blank"
          rel="noreferrer"
        >
          打开 Supabase 控制台 <ArrowUpRight size={16} />
        </a>
        <small className="muted block mt-6">
          完整步骤见项目 README · 仅本地运行，不自动发布
        </small>
      </div>
    </main>
  );
}
