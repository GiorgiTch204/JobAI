"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "./Button";

/**
 * A dialog built on <dialog>, so focus trapping, Escape and the top layer
 * come from the platform rather than from a hand-rolled portal.
 */
export function Modal({ open, onClose, title, description, size = "md", children, footer }) {
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const handleCancel = (event) => {
      event.preventDefault();
      onClose?.();
    };
    node.addEventListener("cancel", handleCancel);
    return () => node.removeEventListener("cancel", handleCancel);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      className={cn(
        "pop-in m-auto w-[calc(100vw-2rem)] rounded-[var(--radius-panel)] border border-rule bg-surface p-0 text-ink shadow-[var(--pop-shadow)]",
        "backdrop:bg-[color-mix(in_oklab,var(--shell)_55%,transparent)] backdrop:backdrop-blur-[2px]",
        size === "sm" && "max-w-sm",
        size === "md" && "max-w-lg",
        size === "lg" && "max-w-2xl",
        size === "xl" && "max-w-4xl",
      )}
      onClick={(event) => {
        if (event.target === ref.current) onClose?.();
      }}
    >
      <div className="flex items-start justify-between gap-4 border-b border-rule px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-[0.9375rem] font-semibold text-ink">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-ink-3">{description}</p>
          ) : null}
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="size-4" />
        </Button>
      </div>

      <div className="scrollbar-thin max-h-[min(70vh,34rem)] overflow-y-auto px-5 py-4">
        {children}
      </div>

      {footer ? (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-rule bg-surface-2 px-5 py-3">
          {footer}
        </div>
      ) : null}
    </dialog>
  );
}

/** Destructive confirmation. The verb in the button matches the verb asked. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Are you sure?",
  description,
  confirmLabel = "Delete",
  loading = false,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="quiet" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-[0.8125rem] leading-relaxed text-ink-2">
        This cannot be undone.
      </p>
    </Modal>
  );
}
