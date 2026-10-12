"use client";

import { Check } from "lucide-react";

import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { useToast } from "@/components/ui/Toast";
import { useFormState } from "@/hooks/useFormState";
import { patch } from "@/lib/client-api";
import { passwordStrength } from "@/lib/auth/password";
import { cn } from "@/lib/utils";

const RULES = [
  { key: "length", label: "At least 8 characters" },
  { key: "number", label: "Contains a number" },
  { key: "letter", label: "Contains a letter" },
];

export function PasswordForm() {
  const toast = useToast();
  const form = useFormState({ currentPassword: "", newPassword: "" });
  const { checks } = passwordStrength(form.values.newPassword);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const result = await form.submit(() =>
      patch("/api/auth/password", {
        currentPassword: form.values.currentPassword,
        newPassword: form.values.newPassword,
      }),
    );
    if (result) {
      toast.success(result.message);
      form.reset({ currentPassword: "", newPassword: "" });
    }
  };

  return (
    <Panel as="form" onSubmit={handleSubmit}>
      <PanelHeader
        title="Password"
        description="Changing it signs out every other device straight away."
      />
      <PanelBody className="grid gap-4">
        {form.error ? <Alert tone="danger">{form.error}</Alert> : null}

        <Field
          label="Current password"
          htmlFor="currentPassword"
          error={form.fieldErrors.currentPassword}
        >
          <Input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            value={form.values.currentPassword}
            onChange={form.handleChange}
            error={form.fieldErrors.currentPassword}
            required
          />
        </Field>

        <Field label="New password" htmlFor="newPassword" error={form.fieldErrors.newPassword}>
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            value={form.values.newPassword}
            onChange={form.handleChange}
            error={form.fieldErrors.newPassword}
            required
          />
          <ul className="mt-1 grid gap-1">
            {RULES.map((rule) => {
              const met = checks[rule.key];
              return (
                <li key={rule.key} className="flex items-center gap-1.5 text-[0.6875rem]">
                  <span
                    className={cn(
                      "grid size-3.5 place-items-center rounded-full",
                      met ? "bg-mark text-mark-ink" : "bg-surface-3 text-ink-3",
                    )}
                  >
                    <Check className="size-2.5" aria-hidden="true" />
                  </span>
                  <span className={met ? "text-ink-2" : "text-ink-3"}>{rule.label}</span>
                </li>
              );
            })}
          </ul>
        </Field>
      </PanelBody>
      <PanelFooter>
        <p className="text-[0.75rem] text-ink-3">You stay signed in on this device.</p>
        <Button type="submit" size="sm" loading={form.submitting}>
          Change password
        </Button>
      </PanelFooter>
    </Panel>
  );
}
