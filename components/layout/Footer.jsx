import Link from "next/link";

import { Logo } from "@/components/brand/Logo";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/jobs", label: "Browse jobs" },
      { href: "/cv", label: "CV builder" },
      { href: "/cv/upload", label: "Import a CV" },
      { href: "/dashboard", label: "Dashboard" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/register", label: "Create account" },
      { href: "/login", label: "Sign in" },
      { href: "/settings", label: "Settings" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-rule bg-surface">
      <div className="mx-auto grid w-full max-w-[82rem] gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink-3">
            JobAI reads your CV the way an applicant tracking system does,
            scores what it finds, and shows which keywords a job post wants that
            your CV does not mention yet.
          </p>
        </div>

        {COLUMNS.map((column) => (
          <div key={column.title}>
            <h2 className="text-[0.8125rem] font-semibold text-ink">
              {column.title}
            </h2>
            <ul className="mt-3 grid gap-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[0.8125rem] text-ink-3 transition-colors hover:text-ink"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-rule">
        <div className="mx-auto flex w-full max-w-[82rem] flex-wrap items-center justify-between gap-2 px-4 py-4 sm:px-6 lg:px-8">
          <p className="font-mono text-[0.6875rem] text-ink-3">
            JobAI 2.0 — built with Next.js
          </p>
          <p className="font-mono text-[0.6875rem] text-ink-3">
            Scores are computed locally from your own CV
          </p>
        </div>
      </div>
    </footer>
  );
}
