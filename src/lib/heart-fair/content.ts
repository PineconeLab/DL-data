// 照片放入 public/heart-fair/photos 后填写 src，例如 /heart-fair/photos/together.jpg。
export type FairPhoto = { id: string; label: string; src: string; alt: string };
export const photos: FairPhoto[] = [
  {
    id: "together",
    label: "放一张我们的合照",
    src: "/heart-fair/photos/together-home.jpg",
    alt: "我们的第一次合照",
  },
  { id: "first", label: "第一次见面的你", src: "", alt: "第一次见面的冰雪" },
  { id: "moment", label: "那天的小瞬间", src: "", alt: "第一次见面的小瞬间" },
  {
    id: "smile",
    label: "放一张你笑起来的照片",
    src: "",
    alt: "冰雪笑起来的样子",
  },
];
export const fair = {
  name: "冰雪的心动游园会",
  people: "松松 × 冰雪",
  subtitle: "这一次，只为你开放。",
  audio: "/heart-fair/bgm.mp3",
  audioIntro: 5,
  audioStart: 52,
  cities: ["上海", "南京"],
  stops: [
    { label: "欢迎入场", title: "冰雪的\n心动游园会", next: "出发，去看看" },
    {
      label: "第一站 · 我们的开始",
      title: "后来，\n屏幕那边的人\n是你",
      date: "2026.01.18 · 晚上",
      paragraphs: [
        "那天晚上，我们在网上认识。",
        "那时候还不知道，屏幕另一边的你，后来会成为我想见、想念，也想认真喜欢的人。",
      ],
      next: "下一站，第一次见面",
    },
    {
      label: "第二站 · 第一次见面",
      title: "终于，见到你了",
      date: "2026.10.01 · 苏州",
      paragraphs: [
        "我一直记得，在苏州高铁站的星巴克门口，第一次见到穿着牛仔外套的你。",
      ],
      note: "想把第一次见面的样子，好好留下来。",
      next: "一起走过的地方",
    },
    {
      label: "第三站 · 一起走过",
      title: "这些地方，\n都有你在身边",
      paragraphs: [
        "我们在苏州玩了两天，吃了你请的海底捞，又一起去了上海。",
        "现在想起来，最让我留恋的，是这些地方都有你在身边。",
      ],
      next: "还有一些心动的瞬间",
    },
    {
      label: "第四站 · 心动的瞬间",
      title: "看着你笑，\n我也会开心",
      paragraphs: [
        "尤其是你笑起来的时候，我会觉得，原本有点疲惫的一天，好像也能变得轻松。",
      ],
      next: "想和你说说以后",
    },
    {
      label: "第五站 · 想和你的以后",
      title: "慢慢积攒\n我们的回忆",
      paragraphs: [
        "我们很有意思，明明还没正式谈恋爱，就已经聊了好多结婚、生孩子的事。那些想象让我觉得温暖，但我更想先把眼前这一步走好，认真和你谈一场恋爱。",
        "我在上海，你在南京，以后见面需要安排，也会有各自忙碌的时候。但我愿意为见你留出时间，认真听你说话，把喜欢放进日常的小事里。有分歧时，我们就好好说，也给彼此理解和调整的机会。",
      ],
      note: "我想和你一起去更多地方，慢慢积攒我们的回忆。",
      next: "最后，有句话想告诉你",
    },
    {
      label: "最后一站 · 我的心意",
      title: "冰雪，\n我喜欢你！",
      paragraphs: ["想认真地和你谈一场恋爱，\n把喜欢放进以后的行动里。"],
      next: "",
    },
  ],
  places: [
    { city: "苏州", places: ["西园寺", "留园", "七里山塘", "海底捞"] },
    {
      city: "上海",
      places: ["新天地", "淮海中路", "陆家嘴·三件套", "上海博物馆"],
    },
  ],
  question: "你愿意做我的女朋友吗？",
  yes: "那我们，就从这里认真开始吧。",
  later: "好呀，按你的节奏来。谢谢你认真看完我的心意。",
};

// 首页合照只用于第一页，不进入见面轮播。
export const meetingPhotos = photos.slice(1, 3);
export const smilePhotos: FairPhoto[] = [
  photos[3],
  {
    id: "smile-2",
    label: "放一张你笑起来的照片",
    src: "",
    alt: "冰雪笑起来的照片（二）",
  },
  {
    id: "smile-3",
    label: "放一张你笑起来的照片",
    src: "",
    alt: "冰雪笑起来的照片（三）",
  },
];
