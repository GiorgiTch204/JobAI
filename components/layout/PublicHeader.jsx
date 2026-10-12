"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";
import { useAuth } from "@/components/providers/AuthProvider";
import { PUBLIC_NAV } from "./nav-config";
import { cn } from "@/lib/utils";

export function PublicHeader() {
  const { signedIn, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-[color-mix(in_oklab,var(--paper)_90%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-[82rem] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />

        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Sections"
        >
          {PUBLIC_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-[var(--radius-field)] px-2.5 py-1.5 text-[0.8125rem] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle className="hidden sm:grid" />

          {signedIn ? (
            <>
              <Button
                href={isAdmin ? "/admin" : "/dashboard"}
                size="sm"
                variant="outline"
                className="hidden sm:inline-flex"
              >
                {isAdmin ? "Admin console" : "Dashboard"}
              </Button>
              <UserMenu />
            </>
          ) : (
            <>
              <Button
                href="/login"
                size="sm"
                variant="ghost"
                className="hidden sm:inline-flex"
              >
                Sign in
              </Button>
              <Button href="/register" size="sm">
                Create account
              </Button>
            </>
          )}

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="grid size-9 place-items-center rounded-[var(--radius-field)] text-ink-2 transition-colors hover:bg-surface-2 md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "overflow-hidden border-t border-rule bg-surface transition-[max-height] duration-250 md:hidden",
          open ? "max-h-72" : "max-h-0 border-t-0",
        )}
      >
        <nav className="grid gap-0.5 px-4 py-3" aria-label="Sections">
          {PUBLIC_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="rounded-[var(--radius-field)] px-2.5 py-2 text-[0.875rem] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-2 flex items-center gap-2 border-t border-rule pt-3">
            {signedIn ? (
              <Button
                href={isAdmin ? "/admin" : "/dashboard"}
                size="sm"
                className="flex-1"
              >
                {isAdmin ? "Admin console" : "Dashboard"}
              </Button>
            ) : (
              <>
                <Button
                  href="/login"
                  size="sm"
                  variant="outline"
                  className="flex-1"
                >
                  Sign in
                </Button>
                <Button href="/register" size="sm" className="flex-1">
                  Create account
                </Button>
              </>
            )}
            <ThemeToggle />
          </div>
        </nav>
      </div>
    </header>
  );
}
