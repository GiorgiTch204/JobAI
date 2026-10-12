"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";

const ThemeContext = createContext(null);

/**
 * The theme lives on `<html data-theme>`, written by the inline script in the
 * layout before first paint. React subscribes to that attribute rather than
 * holding its own copy, so there is no flash, no hydration mismatch and no
 * state to keep in sync.
 */

function subscribe(onChange) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

function getSnapshot() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function getServerSnapshot() {
  return "light";
}

export function ThemeProvider({ children }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTheme = useCallback((next) => {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("jobai.theme", next);
    } catch {
      /* private mode: the choice lasts for this page only */
    }
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggle: () => setTheme(theme === "dark" ? "light" : "dark"),
    }),
    [theme, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside <ThemeProvider>");
  return context;
}
