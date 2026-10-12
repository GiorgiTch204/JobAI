"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";

import { SideNav, SideNavFooter } from "./SideNav";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils";

/**
 * The signed-in frame: a fixed rail from 1024px up, a slide-over drawer
 * below that, and a sticky bar that carries the page title on small screens.
 * Only the content column scrolls, so the rail never jumps.
 */
export function AppShell({ groups, variant = "member", title, children }) {
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer when the route changes. Adjusting state during render is
  // the documented alternative to an effect for "reset when a prop changes",
  // and it avoids the extra render pass an effect would cost.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (drawerOpen) setDrawerOpen(false);
  }

  // Lock the body while the drawer is open so the page behind cannot scroll.
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [drawerOpen]);

  const footer = (
    <SideNavFooter user={user}>
      <button
        type="button"
        onClick={logout}
        className="flex w-full items-center gap-2.5 rounded-[var(--radius-field)] px-2.5 py-2 text-[0.8125rem] text-shell-ink-2 transition-colors hover:bg-shell-2 hover:text-shell-ink"
      >
        <LogOut className="size-4" aria-hidden="true" />
        Sign out
      </button>
    </SideNavFooter>
  );

  return (
    <div className="min-h-dvh bg-paper">
      {/* Rail: desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-shell-rule lg:block">
        <SideNav groups={groups} footer={footer} variant={variant} />
      </aside>

      {/* Drawer: mobile + tablet */}
      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          drawerOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!drawerOpen}
      >
        <button
          type="button"
          tabIndex={drawerOpen ? 0 : -1}
          onClick={() => setDrawerOpen(false)}
          className={cn(
            "absolute inset-0 bg-[color-mix(in_oklab,var(--shell)_60%,transparent)] transition-opacity duration-200",
            drawerOpen ? "opacity-100" : "opacity-0",
          )}
          aria-label="Close navigation"
        />
        <div
          className={cn(
            "absolute inset-y-0 left-0 w-[17rem] max-w-[85vw] shadow-[var(--pop-shadow)] transition-transform duration-250 ease-[var(--ease-out-quint)]",
            drawerOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <SideNav
            groups={groups}
            footer={footer}
            variant={variant}
            onNavigate={() => setDrawerOpen(false)}
          />
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="absolute right-2 top-2.5 grid size-9 place-items-center rounded-[var(--radius-field)] text-shell-ink-2 transition-colors hover:bg-shell-2 hover:text-shell-ink lg:hidden"
            aria-label="Close navigation"
            tabIndex={drawerOpen ? 0 : -1}
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Content column */}
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-rule bg-[color-mix(in_oklab,var(--paper)_88%,transparent)] px-3 backdrop-blur-md sm:px-5">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="size-4.5" />
          </Button>

          <div className="flex min-w-0 items-center gap-2">
            <span className="lg:hidden">
              <Logo size="sm" />
            </span>
            {title ? (
              <h1 className="hidden truncate text-[0.9375rem] font-semibold text-ink lg:block">
                {title}
              </h1>
            ) : null}
          </div>

          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>

        <main className="mx-auto w-full max-w-[82rem] px-3 py-5 sm:px-5 sm:py-7 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
