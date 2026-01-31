import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'learnspace.db');
const WASM_PATH = path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');

let db: Database | null = null;

export interface Bookmark {
  ID: number;
  URL: string;
  TITLE: string | null;
  DATE_ADDED: string | null;
  _LOAD_TIME: string;
}

async function getDb(): Promise<Database> {
  if (db) return db;

  // Load WASM binary directly for server-side usage
  const wasmBinary = fs.readFileSync(WASM_PATH);
  const SQL = await initSqlJs({ wasmBinary });
  
  // Try to load existing database
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Create the bookmarks table if it doesn't exist
  db.run(`
    CREATE TABLE IF NOT EXISTS LEARNSPACE_BOOKMARKS (
      ID INTEGER PRIMARY KEY AUTOINCREMENT,
      URL VARCHAR(2048) NOT NULL,
      TITLE VARCHAR(1024),
      DATE_ADDED TEXT,
      _LOAD_TIME TEXT DEFAULT (datetime('now'))
    )
  `);
  
  saveDb();
  return db;
}

function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

export async function getAllBookmarks(): Promise<Bookmark[]> {
  const database = await getDb();
  const results = database.exec('SELECT * FROM LEARNSPACE_BOOKMARKS ORDER BY _LOAD_TIME DESC');
  
  if (results.length === 0) return [];
  
  const columns = results[0].columns;
  return results[0].values.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj as unknown as Bookmark;
  });
}

export async function getBookmarksForPodcast(): Promise<{ URL: string; TITLE: string | null }[]> {
  const database = await getDb();
  const results = database.exec('SELECT URL, TITLE FROM LEARNSPACE_BOOKMARKS ORDER BY _LOAD_TIME DESC LIMIT 15');
  
  if (results.length === 0) return [];
  
  const columns = results[0].columns;
  return results[0].values.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj as { URL: string; TITLE: string | null };
  });
}

export async function insertBookmark(url: string, title: string, dateAdded: string | null): Promise<number> {
  const database = await getDb();
  database.run(
    'INSERT INTO LEARNSPACE_BOOKMARKS (URL, TITLE, DATE_ADDED) VALUES (?, ?, ?)',
    [url, title, dateAdded]
  );
  saveDb();
  
  // Get the last inserted ID
  const result = database.exec('SELECT last_insert_rowid() as id');
  return result[0]?.values[0]?.[0] as number || 0;
}

export async function deleteBookmark(url: string): Promise<number> {
  const database = await getDb();
  database.run('DELETE FROM LEARNSPACE_BOOKMARKS WHERE URL = ?', [url]);
  const changes = database.getRowsModified();
  saveDb();
  return changes;
}
