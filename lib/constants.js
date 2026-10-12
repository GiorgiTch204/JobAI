export const USER_ROLES = ["USER", "ADMIN"];
export const USER_STATUSES = ["ACTIVE", "SUSPENDED"];

export const WORK_MODES = ["REMOTE", "HYBRID", "ONSITE"];
export const EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP"];
export const SENIORITIES = ["INTERN", "JUNIOR", "MID", "SENIOR", "LEAD"];
export const JOB_STATUSES = ["OPEN", "CLOSED", "DRAFT"];

export const APPLICATION_STATUSES = [
  "SUBMITTED",
  "IN_REVIEW",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
];

/** Human labels — the single source of truth for every status chip. */
export const LABELS = {
  role: { USER: "Member", ADMIN: "Admin" },
  userStatus: { ACTIVE: "Active", SUSPENDED: "Suspended" },
  workMode: { REMOTE: "Remote", HYBRID: "Hybrid", ONSITE: "On site" },
  employmentType: {
    FULL_TIME: "Full time",
    PART_TIME: "Part time",
    CONTRACT: "Contract",
    INTERNSHIP: "Internship",
  },
  seniority: {
    INTERN: "Intern",
    JUNIOR: "Junior",
    MID: "Mid level",
    SENIOR: "Senior",
    LEAD: "Lead",
  },
  jobStatus: { OPEN: "Open", CLOSED: "Closed", DRAFT: "Draft" },
  applicationStatus: {
    SUBMITTED: "Submitted",
    IN_REVIEW: "In review",
    INTERVIEW: "Interview",
    OFFER: "Offer",
    REJECTED: "Not selected",
    WITHDRAWN: "Withdrawn",
  },
};

/** Tone keys consumed by the Badge component. */
export const STATUS_TONE = {
  SUBMITTED: "neutral",
  IN_REVIEW: "info",
  INTERVIEW: "mark",
  OFFER: "positive",
  REJECTED: "danger",
  WITHDRAWN: "muted",
  ACTIVE: "positive",
  SUSPENDED: "danger",
  OPEN: "positive",
  CLOSED: "muted",
  DRAFT: "warning",
  ADMIN: "mark",
  USER: "neutral",
};

export const ACTIVITY_LABELS = {
  "user.register": "Account created",
  "user.login": "Signed in",
  "user.login_failed": "Failed sign-in",
  "user.logout": "Signed out",
  "user.profile_update": "Profile updated",
  "user.password_change": "Password changed",
  "user.session_revoke": "Session revoked",
  "resume.create": "CV created",
  "resume.update": "CV updated",
  "resume.delete": "CV deleted",
  "resume.upload": "CV uploaded",
  "resume.primary": "Primary CV changed",
  "job.create": "Job posted",
  "job.update": "Job updated",
  "job.delete": "Job deleted",
  "job.save": "Job saved",
  "job.unsave": "Job unsaved",
  "application.create": "Application sent",
  "application.status": "Application status changed",
  "application.withdraw": "Application withdrawn",
  "admin.user_update": "Member updated by admin",
  "admin.user_delete": "Member deleted by admin",
  "admin.export": "Data exported",
};

/** Avatar tones, matched to the palette in globals.css. */
export const AVATAR_TONES = 6;
