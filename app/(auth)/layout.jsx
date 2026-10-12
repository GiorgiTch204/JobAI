import Link from "next/link";

import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

/**
 * Sign-in and sign-up share a two-column frame: the form on paper, and an
 * ink panel that shows what the product does rather than a stock photograph.
 */
export default function AuthLayout({ children }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
      <div className="relative order-2 flex flex-col px-5 py-8 sm:px-10 lg:order-1 lg:px-16 lg:py-12">
        <div className="flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>

        <p className="text-center font-mono text-[0.6875rem] text-ink-3">
          <Link href="/jobs" className="transition-colors hover:text-ink-2">
            Browse jobs without an account
          </Link>
        </p>
      </div>

      <aside className="order-1 hidden flex-col justify-between bg-shell px-12 py-12 text-shell-ink lg:order-2 lg:flex">
        <p className="font-mono text-[0.6875rem] tracking-[0.12em] text-shell-ink-2">
          What JobAI does
        </p>

        <div className="grid gap-7">
          <h2 className="font-display text-[1.75rem] leading-[1.15] tracking-tight">
            Most CVs are read by software before a person sees them.
          </h2>

          <ul className="grid gap-4 text-[0.875rem] leading-relaxed text-shell-ink-2">
            <li className="border-l-2 border-mark pl-3.5">
              Your CV is parsed into fields — contact block, roles, dates, skills — exactly as a
              tracking system would read it.
            </li>
            <li className="border-l-2 border-shell-rule pl-3.5">
              Six checks score what it found, each one telling you what to change.
            </li>
            <li className="border-l-2 border-shell-rule pl-3.5">
              Every job post is compared against your CV, so you can see the keywords it screens
              for that you have not mentioned.
            </li>
          </ul>
        </div>

        <p className="font-mono text-[0.6875rem] text-shell-ink-2">
          Nothing leaves your database. Scores are computed on your own server.
        </p>
      </aside>
    </div>
  );
}
