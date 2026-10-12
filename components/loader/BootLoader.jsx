"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The first thing anyone sees: the JobAI wordmark filling left to right with
 * the highlighter colour used everywhere else in the product.
 *
 * How it behaves
 *   • The markup is server-rendered, so the sweep starts painting before any
 *     JavaScript arrives — the CSS keyframes run on their own.
 *   • Once hydrated, this component takes the fill over and ties it to real
 *     readiness: fonts loaded and the document complete. The percentage and
 *     the sweep are driven from the same number, so they never disagree.
 *   • It shows once per tab. The inline script in the layout marks repeat
 *     visits before first paint, so navigating back never flashes it again.
 *   • `prefers-reduced-motion` gets the finished state and an instant exit.
 */

const MIN_VISIBLE_MS = 1150;
const MAX_VISIBLE_MS = 4000;

export default function BootLoader() {
  const [hidden, setHidden] = useState(false);
  const rootRef = useRef(null);
  const stackRef = useRef(null);
  const nibRef = useRef(null);
  const percentRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    // Already booted in this tab. CSS has hidden the overlay before paint, so
    // unmounting is only tidying up — it can wait for the next tick.
    if (document.documentElement.dataset.boot === "skip") {
      const tidy = window.setTimeout(() => setHidden(true), 0);
      return () => window.clearTimeout(tidy);
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const finish = () => {
      try {
        sessionStorage.setItem("jobai.booted", "1");
      } catch {
        /* private mode — the loader simply shows again next time */
      }
      document.documentElement.dataset.boot = "skip";
      root.dataset.state = "done";
      window.setTimeout(() => setHidden(true), reduceMotion ? 0 : 480);
    };

    if (reduceMotion) {
      const done = window.setTimeout(finish, 0);
      return () => window.clearTimeout(done);
    }

    // Hand the fill over from CSS to JS so it can track real progress.
    // Every layer reads the inherited --fill from this one element.
    if (stackRef.current) stackRef.current.style.animation = "none";

    const started = performance.now();
    let ready = false;
    let frame = 0;
    let settled = false;

    const paint = (value) => {
      const clamped = Math.max(0, Math.min(100, value));
      if (stackRef.current) stackRef.current.style.setProperty("--fill", `${clamped}%`);
      if (nibRef.current) nibRef.current.style.opacity = clamped >= 99 ? "0" : "0.95";
      if (percentRef.current) percentRef.current.textContent = String(Math.round(clamped));
    };

    const tick = (now) => {
      const elapsed = now - started;

      // The sweep is paced by time, so it always reads as one deliberate
      // stroke rather than snapping shut on a fast connection. Until the page
      // is actually ready it holds at 92%, however long that takes.
      const eased = 1 - Math.pow(1 - Math.min(elapsed / MIN_VISIBLE_MS, 1), 3);
      const target = ready ? eased * 100 : Math.min(eased * 100, 92);
      paint(target);

      const done = ready && elapsed >= MIN_VISIBLE_MS;
      if (done || elapsed > MAX_VISIBLE_MS) {
        paint(100);
        if (!settled) {
          settled = true;
          window.setTimeout(finish, 180);
        }
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    const markReady = () => {
      ready = true;
    };

    const signals = [
      document.fonts?.ready ?? Promise.resolve(),
      document.readyState === "complete"
        ? Promise.resolve()
        : new Promise((resolve) => window.addEventListener("load", resolve, { once: true })),
    ];
    Promise.all(signals).then(markReady).catch(markReady);

    return () => cancelAnimationFrame(frame);
  }, []);

  if (hidden) return null;

  return (
    <div
      id="jobai-boot"
      ref={rootRef}
      data-state="running"
      role="status"
      aria-live="polite"
      aria-label="Loading JobAI"
    >
      <div className="boot-stack" ref={stackRef}>
        <div className="boot-word" aria-hidden="true">
          <span className="boot-word__ghost">JobAI</span>
          <span className="boot-word__fill">JobAI</span>
          <span className="boot-word__nib" ref={nibRef} />
        </div>

        <div className="grid w-full gap-2">
          <div className="boot-rule" />
          <div className="boot-meta">
            <span>Loading JobAI</span>
            <span>
              <span ref={percentRef} className="tabular">
                0
              </span>
              %
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
