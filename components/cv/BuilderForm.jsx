"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CircleCheck,
  Eye,
  FilePlus,
  Plus,
  Save,
  Star,
  Trash2,
  WandSparkles,
  X,
} from "lucide-react";

import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import {
  Checkbox,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { AtsReport } from "./AtsReport";
import { ResumeSheet } from "./ResumeSheet";
import { del, patch, post } from "@/lib/client-api";
import { scoreResume } from "@/lib/ats";
import { cn, uid } from "@/lib/utils";

/**
 * The CV builder.
 *
 * The score on the right is recomputed locally on every keystroke using the
 * same module the server uses, so the feedback is immediate and the saved
 * score always agrees with what was on screen. Saving is explicit — this is a
 * document, and a document should not change under you — with Cmd/Ctrl+S
 * bound and a dirty marker in the header.
 */

const EMPTY = {
  title: "My CV",
  fullName: "",
  headline: "",
  email: "",
  phone: "",
  location: "",
  website: "",
  summary: "",
  skills: [],
  experience: [],
  education: [],
  projects: [],
  languages: [],
  certifications: [],
};

export function BuilderForm({ resumes, activeId }) {
  const router = useRouter();
  const toast = useToast();

  const [list, setList] = useState(resumes);
  const [currentId, setCurrentId] = useState(
    activeId || resumes[0]?.id || null,
  );

  const active = useMemo(
    () => list.find((item) => item.id === currentId) || null,
    [list, currentId],
  );

  const [draft, setDraft] = useState(() => ({ ...EMPTY, ...(active || {}) }));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [view, setView] = useState("score");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [skillInput, setSkillInput] = useState("");

  // Switching documents replaces the draft. Done during render rather than in
  // an effect so the editor never paints one frame of the previous document.
  const [loadedId, setLoadedId] = useState(currentId);
  if (active && currentId !== loadedId) {
    setLoadedId(currentId);
    setDraft({ ...EMPTY, ...active });
    setDirty(false);
    setError("");
    setFieldErrors({});
  }

  const report = useMemo(() => scoreResume(draft), [draft]);

  const update = useCallback((patchObject) => {
    setDraft((current) => ({ ...current, ...patchObject }));
    setDirty(true);
    setError("");
  }, []);

  const handleField = (event) =>
    update({ [event.target.name]: event.target.value });

  /* ------------------------------------------------------------------ */
  /* saving                                                             */
  /* ------------------------------------------------------------------ */

  const save = useCallback(async () => {
    if (!currentId) return;
    setSaving(true);
    setError("");
    setFieldErrors({});

    const payload = {
      title: draft.title,
      fullName: draft.fullName,
      headline: draft.headline,
      email: draft.email,
      phone: draft.phone,
      location: draft.location,
      website: draft.website,
      summary: draft.summary,
      skills: draft.skills,
      experience: draft.experience,
      education: draft.education,
      projects: draft.projects,
      languages: draft.languages,
      certifications: draft.certifications,
    };

    try {
      const data = await patch(`/api/resumes/${currentId}`, payload);
      setList((current) =>
        current.map((item) =>
          item.id === currentId ? { ...item, ...data.resume } : item,
        ),
      );
      setDirty(false);
      toast.success(`Saved. ATS score ${data.report.score}.`);
      router.refresh();
    } catch (caught) {
      if (caught.fields) setFieldErrors(caught.fields);
      setError(caught.message);
      toast.error(caught.message);
    } finally {
      setSaving(false);
    }
  }, [currentId, draft, router, toast]);

  // Cmd/Ctrl+S saves, like any other document editor.
  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (dirty && !saving) save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirty, saving, save]);

  // Warn before losing unsaved edits.
  useEffect(() => {
    if (!dirty) return undefined;
    const handler = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  /* ------------------------------------------------------------------ */
  /* document actions                                                   */
  /* ------------------------------------------------------------------ */

  const createDocument = async () => {
    try {
      const data = await post("/api/resumes", {
        title: `CV ${list.length + 1}`,
        fullName: draft.fullName,
        email: draft.email,
      });
      setList((current) => [...current, data.resume]);
      setCurrentId(data.resume.id);
      toast.success("New CV created.");
      router.refresh();
    } catch (caught) {
      toast.error(caught.message);
    }
  };

  const makePrimary = async () => {
    try {
      await post(`/api/resumes/${currentId}/primary`);
      setList((current) =>
        current.map((item) => ({ ...item, isPrimary: item.id === currentId })),
      );
      toast.success("This CV is now used when you apply.");
      router.refresh();
    } catch (caught) {
      toast.error(caught.message);
    }
  };

  const removeDocument = async () => {
    try {
      await del(`/api/resumes/${currentId}`);
      const remaining = list.filter((item) => item.id !== currentId);
      setList(remaining);
      setCurrentId(remaining[0]?.id || null);
      setConfirmDelete(false);
      toast.success("CV deleted.");
      router.refresh();
    } catch (caught) {
      toast.error(caught.message);
    }
  };

  const draftSummary = async () => {
    try {
      const data = await post("/api/cv/summary", { resume: draft });
      update({ summary: data.summary });
      toast.success(
        "Summary drafted from your own roles and skills — edit it to sound like you.",
      );
    } catch (caught) {
      toast.error(caught.message);
    }
  };

  const improveBullet = async (roleIndex, bulletIndex) => {
    const text = draft.experience[roleIndex]?.achievements?.[bulletIndex];
    if (!text) return;
    try {
      const data = await post("/api/cv/optimize", {
        text,
        targetRole: draft.headline,
      });
      const next = structuredClone(draft.experience);
      next[roleIndex].achievements[bulletIndex] =
        data.result.suggestions?.[0] || data.result.optimized;
      update({ experience: next });
      toast.info(
        data.result.notes[0] || "Rewritten with a stronger opening verb.",
      );
    } catch (caught) {
      toast.error(caught.message);
    }
  };

  /* ------------------------------------------------------------------ */
  /* list helpers                                                       */
  /* ------------------------------------------------------------------ */

  const addSkill = (event) => {
    event.preventDefault();
    const value = skillInput.trim();
    if (!value) return;
    if (
      draft.skills.some((skill) => skill.toLowerCase() === value.toLowerCase())
    ) {
      setSkillInput("");
      return;
    }
    update({ skills: [...draft.skills, value] });
    setSkillInput("");
  };

  const addFromList = (key, item) => update({ [key]: [...draft[key], item] });

  const updateItem = (key, index, patchObject) => {
    const next = [...draft[key]];
    next[index] = { ...next[index], ...patchObject };
    update({ [key]: next });
  };

  const removeItem = (key, index) =>
    update({ [key]: draft[key].filter((_, i) => i !== index) });

  if (!active) {
    return (
      <Panel>
        <PanelBody className="py-12 text-center">
          <h2 className="text-[1rem] font-semibold text-ink">No CV yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-[0.875rem] leading-relaxed text-ink-2">
            Create an empty document and fill it in, or import a file you
            already have.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button onClick={createDocument}>
              <FilePlus className="size-4" aria-hidden="true" />
              New CV
            </Button>
            <Button href="/cv/upload" variant="outline">
              Import a file
            </Button>
          </div>
        </PanelBody>
      </Panel>
    );
  }

  return (
    <>
      {/* Document bar */}
      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-[var(--radius-panel)] border border-rule bg-surface px-3 py-2.5">
        {list.length > 1 ? (
          <Select
            value={currentId}
            onChange={(event) => {
              if (
                dirty &&
                !window.confirm("You have unsaved changes. Switch anyway?")
              )
                return;
              setCurrentId(event.target.value);
            }}
            aria-label="Choose a CV"
            className="w-auto min-w-[12rem]"
          >
            {list.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title} — ATS {item.atsScore}
                {item.isPrimary ? " (primary)" : ""}
              </option>
            ))}
          </Select>
        ) : (
          <span className="px-1 text-[0.875rem] font-medium text-ink">
            {active.title}
          </span>
        )}

        {active.isPrimary ? (
          <Badge tone="mark">primary</Badge>
        ) : (
          <Button variant="ghost" size="sm" onClick={makePrimary}>
            <Star className="size-3.5" aria-hidden="true" />
            Make primary
          </Button>
        )}

        <span className="ml-auto flex items-center gap-2">
          {dirty ? (
            <span className="font-mono text-[0.6875rem] text-warning">
              unsaved changes
            </span>
          ) : (
            <span className="flex items-center gap-1 font-mono text-[0.6875rem] text-ink-3">
              <CircleCheck className="size-3" aria-hidden="true" />
              saved
            </span>
          )}

          <Button variant="quiet" size="sm" onClick={createDocument}>
            <FilePlus className="size-3.5" aria-hidden="true" />
            New
          </Button>
          <Button href="/cv/preview" variant="quiet" size="sm">
            <Eye className="size-3.5" aria-hidden="true" />
            Print view
          </Button>
          {list.length > 1 ? (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete this CV"
            >
              <Trash2 className="size-4" />
            </Button>
          ) : null}
          <Button size="sm" onClick={save} loading={saving} disabled={!dirty}>
            <Save className="size-3.5" aria-hidden="true" />
            Save
          </Button>
        </span>
      </div>

      {error ? (
        <Alert tone="danger" className="mb-4">
          {error}
        </Alert>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr] xl:items-start">
        {/* ------------------------------------------------------------- */}
        {/* Editor                                                        */}
        {/* ------------------------------------------------------------- */}
        <div className="grid gap-5">
          <Panel>
            <PanelHeader
              title="Basics"
              description="The block a parser reads first."
            />
            <PanelBody className="grid gap-4">
              <Field
                label="Document name"
                htmlFor="title"
                hint="Only you see this"
              >
                <Input
                  id="title"
                  name="title"
                  value={draft.title}
                  onChange={handleField}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Full name"
                  htmlFor="fullName"
                  error={fieldErrors.fullName}
                  required
                >
                  <Input
                    id="fullName"
                    name="fullName"
                    value={draft.fullName}
                    onChange={handleField}
                    placeholder="Your first and last name"
                    error={fieldErrors.fullName}
                  />
                </Field>
                <Field
                  label="Headline"
                  htmlFor="headline"
                  hint="The role you want"
                >
                  <Input
                    id="headline"
                    name="headline"
                    value={draft.headline}
                    onChange={handleField}
                    placeholder="Full-stack developer"
                  />
                </Field>
                <Field label="Email" htmlFor="email" error={fieldErrors.email}>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={draft.email}
                    onChange={handleField}
                    error={fieldErrors.email}
                  />
                </Field>
                <Field label="Phone" htmlFor="phone">
                  <Input
                    id="phone"
                    name="phone"
                    value={draft.phone}
                    onChange={handleField}
                  />
                </Field>
                <Field label="Location" htmlFor="location">
                  <Input
                    id="location"
                    name="location"
                    value={draft.location}
                    onChange={handleField}
                    placeholder="City, Country"
                  />
                </Field>
                <Field label="Website or GitHub" htmlFor="website">
                  <Input
                    id="website"
                    name="website"
                    value={draft.website}
                    onChange={handleField}
                  />
                </Field>
              </div>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader
              title="Summary"
              description="Two or three sentences. 25–90 words scores best."
              action={
                <Button variant="quiet" size="sm" onClick={draftSummary}>
                  <WandSparkles className="size-3.5" aria-hidden="true" />
                  Draft from my CV
                </Button>
              }
            />
            <PanelBody>
              <Textarea
                name="summary"
                rows={5}
                value={draft.summary}
                onChange={handleField}
                error={fieldErrors.summary}
                placeholder="What you build, the tools you use, and the kind of role you are looking for."
                maxLength={1200}
              />
              <p className="mt-1.5 tabular text-[0.6875rem] text-ink-3">
                {draft.summary
                  ? draft.summary.trim().split(/\s+/).filter(Boolean).length
                  : 0}{" "}
                words
              </p>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader
              title="Skills"
              description="Eight to eighteen tools you would be interviewed on."
            />
            <PanelBody>
              <form onSubmit={addSkill} className="flex gap-2">
                <Input
                  value={skillInput}
                  onChange={(event) => setSkillInput(event.target.value)}
                  placeholder="React, PostgreSQL, Figma…"
                  aria-label="Add a skill"
                />
                <Button type="submit" variant="outline">
                  <Plus className="size-4" aria-hidden="true" />
                  Add
                </Button>
              </form>

              {draft.skills.length ? (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {draft.skills.map((skill, index) => (
                    <li key={`${skill}-${index}`}>
                      <span className="inline-flex items-center gap-1 rounded-full border border-rule bg-surface-2 py-1 pl-2.5 pr-1 font-mono text-[0.6875rem] text-ink-2">
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeItem("skills", index)}
                          className="grid size-4 place-items-center rounded-full text-ink-3 transition-colors hover:bg-danger-soft hover:text-danger"
                          aria-label={`Remove ${skill}`}
                        >
                          <X className="size-2.5" />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-[0.8125rem] text-ink-3">
                  No skills yet. This is the block keyword matching reads first.
                </p>
              )}
            </PanelBody>
          </Panel>

          {/* Experience */}
          <Panel>
            <PanelHeader
              title="Experience"
              description="Newest role first. Two achievement lines per role, each opening with a verb."
              action={
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={() =>
                    addFromList("experience", {
                      id: uid("exp"),
                      role: "",
                      company: "",
                      location: "",
                      startDate: "",
                      endDate: "",
                      current: false,
                      achievements: [""],
                    })
                  }
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                  Add role
                </Button>
              }
            />
            <PanelBody className="grid gap-4">
              {draft.experience.length === 0 ? (
                <p className="text-[0.8125rem] text-ink-3">
                  No roles yet. Internships, freelance work and university
                  projects all count.
                </p>
              ) : null}

              {draft.experience.map((role, index) => (
                <fieldset
                  key={role.id || index}
                  className="rounded-[var(--radius-field)] border border-rule bg-surface-2 p-4"
                >
                  <legend className="flex w-full items-center justify-between gap-2 px-1">
                    <span className="font-mono text-[0.6875rem] text-ink-3">
                      role {index + 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeItem("experience", index)}
                      aria-label={`Remove role ${index + 1}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </legend>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Job title">
                      <Input
                        value={role.role}
                        onChange={(event) =>
                          updateItem("experience", index, {
                            role: event.target.value,
                          })
                        }
                        placeholder="Frontend developer"
                      />
                    </Field>
                    <Field label="Company">
                      <Input
                        value={role.company}
                        onChange={(event) =>
                          updateItem("experience", index, {
                            company: event.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="Start" hint="e.g. Jun 2024">
                      <Input
                        value={role.startDate}
                        onChange={(event) =>
                          updateItem("experience", index, {
                            startDate: event.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="End">
                      <Input
                        value={role.current ? "" : role.endDate}
                        disabled={role.current}
                        placeholder={role.current ? "Present" : "Mar 2025"}
                        onChange={(event) =>
                          updateItem("experience", index, {
                            endDate: event.target.value,
                          })
                        }
                      />
                    </Field>
                  </div>

                  <Checkbox
                    className="mt-3"
                    checked={Boolean(role.current)}
                    onChange={(event) =>
                      updateItem("experience", index, {
                        current: event.target.checked,
                        endDate: event.target.checked ? "" : role.endDate,
                      })
                    }
                    label="I still work here"
                  />

                  <div className="mt-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[0.8125rem] font-medium text-ink-2">
                        What you achieved
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          updateItem("experience", index, {
                            achievements: [...(role.achievements || []), ""],
                          })
                        }
                      >
                        <Plus className="size-3.5" aria-hidden="true" />
                        Add line
                      </Button>
                    </div>

                    <div className="mt-2 grid gap-2">
                      {(role.achievements || []).map((line, lineIndex) => (
                        <div key={lineIndex} className="flex items-start gap-2">
                          <Textarea
                            rows={2}
                            value={line}
                            onChange={(event) => {
                              const achievements = [...role.achievements];
                              achievements[lineIndex] = event.target.value;
                              updateItem("experience", index, { achievements });
                            }}
                            placeholder="Built X, which reduced Y by Z%"
                            className="flex-1"
                          />
                          <div className="grid gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => improveBullet(index, lineIndex)}
                              aria-label="Improve this line"
                              title="Rewrite with a stronger verb"
                            >
                              <WandSparkles className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() =>
                                updateItem("experience", index, {
                                  achievements: role.achievements.filter(
                                    (_, i) => i !== lineIndex,
                                  ),
                                })
                              }
                              aria-label="Remove this line"
                            >
                              <X className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </fieldset>
              ))}
            </PanelBody>
          </Panel>

          {/* Education */}
          <Panel>
            <PanelHeader
              title="Education"
              description="One entry is enough. A missing education block costs points."
              action={
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={() =>
                    addFromList("education", {
                      id: uid("edu"),
                      degree: "",
                      school: "",
                      location: "",
                      startDate: "",
                      endDate: "",
                      grade: "",
                    })
                  }
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                  Add
                </Button>
              }
            />
            <PanelBody className="grid gap-4">
              {draft.education.map((item, index) => (
                <fieldset
                  key={item.id || index}
                  className="rounded-[var(--radius-field)] border border-rule bg-surface-2 p-4"
                >
                  <legend className="flex w-full items-center justify-between gap-2 px-1">
                    <span className="font-mono text-[0.6875rem] text-ink-3">
                      entry {index + 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeItem("education", index)}
                      aria-label={`Remove entry ${index + 1}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Qualification">
                      <Input
                        value={item.degree}
                        onChange={(event) =>
                          updateItem("education", index, {
                            degree: event.target.value,
                          })
                        }
                        placeholder="BSc Computer Science"
                      />
                    </Field>
                    <Field label="Institution">
                      <Input
                        value={item.school}
                        onChange={(event) =>
                          updateItem("education", index, {
                            school: event.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="Start">
                      <Input
                        value={item.startDate}
                        onChange={(event) =>
                          updateItem("education", index, {
                            startDate: event.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="End or expected">
                      <Input
                        value={item.endDate}
                        onChange={(event) =>
                          updateItem("education", index, {
                            endDate: event.target.value,
                          })
                        }
                      />
                    </Field>
                  </div>
                </fieldset>
              ))}
              {draft.education.length === 0 ? (
                <p className="text-[0.8125rem] text-ink-3">
                  Nothing added yet.
                </p>
              ) : null}
            </PanelBody>
          </Panel>

          {/* Projects */}
          <Panel>
            <PanelHeader
              title="Projects"
              description="Useful when your experience section is short."
              action={
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={() =>
                    addFromList("projects", {
                      id: uid("prj"),
                      name: "",
                      url: "",
                      description: "",
                      stack: [],
                    })
                  }
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                  Add
                </Button>
              }
            />
            <PanelBody className="grid gap-4">
              {draft.projects.map((project, index) => (
                <fieldset
                  key={project.id || index}
                  className="rounded-[var(--radius-field)] border border-rule bg-surface-2 p-4"
                >
                  <legend className="flex w-full items-center justify-between gap-2 px-1">
                    <span className="font-mono text-[0.6875rem] text-ink-3">
                      project {index + 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeItem("projects", index)}
                      aria-label={`Remove project ${index + 1}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </legend>
                  <div className="grid gap-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Name">
                        <Input
                          value={project.name}
                          onChange={(event) =>
                            updateItem("projects", index, {
                              name: event.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="Link">
                        <Input
                          value={project.url}
                          onChange={(event) =>
                            updateItem("projects", index, {
                              url: event.target.value,
                            })
                          }
                          placeholder="https://github.com/…"
                        />
                      </Field>
                    </div>
                    <Field label="What it does">
                      <Textarea
                        rows={2}
                        value={project.description}
                        onChange={(event) =>
                          updateItem("projects", index, {
                            description: event.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="Stack" hint="Comma separated">
                      <Input
                        value={(project.stack || []).join(", ")}
                        onChange={(event) =>
                          updateItem("projects", index, {
                            stack: event.target.value
                              .split(",")
                              .map((item) => item.trim())
                              .filter(Boolean),
                          })
                        }
                      />
                    </Field>
                  </div>
                </fieldset>
              ))}
              {draft.projects.length === 0 ? (
                <p className="text-[0.8125rem] text-ink-3">
                  Nothing added yet.
                </p>
              ) : null}
            </PanelBody>
          </Panel>

          {/* Languages + certifications */}
          <div className="grid gap-5 sm:grid-cols-2">
            <Panel>
              <PanelHeader
                title="Languages"
                action={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      addFromList("languages", {
                        id: uid("lang"),
                        name: "",
                        level: "",
                      })
                    }
                    aria-label="Add a language"
                  >
                    <Plus className="size-4" />
                  </Button>
                }
              />
              <PanelBody className="grid gap-2">
                {draft.languages.map((item, index) => (
                  <div key={item.id || index} className="flex gap-2">
                    <Input
                      value={item.name}
                      onChange={(event) =>
                        updateItem("languages", index, {
                          name: event.target.value,
                        })
                      }
                      placeholder="Georgian"
                      aria-label="Language"
                    />
                    <Select
                      value={item.level}
                      onChange={(event) =>
                        updateItem("languages", index, {
                          level: event.target.value,
                        })
                      }
                      aria-label="Level"
                      className="w-32"
                    >
                      <option value="">Level</option>
                      <option value="Native">Native</option>
                      <option value="Fluent">Fluent</option>
                      <option value="Advanced">Advanced</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Basic">Basic</option>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem("languages", index)}
                      aria-label="Remove language"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
                {draft.languages.length === 0 ? (
                  <p className="text-[0.8125rem] text-ink-3">
                    Nothing added yet.
                  </p>
                ) : null}
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader
                title="Certifications"
                action={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      addFromList("certifications", {
                        id: uid("cert"),
                        name: "",
                        issuer: "",
                        year: "",
                      })
                    }
                    aria-label="Add a certification"
                  >
                    <Plus className="size-4" />
                  </Button>
                }
              />
              <PanelBody className="grid gap-2">
                {draft.certifications.map((item, index) => (
                  <div key={item.id || index} className="grid gap-2">
                    <div className="flex gap-2">
                      <Input
                        value={item.name}
                        onChange={(event) =>
                          updateItem("certifications", index, {
                            name: event.target.value,
                          })
                        }
                        placeholder="Certificate name"
                        aria-label="Certificate name"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem("certifications", index)}
                        aria-label="Remove certification"
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={item.issuer}
                        onChange={(event) =>
                          updateItem("certifications", index, {
                            issuer: event.target.value,
                          })
                        }
                        placeholder="Issuer"
                        aria-label="Issuer"
                      />
                      <Input
                        value={item.year}
                        onChange={(event) =>
                          updateItem("certifications", index, {
                            year: event.target.value,
                          })
                        }
                        placeholder="Year"
                        aria-label="Year"
                        className="w-24"
                      />
                    </div>
                  </div>
                ))}
                {draft.certifications.length === 0 ? (
                  <p className="text-[0.8125rem] text-ink-3">
                    Nothing added yet.
                  </p>
                ) : null}
              </PanelBody>
            </Panel>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* Live score / preview                                          */}
        {/* ------------------------------------------------------------- */}
        <div className="xl:sticky xl:top-20">
          <Panel>
            <div className="flex gap-1 border-b border-rule p-1.5">
              {[
                { value: "score", label: "Score" },
                { value: "sheet", label: "Preview" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setView(option.value)}
                  className={cn(
                    "flex-1 rounded-[var(--radius-field)] px-3 py-1.5 text-[0.8125rem] font-medium transition-colors",
                    view === option.value
                      ? "bg-surface-3 text-ink"
                      : "text-ink-3 hover:text-ink-2",
                  )}
                  aria-pressed={view === option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <PanelBody className="scrollbar-thin max-h-[calc(100dvh-12rem)] overflow-y-auto">
              {view === "score" ? (
                <AtsReport report={report} />
              ) : (
                <div className="rounded-[var(--radius-sheet)] border border-rule">
                  <ResumeSheet resume={draft} scale="compact" />
                </div>
              )}
            </PanelBody>

            {dirty ? (
              <div className="border-t border-rule bg-surface-2 px-5 py-3">
                <p className="text-[0.75rem] text-ink-3">
                  This score is live. Save to store it with the document.
                </p>
              </div>
            ) : null}
          </Panel>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={removeDocument}
        title={`Delete “${active.title}”?`}
        description="Applications you already sent keep their own copy of this CV."
        confirmLabel="Delete CV"
      />
    </>
  );
}
