import { Keyword } from "@/components/ui/Badge";
import { Meter } from "@/components/ui/Meter";
import { MatchBadge } from "./MatchBadge";
import { matchTone } from "@/lib/match";

/**
 * Why the match score is what it is. The missing keywords are the actionable
 * part, so they come last and stay visible.
 */
export function MatchReport({ match, resumeTitle }) {
  if (!match) return null;

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[0.875rem] font-semibold text-ink">Your match</p>
          {resumeTitle ? (
            <p className="mt-0.5 text-[0.75rem] text-ink-3">against “{resumeTitle}”</p>
          ) : null}
        </div>
        <MatchBadge score={match.score} />
      </div>

      <Meter value={match.score} tone={matchTone(match.score)} size="lg" />
      <p className="text-[0.8125rem] leading-relaxed text-ink-2">{match.verdict}</p>

      <dl className="grid gap-2 border-t border-rule pt-3">
        {match.signals.map((signal) => (
          <div key={signal.id} className="flex items-baseline justify-between gap-3">
            <dt className="text-[0.75rem] text-ink-3">{signal.label}</dt>
            <dd className="tabular font-mono text-[0.6875rem] text-ink-2">
              {signal.points}/{signal.max}
            </dd>
          </div>
        ))}
      </dl>

      {match.hits?.length ? (
        <div className="border-t border-rule pt-3">
          <p className="text-[0.75rem] text-ink-3">
            Found in your CV ({match.hits.length})
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {match.hits.slice(0, 14).map((word) => (
              <Keyword key={word} hit>
                {word}
              </Keyword>
            ))}
          </div>
        </div>
      ) : null}

      {match.misses?.length ? (
        <div className="border-t border-rule pt-3">
          <p className="text-[0.75rem] text-ink-3">Not mentioned yet</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {match.misses.map((word) => (
              <Keyword key={word}>{word}</Keyword>
            ))}
          </div>
          <p className="mt-2.5 text-[0.75rem] leading-relaxed text-ink-3">
            Add the ones you can honestly claim to your skills block or an achievement line, then
            re-score.
          </p>
        </div>
      ) : null}
    </div>
  );
}
