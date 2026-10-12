import { cn } from "@/lib/utils";

/**
 * The CV itself, rendered as a single-column A4 sheet.
 *
 * Single column is deliberate: multi-column résumés are the most common
 * reason a parser scrambles a document, and this page is the one that gets
 * printed. The same component renders the live preview in the builder, the
 * print page, and the snapshot an admin reads on an application.
 */
export function ResumeSheet({ resume, scale = "full", className }) {
  if (!resume) return null;

  const contact = [resume.email, resume.phone, resume.location, resume.website].filter(Boolean);
  const compact = scale === "compact";

  return (
    <article
      className={cn(
        "print-sheet mx-auto w-full bg-surface text-ink",
        compact ? "p-5 text-[0.6875rem]" : "p-8 text-[0.8125rem] sm:p-10",
        className,
      )}
      style={{ maxWidth: compact ? undefined : "48rem" }}
    >
      {/* Header */}
      <header className="border-b border-rule pb-4">
        <h1
          className={cn(
            "font-display leading-none tracking-tight",
            compact ? "text-[1.0625rem]" : "text-[1.75rem]",
          )}
        >
          {resume.fullName || "Your name"}
        </h1>
        {resume.headline ? (
          <p className={cn("mt-1.5 text-ink-2", compact ? "text-[0.6875rem]" : "text-[0.9375rem]")}>
            {resume.headline}
          </p>
        ) : null}

        {contact.length ? (
          <ul
            className={cn(
              "mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-ink-3",
              compact ? "text-[0.5625rem]" : "text-[0.75rem]",
            )}
          >
            {contact.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
      </header>

      {resume.summary ? (
        <Section title="Summary" compact={compact}>
          <p className="max-w-[72ch] leading-relaxed text-ink-2">{resume.summary}</p>
        </Section>
      ) : null}

      {resume.experience?.length ? (
        <Section title="Experience" compact={compact}>
          <div className={cn("grid", compact ? "gap-3" : "gap-4")}>
            {resume.experience.map((role, index) => (
              <div key={role.id || index}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <h3 className={cn("font-semibold", compact ? "text-[0.75rem]" : "text-[0.9375rem]")}>
                    {role.role || "Role"}
                  </h3>
                  <span
                    className={cn(
                      "tabular shrink-0 text-ink-3",
                      compact ? "text-[0.5625rem]" : "text-[0.75rem]",
                    )}
                  >
                    {[role.startDate, role.current ? "Present" : role.endDate]
                      .filter(Boolean)
                      .join(" – ")}
                  </span>
                </div>

                <p className={cn("text-ink-2", compact ? "text-[0.625rem]" : "text-[0.8125rem]")}>
                  {[role.company, role.location].filter(Boolean).join(" · ")}
                </p>

                {role.achievements?.filter(Boolean).length ? (
                  <ul className={cn("mt-1.5 grid", compact ? "gap-1" : "gap-1.5")}>
                    {role.achievements.filter(Boolean).map((line, lineIndex) => (
                      <li key={lineIndex} className="flex gap-2 leading-relaxed text-ink-2">
                        <span
                          className={cn(
                            "shrink-0 rounded-full bg-rule-strong",
                            compact ? "mt-[0.35rem] size-1" : "mt-[0.45rem] size-1.5",
                          )}
                          aria-hidden="true"
                        />
                        <span className="max-w-[72ch]">{line}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {resume.projects?.length ? (
        <Section title="Projects" compact={compact}>
          <div className={cn("grid", compact ? "gap-2" : "gap-3")}>
            {resume.projects.map((project, index) => (
              <div key={project.id || index}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <h3 className={cn("font-semibold", compact ? "text-[0.75rem]" : "text-[0.9375rem]")}>
                    {project.name}
                  </h3>
                  {project.url ? (
                    <span
                      className={cn("text-ink-3", compact ? "text-[0.5625rem]" : "text-[0.6875rem]")}
                    >
                      {project.url.replace(/^https?:\/\//, "")}
                    </span>
                  ) : null}
                </div>
                {project.description ? (
                  <p className="mt-1 max-w-[72ch] leading-relaxed text-ink-2">
                    {project.description}
                  </p>
                ) : null}
                {project.stack?.length ? (
                  <p
                    className={cn(
                      "mt-1 font-mono text-ink-3",
                      compact ? "text-[0.5625rem]" : "text-[0.6875rem]",
                    )}
                  >
                    {project.stack.join(" · ")}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {resume.education?.length ? (
        <Section title="Education" compact={compact}>
          <div className="grid gap-2.5">
            {resume.education.map((item, index) => (
              <div key={item.id || index} className="flex flex-wrap items-baseline justify-between gap-x-3">
                <div>
                  <h3 className={cn("font-semibold", compact ? "text-[0.75rem]" : "text-[0.9375rem]")}>
                    {item.degree}
                  </h3>
                  <p className={cn("text-ink-2", compact ? "text-[0.625rem]" : "text-[0.8125rem]")}>
                    {[item.school, item.location, item.grade].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <span
                  className={cn(
                    "tabular shrink-0 text-ink-3",
                    compact ? "text-[0.5625rem]" : "text-[0.75rem]",
                  )}
                >
                  {[item.startDate, item.endDate].filter(Boolean).join(" – ")}
                </span>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {resume.skills?.length ? (
        <Section title="Skills" compact={compact}>
          <p className="leading-relaxed text-ink-2">{resume.skills.join(" · ")}</p>
        </Section>
      ) : null}

      {resume.certifications?.length || resume.languages?.length ? (
        <div className="grid gap-x-8 sm:grid-cols-2">
          {resume.certifications?.length ? (
            <Section title="Certifications" compact={compact}>
              <ul className="grid gap-1">
                {resume.certifications.map((item, index) => (
                  <li key={item.id || index} className="text-ink-2">
                    {[item.name, item.issuer, item.year].filter(Boolean).join(" · ")}
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {resume.languages?.length ? (
            <Section title="Languages" compact={compact}>
              <ul className="grid gap-1">
                {resume.languages.map((item, index) => (
                  <li key={item.id || index} className="text-ink-2">
                    {[item.name, item.level].filter(Boolean).join(" — ")}
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function Section({ title, compact, children }) {
  return (
    <section className={compact ? "mt-3" : "mt-5"}>
      <h2
        className={cn(
          "mb-2 border-b border-rule pb-1 font-semibold tracking-[0.08em] text-ink-3",
          compact ? "text-[0.5625rem]" : "text-[0.6875rem]",
        )}
      >
        {title.toUpperCase()}
      </h2>
      {children}
    </section>
  );
}
