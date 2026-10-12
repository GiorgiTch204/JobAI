import { z } from "zod";

import {
  APPLICATION_STATUSES,
  EMPLOYMENT_TYPES,
  SENIORITIES,
  USER_ROLES,
  USER_STATUSES,
  WORK_MODES,
} from "./constants.js";

/* -------------------------------------------------------------------------- */
/* primitives                                                                 */
/* -------------------------------------------------------------------------- */

const trimmed = (max) => z.string().trim().max(max);

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .max(190)
  .email("That email address does not look right.")
  .transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(128, "That password is too long.")
  .refine((value) => /\d/.test(value), "Include at least one number.")
  .refine((value) => /[a-zA-Z]/.test(value), "Include at least one letter.");

const optionalText = (max) => trimmed(max).optional().or(z.literal(""));

/* -------------------------------------------------------------------------- */
/* auth                                                                       */
/* -------------------------------------------------------------------------- */

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(80),
  email: emailSchema,
  password: passwordSchema,
  acceptedTerms: z
    .boolean()
    .optional()
    .transform((value) => value ?? true),
});

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Enter your email address.").max(190).toLowerCase(),
  password: z.string().min(1, "Enter your password."),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: passwordSchema,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "Choose a password you have not used here before.",
    path: ["newPassword"],
  });

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(80).optional(),
  headline: optionalText(120),
  phone: optionalText(40),
  location: optionalText(120),
  website: optionalText(200),
  bio: optionalText(600),
});

/* -------------------------------------------------------------------------- */
/* résumé                                                                     */
/* -------------------------------------------------------------------------- */

export const experienceSchema = z.object({
  id: optionalText(40),
  role: trimmed(120).default(""),
  company: trimmed(120).default(""),
  location: optionalText(120),
  startDate: optionalText(40),
  endDate: optionalText(40),
  current: z.boolean().optional().default(false),
  achievements: z.array(trimmed(400)).max(12).default([]),
});

export const educationSchema = z.object({
  id: optionalText(40),
  degree: trimmed(140).default(""),
  school: trimmed(140).default(""),
  location: optionalText(120),
  startDate: optionalText(40),
  endDate: optionalText(40),
  grade: optionalText(60),
});

export const projectSchema = z.object({
  id: optionalText(40),
  name: trimmed(120).default(""),
  url: optionalText(200),
  description: optionalText(500),
  stack: z.array(trimmed(40)).max(20).default([]),
});

export const languageSchema = z.object({
  id: optionalText(40),
  name: trimmed(60).default(""),
  level: optionalText(40),
});

export const certificationSchema = z.object({
  id: optionalText(40),
  name: trimmed(140).default(""),
  issuer: optionalText(140),
  year: optionalText(20),
});

export const resumeSchema = z.object({
  title: trimmed(80).optional(),
  fullName: trimmed(80).optional(),
  headline: optionalText(120),
  email: z.union([emailSchema, z.literal("")]).optional(),
  phone: optionalText(40),
  location: optionalText(120),
  website: optionalText(200),
  summary: optionalText(1200),
  skills: z.array(trimmed(50)).max(60).optional(),
  experience: z.array(experienceSchema).max(20).optional(),
  education: z.array(educationSchema).max(12).optional(),
  projects: z.array(projectSchema).max(12).optional(),
  languages: z.array(languageSchema).max(10).optional(),
  certifications: z.array(certificationSchema).max(12).optional(),
});

export const resumeCreateSchema = resumeSchema.extend({
  source: z.enum(["builder", "upload"]).optional(),
  sourceFile: optionalText(200),
});

/* -------------------------------------------------------------------------- */
/* jobs + applications                                                        */
/* -------------------------------------------------------------------------- */

const salary = z
  .union([z.number(), z.string()])
  .optional()
  .nullable()
  .transform((value) => {
    if (value === "" || value === null || value === undefined) return null;
    const n = Number(String(value).replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
  });

const jobBaseSchema = z.object({
  title: z.string().trim().min(3, "Give the role a title.").max(140),
  company: z.string().trim().min(2, "Which company is hiring?").max(140),
  location: z.string().trim().min(2, "Add a location.").max(140),
  workMode: z.enum(WORK_MODES).default("ONSITE"),
  employmentType: z.enum(EMPLOYMENT_TYPES).default("FULL_TIME"),
  seniority: z.enum(SENIORITIES).default("MID"),
  salaryMin: salary,
  salaryMax: salary,
  salaryCurrency: trimmed(8).default("USD"),
  description: z.string().trim().min(30, "Describe the role in at least 30 characters.").max(8000),
  requirements: z.array(trimmed(300)).max(30).default([]),
  benefits: z.array(trimmed(200)).max(20).default([]),
  tags: z.array(trimmed(40)).max(25).default([]),
  status: z.enum(["OPEN", "CLOSED", "DRAFT"]).default("OPEN"),
  externalUrl: optionalText(300),
});

const salaryOrderIsValid = (data) =>
  !(data.salaryMin && data.salaryMax) || data.salaryMax >= data.salaryMin;

const salaryOrderMessage = {
  message: "The maximum salary must be at least the minimum.",
  path: ["salaryMax"],
};

export const jobSchema = jobBaseSchema.refine(salaryOrderIsValid, salaryOrderMessage);

export const jobUpdateSchema = jobBaseSchema
  .partial()
  .refine(salaryOrderIsValid, salaryOrderMessage);

export const applySchema = z.object({
  resumeId: optionalText(60),
  coverLetter: optionalText(4000),
});

export const applicationStatusSchema = z.object({
  status: z.enum(APPLICATION_STATUSES),
  note: optionalText(500),
});

/* -------------------------------------------------------------------------- */
/* admin                                                                      */
/* -------------------------------------------------------------------------- */

export const adminUserPatchSchema = z
  .object({
    role: z.enum(USER_ROLES).optional(),
    status: z.enum(USER_STATUSES).optional(),
  })
  .refine((data) => data.role || data.status, { message: "Nothing to update." });

export const optimizeSchema = z.object({
  text: z.string().trim().min(3, "Paste the bullet you want to improve.").max(600),
  targetRole: optionalText(120),
  keywords: z.array(trimmed(40)).max(30).optional(),
});

export const scoreSchema = z.object({
  resumeId: optionalText(60),
  resume: resumeSchema.optional(),
  jobId: optionalText(60),
});

/* -------------------------------------------------------------------------- */
/* helper                                                                     */
/* -------------------------------------------------------------------------- */

/** `{ data }` on success, `{ error }` (a ZodError) on failure. */
export function parse(schema, payload) {
  const result = schema.safeParse(payload);
  return result.success ? { data: result.data } : { error: result.error };
}
