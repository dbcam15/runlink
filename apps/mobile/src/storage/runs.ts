import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('runlink.db');

export interface SavedRun {
  id: string;
  date: number;
  durationMs: number;
  distanceMeters: number;
  participants: string[];        // names
  transcript: TranscriptEntry[];
}

export interface TranscriptEntry {
  runnerName: string;
  text: string;
  timestamp: number;
}

export function initDB() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      date INTEGER NOT NULL,
      duration_ms INTEGER NOT NULL,
      distance_meters REAL NOT NULL,
      participants TEXT NOT NULL,
      transcript TEXT NOT NULL
    );
  `);
}

export function saveRun(run: SavedRun) {
  db.runSync(
    `INSERT INTO runs (id, date, duration_ms, distance_meters, participants, transcript)
     VALUES (?, ?, ?, ?, ?, ?)`,
    run.id,
    run.date,
    run.durationMs,
    run.distanceMeters,
    JSON.stringify(run.participants),
    JSON.stringify(run.transcript),
  );
}

export function getRuns(): SavedRun[] {
  const rows = db.getAllSync<{
    id: string;
    date: number;
    duration_ms: number;
    distance_meters: number;
    participants: string;
    transcript: string;
  }>('SELECT * FROM runs ORDER BY date DESC');

  return rows.map(r => ({
    id: r.id,
    date: r.date,
    durationMs: r.duration_ms,
    distanceMeters: r.distance_meters,
    participants: JSON.parse(r.participants),
    transcript: JSON.parse(r.transcript),
  }));
}

export function getRun(id: string): SavedRun | null {
  const row = db.getFirstSync<{
    id: string;
    date: number;
    duration_ms: number;
    distance_meters: number;
    participants: string;
    transcript: string;
  }>('SELECT * FROM runs WHERE id = ?', id);

  if (!row) return null;
  return {
    id: row.id,
    date: row.date,
    durationMs: row.duration_ms,
    distanceMeters: row.distance_meters,
    participants: JSON.parse(row.participants),
    transcript: JSON.parse(row.transcript),
  };
}
