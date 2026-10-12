"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/Logo";
import { NAV_ICONS } from "./icon-map";

function isActive(pathname, href) {
  if (href === "/admin" || href === "/dashboard" || href === "/cv") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The persistent rail. Ink-dark in both themes so the paper-coloured working
 * area stays the brightest thing on screen, and the active item is marked
 * with the highlighter rather than a filled block.
 */
export function SideNav({ groups, footer, onNavigate, variant = "member" }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-shell text-shell-ink">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-shell-rule px-4">
        <Logo tone="shell" size="sm" onClick={onNavigate} />
        {variant === "admin" ? (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-shell-rule px-2 py-0.5 font-mono text-[0.625rem] tracking-wide text-shell-ink-2">
            <ShieldCheck className="size-3" aria-hidden="true" />
            admin
          </span>
        ) : null}
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-2.5 py-4" aria-label="Main">
        {groups.map((group) => (
          <div key={group.label} className="mb-5 last:mb-0">
            <p className="px-2.5 pb-1.5 font-mono text-[0.625rem] tracking-[0.12em] text-shell-ink-2">
              {group.label}
            </p>
            <ul className="grid gap-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = NAV_ICONS[item.icon] || NAV_ICONS.dashboard;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-[var(--radius-field)] px-2.5 py-2 text-[0.8125rem] transition-colors",
                        active
                          ? "bg-shell-2 font-medium text-shell-ink"
                          : "text-shell-ink-2 hover:bg-shell-2/60 hover:text-shell-ink",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-mark transition-opacity",
                          active ? "opacity-100" : "opacity-0",
                        )}
                        aria-hidden="true"
                      />
                      <Icon className="size-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">{item.label}</span>
                      {item.badge ? (
                        <span className="tabular ml-auto rounded-full bg-shell-2 px-1.5 py-0.5 text-[0.625rem] text-shell-ink-2">
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {footer ? (
        <div className="shrink-0 border-t border-shell-rule p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

/** The sign-out / switch-area block at the bottom of the rail. */
export function SideNavFooter({ user, children }) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2.5 rounded-[var(--radius-field)] bg-shell-2 px-2.5 py-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-mark text-[0.625rem] font-semibold text-mark-ink">
          {user?.name
            ? user.name
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0])
                .join("")
                .toUpperCase()
            : <UserRound className="size-3.5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.8125rem] text-shell-ink">{user?.name}</span>
          <span className="block truncate font-mono text-[0.625rem] text-shell-ink-2">
            {user?.email}
          </span>
        </span>
      </div>
      {children}
    </div>
  );
}
