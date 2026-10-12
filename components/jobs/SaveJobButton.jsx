"use client";

import { useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { del, post } from "@/lib/client-api";

export function SaveJobButton({ jobId, initialSaved = false }) {
  const toast = useToast();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);

  const toggle = async () => {
    setPending(true);
    const next = !saved;
    try {
      if (next) await post(`/api/jobs/${jobId}/save`);
      else await del(`/api/jobs/${jobId}/save`);
      setSaved(next);
      toast.success(next ? "Saved to your list." : "Removed from your list.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      variant={saved ? "outline" : "quiet"}
      size="sm"
      onClick={toggle}
      loading={pending}
      aria-pressed={saved}
    >
      {!pending ? (
        saved ? (
          <BookmarkCheck
            className="size-4 text-[var(--mark-deep)]"
            aria-hidden="true"
          />
        ) : (
          <Bookmark className="size-4" aria-hidden="true" />
        )
      ) : null}
      {saved ? "Saved" : "Save"}
    </Button>
  );
}
