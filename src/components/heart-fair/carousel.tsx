"use client";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";
import type { FairPhoto } from "@/lib/heart-fair/content";
export function PhotoContent({ photo }: { photo: FairPhoto }) {
  const [failed, setFailed] = useState(false);
  return photo.src && !failed ? (
    <Image
      src={photo.src}
      alt={photo.alt}
      fill
      sizes="(max-width: 540px) 82vw, 430px"
      className="object-contain"
      draggable={false}
      onError={() => setFailed(true)}
    />
  ) : (
    <span className="prototype-placeholder">
      <Image
        className="prototype-placeholder-icon"
        src="/heart-fair/reference/photo-icon.webp"
        alt=""
        width={145}
        height={110}
        unoptimized
        draggable={false}
      />
      <span>{failed ? "照片暂时无法加载" : photo.label}</span>
    </span>
  );
}
export function PhotoCarousel({
  name,
  photos,
  index,
  onChange,
  onOpen,
  referencePlaceholder = false,
}: {
  referencePlaceholder?: boolean;
  name: string;
  photos: FairPhoto[];
  index: number;
  onChange: (n: number) => void;
  onOpen: (p: FairPhoto) => void;
}) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const change = (offset: number) =>
    onChange((index + offset + photos.length) % photos.length);
  if (!photos.length) return null;
  return (
    <section
      className={`prototype-carousel ${referencePlaceholder && !photos[index].src ? "reference-carousel" : ""}`}
      aria-label={name}
      aria-roledescription="轮播图"
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          change(-1);
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          change(1);
        }
      }}
      onPointerDown={(e) => {
        start.current = { x: e.clientX, y: e.clientY };
        swiped.current = false;
      }}
      onPointerUp={(e) => {
        if (!start.current) return;
        const dx = e.clientX - start.current.x,
          dy = e.clientY - start.current.y;
        if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy) * 1.3) {
          swiped.current = true;
          change(dx < 0 ? 1 : -1);
        }
        start.current = null;
      }}
      onPointerCancel={() => {
        start.current = null;
      }}
    >
      <button
        className="prototype-photo-open"
        onClick={() => {
          if (swiped.current) {
            swiped.current = false;
            return;
          }
          onOpen(photos[index]);
        }}
        aria-label={`放大查看：${photos[index].label}`}
      >
        {referencePlaceholder && !photos[index].src ? (
          <span className="sr-only">{photos[index].label}</span>
        ) : (
          <PhotoContent key={photos[index].id} photo={photos[index]} />
        )}
      </button>
      {photos.length > 1 && (
        <>
          <button
            className="prototype-carousel-arrow previous"
            aria-label={`${name}上一张`}
            onClick={() => change(-1)}
          >
            <ChevronLeft />
          </button>
          <button
            className="prototype-carousel-arrow next"
            aria-label={`${name}下一张`}
            onClick={() => change(1)}
          >
            <ChevronRight />
          </button>
          <div className="prototype-carousel-dots" aria-label={`${name}分页`}>
            {photos.map((p, i) => (
              <button
                key={p.id}
                aria-label={`${name}第${i + 1}张`}
                aria-current={i === index ? "true" : undefined}
                onClick={() => onChange(i)}
              />
            ))}
          </div>
        </>
      )}
      <span className="sr-only" aria-live="polite">
        第 {index + 1} 张，共 {photos.length} 张
      </span>
    </section>
  );
}
