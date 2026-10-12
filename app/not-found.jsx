import Link from "next/link";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-paper px-5 py-16">
      <div className="w-full max-w-md text-center">
        <Logo size="lg" />
        <p className="mt-8 font-mono text-[0.6875rem] tracking-[0.12em] text-ink-3">404</p>
        <h1 className="mt-2 font-display text-[1.75rem] leading-tight text-ink">
          This page is not here
        </h1>
        <p className="mt-2.5 text-[0.875rem] leading-relaxed text-ink-2">
          The link may be out of date, or the job posting it pointed to was taken down.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button href="/jobs">Browse jobs</Button>
          <Button href="/" variant="outline">
            Back to the start
          </Button>
        </div>
        <p className="mt-6 text-[0.75rem] text-ink-3">
          Signed in already? Go to your{" "}
          <Link href="/dashboard" className="underline decoration-[var(--mark-deep)] underline-offset-2">
            dashboard
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
