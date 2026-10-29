"use client";
import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { ensureFairAudio, playFairAudio } from "@/lib/heart-fair/playback";

export function EntryLink({
  href,
  className,
  prime = false,
  children,
}: {
  href: string;
  className?: string;
  prime?: boolean;
  children: ReactNode;
}) {
  useEffect(() => {
    if (prime) ensureFairAudio();
  }, [prime]);
  return (
    <Link
      href={href}
      prefetch={false}
      className={className}
      onClick={() => {
        if (prime) void playFairAudio();
      }}
    >
      {children}
    </Link>
  );
}
