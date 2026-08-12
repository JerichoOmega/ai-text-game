/**
 * TEST-ONLY stand-in for the `expo-sqlite` native module.
 *
 * Why this exists: the real `expo-sqlite` native module ("ExpoSQLite") is
 * unavailable under plain Node, so importing `src/data/db.ts` (which does
 * `import * as SQLite from "expo-sqlite"`) would throw before any repository
 * code could run. That is exactly why `src/data/db.web.ts` exists for the
 * browser. This stub lets the Node test runner exercise the *native* code
 * path (`src/data/db.ts` and every repository that imports it) by backing
 * `openDatabaseAsync` with the already-shipping web adapter's in-memory
 * engine — the same interpreter the browser uses.
 *
 * It is wired in ONLY for tests, via a `paths` entry in `tsconfig.test.json`
 * (`"expo-sqlite": ["tests/stubs/expo-sqlite.ts"]`). The production
 * `tsconfig.json` does NOT remap `expo-sqlite`, so the app still typechecks
 * and builds against the real module. No application code changes.
 */
import { getDb as getWebDb } from "@/data/db.web";

/** Structural match for the subset of expo-sqlite's SQLiteDatabase db.ts uses. */
export type SQLiteDatabase = Awaited<ReturnType<typeof getWebDb>>;

export async function openDatabaseAsync(_name: string): Promise<SQLiteDatabase> {
  return getWebDb();
}
