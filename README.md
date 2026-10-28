# 我们的小日子

两个人共同维护的私密生活记录。Next.js App Router + React + TypeScript + Tailwind CSS，Route Handlers 处理业务，Supabase Auth / PostgreSQL / 私有 Storage 持久化。没有 Prisma、Express、模拟持久化或 localStorage 业务数据。**目前只在本地开发，不自动部署、不自动购买任何服务。** 原版静态页面保留在 `dist/`，不属于新应用；新应用从 `src/app` 启动。

## 1. 本地安装和启动

要求 Node.js 22.17+（建议当前 Node 22 LTS）、npm。依赖准确版本在 `package-lock.json` 锁定；本次使用 npm stable Next.js 16.4.3、React 19.3.1、Tailwind 4.3.3、Supabase SSR 0.12.7 / JS 2.118.0、Zod 4.6.7。

```bash
npm ci
cp .env.example .env.local
npm run dev
```

打开 **http://127.0.0.1:3000**。服务默认只监听本机，不对局域网/公网开放。没有环境配置时显示真实配置提示，不会伪装保存成功；没有内置虚构经历或演示数据。停止后再次运行 `npm run dev` 即可。旧静态预览在 4173，与新版本不是同一个服务。

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

当前环境的 Turbopack 编译子进程无法绑定临时端口，因此 dev/build 脚本显式使用 Next.js 官方支持的 Webpack。构建无需真实 Supabase 密钥，无法据此证明外部服务已连接。访问 `127.0.0.1` 和 `localhost` 是不同 origin，会话不能通用；请统一使用 `.env.local` 的 `APP_URL`。数据将通过网络存入你配置的 Supabase，应用本身本地运行不等于数据库离线。

## 2. 创建 Supabase 项目及环境变量

在 Supabase 控制台选择自己的项目，手动确认所选套餐、区域与配额。此仓库不会开通或付费。生产流量、照片存储和邮件可能超过免费配额，请以控制台当时显示为准。

复制 `.env.example`，填写：

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://项目编号.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=控制台提供的publishable-key
APP_URL=http://127.0.0.1:3000
```

Publishable Key 可以出现在浏览器；真正权限由登录 JWT 和 RLS 控制。本应用普通请求全部使用当前用户身份，不需要生产 service_role / secret 管理密钥。不要把管理密钥写入任何 `NEXT_PUBLIC_*`、源代码、截图或提交。真实 `.env.local` 和 `.env.test` 均被忽略。修改环境变量后重启服务。

## 3. 执行数据库迁移

**选项 A：SQL Editor**（不需要本机 PostgreSQL）：按顺序逐个执行：

1. `supabase/migrations/202610280001_initial.sql`
2. `supabase/migrations/202610280002_settings.sql`

每个文件使用事务，任一步失败会回滚该文件。它们是一次性版本迁移，不要反复执行已成功的文件；之后新增迁移，不修改已运行历史。

**选项 B：Supabase CLI**（你自行安装官方 CLI 后）：

```bash
supabase login
supabase init
supabase link --project-ref 你的项目编号
supabase db push
```

执行后检查表、函数和 RLS 是否都存在。请使用新的专用项目或先完整备份现有项目；迁移不会关闭 RLS。所有业务表启用 RLS，匿名没有表权限；空间成员关系只能通过受控事务函数建立。profiles 仅本人/同空间成员可读，邮箱不会复制到共享 profiles。邀请表没有 authenticated/anon SELECT 权限，数据库只存 256 位随机令牌的 SHA-256 摘要。API 不接受客户端 user_id 或 space_id。

## 4. Auth 配置

Supabase → Authentication：开启 Email provider，推荐保持 **Confirm email** 开启。把 Site URL 设为 `http://127.0.0.1:3000`；在 Redirect URLs 添加：

- `http://127.0.0.1:3000/auth/callback`
- `http://127.0.0.1:3000/auth/callback**`（允许保存邀请 next 参数；限制到这个本地 origin）
- `http://127.0.0.1:3000/auth/confirm**`（如使用下面的 token_hash 邮件模板）

默认注册流程使用官方 SSR PKCE：邮件跳转到 `/auth/callback`，交换 code 并写入 Cookie。通常应在发起注册的同一浏览器完成确认。需要跨浏览器确认时，参考 Supabase 官方 SSR 邮件模板，将 Confirm signup 的链接设置为：

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email"
  >确认邮箱</a
