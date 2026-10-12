"use client";

import { useCallback, useState } from "react";

import { ApiError } from "@/lib/client-api";

/**
 * Form plumbing shared by every form in the app: values, per-field errors
 * from the API, a submitting flag and a single error message to show at the
 * top. Keeps the forms themselves about their own fields.
 */
export function useFormState(initialValues = {}) {
  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const setValue = useCallback((name, value) => {
    setValues((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
    setError("");
  }, []);

  const handleChange = useCallback(
    (event) => {
      const { name, value, type, checked } = event.target;
      setValue(name, type === "checkbox" ? checked : value);
    },
    [setValue],
  );

  const reset = useCallback((next = initialValues) => {
    setValues(next);
    setFieldErrors({});
    setError("");
  }, [initialValues]);

  /** Runs `task`, routing API validation errors to the right fields. */
  const submit = useCallback(async (task) => {
    setSubmitting(true);
    setError("");
    setFieldErrors({});
    try {
      return await task();
    } catch (caught) {
      if (caught instanceof ApiError) {
        if (caught.fields) setFieldErrors(caught.fields);
        setError(caught.message);
      } else {
        setError(caught?.message || "Something went wrong.");
      }
      return null;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return {
    values,
    setValues,
    setValue,
    handleChange,
    fieldErrors,
    setFieldErrors,
    error,
    setError,
    submitting,
    submit,
    reset,
  };
}
