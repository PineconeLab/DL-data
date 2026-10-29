# 冰雪的心动游园会

独立路由 `/heart-fair`，不改变原有登录、数据库或共享空间。本次仅本地预览，没有发布或推送。

## 预览

在项目目录运行 `npm run dev -- --port 3001`，打开 http://127.0.0.1:3001/heart-fair 。

## 图片与文案

`public/heart-fair/generated/` 保存根据用户原图重新生成的七张 1024 × 1536 图片，依次为 welcome、beginning、meeting、travel、smile、future、confession。PNG 是原始生成图，页面加载 WebP。图片按 2:3 等比缩放，不拉伸、不裁切。

按本次要求，固定画面的文字与插画一同生成；修改 `src/lib/heart-fair/content.ts` 不会改变底图中的字。更改固定可见文案需重新生成对应图片，并同步配置中的无障碍文本。回应文字与交互由 HTML 实现。第四站已删除指定的心里话段落。

## 替换照片

真实照片放入 `public/heart-fair/photos/`，在 `src/lib/heart-fair/content.ts` 填写 `photos[].src`，例如 `/heart-fair/photos/together.jpg`。

首次见面的主照片框使用 `meetingPhotos`，心动瞬间使用 `smilePhotos`，两个数组独立，均可增加照片。空路径保留手绘占位，未加入任何陌生人物照片。两处轮播支持左右滑动、箭头、圆点与方向键；点击照片可放大。图片使用 contain 保留完整内容，比例不同时会有留白。

## 交互

`heart-fair.tsx` 负责逐页导航和回应，`carousel.tsx` 负责轮播，`photo.tsx` 负责原生 dialog 放大。覆盖区域以原图 1024 × 1536 坐标换算百分比，与底图一起缩放。

可选音频设置 `fair.audio`，留空不显示控件。不会自动播放。回应仅存在当前页面内存，不发送、不保存，刷新重置。CSS 尊重系统减少动态效果。

## 验证

运行 `npm run typecheck`、`npm run lint`、`npm run build`。
已在本地浏览器检查逐页导航、两处独立轮播、滑动、箭头、照片占位放大与关闭、两种回应。未提供真实照片和音频，因此真实媒体仍需替换后验证。

## 页面入口与手机铺满预览

新增 `/start` 入口选择页：前往 `/heart-fair` 或原有 `/` 双人空间。入口和游园会无需登录；原有双人空间仍需登录。游园会是可直接访问的展示页面，不提供访问权限保护。

按后续确认，600px 以下手机使用可视区域宽高直接铺满，静态画面会纵向拉伸；照片保持比例，交互区域按相同比例对齐。大屏保留居中展示。
