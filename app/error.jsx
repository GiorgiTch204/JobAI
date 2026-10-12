"use client";

import { useEffect } from "react";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error("[jobai] unhandled page error:", error);
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center bg-paper px-5 py-16">
      <div className="w-full max-w-md text-center">
        <Logo size="lg" />
        <p className="mt-8 font-mono text-[0.6875rem] tracking-[0.12em] text-ink-3">
          Something broke
        </p>
        <h1 className="mt-2 font-display text-[1.75rem] leading-tight text-ink">
          This screen did not load
        </h1>
        <p className="mt-2.5 text-[0.875rem] leading-relaxed text-ink-2">
          Nothing you did caused this, and nothing was lost. Try again, and if it keeps happening
          the server log has the details.
        </p>
        {error?.digest ? (
          <p className="mt-3 font-mono text-[0.6875rem] text-ink-3">ref {error.digest}</p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button onClick={reset}>Try again</Button>
          <Button href="/dashboard" variant="outline">
            Go to the dashboard
          </Button>
        </div>
      </div>
    </main>
  );
}
