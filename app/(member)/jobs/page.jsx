import { Suspense } from "react";
import { Briefcase } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { JobCard } from "@/components/jobs/JobCard";
import { JobFilters } from "@/components/jobs/JobFilters";
import { EmptyState } from "@/components/ui/EmptyState";
import { Alert } from "@/components/ui/Alert";
import { JobPager } from "./JobPager";
import { getCurrentUser } from "@/lib/auth/session";
import { jobFacets, listJobs } from "@/lib/db/jobs.repo";
import { findPrimaryResume } from "@/lib/db/resumes.repo";
import { applicationStatusByJob } from "@/lib/db/applications.repo";
import { savedJobIds } from "@/lib/db/saved-jobs.repo";
import { annotateJobsWithMatch } from "@/lib/match";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Find jobs",
  description: "Open roles, ranked by how well your CV matches each posting's keywords.",
};

const PER_PAGE = 10;

export default async function JobsPage({ searchParams }) {
  const params = await searchParams;
  const user = await getCurrentUser();

  const query = {
    search: params?.search || "",
    location: params?.location || "",
    workMode: params?.workMode || "",
    employmentType: params?.employmentType || "",
    seniority: params?.seniority || "",
    tag: params?.tag || "",
    sort: params?.sort || "newest",
    page: Number(params?.page) || 1,
    perPage: PER_PAGE,
  };

  const { rows, total, page } = listJobs(query);
  const facets = jobFacets();

  const resume = user ? findPrimaryResume(user.id) : null;
  let jobs = resume ? annotateJobsWithMatch(rows, resume) : rows.map((job) => ({ ...job, match: null }));

  if (resume && query.sort === "match") {
    jobs = [...jobs].sort((a, b) => b.match.score - a.match.score);
  }

  if (user) {
    const applied = applicationStatusByJob(user.id);
    const saved = new Set(savedJobIds(user.id));
    jobs = jobs.map((job) => ({
      ...job,
      applicationStatus: applied[job.id] || null,
      saved: saved.has(job.id),
    }));
  }

  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <>
      <PageHeader
        title="Find jobs"
        description={
          resume
            ? `${total} open ${total === 1 ? "role" : "roles"}, each compared against “${resume.title}”.`
            : `${total} open ${total === 1 ? "role" : "roles"}. Add a CV to see how well you match each one.`
        }
      />

      <Suspense fallback={null}>
        <JobFilters facets={facets} hasResume={Boolean(resume)} />
      </Suspense>

      {!resume && user ? (
        <Alert tone="info" className="mt-4">
          Add a CV and every posting here gets a keyword match score.{" "}
          <a href="/cv/upload" className="font-medium underline underline-offset-2">
            Import one
          </a>
          .
        </Alert>
      ) : null}

      <div className="mt-5 grid gap-3">
        {jobs.length ? (
          jobs.map((job) => <JobCard key={job.id} job={job} signedIn={Boolean(user)} />)
        ) : (
          <EmptyState
            icon={Briefcase}
            title="No postings match those filters"
            description="Try removing a filter, or search for a technology instead of a job title."
            action={{ label: "Clear filters", href: "/jobs", variant: "outline" }}
          />
        )}
      </div>

      {pages > 1 ? (
        <Suspense fallback={null}>
          <JobPager page={page} pages={pages} total={total} perPage={PER_PAGE} />
        </Suspense>
      ) : null}
    </>
  );
}
