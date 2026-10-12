import { Skeleton } from "@/components/ui/Skeleton";

/** Shown while a route segment streams in. Mirrors the page rhythm. */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[82rem] px-4 py-8 sm:px-6 lg:px-8">
      <Skeleton className="h-7 w-56" />
      <Skeleton className="mt-3 h-4 w-80" />
      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[5.5rem] rounded-[var(--radius-panel)]" />
        ))}
      </div>
      <Skeleton className="mt-5 h-64 rounded-[var(--radius-panel)]" />
    </div>
  );
}
