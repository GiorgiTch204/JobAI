import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

const TONES = {
  info: { className: "border-info/25 bg-info-soft text-info", Icon: Info },
  success: { className: "border-positive/25 bg-positive-soft text-positive", Icon: CircleCheck },
  warning: { className: "border-warning/25 bg-warning-soft text-warning", Icon: TriangleAlert },
  danger: { className: "border-danger/25 bg-danger-soft text-danger", Icon: CircleAlert },
};

/** Inline message. Errors say what happened and what to do about it. */
export function Alert({ tone = "info", title, children, className, action }) {
  const { className: toneClass, Icon } = TONES[tone] || TONES.info;

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-[var(--radius-field)] border px-3.5 py-3",
        toneClass,
        className,
      )}
      role={tone === "danger" ? "alert" : undefined}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1 text-[0.8125rem] leading-relaxed">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
