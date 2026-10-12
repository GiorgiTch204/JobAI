import { CircleCheck } from "lucide-react";

import { Meter, ScoreDial } from "@/components/ui/Meter";
import { Keyword } from "@/components/ui/Badge";
import { gradeFor } from "@/lib/ats";

/**
 * The score, and the reason for it. Every check that withheld points shows
 * the sentence that earns them, so this panel is a to-do list rather than a
 * verdict.
 */
export function AtsReport({ report, wordsLabel = true }) {
  if (!report) return null;
  const grade = gradeFor(report.score);

  return (
    <div className="grid gap-5">
      <ScoreDial
        score={report.score}
        grade={grade.grade}
        tone={grade.tone}
        caption={wordsLabel ? `${report.wordCount} words` : undefined}
      />

      <dl className="grid gap-3.5 border-t border-rule pt-4">
        {report.checks.map((check) => {
          const full = check.points === check.max;
          return (
            <div key={check.id}>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-[0.8125rem] text-ink">
                  {full ? (
                    <CircleCheck className="size-3.5 text-positive" aria-hidden="true" />
                  ) : null}
                  {check.label}
                </dt>
                <dd className="tabular shrink-0 font-mono text-[0.6875rem] text-ink-3">
                  {check.points}/{check.max}
                </dd>
              </div>
              <Meter
                value={check.points}
                max={check.max}
                tone={full ? "positive" : "mark"}
                size="sm"
                className="mt-1.5"
              />
              {!full ? (
                <p className="mt-1.5 text-[0.75rem] leading-relaxed text-ink-3">{check.detail}</p>
              ) : null}
            </div>
          );
        })}
      </dl>

      {report.keywords?.length ? (
        <div className="border-t border-rule pt-4">
          <p className="text-[0.75rem] text-ink-3">
            Keywords a parser would index from your CV
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {report.keywords.slice(0, 18).map((word) => (
              <Keyword key={word} hit>
                {word}
              </Keyword>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
