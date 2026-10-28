import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "我们的小日子",
  description: "把两个人的日常，慢慢收藏。",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
