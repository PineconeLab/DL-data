"use client";
import Image from "next/image";
import { ImagePlus, X, ZoomIn } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FairPhoto } from "@/lib/heart-fair/content";
function PhotoContent({ photo }: { photo: FairPhoto }) {
  const [failed, setFailed] = useState(false);
  return photo.src && !failed ? (
    <Image
      src={photo.src}
      alt={photo.alt}
      fill
      sizes="(max-width: 700px) 90vw, 650px"
      className="object-contain"
      onError={() => setFailed(true)}
    />
  ) : (
    <span className="fair-photo-empty">
      <ImagePlus size={38} strokeWidth={1.3} />
      <span>{failed ? "照片暂时没有加载出来" : photo.label}</span>
    </span>
  );
}
export function PhotoCard({
  photo,
  large = false,
  onOpen,
}: {
  photo: FairPhoto;
  large?: boolean;
  onOpen: (photo: FairPhoto) => void;
}) {
  return (
    <button
      className={`fair-photo ${large ? "fair-photo-large" : ""}`}
      onClick={() => onOpen(photo)}
      aria-label={`放大查看：${photo.label}`}
    >
      <span className="fair-tape" aria-hidden="true" />
      <PhotoContent photo={photo} />
      <ZoomIn className="fair-zoom" size={18} />
    </button>
  );
}
export function PhotoViewer({
  photo,
  onClose,
}: {
  photo: FairPhoto;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = before;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="fair-viewer"
      aria-label={photo.label}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="fair-viewer-body">
        <button
          autoFocus
          aria-label="关闭照片"
          className="fair-icon"
          onClick={onClose}
        >
          <X />
        </button>
        <div className="fair-viewer-image">
          <PhotoContent photo={photo} />
        </div>
        <p>{photo.label}</p>
      </div>
    </dialog>
  );
}
