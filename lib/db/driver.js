/**
 * SQLite driver selection.
 *
 * The app prefers `better-sqlite3`, which is the fastest option and works on
 * every supported Node version. It is a native module, though, so on a machine
 * with no prebuilt binary and no compiler it cannot install — which is why it
 * is an *optional* dependency: `npm install` still succeeds, and this module
 * falls back to `node:sqlite`, built into Node 22.5 and later.
 *
 * Both drivers are exposed through the small surface the repositories use:
 * `prepare().get/all/run`, `exec`, `pragma` and `transaction`.
 */

import { createRequire } from "node:module";

// Both drivers are loaded with require() rather than import, so a missing
// native module or an older Node (no node:sqlite) fails here, where it can be
// handled, instead of at module-evaluation time.
const requireModule = createRequire(import.meta.url);

let driverName = null;

function loadBetterSqlite() {
  if (process.env.JOBAI_FORCE_NODE_SQLITE === "1") return null;
  try {
    return requireModule("better-sqlite3");
  } catch {
    return null;
  }
}

function loadNodeSqlite() {
  // `process.getBuiltinModule` (Node 22.3+) reaches the real builtin even from
  // inside a bundle, where a plain require("node:sqlite") is rewritten by the
  // bundler and fails. require() is kept as the fallback for older runtimes.
  try {
    const builtin = process.getBuiltinModule?.("node:sqlite");
    if (builtin?.DatabaseSync) return builtin.DatabaseSync;
  } catch {
    /* older Node, or the builtin is unavailable */
  }

  try {
    const { DatabaseSync } = requireModule("node:sqlite");
    return DatabaseSync || null;
  } catch {
    return null;
  }
}

/** Wraps node:sqlite so it answers to the better-sqlite3 calls we make. */
function adaptNodeSqlite(DatabaseSync, file) {
  const db = new DatabaseSync(file);

  const normalise = (params) => {
    if (params.length === 0) return [];
    // better-sqlite3 accepts one object of named parameters; so does
    // node:sqlite, which resolves bare keys against :name / @name / $name.
    if (params.length === 1 && params[0] && typeof params[0] === "object" && !Array.isArray(params[0])) {
      return [params[0]];
    }
    return params;
  };

  const api = {
    prepare(sql) {
      const statement = db.prepare(sql);
      return {
        get: (...params) => statement.get(...normalise(params)),
        all: (...params) => statement.all(...normalise(params)),
        run: (...params) => {
          const result = statement.run(...normalise(params));
          return {
            changes: Number(result?.changes ?? 0),
            lastInsertRowid: result?.lastInsertRowid ?? null,
          };
        },
      };
    },
    exec: (sql) => db.exec(sql),
    pragma: (statement) => db.exec(`PRAGMA ${statement};`),
    transaction(fn) {
      return (...args) => {
        db.exec("BEGIN");
        try {
          const result = fn(...args);
          db.exec("COMMIT");
          return result;
        } catch (error) {
          try {
            db.exec("ROLLBACK");
          } catch {
            /* the transaction was already rolled back */
          }
          throw error;
        }
      };
    },
    close: () => db.close(),
  };

  return api;
}

/**
 * Opens the database with whichever driver is available.
 * @param {string} file absolute path to the SQLite file
 */
export function openDatabase(file) {
  const BetterSqlite = loadBetterSqlite();

  if (BetterSqlite) {
    driverName = "better-sqlite3";
    return new BetterSqlite(file);
  }

  const DatabaseSync = loadNodeSqlite();
  if (DatabaseSync) {
    driverName = "node:sqlite";
    if (!globalThis.__jobaiDriverNotice) {
      globalThis.__jobaiDriverNotice = true;
      console.warn(
        "[db] better-sqlite3 is not installed; using Node's built-in node:sqlite instead. " +
          "Run `npm install better-sqlite3` for the faster driver.",
      );
    }
    return adaptNodeSqlite(DatabaseSync, file);
  }

  throw new Error(
    "No SQLite driver available.\n" +
      "Either install the native driver:   npm install better-sqlite3\n" +
      "or run the app on Node 22.5 or newer, which includes node:sqlite.\n" +
      `This process is Node ${process.version}.`,
  );
}

export function activeDriver() {
  return driverName;
}
