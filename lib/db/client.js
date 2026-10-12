import fs from "node:fs";
import path from "node:path";

import { openDatabase } from "./driver.js";

/**
 * A single SQLite connection is shared across the whole server process.
 * In development Next.js re-evaluates modules on every change, so the handle
 * is cached on `globalThis` to avoid leaking file descriptors.
 */
const globalForDb = globalThis;

const DB_FILE = process.env.DATABASE_FILE || "data/jobai.db";
const SCHEMA_PATH = path.join(process.cwd(), "lib", "db", "schema.sql");

function resolveDbPath() {
  const file = path.isAbsolute(DB_FILE) ? DB_FILE : path.join(process.cwd(), DB_FILE);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  return file;
}

function connect() {
  const file = resolveDbPath();
  const db = openDatabase(file);

  // Durability + concurrency defaults that suit a web app.
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");

  applySchema(db);
  return db;
}

/** Runs schema.sql. Every statement in it is idempotent. */
export function applySchema(db) {
  const sql = fs.readFileSync(SCHEMA_PATH, "utf8");
  db.exec(sql);
  return db;
}

export function getDb() {
  if (!globalForDb.__jobaiDb) {
    globalForDb.__jobaiDb = connect();
  }
  return globalForDb.__jobaiDb;
}

export const db = new Proxy(
  {},
  {
    get(_target, prop) {
      const instance = getDb();
      const value = instance[prop];
      return typeof value === "function" ? value.bind(instance) : value;
    },
  },
);

/* -------------------------------------------------------------------------- */
/* helpers                                                                    */
/* -------------------------------------------------------------------------- */

const ID_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

/** Short, sortable, human-readable identifier: `usr_m4k2x8_7fq1`. */
export function newId(prefix) {
  const time = Date.now().toString(36);
  let rand = "";
  for (let i = 0; i < 5; i += 1) {
    rand += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)];
  }
  return `${prefix}_${time}${rand}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function toJson(value, fallback = []) {
  if (value === undefined || value === null) return JSON.stringify(fallback);
  return JSON.stringify(value);
}

export function fromJson(value, fallback = []) {
  if (value === undefined || value === null || value === "") return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

/** Wraps a function in a transaction. Rolls back if it throws. */
export function transaction(fn) {
  return getDb().transaction(fn);
}
