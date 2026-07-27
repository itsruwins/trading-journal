"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Plus, Search, SunMoon, type LucideIcon } from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import { useTheme } from "@/src/lib/theme";
import { ALL_NAV } from "./nav";

const EXIT_MS = 150;

type Command = {
  id: string;
  label: string;
  group: string;
  icon: LucideIcon;
  /** Extra terms that should match this command but aren't in its label. */
  keywords?: string;
  run: () => void;
};

/* Ranked, not filtered: an exact prefix should always outrank a scattered
   subsequence, so typing "ta" lands on Tags rather than Trades-by-accident. */
function score(text: string, query: string): number | null {
  const t = text.toLowerCase();
  if (t.startsWith(query)) return 3;
  if (t.includes(query)) return 2;

  let from = 0;
  for (const char of query) {
    const at = t.indexOf(char, from);
    if (at === -1) return null;
    from = at + 1;
  }
  return 1;
}

function rank(commands: Command[], query: string): Command[] {
  const q = query.trim().toLowerCase();
  if (!q) return commands;

  return commands
    .map((command) => {
      const direct = score(command.label, q);
      const viaKeyword = command.keywords ? score(command.keywords, q) : null;
      const best = Math.max(direct ?? -1, viaKeyword === null ? -1 : viaKeyword - 1);
      return { command, best };
    })
    .filter((entry) => entry.best >= 0)
    .sort((a, b) => b.best - a.best)
    .map((entry) => entry.command);
}

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { toggle } = useTheme();

  const [closing, setClosing] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);

  const commands = useMemo<Command[]>(() => {
    const destinations: Command[] = ALL_NAV.map((item) => ({
      id: `go:${item.href}`,
      label: item.label,
      group: "Go to",
      icon: item.icon,
      run: () => router.push(item.href),
    }));

    const actions: Command[] = [
      {
        id: "act:new-trade",
        label: "Log trade",
        group: "Actions",
        icon: Plus,
        keywords: "new trade add entry",
        run: () => router.push("/trades?new=1"),
      },
      {
        id: "act:theme",
        label: "Toggle theme",
        group: "Actions",
        icon: SunMoon,
        keywords: "dark light appearance",
        run: toggle,
      },
      {
        id: "act:signout",
        label: "Sign out",
        group: "Actions",
        icon: LogOut,
        keywords: "log out exit",
        run: async () => {
          await supabase.auth.signOut();
          router.replace("/login");
        },
      },
    ];

    return [...destinations, ...actions];
  }, [router, toggle]);

  const results = useMemo(() => rank(commands, query), [commands, query]);
  const activeId = results[cursor]?.id;

  // Dialog drives the top layer, so the palette can never be clipped by an
  // ancestor's overflow and Esc/backdrop come from the platform.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      setQuery("");
      setCursor(0);
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

  // Keep the highlighted row in view when arrowing past the fold.
  useEffect(() => {
    if (!activeId) return;
    listRef.current
      ?.querySelector(`[data-id="${CSS.escape(activeId)}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  function runAt(index: number) {
    const command = results[index];
    if (!command) return;
    onClose();
    command.run();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => (c + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => (c - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      runAt(cursor);
    }
  }

  return (
    <dialog
      ref={ref}
      aria-label="Command palette"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      /* ::backdrop styling (and its fade) already lives in globals.css. */
      className="m-0 max-h-none w-full max-w-none bg-transparent p-0 text-ink"
    >
      {/* Sits high in the viewport rather than dead-centre: the eye is already
          near the top when reading, and it leaves the dock visible below. */}
      <div className="fixed inset-x-0 top-0 flex justify-center px-4 pt-[12vh]">
        <div
          style={{ transformOrigin: "top center" }}
          className={`w-full max-w-lg overflow-hidden rounded-lg border border-edge-strong bg-raised shadow-xl ${
            closing ? "modal-exit" : "modal-enter"
          }`}
        >
          <div className="flex h-12 items-center gap-3 border-b border-edge px-4">
            <Search className="size-4 shrink-0 text-faint" aria-hidden="true" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCursor(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search pages and actions…"
              aria-label="Search pages and actions"
              role="combobox"
              aria-expanded
              aria-controls="command-results"
              aria-activedescendant={activeId}
              /* The row already reads as focused; the global :focus-visible
                 ring here would double up on the border. Needs the
                 focus-visible variant to outrank that rule's specificity. */
              className="h-full flex-1 bg-transparent text-[15px] text-ink outline-none focus-visible:outline-none placeholder:text-faint"
            />
            <kbd className="hidden rounded border border-edge px-1.5 py-0.5 font-sans text-[11px] text-faint sm:block">
              esc
            </kbd>
          </div>

          <div
            ref={listRef}
            id="command-results"
            role="listbox"
            aria-label="Results"
            /* Tall enough that the default list (9 items + 2 group labels)
               never needs scrolling — Sign out was falling below the fold. */
            className="max-h-[min(29rem,65vh)] overflow-y-auto p-1.5"
          >
            {results.length === 0 && (
              <p className="px-3 py-6 text-center text-[14px] text-muted">
                No matches for “{query.trim()}”
              </p>
            )}

            {results.map((command, index) => {
              const Icon = command.icon;
              const selected = index === cursor;
              const newGroup = results[index - 1]?.group !== command.group;

              return (
                <div key={command.id}>
                  {newGroup && !query.trim() && (
                    <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-faint first:pt-1">
                      {command.group}
                    </p>
                  )}
                  <button
                    type="button"
                    role="option"
                    id={command.id}
                    data-id={command.id}
                    aria-selected={selected}
                    onMouseMove={() => setCursor(index)}
                    onClick={() => runAt(index)}
                    className={`flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-[14px] transition-colors duration-100 ease-out ${
                      selected ? "bg-selected text-ink" : "text-muted"
                    }`}
                  >
                    <Icon
                      className={`size-4 shrink-0 ${
                        selected ? "text-ink" : "text-faint"
                      }`}
                      aria-hidden="true"
                    />
                    <span className="flex-1 truncate">{command.label}</span>
                    {selected && (
                      <kbd className="hidden font-sans text-[11px] text-faint sm:block">
                        ↵
                      </kbd>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </dialog>
  );
}
