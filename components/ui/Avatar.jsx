import { cn, initials } from "@/lib/utils";

/**
 * Initials on a tinted ground. The tone is stored per account so a person
 * keeps the same colour everywhere in the product.
 */
const TONES = [
  "bg-[color-mix(in_oklab,var(--mark)_38%,var(--surface))] text-mark-ink",
  "bg-info-soft text-info",
  "bg-positive-soft text-positive",
  "bg-warning-soft text-warning",
  "bg-danger-soft text-danger",
  "bg-surface-3 text-ink-2",
];

const SIZES = {
  sm: "size-7 text-[0.625rem]",
  md: "size-9 text-[0.75rem]",
  lg: "size-12 text-sm",
  xl: "size-16 text-base",
};

export function Avatar({ name, tone = 0, size = "md", className }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-semibold uppercase",
        TONES[Number(tone) % TONES.length],
        SIZES[size],
        className,
      )}
      aria-hidden="true"
      title={name}
    >
      {initials(name)}
    </span>
  );
}
