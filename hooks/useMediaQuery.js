"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Subscribes to a media query. `useSyncExternalStore` is the right tool here:
 * the match is state owned by the browser, not by React, so there is nothing
 * to copy into a useState and keep in step.
 */
export function useMediaQuery(query) {
  const subscribe = useCallback(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  // The server has no viewport, so it always reports "no match".
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
