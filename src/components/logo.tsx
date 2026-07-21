export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        aria-hidden="true"
      >
        <rect width="28" height="28" rx="8" fill="var(--primary)" />
        <rect x="7" y="15" width="3" height="6" rx="1.5" fill="white" />
        <rect x="12.5" y="11" width="3" height="10" rx="1.5" fill="white" />
        <rect x="18" y="7" width="3" height="14" rx="1.5" fill="white" />
      </svg>
      {!compact && (
        <span className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
          Trading Journal
        </span>
      )}
    </span>
  );
}
