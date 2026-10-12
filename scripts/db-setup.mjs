#!/usr/bin/env node
/**
 * Creates (or repairs) the SQLite database.
 *
 *   node scripts/db-setup.mjs            # create tables if missing
 *   node scripts/db-setup.mjs --reset    # delete the file, then create
 */
import fs from "node:fs";
import path from "node:path";

import { loadEnv } from "./load-env.mjs";

loadEnv();

const reset = process.argv.includes("--reset");
const file = process.env.DATABASE_FILE || "data/jobai.db";
const full = path.isAbsolute(file) ? file : path.join(process.cwd(), file);

if (reset) {
  for (const suffix of ["", "-shm", "-wal"]) {
    const target = `${full}${suffix}`;
    if (fs.existsSync(target)) {
      fs.rmSync(target);
      console.log(`removed ${path.relative(process.cwd(), target)}`);
    }
  }
}

fs.mkdirSync(path.dirname(full), { recursive: true });

const { getDb } = await import("../lib/db/client.js");
const db = getDb();

const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
  .all()
  .map((row) => row.name)
  .sort();

console.log(`\ndatabase  ${path.relative(process.cwd(), full)}`);
console.log(`tables    ${tables.join(", ")}`);
console.log("\nSchema is up to date. Run `npm run db:seed` to add demo data.\n");
