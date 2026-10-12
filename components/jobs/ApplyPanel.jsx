"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, Send } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Field, Select, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { post } from "@/lib/client-api";
import { formatDate } from "@/lib/utils";

/**
 * The apply action on a job posting. It asks for the two things that change
 * the outcome — which CV, and anything worth saying — and nothing else.
 */
export function ApplyPanel({ job, resumes, application, signedIn }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [resumeId, setResumeId] = useState(
    resumes.find((item) => item.isPrimary)?.id || resumes[0]?.id || "",
  );
  const [coverLetter, setCoverLetter] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!signedIn) {
    return (
      <div className="grid gap-2.5">
        <Button
          href={`/login?next=/jobs/${job.id}`}
          size="lg"
          className="w-full"
        >
          Sign in to apply
        </Button>
        <p className="text-center text-[0.75rem] text-ink-3">
          You need an account so the company can read your CV.
        </p>
      </div>
    );
  }

  if (application) {
    return (
      <div className="grid gap-3 rounded-[var(--radius-field)] border border-rule bg-surface-2 px-4 py-3.5">
        <div className="flex items-center gap-2">
          <CircleCheck className="size-4 text-positive" aria-hidden="true" />
          <p className="text-[0.875rem] font-medium text-ink">Applied</p>
          <StatusBadge value={application.status} className="ml-auto" />
        </div>
        <p className="text-[0.75rem] text-ink-3">
          Sent {formatDate(application.createdAt)} with a{" "}
          {application.matchScore}% keyword match.
        </p>
        <Button href="/applications" variant="outline" size="sm">
          Track this application
        </Button>
      </div>
    );
  }

  if (job.status !== "OPEN") {
    return (
      <Alert tone="warning">
        This posting is closed, so it is no longer accepting applications.
      </Alert>
    );
  }

  if (!resumes.length) {
    return (
      <div className="grid gap-2.5">
        <Alert tone="warning" title="You need a CV first">
          Import a file or build one in a few minutes, then come back and apply.
        </Alert>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button href="/cv/upload" size="sm">
            Import a CV
          </Button>
          <Button href="/cv" size="sm" variant="outline">
            Build one
          </Button>
        </div>
      </div>
    );
  }

  const submit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const data = await post(`/api/jobs/${job.id}/apply`, {
        resumeId,
        coverLetter,
      });
      setOpen(false);
      toast.success(data.message);
      router.refresh();
    } catch (caught) {
      setError(caught.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="grid gap-2.5">
        <Button size="lg" className="w-full" onClick={() => setOpen(true)}>
          <Send className="size-4" aria-hidden="true" />
          Apply with your CV
        </Button>
        <p className="text-center text-[0.75rem] text-ink-3">
          {resumes.length === 1
            ? `Sends "${resumes[0].title}" as it is right now.`
            : `You have ${resumes.length} CVs — pick one on the next step.`}
        </p>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Apply to ${job.title}`}
        description={`${job.company} · ${job.location}`}
        footer={
          <>
            <Button variant="quiet" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={submit} loading={submitting}>
              {submitting ? "Sending…" : "Send application"}
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          {error ? <Alert tone="danger">{error}</Alert> : null}

          <Field
            label="Which CV should they read?"
            htmlFor="resume"
            hint={`${resumes.length} saved`}
          >
            <Select
              id="resume"
              value={resumeId}
              onChange={(event) => setResumeId(event.target.value)}
            >
              {resumes.map((resume) => (
                <option key={resume.id} value={resume.id}>
                  {resume.title} — ATS {resume.atsScore}
                  {resume.isPrimary ? " (primary)" : ""}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Anything to add?" htmlFor="cover" hint="Optional">
            <Textarea
              id="cover"
              rows={6}
              value={coverLetter}
              onChange={(event) => setCoverLetter(event.target.value)}
              placeholder={`Why this role at ${job.company}, and the one thing you have done that proves you can do it.`}
              maxLength={4000}
            />
          </Field>

          <p className="text-[0.75rem] leading-relaxed text-ink-3">
            A copy of the CV is stored with the application, so later edits to
            your CV will not change what this company sees.
          </p>
        </div>
      </Modal>
    </>
  );
}
