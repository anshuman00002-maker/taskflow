const initSqlJs = require('sql.js');
const path = require('path');
const fs   = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH  = process.env.DB_PATH || path.join(DATA_DIR, 'taskflow.db');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

let db;   // sql.js Database instance

// ── Persist to disk ───────────────────────────────────────────────────────────
function save() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// ── Thin synchronous-style helpers matching better-sqlite3 API ────────────────
function prepare(sql) {
  return {
    run(...params) {
      db.run(sql, params);
      const info = db.exec('SELECT last_insert_rowid() AS id');
      save();
      return { lastInsertRowid: info[0]?.values[0][0] ?? null, changes: db.getRowsModified() };
    },
    get(...params) {
      const res = db.exec(sql, params);
      if (!res[0]) return undefined;
      const { columns, values } = res[0];
      if (!values[0]) return undefined;
      return Object.fromEntries(columns.map((c, i) => [c, values[0][i]]));
    },
    all(...params) {
      const res = db.exec(sql, params);
      if (!res[0]) return [];
      const { columns, values } = res[0];
      return values.map(row => Object.fromEntries(columns.map((c, i) => [c, row[i]])));
    },
  };
}

// Export a proxy so routes can call db.prepare() identically to better-sqlite3
const dbProxy = { prepare, exec: (sql) => db.run(sql) };

// ── Boot: async init ──────────────────────────────────────────────────────────
async function init() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON;');

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT    NOT NULL,
      email        TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT   NOT NULL,
      created_at   TEXT    DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      description TEXT    DEFAULT '',
      owner_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at  TEXT    DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS project_members (
      project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id     INTEGER NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
      role        TEXT    NOT NULL DEFAULT 'member',
      joined_at   TEXT    DEFAULT (datetime('now')),
      PRIMARY KEY (project_id, user_id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title       TEXT    NOT NULL,
      description TEXT    DEFAULT '',
      assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
      status      TEXT    NOT NULL DEFAULT 'todo',
      priority    TEXT    NOT NULL DEFAULT 'medium',
      due_date    TEXT,
      created_by  INTEGER NOT NULL REFERENCES users(id),
      created_at  TEXT    DEFAULT (datetime('now')),
      updated_at  TEXT    DEFAULT (datetime('now'))
    );
  `);

  save();
  console.log(`[DB] sql.js ready → ${DB_PATH}`);
  return dbProxy;
}

module.exports = { init, getDb: () => dbProxy };
