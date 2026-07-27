"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";

type ToastVariant = "success" | "error" | "info";

type ToastOptions = {
  title: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastItem = ToastOptions & { id: string };

const ToastContext = createContext<{
  toast: (options: ToastOptions) => void;
}>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const AUTO_DISMISS_MS = 5000;
const EXIT_MS = 150;

const icons: Record<ToastVariant, ReactNode> = {
  success: <CircleCheck className="size-4 shrink-0 text-positive" />,
  error: <CircleAlert className="size-4 shrink-0 text-negative" />,
  info: <Info className="size-4 shrink-0 text-ink" />,
};

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const [leaving, setLeaving] = useState(false);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const beginExit = useCallback(() => {
    setLeaving(true);
    setTimeout(() => onDismiss(item.id), EXIT_MS);
  }, [item.id, onDismiss]);

  useEffect(() => {
    dismissTimer.current = setTimeout(beginExit, AUTO_DISMISS_MS);
    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [beginExit]);

  return (
    <div
      role="status"
      className={`pointer-events-auto flex w-full items-start gap-3 rounded-md border border-edge-strong bg-raised p-4 shadow-xl sm:w-90 ${
        leaving ? "animate-fade-out" : "animate-rise"
      }`}
    >
      <span className="mt-px" aria-hidden="true">
        {icons[item.variant ?? "info"]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium text-ink">{item.title}</p>
        {item.description && (
          <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
            {item.description}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={beginExit}
        aria-label="Dismiss"
        className="flex size-6 shrink-0 items-center justify-center rounded text-faint transition-colors duration-150 ease-out hover:text-ink"
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((options: ToastOptions) => {
    setItems((current) => [
      ...current,
      { ...options, id: crypto.randomUUID() },
    ]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Stacked above the dock rather than beside it — on a narrow window the
          centred dock and a right-aligned toast would otherwise overlap. */}
      <div className="pointer-events-none fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6">
        {items.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
