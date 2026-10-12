import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind-aware class joiner. */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/* -------------------------------------------------------------------------- */
/* formatting                                                                 */
/* -------------------------------------------------------------------------- */

export function formatDate(value, { withTime = false } = {}) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function formatRelative(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 31) return `${Math.round(days / 7)}w ago`;
  return formatDate(value);
}

const CURRENCY_SYMBOL = { USD: "$", EUR: "€", GBP: "£", GEL: "₾" };

export function formatSalary(min, max, currency = "USD") {
  const symbol = CURRENCY_SYMBOL[currency] || `${currency} `;
  const short = (n) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(n));
  if (min && max) return `${symbol}${short(min)} – ${symbol}${short(max)}`;
  if (min) return `from ${symbol}${short(min)}`;
  if (max) return `up to ${symbol}${short(max)}`;
  return "Not disclosed";
}

export function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Number(value) || 0);
}

export function initials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function truncate(text, length = 160) {
  const value = String(text || "");
  return value.length > length ? `${value.slice(0, length - 1).trimEnd()}…` : value;
}

export function pluralise(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural || `${singular}s`}`;
}

/* -------------------------------------------------------------------------- */
/* misc                                                                       */
/* -------------------------------------------------------------------------- */

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Builds a query string, dropping empty values. */
export function buildQuery(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "" || value === false) continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export function toCsv(rows, columns) {
  const escape = (value) => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const head = columns.map((column) => escape(column.label)).join(",");
  const body = rows
    .map((row) => columns.map((column) => escape(column.value(row))).join(","))
    .join("\n");
  return `${head}\n${body}`;
}

/** Splits "React, Next.js , React" into ["React", "Next.js"]. */
export function parseList(input) {
  return [
    ...new Set(
      String(input || "")
        .split(/[,\n]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}
