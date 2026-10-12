"use client";

import { useRouter } from "next/navigation";

import {
  Panel,
  PanelBody,
  PanelFooter,
  PanelHeader,
} from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/components/providers/AuthProvider";
import { useFormState } from "@/hooks/useFormState";

export function ProfileForm({ user }) {
  const router = useRouter();
  const toast = useToast();
  const { updateProfile } = useAuth();

  const form = useFormState({
    name: user.name || "",
    headline: user.headline || "",
    phone: user.phone || "",
    location: user.location || "",
    website: user.website || "",
    bio: user.bio || "",
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    const result = await form.submit(() => updateProfile(form.values));
    if (result) {
      toast.success("Profile saved.");
      router.refresh();
    }
  };

  return (
    <Panel as="form" onSubmit={handleSubmit}>
      <PanelHeader
        title="Your details"
        description="These prefill a new CV and travel with your applications."
      />
      <PanelBody className="grid gap-4">
        {form.error ? <Alert tone="danger">{form.error}</Alert> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Full name"
            htmlFor="name"
            error={form.fieldErrors.name}
            required
          >
            <Input
              id="name"
              name="name"
              value={form.values.name}
              onChange={form.handleChange}
              error={form.fieldErrors.name}
            />
          </Field>
          <Field
            label="Headline"
            htmlFor="headline"
            error={form.fieldErrors.headline}
          >
            <Input
              id="headline"
              name="headline"
              value={form.values.headline}
              onChange={form.handleChange}
              placeholder="Full-stack developer"
            />
          </Field>
          <Field label="Phone" htmlFor="phone">
            <Input
              id="phone"
              name="phone"
              value={form.values.phone}
              onChange={form.handleChange}
            />
          </Field>
          <Field label="Location" htmlFor="location">
            <Input
              id="location"
              name="location"
              value={form.values.location}
              onChange={form.handleChange}
              placeholder="City, Country"
            />
          </Field>
        </div>

        <Field
          label="Website or GitHub"
          htmlFor="website"
          error={form.fieldErrors.website}
        >
          <Input
            id="website"
            name="website"
            value={form.values.website}
            onChange={form.handleChange}
            placeholder="https://github.com/you"
          />
        </Field>

        <Field label="About you" htmlFor="bio" hint="Optional, 600 characters">
          <Textarea
            id="bio"
            name="bio"
            rows={3}
            value={form.values.bio}
            onChange={form.handleChange}
            maxLength={600}
          />
        </Field>
      </PanelBody>
      <PanelFooter>
        <p className="text-[0.75rem] text-ink-3">
          Your email address cannot be changed here.
        </p>
        <Button type="submit" size="sm" loading={form.submitting}>
          Save changes
        </Button>
      </PanelFooter>
    </Panel>
  );
}
