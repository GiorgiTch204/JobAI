"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, LogOut, Settings, ShieldCheck, UserRound } from "lucide-react";

import { useAuth } from "@/components/providers/AuthProvider";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";

export function UserMenu({ align = "right" }) {
  const { user, isAdmin, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const onClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      setSigningOut(false);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-[var(--radius-field)] py-1 pl-1 pr-1.5 transition-colors hover:bg-surface-2"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Avatar name={user.name} tone={user.avatarTone} size="sm" />
        <span className="hidden max-w-[9rem] truncate text-[0.8125rem] text-ink-2 sm:block">
          {user.name}
        </span>
        <ChevronDown className="size-3.5 text-ink-3" aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="menu"
          className={cn(
            "pop-in absolute top-full z-50 mt-1.5 w-60 overflow-hidden rounded-[var(--radius-panel)] border border-rule bg-surface shadow-[var(--pop-shadow)]",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          <div className="border-b border-rule px-3.5 py-3">
            <p className="truncate text-[0.8125rem] font-medium text-ink">{user.name}</p>
            <p className="truncate font-mono text-[0.6875rem] text-ink-3">{user.email}</p>
          </div>

          <div className="grid p-1.5">
            <MenuLink href="/dashboard" icon={UserRound} onClick={() => setOpen(false)}>
              Your dashboard
            </MenuLink>
            <MenuLink href="/settings" icon={Settings} onClick={() => setOpen(false)}>
              Settings
            </MenuLink>
            {isAdmin ? (
              <MenuLink href="/admin" icon={ShieldCheck} onClick={() => setOpen(false)}>
                Admin console
              </MenuLink>
            ) : null}
          </div>

          <div className="border-t border-rule p-1.5">
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex w-full items-center gap-2.5 rounded-[var(--radius-field)] px-2.5 py-2 text-left text-[0.8125rem] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-60"
              role="menuitem"
            >
              <LogOut className="size-4" aria-hidden="true" />
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({ href, icon: Icon, children, onClick }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      role="menuitem"
      className="flex items-center gap-2.5 rounded-[var(--radius-field)] px-2.5 py-2 text-[0.8125rem] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
    >
      <Icon className="size-4" aria-hidden="true" />
      {children}
    </Link>
  );
}
