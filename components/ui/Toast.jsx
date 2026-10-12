"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Toasts report the outcome of an action in the same words as the button that
 * caused it. They never carry the only copy of an error that belongs inline
 * in a form.
 */

const ToastContext = createContext(null);

const ICONS = {
  success: CircleCheck,
  error: CircleAlert,
  info: Info,
};

const TONES = {
  success: "border-positive/30 bg-positive-soft text-positive",
  error: "border-danger/30 bg-danger-soft text-danger",
  info: "border-rule-strong bg-surface text-ink",
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (message, { tone = "info", duration = 4200 } = {}) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((current) => [...current.slice(-2), { id, message, tone }]);
      if (duration > 0) {
        window.setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss],
  );

  const api = useMemo(
    () => ({
      push,
      dismiss,
      success: (message, options) =>
        push(message, { ...options, tone: "success" }),
      error: (message, options) =>
        push(message, { ...options, tone: "error", duration: 6000 }),
      info: (message, options) => push(message, { ...options, tone: "info" }),
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex flex-col items-center gap-2 px-4 pb-4 sm:items-end sm:px-6"
        role="region"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const Icon = ICONS[toast.tone] || Info;
          return (
            <div
              key={toast.id}
              className={cn(
                "pop-in pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-[var(--radius-field)] border px-3.5 py-3 shadow-[var(--pop-shadow)]",
                TONES[toast.tone],
              )}
            >
              <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <p className="flex-1 text-[0.8125rem] leading-snug">
                {toast.message}
              </p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
                aria-label="Dismiss"
              >
                <X className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return context;
}
