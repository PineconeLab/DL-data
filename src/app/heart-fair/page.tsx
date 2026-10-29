import type { Metadata } from "next";
import { HeartFair } from "@/components/heart-fair/heart-fair";
import "./fair.css";
export const metadata: Metadata = {
  title: "冰雪的心动游园会",
  description: "这一次，只为你开放。",
  robots: { index: false, follow: false },
};
export default function HeartFairPage() {
  return <HeartFair />;
}
