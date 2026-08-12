/**
 * WEB-ONLY persistence adapter for the data layer.
 *
 * Why this file exists: `expo-sqlite`'s native module ("ExpoSQLite") isn't
 * available in the browser, so importing/using it on Expo Web throws
 * "Cannot find native module 'ExpoSQLite'". Metro resolves platform
 * extensions automatically — on web it picks THIS file over `db.ts`, on
 * iOS/Android it keeps the real `db.ts` (unchanged). So:
 *   - Native (iOS/Android): src/data/db.ts  → real expo-sqlite
 *   - Web (browser):        src/data/db.web.ts (this) → localStorage-backed
 * Both expose the identical `getDb()` / `resetDb()` surface the repositories
 * use (`execAsync`, `runAsync`, `getFirstAsync`, `getAllAsync`), so nothing
 * in src/data/repositories/* or src/systems/* changes.
 *
 * This is NOT a general SQL engine. The repositories issue a small, fixed
 * set of statement shapes (meta upserts and `SELECT id, data FROM <table>`
 * with simple WHERE/ORDER BY/LIMIT); this adapter interprets exactly those
 * shapes over an in-memory table store persisted to localStorage. It is the
 * web sibling of the SQLite schema in db.ts, not a replacement for it.
 */

type Cell = string | number;
type Row = Record<string, Cell>;

interface Store {
  meta: Record<string, string>;
  tables: Record<string, Row[]>;
}

const STORAGE_KEY = "chronicle.db.web.v1";
const TABLES = ["kingdoms", "settlements", "factions", "npcs", "quests", "events", "history"];

let store: Store | null = null;

function storage(): { getItem(k: string): string | null; setItem(k: string, v: string): void } | null {
  const g = globalThis as unknown as { localStorage?: { getItem(k: string): string | null; setItem(k: string, v: string): void } };
  return g.localStorage ?? null;
}

function load(): Store {
  if (store) return store;
  let parsed: Store | null = null;
  const raw = storage()?.getItem(STORAGE_KEY);
  if (raw) {
    try {
      parsed = JSON.parse(raw) as Store;
    } catch {
      parsed = null;
    }
  }
  store = parsed ?? { meta: {}, tables: {} };
  if (!store.meta) store.meta = {};
  if (!store.tables) store.tables = {};
  for (const t of TABLES) if (!store.tables[t]) store.tables[t] = [];
  return store;
}

function persist(): void {
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* private-mode / quota — data stays in-memory for the session */
  }
}

function tableOf(sql: string): string {
  const m = /\b(?:INTO|FROM)\s+([a-z_]+)/i.exec(sql);
  return m ? m[1]! : "";
}

function columnsOf(sql: string): string[] {
  const m = /INSERT\s+INTO\s+[a-z_]+\s*\(([^)]*)\)/i.exec(sql);
  return m ? m[1]!.split(",").map((c) => c.trim()) : [];
}

async function runAsync(sql: string, params: Cell[] = []): Promise<{ changes: number; lastInsertRowId: number }> {
  const s = load();
  const table = tableOf(sql);

  if (table === "meta") {
    // INSERT INTO meta (key, value) ... (upsert on key)
    s.meta[String(params[0])] = String(params[1]);
    persist();
    return { changes: 1, lastInsertRowId: 0 };
  }

  const cols = columnsOf(sql);
  const row: Row = {};
  cols.forEach((col, i) => {
    row[col] = params[i]!;
  });
  const rows = s.tables[table] ?? (s.tables[table] = []);
  const idx = rows.findIndex((r) => r.id === row.id); // upsert by id (all tables key on id)
  if (idx >= 0) rows[idx] = row;
  else rows.push(row);
  persist();
  return { changes: 1, lastInsertRowId: 0 };
}

/** Applies WHERE / ORDER BY / LIMIT to a table's rows for the SELECT shapes the repos use. */
function selectRows(sql: string, params: Cell[]): Row[] {
  const s = load();
  const table = tableOf(sql);
  let rows = [...(s.tables[table] ?? [])];
  let p = 0;

  const where = /WHERE\s+([a-z_]+)\s*=\s*(\?|\d+)/i.exec(sql);
  if (where) {
    const col = where[1]!;
    const val: Cell = where[2] === "?" ? params[p++]! : Number(where[2]);
    rows = rows.filter((r) => r[col] === val || String(r[col]) === String(val));
  }

  const order = /ORDER\s+BY\s+([a-z_]+)\s*(ASC|DESC)?/i.exec(sql);
  if (order) {
    const col = order[1]!;
    const dir = (order[2] ?? "ASC").toUpperCase() === "DESC" ? -1 : 1;
    rows.sort((a, b) => {
      const av = a[col] as Cell;
      const bv = b[col] as Cell;
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }

  const limit = /LIMIT\s+(\?|\d+)/i.exec(sql);
  if (limit) {
    const n = limit[1] === "?" ? Number(params[p++]) : Number(limit[1]);
    rows = rows.slice(0, n);
  }
  return rows;
}

async function getAllAsync<T>(sql: string, params: Cell[] = []): Promise<T[]> {
  if (/FROM\s+meta/i.test(sql)) {
    // No repository does SELECT-all on meta today, but keep it safe.
    return [] as T[];
  }
  return selectRows(sql, params) as unknown as T[];
}

async function getFirstAsync<T>(sql: string, params: Cell[] = []): Promise<T | null> {
  const s = load();
  if (/FROM\s+meta/i.test(sql)) {
    const value = s.meta[String(params[0])];
    return value === undefined ? null : ({ value } as unknown as T);
  }
  const rows = selectRows(sql, params);
  return (rows[0] as unknown as T) ?? null;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function execAsync(_sql: string): Promise<void> {
  // Only CREATE TABLE IF NOT EXISTS statements reach here (the migrate step).
  // Tables are implicit in the store, so this is a safe no-op. (resetDb below
  // clears data directly rather than via a DELETE exec.)
  load();
}

/** Structural match for the subset of expo-sqlite's SQLiteDatabase the app uses. */
const webDb = { execAsync, runAsync, getFirstAsync, getAllAsync };

export async function getDb(): Promise<typeof webDb> {
  load();
  return webDb;
}

/** Web sibling of db.ts's resetDb — wipes the persisted world (used by "New Adventure"). */
export async function resetDb(): Promise<void> {
  store = { meta: {}, tables: {} };
  for (const t of TABLES) store.tables[t] = [];
  persist();
}
