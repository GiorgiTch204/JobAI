"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Pagination } from "@/components/ui/Pagination";

/** Keeps the current filters while moving between pages. */
export function JobPager({ page, pages, total, perPage }) {
  const router = useRouter();
  const params = useSearchParams();

  const goTo = (next) => {
    const query = new URLSearchParams(params.toString());
    if (next <= 1) query.delete("page");
    else query.set("page", String(next));
    const text = query.toString();
    router.push(`/jobs${text ? `?${text}` : ""}`);
  };

  return (
    <Pagination
      page={page}
      pages={pages}
      total={total}
      perPage={perPage}
      onChange={goTo}
      className="mt-5 border-t border-rule pt-4"
    />
  );
}
