/**
 * Navigation data.
 *
 * Icons are named here rather than imported, because this file is read by
 * server layouts and handed to a client component — and a React component
 * cannot cross that boundary as a prop. `icon-map.js` turns the name back
 * into a component on the client side.
 */

export const MEMBER_NAV = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
      { href: "/jobs", label: "Find jobs", icon: "jobs" },
      { href: "/applications", label: "Applications", icon: "applications" },
      { href: "/saved", label: "Saved jobs", icon: "saved" },
    ],
  },
  {
    label: "Your CV",
    items: [
      { href: "/cv", label: "CV builder", icon: "cv" },
      { href: "/cv/upload", label: "Import a CV", icon: "upload" },
    ],
  },
  {
    label: "Account",
    items: [{ href: "/settings", label: "Settings", icon: "settings" }],
  },
];

export const ADMIN_NAV = [
  {
    label: "Console",
    items: [
      { href: "/admin", label: "Overview", icon: "chart" },
      { href: "/admin/users", label: "Members", icon: "users" },
      { href: "/admin/jobs", label: "Job postings", icon: "jobs" },
      {
        href: "/admin/applications",
        label: "Applications",
        icon: "applications",
      },
      { href: "/admin/activity", label: "Activity log", icon: "activity" },
    ],
  },
];

export const PUBLIC_NAV = [
  { href: "/jobs", label: "Browse jobs" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#ats", label: "ATS checks" },
];
