"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Briefcase, Eye, Plus, Search, Trash2 } from "lucide-react";

import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/Table";
import { Alert } from "@/components/ui/Alert";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { useDebounced } from "@/hooks/useDebounced";
import { useFormState } from "@/hooks/useFormState";
import { del, patch, post } from "@/lib/client-api";
import {
  EMPLOYMENT_TYPES,
  JOB_STATUSES,
  LABELS,
  SENIORITIES,
  WORK_MODES,
} from "@/lib/constants";
import { formatRelative, formatSalary, parseList } from "@/lib/utils";

const BLANK = {
  title: "",
  company: "",
  location: "",
  workMode: "ONSITE",
  employmentType: "FULL_TIME",
  seniority: "MID",
  salaryMin: "",
  salaryMax: "",
  salaryCurrency: "GEL",
  description: "",
  requirements: "",
  benefits: "",
  tags: "",
  status: "OPEN",
  externalUrl: "",
};

export function JobsManager({ jobs, query }) {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();

  const [search, setSearch] = useState(query.search);
  const debounced = useDebounced(search, 350);
  const [editing, setEditing] = useState(null); // null | "new" | job
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [pending, setPending] = useState("");

  const form = useFormState(BLANK);

  const apply = (updates) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value) next.delete(key);
      else next.set(key, String(value));
    }
    router.push(`/admin/jobs?${next.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (debounced === (params.get("search") || "")) return;
    apply({ search: debounced });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const openNew = () => {
    form.reset(BLANK);
    setEditing("new");
  };

  const openEdit = (job) => {
    form.reset({
      ...BLANK,
      ...job,
      salaryMin: job.salaryMin ?? "",
      salaryMax: job.salaryMax ?? "",
      requirements: (job.requirements || []).join("\n"),
      benefits: (job.benefits || []).join("\n"),
      tags: (job.tags || []).join(", "),
      externalUrl: job.externalUrl || "",
    });
    setEditing(job);
  };

  const submit = async (event) => {
    event.preventDefault();

    const payload = {
      ...form.values,
      requirements: parseList(form.values.requirements),
      benefits: parseList(form.values.benefits),
      tags: parseList(form.values.tags),
      salaryMin: form.values.salaryMin === "" ? null : form.values.salaryMin,
      salaryMax: form.values.salaryMax === "" ? null : form.values.salaryMax,
    };

    const result = await form.submit(async () =>
      editing === "new"
        ? post("/api/jobs", payload)
        : patch(`/api/jobs/${editing.id}`, payload),
    );

    if (result) {
      toast.success(editing === "new" ? "Job published." : "Job updated.");
      setEditing(null);
      router.refresh();
    }
  };

  const setStatus = async (job, status) => {
    setPending(job.id);
    try {
      await patch(`/api/jobs/${job.id}`, { status });
      toast.success(
        `“${job.title}” is now ${LABELS.jobStatus[status].toLowerCase()}.`,
      );
      router.refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setPending("");
    }
  };

  const remove = async () => {
    setPending(confirmDelete.id);
    try {
      await del(`/api/jobs/${confirmDelete.id}`);
      toast.success("Job deleted.");
      setConfirmDelete(null);
      router.refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setPending("");
    }
  };

  return (
    <>
      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <Input
          icon={Search}
          placeholder="Search title, company or description"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search postings"
        />
        <Select
          value={query.status}
          onChange={(event) => apply({ status: event.target.value })}
          aria-label="Filter by status"
          className="sm:w-40"
        >
          <option value="">Any status</option>
          {JOB_STATUSES.map((status) => (
            <option key={status} value={status}>
              {LABELS.jobStatus[status]}
            </option>
          ))}
        </Select>
        <Button onClick={openNew}>
          <Plus className="size-4" aria-hidden="true" />
          New posting
        </Button>
      </div>

      {jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No postings here"
          description="Publish the first one and it appears on the public job board straight away."
          action={{ label: "New posting", onClick: openNew }}
        />
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Posting</Th>
                <Th className="hidden lg:table-cell">Type</Th>
                <Th className="hidden md:table-cell">Salary</Th>
                <Th>Applications</Th>
                <Th className="hidden sm:table-cell">Views</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <Tr key={job.id}>
                  <Td>
                    <button
                      type="button"
                      onClick={() => openEdit(job)}
                      className="text-left"
                    >
                      <span className="block text-[0.8125rem] font-medium text-ink">
                        {job.title}
                      </span>
                      <span className="block text-[0.6875rem] text-ink-3">
                        {job.company} · {job.location} ·{" "}
                        {formatRelative(job.createdAt)}
                      </span>
                    </button>
                  </Td>
                  <Td className="hidden lg:table-cell">
                    <span className="flex flex-wrap gap-1">
                      <Badge tone="neutral">
                        {LABELS.workMode[job.workMode]}
                      </Badge>
                      <Badge tone="muted">
                        {LABELS.seniority[job.seniority]}
                      </Badge>
                    </span>
                  </Td>
                  <Td className="tabular hidden whitespace-nowrap text-[0.75rem] md:table-cell">
                    {formatSalary(
                      job.salaryMin,
                      job.salaryMax,
                      job.salaryCurrency,
                    )}
                  </Td>
                  <Td className="tabular">
                    {job.applicationCount ? (
                      <Link
                        href={`/admin/applications?jobId=${job.id}`}
                        className="underline decoration-[var(--mark-deep)] decoration-2 underline-offset-4"
                      >
                        {job.applicationCount}
                      </Link>
                    ) : (
                      "0"
                    )}
                  </Td>
                  <Td className="tabular hidden sm:table-cell">{job.views}</Td>
                  <Td>
                    <Select
                      value={job.status}
                      onChange={(event) => setStatus(job, event.target.value)}
                      disabled={pending === job.id}
                      aria-label={`Status for ${job.title}`}
                      className="h-8 w-28 text-[0.75rem]"
                    >
                      {JOB_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {LABELS.jobStatus[status]}
                        </option>
                      ))}
                    </Select>
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        as="a"
                        href={`/jobs/${job.id}`}
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`View ${job.title}`}
                        title="View the public posting"
                      >
                        <Eye className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setConfirmDelete(job)}
                        aria-label={`Delete ${job.title}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}

      {/* Create / edit */}
      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={
          editing === "new" ? "New posting" : `Edit “${editing?.title || ""}”`
        }
        description="Tags are what the match score reads, so list the real technologies."
        size="lg"
        footer={
          <>
            <Button variant="quiet" size="sm" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={submit} loading={form.submitting}>
              {editing === "new" ? "Publish" : "Save changes"}
            </Button>
          </>
        }
      >
        <form onSubmit={submit} className="grid gap-4">
          {form.error ? <Alert tone="danger">{form.error}</Alert> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Role title" error={form.fieldErrors.title} required>
              <Input
                name="title"
                value={form.values.title}
                onChange={form.handleChange}
                error={form.fieldErrors.title}
                placeholder="Frontend developer (React)"
              />
            </Field>
            <Field label="Company" error={form.fieldErrors.company} required>
              <Input
                name="company"
                value={form.values.company}
                onChange={form.handleChange}
                error={form.fieldErrors.company}
              />
            </Field>
            <Field label="Location" error={form.fieldErrors.location} required>
              <Input
                name="location"
                value={form.values.location}
                onChange={form.handleChange}
                error={form.fieldErrors.location}
                placeholder="Tbilisi, Georgia"
              />
            </Field>
            <Field label="Work mode">
              <Select
                name="workMode"
                value={form.values.workMode}
                onChange={form.handleChange}
              >
                {WORK_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {LABELS.workMode[mode]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Contract type">
              <Select
                name="employmentType"
                value={form.values.employmentType}
                onChange={form.handleChange}
              >
                {EMPLOYMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {LABELS.employmentType[type]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Seniority">
              <Select
                name="seniority"
                value={form.values.seniority}
                onChange={form.handleChange}
              >
                {SENIORITIES.map((level) => (
                  <option key={level} value={level}>
                    {LABELS.seniority[level]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Salary from" error={form.fieldErrors.salaryMin}>
              <Input
                name="salaryMin"
                value={form.values.salaryMin}
                onChange={form.handleChange}
                inputMode="numeric"
                placeholder="2500"
              />
            </Field>
            <Field label="Salary to" error={form.fieldErrors.salaryMax}>
              <Input
                name="salaryMax"
                value={form.values.salaryMax}
                onChange={form.handleChange}
                inputMode="numeric"
                placeholder="4000"
              />
            </Field>
            <Field label="Currency">
              <Select
                name="salaryCurrency"
                value={form.values.salaryCurrency}
                onChange={form.handleChange}
              >
                {["GEL", "USD", "EUR", "GBP"].map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field
            label="Description"
            error={form.fieldErrors.description}
            hint="At least 30 characters"
            required
          >
            <Textarea
              name="description"
              rows={5}
              value={form.values.description}
              onChange={form.handleChange}
              error={form.fieldErrors.description}
              placeholder="What the team does, what the person will own, and who they work with."
            />
          </Field>

          <Field label="Requirements" hint="One per line">
            <Textarea
              name="requirements"
              rows={4}
              value={form.values.requirements}
              onChange={form.handleChange}
              placeholder={"Two years with React\nComfortable with TypeScript"}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Benefits" hint="One per line">
              <Textarea
                name="benefits"
                rows={3}
                value={form.values.benefits}
                onChange={form.handleChange}
              />
            </Field>
            <Field label="Tags" hint="Comma separated — these drive matching">
              <Textarea
                name="tags"
                rows={3}
                value={form.values.tags}
                onChange={form.handleChange}
                placeholder="React, Next.js, TypeScript"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Status">
              <Select
                name="status"
                value={form.values.status}
                onChange={form.handleChange}
              >
                {JOB_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {LABELS.jobStatus[status]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Original posting URL" hint="Optional">
              <Input
                name="externalUrl"
                value={form.values.externalUrl}
                onChange={form.handleChange}
                placeholder="https://"
              />
            </Field>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={remove}
        loading={pending === confirmDelete?.id}
        title={confirmDelete ? `Delete “${confirmDelete.title}”?` : ""}
        description={
          confirmDelete
            ? `${confirmDelete.applicationCount || 0} application(s) attached to this posting are deleted with it. Closing the posting instead keeps the record.`
            : ""
        }
        confirmLabel="Delete posting"
      />
    </>
  );
}
