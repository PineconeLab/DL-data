# 冰雪的心动游园会

独立路由 `/heart-fair`，不改变原有登录、数据库或共享空间。

## 本地预览

在本项目目录运行 `npm run dev -- --port 3001`，打开 http://127.0.0.1:3001/heart-fair 。只绑定本机，没有发布或推送。

## 修改内容

`src/lib/heart-fair/content.ts` 集中存放七站文案、日期、城市、地点、回应和照片路径。
真实照片放入 `public/heart-fair/photos/`，填入相应 `photos[].src`，例如 `/heart-fair/photos/together.jpg`。四个照片位为合照、第一次见面的你、那天的小瞬间、笑容。空路径显示占位相框；点击仍可预览相框。图片加载失败有占位提示。

可选音频放入 public 下，设置 `fair.audio`。留空不显示控件，有音频也仅在用户点击后播放。

主要组件位于 `src/components/heart-fair/`：heart-fair 负责逐页导航，photo 负责照片与原生 dialog 放大，response 负责两种回应，art 负责插画。样式限定为 fair 前缀，页面使用现有 Tailwind 4。

插画由 imagegen 生成统一水彩角色素材并提取为四张 WebP，保存在 `public/heart-fair/`。正文与标题均为 HTML 文本，没有将原型截图用作页面。手写标题使用设备楷体字体回退与蓝色纹理；不同系统字体可能有差异。

回应只存在当前页面内存，不发送、不持久保存，刷新后重置。当前页面没有新增后端接口，也没有提供公网访问保护。没有真实照片和音频，相关真实媒体仍待替换后确认。

## 验证

`npm run typecheck`、`npm run lint`、`npm run build`。
浏览器已检查窄屏、390px 手机、1280px 桌面；前进返回、照片占位放大/关闭、长文与切页回顶、两种回应。减少动态效果由 CSS 媒体查询处理。
