"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";

const EXIT_MS = 150;

export function Modal({
  open,
  onClose,
  title,
  description,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  footer?: ReactNode;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      setClosing(false);
      dialog.showModal();
      document.body.style.overflow = "hidden";
      return;
    }

    if (!open && dialog.open) {
      setClosing(true);
      dialog.setAttribute("data-closing", "");
      const timer = setTimeout(() => {
        dialog.close();
        dialog.removeAttribute("data-closing");
        setClosing(false);
        document.body.style.overflow = "";
      }, EXIT_MS);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="modal-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={`m-auto w-[calc(100vw-2rem)] max-w-110 rounded-lg border border-edge-strong bg-raised p-0 text-ink shadow-2xl ${
        closing ? "modal-exit" : "modal-enter"
      }`}
    >
      <div className="relative px-6 pt-6">
        <h2
          id="modal-title"
          className="pr-8 text-[17px] font-semibold tracking-[-0.01em] text-ink"
        >
          {title}
        </h2>
        {description && (
          <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
            {description}
          </p>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-md text-faint transition-colors duration-150 ease-out hover:bg-white/5 hover:text-ink"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      {children && <div className="px-6 py-5">{children}</div>}
      {footer && (
        <div className="flex justify-end gap-2 px-6 pb-6">{footer}</div>
      )}
    </dialog>
  );
}