>
```

`/auth/confirm` 只处理 email 类型的 token_hash，不回显令牌。此模板确认后回首页；如在邀请过程中注册，可再打开邀请链接。邮件发送受 Supabase Auth 速率/SMTP 限制，正式双人使用前配置自己的 SMTP。已有账号请直接登录，注册不会暴露邮箱是否存在。退出使用官方 Auth signOut。Proxy 刷新 Cookie，会话保护页面和 API，服务端用 `getUser()` 验证身份，不信任 `getSession()`。

## 5. Storage 配置与照片生命周期

迁移自动建立 **`couple-private` 私有 bucket**（5MB，对象 MIME 限 image/webp），安装基于当前成员关系与照片元数据的 Storage RLS。不要改为 Public，不需要手动开放匿名策略。对象路径：

- 见面照片：`space_uuid/meeting_uuid/photo_uuid.webp`
- 个人头像：`avatars/user_uuid/avatar.webp`，固定路径替换，不不断产生孤儿头像。

客户端允许 JPG / PNG / WebP 原图最多 20MB；压缩到最长边 2000px、WebP，压缩后最多 5MB；头像最长边 512px。服务端限制真实 body 大小、允许 MIME、解码验证（最多 4000 万像素）并重新编码去掉 EXIF。每次见面最多 10 张，在数据库锁住 meeting 行后计算并预留名额，未完成上传也占位。可预览、查看进度、失败重试或删除占位。服务端重新编码阶段进度显示为“验证与保存”，不提前报成功。

业务请求走 Route Handler，照片通过带 Cookie 的限流尺寸 PUT 上传，不把数据库管理密钥给浏览器。数据库保存路径/元数据，不保存公开 URL；查看时生成 120 秒签名链接，界面可见时每 60 秒刷新共享数据和签名，手动刷新也可恢复过期链接。签名 URL 在有效期内是 bearer capability，不应转发；删除后已有签名也可能在短期内受缓存影响，不能承诺瞬时撤销。

删除见面使用软删除，并把关联照片标记为 `deleting`，**立即在 RLS/视图中隐藏私人记录**；随后调用 Storage 删除。删除失败或进程中断时保留路径和错误状态，首页提供“重试清理”，`POST /api/cleanup` 也可由已登录成员调用。清理成功仍保留照片墓碑元数据及软删除会议，以便重复清理、处理极端情况下的在途上传。没有悄悄丢弃清理失败任务。照片和数据库不是分布式原子事务：服务崩溃时必须重试，不承诺无网络条件下立即删除原文件。定期在设置导出备份，必要时手动调用清理接口；此版本不自动运行付费 cron。墓碑物理回收应在人工确认 Storage 为空、无在途上传并完成备份后维护，不直接删除 metadata 掩盖存储残留。

## 6. 两个人加入同一空间

1. 第一个人注册、确认邮箱并登录，创建空间。
2. 首页点击“邀请对方”；生成 48 小时有效、仅可使用一次的链接，私下传给第二个人。新邀请撤销旧的未使用邀请；第二个人必须登录后接受。
3. 每个空间最多两人，每个账号仅一个空间。使用空间行锁、每账号事务 advisory lock、user_id 唯一约束、成员容量触发器，避免并发超员。不能直接向成员表插入绕过。
4. 在日历点选日期，新增见面，保存后上传照片；另一个人刷新即可查看与编辑。共享视图前台每分钟刷新，也有手动刷新按钮；本版不是即时 websocket 协同，冲突编辑遵循后保存覆盖先保存，并展示创建者和最后更新者/时间。
5. 计划记录不会自动变成完成，只有明确选“已经见面”才出现在回忆。一天可有多次见面，活动可多选或自定义；事项可完成和恢复。

**本地跨账号验证**：邀请链接的 127.0.0.1 只指向当前电脑。第二账号请在同一电脑的另一个浏览器/隐私窗口登录。远程的第二个人不能通过你的 loopback 链接访问；需要之后由你明确决定部署或配置受控网络，此次不做公网发布。

## 7. 日期约定

见面日期、相识日期、恋爱纪念日均为 PostgreSQL `date`，API 使用原样 `YYYY-MM-DD`，不把它们转换为本地时区的 timestamp。`created_at / updated_at / completed_at` 为 `timestamptz`，界面统一 `Asia/Shanghai`。恋爱纪念日当天计第 1 天，即「上海今天自然日 − 纪念日自然日 + 1」，未设或未来纪念日不显示累计天数。是否完成见面始终由状态决定，不从日期推断。

## 8. 测试与尚需真实环境验证的边界

`npm test` 包含参数/日期/接口身份边界、上传内容验证，以及本地 PGlite（真实 PostgreSQL WASM 引擎）上的两份 migration、RLS、邀请一次性、成员上限、双人读写和第三方隔离。PGlite 测试提供 `auth.uid()` 与 Storage 元数据表的最小夹具，只省去 Supabase 提供的 pgcrypto extension 安装（UUID 使用 PostgreSQL 内建函数）。它能验证 SQL，但不能替代真实 Auth/Cookie、Storage HTTP 行为或跨连接并发测试。

真实 Supabase 集成测试（需要**专用测试项目**，绝不把生产管理密钥放入客户端）：

```bash
cp .env.test.example .env.test
# 填好测试 URL、anon/publishable key、仅限测试的 service_role key
# 若是专用远程测试项目，额外写 TEST_ALLOW_REMOTE=true
npm run test:db
```

脚本自动创建并清理三个测试账号/空间：并发争抢同一个邀请只能有一个成功、满员/重复使用拒绝、双方新增/编辑可见、第三人/匿名不能读照片与记录，测试私有 Storage 鉴权下载和短期签名。只删除脚本创建的 ID。它调用真实 Supabase，不是模拟接口；无上述配置时不能运行。浏览器端邮箱确认、SSR Cookie 的双浏览器体验与实际上传进度仍需在配置后的应用中手动验收：A 新增，B 编辑，A 刷新，C 访问失败；退出后打开 `/api/bootstrap` 应为 401。

## 9. 备份和恢复

设置 → “导出共享文字 JSON”导出空间设置、成员必要资料、见面/活动/事项、照片路径及元数据，**不含照片原文件、不含邀请令牌和账号密码**。此 JSON 是便携查看备份，不是自动恢复工具；没有在生产上直接覆盖整个空间的导入按钮。

- 数据库：使用 Supabase 官方数据库备份或 CLI `supabase db dump --linked --data-only -f data.sql`，另保存 schema migration。Auth 用户、Storage 对象和数据库备份是不同部分，按 Supabase 官方恢复流程处理，不假设 JSON 包含 Auth 用户或权限。
- 照片/头像：在控制台 Storage 的私有 bucket 单独下载对象原文件，保留完整目录路径；或在受控本机用官方 Storage API 分页列举并鉴权下载，管理凭据仅留本机环境。
- 恢复：先恢复 schema、必要用户和成员关系，再导入业务记录，最后按原路径恢复私有对象并验证 RLS。先在独立测试项目演练，不关闭 RLS 恢复。

## 10. 后续部署（仅说明，不会自动执行）

若你之后决定部署，运行 Node.js 22 的 Next.js 服务，配置同样的三个环境变量，`APP_URL` 改为最终 HTTPS origin，并在 Auth 控制台登记确切的 HTTPS callback/confirm 地址。生产上传请求要允许 ≤5MB；某些托管平台有更低 body 上限，应调整压缩阈值/迁移到授权直传后再选择该平台。不要缓存带 Cookie 的页面/API，不把 `.env.local` 打进镜像。RLS 和 private bucket 始终保留，不用隐藏页面或搜索引擎 noindex 当访问保护。本地有 `.openai/hosting.json` 是旧静态站点遗留，本版本没有同步或发布到 Sites。

官方接入依据：[Next.js 安装](https://nextjs.org/docs/app/getting-started/installation)、[Supabase Next.js SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs)、[Supabase Storage](https://supabase.com/docs/guides/storage/security/access-control)。

## 本次本地验证记录（2026-10-28）

- `npm run typecheck`：通过。
- `npm run lint`：通过，无错误或警告。
- `npm test`：5 个测试文件、27 项测试全部通过，包含本地 PostgreSQL / RLS 测试。
- `npm run build`：通过，使用 Webpack。
- 本地 HTTP：未配置 Supabase 的首页返回 200，`/api/bootstrap` 返回 503 和明确配置说明，未伪装数据读写成功。
- 手机宽度浏览器：配置指引页面正常显示。
- 未执行：真实 Supabase 的邮箱确认 / SSR Cookie / 双浏览器协同 / 跨连接并发 / 云端 Storage HTTP 权限验收，原因是尚未提供外部项目配置。已提供可选择运行的专用测试脚本及手动步骤。
