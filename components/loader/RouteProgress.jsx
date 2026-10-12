"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * A 2px highlighter line across the top during client-side navigation. It
 * only appears if the next route takes longer than a moment to arrive, so
 * quick transitions stay still.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return undefined;
    }

    let frame = 0;
    const show = window.setTimeout(() => {
      setVisible(true);
      setWidth(18);
      frame = window.setInterval(() => {
        setWidth((current) => (current >= 90 ? 90 : current + (90 - current) * 0.18));
      }, 180);
    }, 120);

    const settle = window.setTimeout(() => {
      window.clearInterval(frame);
      setWidth(100);
      window.setTimeout(() => {
        setVisible(false);
        setWidth(0);
      }, 260);
    }, 420);

    return () => {
      window.clearTimeout(show);
      window.clearTimeout(settle);
      window.clearInterval(frame);
    };
  }, [pathname, searchParams]);

  return (
    <div className="route-progress" aria-hidden="true">
      <div
        className="route-progress__bar"
        style={{ width: `${width}%`, opacity: visible ? 1 : 0 }}
      />
    </div>
  );
}
