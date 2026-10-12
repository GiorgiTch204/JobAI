import { Bookmark } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { JobCard } from "@/components/jobs/JobCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireUser } from "@/lib/auth/session";
import { listSavedJobs } from "@/lib/db/saved-jobs.repo";
import { findPrimaryResume } from "@/lib/db/resumes.repo";
import { applicationStatusByJob } from "@/lib/db/applications.repo";
import { annotateJobsWithMatch } from "@/lib/match";

export const dynamic = "force-dynamic";
export const metadata = { title: "Saved jobs" };

export default async function SavedJobsPage() {
  const { user } = await requireUser("/saved");

  const saved = listSavedJobs(user.id);
  const resume = findPrimaryResume(user.id);
  const applied = applicationStatusByJob(user.id);

  const jobs = (resume ? annotateJobsWithMatch(saved, resume) : saved).map((job) => ({
    ...job,
    saved: true,
    applicationStatus: applied[job.id] || null,
  }));

  return (
    <>
      <PageHeader
        title="Saved jobs"
        description={
          jobs.length
            ? `${jobs.length} ${jobs.length === 1 ? "posting" : "postings"} you kept for later.`
            : "Jobs you save are kept here until you apply or remove them."
        }
      />

      {jobs.length ? (
        <div className="grid gap-3">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} signedIn />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Bookmark}
          title="Nothing saved"
          description="Use the bookmark on any posting to keep it here while you work on your CV."
          action={{ label: "Browse jobs", href: "/jobs" }}
        />
      )}
    </>
  );
}
