import Link from "next/link";
import { Briefcase, FileText, Upload } from "lucide-react";

import { PublicHeader } from "@/components/layout/PublicHeader";
import { Footer } from "@/components/layout/Footer";
import { ScanDemo } from "@/components/marketing/ScanDemo";
import { Button } from "@/components/ui/Button";
import { Keyword } from "@/components/ui/Badge";
import { getCurrentUser } from "@/lib/auth/session";
import { countJobs } from "@/lib/db/jobs.repo";
import { jobFacets, listJobs } from "@/lib/db/jobs.repo";
import { formatSalary } from "@/lib/utils";
import { LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

const CHECKS = [
  {
    name: "Contact block",
    points: 15,
    detail:
      "Name, headline, email, phone and location, each where a parser expects to find them.",
  },
  {
    name: "Professional summary",
    points: 15,
    detail: "Present, between 25 and 90 words, and free of phrases you cannot prove.",
  },
  {
    name: "Skills keywords",
    points: 20,
    detail: "Eight to eighteen distinct tools. This is the block keyword matching reads first.",
  },
  {
    name: "Experience depth",
    points: 25,
    detail: "Every role dated and titled, with at least two lines that open with a verb.",
  },
  {
    name: "Measurable results",
    points: 15,
    detail: "Half your achievement lines should carry a number: a percentage, a count, an hour saved.",
  },
  {
    name: "Formatting hygiene",
    points: 10,
    detail: "Line lengths, a complete name, an education entry, no filler phrases.",
  },
];

const STEPS = [
  {
    title: "Bring your CV",
    body: "Upload a PDF, DOCX or text file and JobAI extracts the text, or start from the builder with an empty document.",
    icon: Upload,
    href: "/cv/upload",
    action: "Import a CV",
  },
  {
    title: "Read the score",
    body: "Six checks award 100 points between them. Each one names the single change that earns the rest.",
    icon: FileText,
    href: "/cv",
    action: "Open the builder",
  },
  {
    title: "Match and apply",
    body: "Every posting is compared against your CV. Apply with the version that matches, and track the reply.",
    icon: Briefcase,
    href: "/jobs",
    action: "Browse jobs",
  },
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  const openJobs = countJobs("OPEN");
  const facets = jobFacets();
  const { rows: latest } = listJobs({ perPage: 3, sort: "newest" });

  const sampleJob = latest[0];

  return (
    <>
      <PublicHeader />

      <main>
        {/* ---------------------------------------------------------------- */}
        {/* Hero                                                             */}
        {/* ---------------------------------------------------------------- */}
        <section className="border-b border-rule">
          <div className="mx-auto grid w-full max-w-[82rem] items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:px-8 lg:py-20">
            <div className="max-w-xl">
              <p className="text-[0.8125rem] text-ink-3">
                Most CVs are read by software before a person sees them.
              </p>

              <h1 className="mt-4 font-display text-[2.25rem] leading-[0.98] tracking-[-0.03em] text-ink sm:text-[3rem] lg:text-[3.5rem]">
                See your CV the way the machine sees it.
              </h1>

              <p className="mt-5 max-w-lg text-[0.9375rem] leading-relaxed text-ink-2">
                JobAI parses your CV into the fields an applicant tracking system reads, scores
                what it found against six checks, and shows you the keywords each job post is
                screening for that your CV never mentions.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-2.5">
                <Button href={user ? "/cv/upload" : "/register"} size="lg">
                  {user ? "Import your CV" : "Create your account"}
                </Button>
                <Button href="/jobs" size="lg" variant="outline">
                  Browse {openJobs} open roles
                </Button>
              </div>

              <p className="mt-5 font-mono text-[0.6875rem] leading-relaxed text-ink-3">
                No API keys. Every score is computed on your own server from your own CV.
              </p>
            </div>

            <div className="lg:pl-4">
              <ScanDemo />
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* How it works — a real sequence, so it is numbered               */}
        {/* ---------------------------------------------------------------- */}
        <section id="how-it-works" className="border-b border-rule bg-surface">
          <div className="mx-auto w-full max-w-[82rem] px-4 py-14 sm:px-6 lg:px-8 lg:py-18">
            <h2 className="max-w-lg font-display text-[1.625rem] leading-tight tracking-tight text-ink sm:text-[2rem]">
              Three steps, in this order
            </h2>

            <ol className="mt-9 grid gap-px bg-rule md:grid-cols-3">
              {STEPS.map((step, index) => (
                <li key={step.title} className="relative bg-surface p-6">
                  <div className="flex items-center gap-3">
                    <span className="tabular font-mono text-[0.6875rem] text-ink-3">
                      {index + 1}
                    </span>
                    <span className="h-px flex-1 bg-rule" aria-hidden="true" />
                    <step.icon className="size-4 text-ink-3" aria-hidden="true" />
                  </div>

                  <h3 className="mt-4 text-[1rem] font-semibold text-ink">{step.title}</h3>
                  <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-2">{step.body}</p>

                  <Link
                    href={step.href}
                    className="mt-4 inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-ink underline decoration-[var(--mark-deep)] decoration-2 underline-offset-4 transition-colors hover:text-[var(--mark-deep)]"
                  >
                    {step.action}
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* The six checks                                                   */}
        {/* ---------------------------------------------------------------- */}
        <section id="ats" className="border-b border-rule">
          <div className="mx-auto grid w-full max-w-[82rem] gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8 lg:py-18">
            <div className="max-w-sm">
              <h2 className="font-display text-[1.625rem] leading-tight tracking-tight text-ink sm:text-[2rem]">
                What the score is made of
              </h2>
              <p className="mt-4 text-[0.875rem] leading-relaxed text-ink-2">
                Nothing here is a black box. Six checks share 100 points, and every one of them
                reports the points it withheld along with the change that earns them.
              </p>
              <p className="mt-4 font-mono text-[0.6875rem] leading-relaxed text-ink-3">
                lib/ats.js — read it, change the weights, re-score.
              </p>
            </div>

            <dl className="grid gap-px bg-rule sm:grid-cols-2">
              {CHECKS.map((check) => (
                <div key={check.name} className="bg-surface p-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-[0.9375rem] font-semibold text-ink">{check.name}</dt>
                    <span className="tabular shrink-0 font-mono text-[0.6875rem] text-ink-3">
                      {check.points} pts
                    </span>
                  </div>
                  <dd className="mt-2 text-[0.8125rem] leading-relaxed text-ink-2">
                    {check.detail}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Keyword matching, shown with a real posting                      */}
        {/* ---------------------------------------------------------------- */}
        {sampleJob ? (
          <section className="border-b border-rule bg-surface">
            <div className="mx-auto grid w-full max-w-[82rem] gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-18">
              <div className="max-w-md">
                <h2 className="font-display text-[1.625rem] leading-tight tracking-tight text-ink sm:text-[2rem]">
                  Every posting, read against your CV
                </h2>
                <p className="mt-4 text-[0.875rem] leading-relaxed text-ink-2">
                  A job post is a keyword list with prose around it. JobAI pulls those keywords
                  out, marks the ones your CV already proves, and leaves the rest plain — those are
                  the words to earn before you apply.
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-2 text-[0.75rem] text-ink-3">
                  <span className="flex items-center gap-1.5">
                    <Keyword hit>matched</Keyword> in your CV
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Keyword>missing</Keyword> not mentioned
                  </span>
                </div>
              </div>

              <div className="rounded-[var(--radius-panel)] border border-rule bg-surface-2 p-5">
                <p className="font-mono text-[0.6875rem] text-ink-3">Open right now</p>
                <h3 className="mt-2 text-[1.0625rem] font-semibold leading-snug text-ink">
                  {sampleJob.title}
                </h3>

                <table className="mt-3 w-full text-[0.8125rem]">
                  <tbody>
                    <tr>
                      <th scope="row" className="w-28 py-1 text-left font-normal text-ink-3">
                        Company
                      </th>
                      <td className="py-1 text-ink-2">{sampleJob.company}</td>
                    </tr>
                    <tr>
                      <th scope="row" className="py-1 text-left font-normal text-ink-3">
                        Location
                      </th>
                      <td className="py-1 text-ink-2">
                        {sampleJob.location} ({LABELS.workMode[sampleJob.workMode]})
                      </td>
                    </tr>
                    <tr>
                      <th scope="row" className="py-1 text-left font-normal text-ink-3">
                        Salary
                      </th>
                      <td className="py-1 text-ink-2">
                        {formatSalary(
                          sampleJob.salaryMin,
                          sampleJob.salaryMax,
                          sampleJob.salaryCurrency,
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="mt-4 border-t border-rule pt-4">
                  <p className="text-[0.75rem] text-ink-3">Screening for</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {sampleJob.tags.map((tag, index) => (
                      <Keyword key={tag} hit={index % 3 !== 2}>
                        {tag}
                      </Keyword>
                    ))}
                  </div>
                </div>

                <Button href={`/jobs/${sampleJob.id}`} size="sm" variant="outline" className="mt-5">
                  Open this posting
                </Button>
              </div>
            </div>
          </section>
        ) : null}

        {/* ---------------------------------------------------------------- */}
        {/* Close                                                            */}
        {/* ---------------------------------------------------------------- */}
        <section className="bg-shell text-shell-ink">
          <div className="mx-auto flex w-full max-w-[82rem] flex-col items-start gap-6 px-4 py-14 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div className="max-w-xl">
              <h2 className="font-display text-[1.625rem] leading-tight tracking-tight sm:text-[2rem]">
                Score the CV you already have
              </h2>
              <p className="mt-3 text-[0.875rem] leading-relaxed text-shell-ink-2">
                {openJobs} roles across {facets.companies} companies are open right now, and the
                CV you upload is scored the moment it is parsed.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <Button href={user ? "/dashboard" : "/register"} variant="mark" size="lg">
                {user ? "Go to your dashboard" : "Create your account"}
              </Button>
              <Button
                href="/jobs"
                size="lg"
                variant="ghost"
                className="text-shell-ink hover:bg-shell-2"
              >
                Browse jobs first
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
