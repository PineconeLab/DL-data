"use client";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? "modal wide" : "modal"}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="modal-heading">
        <div>
          <span className="eyebrow">OUR LITTLE DAYS</span>
          <h2>{title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="icon-button"
          aria-label="关闭弹窗"
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
