"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/Button";

export function PrintButton() {
  return (
    <Button size="sm" onClick={() => window.print()}>
      <Printer className="size-3.5" aria-hidden="true" />
      Print or save as PDF
    </Button>
  );
}
