# GitLab → 服务器部署

这份配置尚未执行远程部署。代码放 GitLab 并不等于网站已上线，GitLab Pages 不适合本项目所需的 Route Handlers 和 SSR Auth。这里用 GitLab 测试/构建镜像，服务器运行 Next.js，Caddy 在宿主机负责 HTTPS 反向代理。业务数据继续放现有 Supabase，无需复制数据库或开放管理密钥。

## 前提

- 你有权使用的 Linux 服务器，已安装 Docker Engine 和 Docker Compose v2。
- 准备一个域名，将 A/AAAA 记录指向服务器；仅设置实际可用的 IPv4/IPv6 地址。
- 宿主机 Caddy 已安装，80/443 端口可达。SSH 按你既有的密钥配置使用，不向聊天或仓库粘贴私钥。
- Supabase 已执行两份 migration。用户仍必须登录并属于这个双人空间才能读私人数据；公网访问的是登录入口。

## 1. GitLab 构建

项目根目录已有 `.gitlab-ci.yml`，不需要运行 `create-next-app`。若 GitLab 仓库根就是当前 DL 目录，直接使用；若它位于其他仓库的 `DL/` 子目录，需要相应调整 job 工作目录与 Docker build context，不能直接把文件放错层级。

在 GitLab CI/CD Variables 配置下面两项（Protected，保证保护分支上的 job 能读取）：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

这两项本来会下发给浏览器。**不要添加 service_role、数据库密码或 Supabase Secret key 作为构建参数。** Next.js 的 NEXT_PUBLIC 变量会编译进客户端，改项目或换 key 后必须重新构建，不能只改运行时环境。

Runner 需要支持 Docker-in-Docker，并由管理员配置 TLS `/certs/client` 共享卷与必要权限；只用专用、受信任的 Runner，不在未知共享 Runner 上开启 privileged。若现有 Runner 不支持，先由管理员采用官方受支持的镜像构建方式配置，不要关闭 TLS 或在应用里绕过。

推送后的 verify job 只检查代码。保护默认分支后，手动点击 `package_image`，它才会推送镜像到项目的私有 Container Registry。镜像 tag 为完整 commit SHA，页面或日志中的镜像地址可直接复制。该 job 不 SSH、不部署网站。

没有 GitLab Runner 时，也可在你自己的受控 Docker 机器构建：

```bash
# 从该项目目录执行；先按本地 .env.local 中的值在当前 shell 设置这两项公开配置。
# 不把实际 key 写进 Dockerfile 或 Git。
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
  -t registry.example.com/group/project:你的commitSHA .
# 用 GitLab Deploy Token / Personal Token 按官方步骤登录 Registry 后再 push。
```

## 2. 服务器启动

建议选一个新目录，例如 `/opt/our-little-days`，不要覆盖服务器已有项目。在服务器复制以下文件：

- 本目录 `compose.yml`
- 本目录 `.env.production.example`，另存为 `.env.production` 并填好现有 Supabase 的公开 URL / Publishable Key
- 将 `.env.production` 中 `APP_URL` 改为最终的 **HTTPS 域名**，不要带路径或末尾斜杠

把镜像地址单独保存到服务器这个目录的 `.env`（不能提交仓库）：

```dotenv
APP_IMAGE=registry.example.com/group/project:完整commitSHA
```

使用只读 `read_registry` Deploy Token 登录私有 Registry，密码通过 `docker login --password-stdin` 输入。随后在该目录执行：

```bash
docker compose -f compose.yml pull
docker compose -f compose.yml up -d --wait
docker compose -f compose.yml ps
docker compose -f compose.yml logs --tail=100 app
```

容器里的 Next.js 监听 0.0.0.0，但宿主机仅映射 `127.0.0.1:3000`，外部只能经 HTTPS 代理访问。没有绑定 Docker socket、没有数据磁盘公开挂载、没有生产管理密钥。照片上传最大 5MB，反向代理留 6MB body 限额。

## 3. HTTPS 和 Supabase Auth

修改 `Caddyfile` 中的域名，把站点块并入宿主机已有 Caddy 配置（不要覆盖别的站点）。按服务器安装方式验证并 reload Caddy。DNS 和 80/443 可达后，Caddy 自动申请/续期证书。若服务器已经使用 Nginx，由现有代理管理同一个 upstream 和 HTTPS，不要让 Caddy 再抢 80/443。

Supabase → Authentication → URL Configuration：

- Site URL：`https://你的域名`
- Redirect URLs：`https://你的域名/auth/callback**`
- 若使用 token_hash 邮件模板，再添加 `https://你的域名/auth/confirm**`
- 本地还要继续测试时，保留原来的 `http://127.0.0.1:3000/auth/callback**`。

使用 APP_URL 中的同一个域名访问；不要混用 IP、其他别名或未配置的 origin，否则状态更改会被来源校验拒绝。域名变更时要同步 APP_URL 与 Auth 回调配置。

## 4. 验收、更新和回滚

上线后逐项检查：HTTPS 正常；未登录 `/api/bootstrap` 返回 401；本人登录可读写；第二账号邀请可加入；第三账号不可查看空间和照片；上传/删除照片正常；邮箱确认链接回到正确域名。不要只看到登录页就宣称双人流程通过。

更新时为 `APP_IMAGE` 指定新 commit SHA，执行 `pull` 和 `up -d --wait`，通过上面的验收；保留旧 tag，回滚时改回旧值再启动。单实例更新可能有短暂中断，不承诺零停机。数据库结构变化先备份并按 migration 说明处理，回滚镜像不等于回滚数据库。

## 成本与当前状态

服务器、域名和超额流量/存储的费用由你选择的服务决定；此项目没有自动购买或开通任何付费服务。目前只准备配置，不会自动申请服务器、推送 GitLab、构建/推送镜像或部署。

官方参考：[Next.js 自托管](https://nextjs.org/docs/app/guides/self-hosting)、[Docker Next.js](https://docs.docker.com/guides/nextjs/)、[GitLab Container Registry 构建](https://docs.gitlab.com/user/packages/container_registry/build_and_push_images/)。

## Render（无需自己的服务器）

以 Native Node **Web Service** 部署：

| 设置 | 值 |
| --- | --- |
| Root Directory | 仓库中 `package.json` 所在目录；若就在根目录则留空 |
| Runtime | Node |
| Build Command | `npm ci --no-audit --no-fund && npm run build` |
| Start Command | `npm run start:render` |
| Node | 仓库 `.node-version` 固定 22.17.0；若 Render 设置过 `NODE_VERSION`，以环境变量为准，需保持一致 |

仓库 `.npmrc` 与锁文件都使用 `https://registry.npmjs.org/`，不依赖开发机器的公司镜像。`start:render` 将静态资源复制到 standalone 目录，并在 Render 分配的 `PORT`、`0.0.0.0` 地址启动；本地原 `npm start` 仍只监听回环地址。

在 Render 设置现有两个 `NEXT_PUBLIC_SUPABASE_*` 环境变量，以及 `APP_URL=https://实际服务名.onrender.com`。这两项公开 Supabase 配置在构建时也必须存在；不要添加管理密钥。同步更新 Supabase 的 Site URL 和 callback/confirm 白名单。确认使用正确分支、最新 commit，之后手动重新部署；镜像源修复后可用 **Clear build cache & deploy** 避免旧缓存干扰。

Free 服务有闲置休眠限制。若构建长期没有任何新日志，先排查依赖下载，不要通过升级付费实例掩盖镜像不可达。
