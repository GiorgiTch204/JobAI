import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * The wordmark. "Job" is set in ink, "AI" wears the highlighter — the same
 * mark that shows a keyword match everywhere else, so the logo explains the
 * product's one idea.
 */
export function Logo({
  href = "/",
  size = "md",
  tone = "ink",
  className,
  onClick,
}) {
  const sizes = {
    sm: "text-[1.0625rem]",
    md: "text-[1.25rem]",
    lg: "text-[1.75rem]",
  };

  const inner = (
    <span
      className={cn(
        "font-display tracking-[-0.045em] leading-none",
        sizes[size],
        tone === "shell" ? "text-shell-ink" : "text-ink",
      )}
    >
      Job
      <span className="mark-full rounded-[2px] px-[0.1em] pb-[0.02em]">AI</span>
    </span>
  );

  if (!href) return <span className={className}>{inner}</span>;

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded focus-visible:outline-offset-4",
        className,
      )}
      aria-label="JobAI home"
    >
      {inner}
    </Link>
  );
}
