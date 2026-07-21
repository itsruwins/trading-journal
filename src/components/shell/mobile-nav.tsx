"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Logo } from "@/src/components/logo";
import { NavLinks } from "./sidebar";

const EXIT_MS = 200;

export function MobileNav({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      setClosing(false);
      dialog.showModal();
      return;
    }

    if (!open && dialog.open) {
      setClosing(true);
      dialog.setAttribute("data-closing", "");
      const timer = setTimeout(() => {
        dialog.close();
        dialog.removeAttribute("data-closing");
        setClosing(false);
      }, EXIT_MS);
      return () => clearTimeout(timer);
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label="Navigation"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={`m-0 h-dvh max-h-none w-72 border-r border-edge bg-shell p-0 text-ink lg:hidden ${
        closing ? "drawer-exit" : "drawer-enter"
      }`}
    >
      <div className="flex h-full flex-col">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-edge pl-5 pr-3">
          <Logo />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="flex size-9 items-center justify-center rounded-md text-faint transition-colors duration-150 ease-out hover:bg-white/5 hover:text-ink"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <NavLinks onNavigate={onClose} />
      </div>
    </dialog>
  );
}
