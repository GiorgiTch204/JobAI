"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * The hero: a CV sheet being read.
 *
 * A scan line travels down a real résumé once, the keywords it recognises
 * take the highlighter as it passes, and the score counts up to the number
 * those keywords actually produce. It runs a single time when it scrolls
 * into view — this is the only unprompted motion on the page.
 */

const LINES = [
  { text: "Giorgi Tcheishvili", className: "font-display text-[0.9375rem] text-ink" },
  { text: "Full-stack web developer · Tbilisi, Georgia", className: "text-[0.6875rem] text-ink-3" },
  { divider: true },
  { label: "Summary" },
  {
    parts: [
      "Developer building ",
      { mark: "Next.js" },
      " interfaces and ",
      { mark: "ASP.NET" },
      " services for public-sector teams.",
    ],
  },
  { label: "Experience" },
  { text: "Web developer intern — Ministry of Environment", className: "text-[0.75rem] text-ink" },
  {
    parts: [
      "Built an intranet used by ",
      { mark: "420 staff" },
      " weekly; cut load time by ",
      { mark: "38%" },
      ".",
    ],
  },
  { label: "Skills" },
  {
    chips: ["React", "Next.js", "Tailwind CSS", "Node.js", "SQL", "C#"],
  },
];

const CHECKS = [
  { label: "Contact block", points: 15, of: 15 },
  { label: "Summary", points: 15, of: 15 },
  { label: "Skills keywords", points: 20, of: 20 },
  { label: "Experience depth", points: 21, of: 25 },
  { label: "Measurable results", points: 15, of: 15 },
  { label: "Formatting", points: 7, of: 10 },
];

const TARGET = 93;

/**
 * The order in which the highlighter reaches each keyword, computed once from
 * the content above. Rendering stays pure: every mark looks up its own delay.
 */
const MARK_DELAY = (() => {
  const delays = new Map();
  let index = 0;
  LINES.forEach((line, lineIndex) => {
    if (line.chips) {
      line.chips.forEach((_, chipIndex) => {
        index += 1;
        delays.set(`${lineIndex}:chip:${chipIndex}`, 520 + index * 110);
      });
      return;
    }
    if (line.parts) {
      line.parts.forEach((part, partIndex) => {
        if (typeof part === "string") return;
        index += 1;
        delays.set(`${lineIndex}:part:${partIndex}`, 520 + index * 110);
      });
    }
  });
  return delays;
})();

export function ScanDemo() {
  const [started, setStarted] = useState(false);
  const [score, setScore] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      // Show the finished state instead of the sweep, on the next tick.
      const done = window.setTimeout(() => {
        setStarted(true);
        setScore(TARGET);
      }, 0);
      return () => window.clearTimeout(done);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return undefined;

    const delay = window.setTimeout(() => {
      const duration = 900;
      const start = performance.now();
      let frame = 0;

      const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setScore(Math.round(TARGET * eased));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(frame);
    }, 1600);

    return () => window.clearTimeout(delay);
  }, [started]);

  return (
    <div ref={ref} className="grid gap-3">
      {/* The sheet */}
      <div className="relative overflow-hidden rounded-[var(--radius-sheet)] border border-rule bg-surface shadow-sheet">
        <div className="flex items-center justify-between border-b border-rule bg-surface-2 px-3 py-1.5">
          <span className="font-mono text-[0.625rem] text-ink-3">luka-danelia-cv.pdf</span>
          <span className="font-mono text-[0.625rem] text-ink-3">
            {started ? "parsed" : "reading…"}
          </span>
        </div>

        <div className="relative px-4 py-4 sm:px-5 sm:py-5">
          {started ? (
            <div
              className="scan-line pointer-events-none absolute inset-x-0 top-0 h-16 bg-[linear-gradient(to_bottom,transparent,color-mix(in_oklab,var(--mark)_26%,transparent),transparent)]"
              aria-hidden="true"
            />
          ) : null}

          <div className="grid gap-2">
            {LINES.map((line, index) => {
              if (line.divider) {
                return <hr key={index} className="my-1 border-rule" />;
              }
              if (line.label) {
                return (
                  <p key={index} className="mt-1 font-mono text-[0.5625rem] text-ink-3">
                    {line.label}
                  </p>
                );
              }
              if (line.chips) {
                return (
                  <div key={index} className="flex flex-wrap gap-1.5 pt-0.5">
                    {line.chips.map((chip, chipIndex) => {
                      const delay = MARK_DELAY.get(`${index}:chip:${chipIndex}`) ?? 0;
                      return (
                        <span
                          key={chip}
                          className={cn(
                            "rounded-[3px] border border-rule px-1.5 py-0.5 font-mono text-[0.625rem] text-ink-2",
                            started && "mark-in",
                          )}
                          style={started ? { animationDelay: `${delay}ms` } : undefined}
                        >
                          {chip}
                        </span>
                      );
                    })}
                  </div>
                );
              }
              if (line.parts) {
                return (
                  <p key={index} className="text-[0.75rem] leading-relaxed text-ink-2">
                    {line.parts.map((part, partIndex) => {
                      if (typeof part === "string") return <span key={partIndex}>{part}</span>;
                      const delay = MARK_DELAY.get(`${index}:part:${partIndex}`) ?? 0;
                      return (
                        <span
                          key={partIndex}
                          className={cn("font-medium text-ink", started && "mark-in")}
                          style={started ? { animationDelay: `${delay}ms` } : undefined}
                        >
                          {part.mark}
                        </span>
                      );
                    })}
                  </p>
                );
              }
              return (
                <p key={index} className={cn("leading-snug", line.className)}>
                  {line.text}
                </p>
              );
            })}
          </div>
        </div>
      </div>

      {/* The report it produced */}
      <div className="rounded-[var(--radius-panel)] border border-rule bg-surface">
        <div className="flex items-center gap-4 border-b border-rule px-4 py-3">
          <div>
            <p className="font-mono text-[0.625rem] text-ink-3">ATS score</p>
            <p className="tabular font-display text-[2rem] leading-none text-ink">{score}</p>
          </div>
          <div className="flex-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full rounded-full bg-[var(--mark-deep)] transition-[width] duration-200"
                style={{ width: `${score}%` }}
              />
            </div>
            <p className="mt-1.5 text-[0.6875rem] text-ink-3">
              {score >= TARGET
                ? "Two checks have points left: experience depth and formatting."
                : "Scoring the fields it recognised…"}
            </p>
          </div>
        </div>

        <ul className="grid gap-px bg-rule sm:grid-cols-2">
          {CHECKS.map((check) => (
            <li
              key={check.label}
              className="flex items-baseline justify-between gap-2 bg-surface px-4 py-2"
            >
              <span className="text-[0.75rem] text-ink-2">{check.label}</span>
              <span
                className={cn(
                  "tabular font-mono text-[0.6875rem]",
                  check.points === check.of ? "text-ink-3" : "text-warning",
                )}
              >
                {check.points}/{check.of}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
