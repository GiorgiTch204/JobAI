import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

import { ResumeSheet } from "@/components/cv/ResumeSheet";
import { PrintButton } from "@/components/cv/PrintButton";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireUser } from "@/lib/auth/session";
import { findPrimaryResume, findResume } from "@/lib/db/resumes.repo";

export const dynamic = "force-dynamic";
export const metadata = { title: "CV preview" };

export default async function CvPreviewPage({ searchParams }) {
  const { user } = await requireUser("/cv/preview");
  const params = await searchParams;

  const resume = params?.id
    ? findResume(params.id, user.id)
    : findPrimaryResume(user.id);

  if (!resume) {
    return (
      <EmptyState
        icon={FileText}
        title="No CV to preview"
        description="Build one or import a file, then come back to print it."
        action={{ label: "Open the builder", href: "/cv" }}
      />
    );
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/cv"
          className="inline-flex items-center gap-1.5 text-[0.8125rem] text-ink-3 transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to the builder
        </Link>

        <div className="flex items-center gap-2">
          <span className="tabular font-mono text-[0.6875rem] text-ink-3">
            ATS {resume.atsScore}
          </span>
          <PrintButton />
        </div>
      </div>

      <p className="mb-4 text-[0.8125rem] leading-relaxed text-ink-3 print:hidden">
        One column, no tables, no text in images — the layout a parser reads
        without errors. Use your browser's print dialog and choose “Save as
        PDF”.
      </p>

      <div className="overflow-hidden rounded-[var(--radius-sheet)] border border-rule shadow-sheet print:border-0 print:shadow-none">
        <ResumeSheet resume={resume} />
      </div>

      <p className="mt-4 text-center font-mono text-[0.6875rem] text-ink-3 print:hidden">
        {resume.title} · updated{" "}
        {new Date(resume.updatedAt).toLocaleDateString("en-GB")}
      </p>
    </>
  );
}
