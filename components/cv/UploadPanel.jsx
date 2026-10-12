"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CircleCheck,
  FileText,
  LoaderCircle,
  TriangleAlert,
  Upload,
  UploadCloud,
} from "lucide-react";

import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { AtsReport } from "./AtsReport";
import { ResumeSheet } from "./ResumeSheet";
import { useToast } from "@/components/ui/Toast";
import { api, post } from "@/lib/client-api";
import { cn } from "@/lib/utils";

/**
 * Import a CV file.
 *
 * The result is shown before anything is saved: which fields were recognised,
 * which were not, and the sheet as it would look. Nothing is invented — a
 * field the parser could not find comes back empty and is listed as missing,
 * so the person knows exactly what to fill in.
 */

const ACCEPT = ".pdf,.docx,.txt,.md";
const LABELS = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  location: "Location",
  summary: "Summary",
  skills: "Skills",
  experience: "Experience",
  education: "Education",
};

export function UploadPanel({ hasResumes }) {
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef(null);

  const [stage, setStage] = useState("idle"); // idle | reading | review | saving
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [fileName, setFileName] = useState("");

  const read = async (file) => {
    if (!file) return;

    setError("");
    setFileName(file.name);
    setStage("reading");

    const body = new FormData();
    body.append("file", file);

    try {
      const data = await api("/api/cv/parse", { method: "POST", body });
      setResult(data);
      setStage("review");
    } catch (caught) {
      setError(caught.message);
      setStage("idle");
    }
  };

  const save = async () => {
    setStage("saving");
    try {
      const data = await post("/api/resumes", { ...result.resume, source: "upload" });
      toast.success(`Imported. ATS score ${data.report.score}.`);
      router.push(`/cv?id=${data.resume.id}`);
      router.refresh();
    } catch (caught) {
      setError(caught.message);
      setStage("review");
    }
  };

  const reset = () => {
    setResult(null);
    setError("");
    setFileName("");
    setStage("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

  /* ------------------------------------------------------------------ */

  if (stage === "review" && result) {
    const { diagnostics, report, resume } = result;

    return (
      <div className="grid gap-5 lg:grid-cols-[1fr_1fr] lg:items-start">
        <div className="grid gap-5">
          <Panel>
            <PanelHeader
              title="What the parser read"
              description={`${diagnostics.words} words from ${fileName}`}
              action={
                <Badge tone="neutral">
                  {diagnostics.engine === "pdf"
                    ? `PDF · ${diagnostics.pages || "?"} pages`
                    : diagnostics.engine.toUpperCase()}
                </Badge>
              }
            />
            <PanelBody className="grid gap-4">
              <div>
                <p className="text-[0.75rem] text-ink-3">Recognised</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {diagnostics.detected.map((key) => (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1 rounded-full bg-mark px-2 py-0.5 text-[0.6875rem] text-mark-ink"
                    >
                      <CircleCheck className="size-3" aria-hidden="true" />
                      {LABELS[key] || key}
                    </span>
                  ))}
                </div>
              </div>

              {diagnostics.missing.length ? (
                <div>
                  <p className="text-[0.75rem] text-ink-3">Not found in the file</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {diagnostics.missing.map((key) => (
                      <span
                        key={key}
                        className="inline-flex items-center gap-1 rounded-full border border-dashed border-rule-strong px-2 py-0.5 text-[0.6875rem] text-ink-3"
                      >
                        {LABELS[key] || key}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-[0.75rem] leading-relaxed text-ink-3">
                    These were left empty rather than guessed. Fill them in after you import.
                  </p>
                </div>
              ) : null}

              <dl className="grid gap-1.5 border-t border-rule pt-3 text-[0.8125rem]">
                <Row label="Roles found" value={resume.experience.length} />
                <Row label="Achievement lines" value={diagnostics.bullets} />
                <Row label="Skills found" value={resume.skills.length} />
                <Row label="Education entries" value={resume.education.length} />
                <Row
                  label="Sections detected"
                  value={diagnostics.sectionsFound.join(", ") || "none"}
                />
              </dl>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader title="Score of the imported document" />
            <PanelBody>
              <AtsReport report={report} />
            </PanelBody>
          </Panel>

          <div className="flex flex-wrap gap-2">
            <Button onClick={save} loading={stage === "saving"} size="lg">
              Import and open in the builder
            </Button>
            <Button variant="outline" size="lg" onClick={reset}>
              Try a different file
            </Button>
          </div>

          {error ? <Alert tone="danger">{error}</Alert> : null}
        </div>

        <Panel className="lg:sticky lg:top-20">
          <PanelHeader
            title="How it will look"
            description="Single column, parser-safe, ready to print."
          />
          <PanelBody className="scrollbar-thin max-h-[calc(100dvh-14rem)] overflow-y-auto">
            <div className="rounded-[var(--radius-sheet)] border border-rule">
              <ResumeSheet resume={resume} scale="compact" />
            </div>
          </PanelBody>
        </Panel>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-start">
      <Panel>
        <PanelBody className="p-5 sm:p-6">
          {error ? (
            <Alert tone="danger" className="mb-4" title="That file did not work">
              {error}
            </Alert>
          ) : null}

          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              read(event.dataTransfer.files?.[0]);
            }}
            className={cn(
              "grid justify-items-center gap-3 rounded-[var(--radius-panel)] border-2 border-dashed px-6 py-12 text-center transition-colors",
              dragging
                ? "border-[var(--mark-deep)] bg-mark-soft"
                : "border-rule-strong bg-surface-2",
            )}
          >
            {stage === "reading" ? (
              <>
                <LoaderCircle className="size-7 spin text-[var(--mark-deep)]" aria-hidden="true" />
                <p className="text-[0.9375rem] font-medium text-ink">Reading {fileName}</p>
                <p className="text-[0.8125rem] text-ink-3">
                  Extracting the text, then looking for the sections.
                </p>
              </>
            ) : (
              <>
                <div className="grid size-12 place-items-center rounded-full bg-surface text-ink-2">
                  <UploadCloud className="size-5" aria-hidden="true" />
                </div>
                <p className="text-[0.9375rem] font-medium text-ink">
                  Drop your CV here, or choose a file
                </p>
                <p className="text-[0.8125rem] text-ink-3">PDF, DOCX or plain text, up to 8 MB</p>

                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPT}
                  className="sr-only"
                  id="cv-file"
                  onChange={(event) => read(event.target.files?.[0])}
                />
                <label
                  htmlFor="cv-file"
                  className="mt-2 inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-field)] bg-ink px-4 text-sm font-medium text-[var(--surface)] transition-colors hover:bg-[color-mix(in_oklab,var(--ink)_88%,var(--mark-deep))]"
                >
                  <Upload className="size-4" aria-hidden="true" />
                  Choose a file
                </label>
              </>
            )}
          </div>

          <div className="mt-5 grid gap-2.5 text-[0.8125rem] leading-relaxed text-ink-2">
            <p className="flex gap-2">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden="true" />
              A scanned CV is an image, so there is no text to read. Export a text-based PDF from
              Word or Google Docs instead.
            </p>
            <p className="flex gap-2">
              <FileText className="mt-0.5 size-3.5 shrink-0 text-ink-3" aria-hidden="true" />
              Nothing is saved until you have seen what was read and pressed import.
            </p>
          </div>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader title="Or start from an empty document" />
        <PanelBody className="grid gap-3">
          <p className="text-[0.8125rem] leading-relaxed text-ink-2">
            The builder works the same either way, and the live score tells you what each section
            still needs.
          </p>
          <Button href="/cv" variant="outline">
            Open the builder
          </Button>
          {hasResumes ? (
            <p className="text-[0.75rem] text-ink-3">
              Importing adds another CV rather than replacing the one you have.
            </p>
          ) : null}
        </PanelBody>
      </Panel>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-3">{label}</dt>
      <dd className="tabular text-ink-2">{value}</dd>
    </div>
  );
}
