import { Platform } from 'react-native';

export interface SavedRun {
  id: string;
  date: number;
  durationMs: number;
  distanceMeters: number;
  participants: string[];
  transcript: TranscriptEntry[];
}

export interface TranscriptEntry {
  runnerName: string;
  text: string;
  timestamp: number;
}

const isWeb = Platform.OS === 'web';

// Web: localStorage fallback
const WEB_KEY = 'runlink_runs';
function webGetRuns(): SavedRun[] {
  try { return JSON.parse(localStorage.getItem(WEB_KEY) ?? '[]'); } catch { return []; }
}
function webSaveRun(run: SavedRun) {
  const runs = webGetRuns();
  localStorage.setItem(WEB_KEY, JSON.stringify([run, ...runs]));
}

// Native: SQLite
let db: any = null;
function getDB() {
  if (!db) {
    const SQLite = require('expo-sqlite');
    db = SQLite.openDatabaseSync('runlink.db');
  }
  return db;
}

export function initDB() {
  if (isWeb) return;
  getDB().execSync(`
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
  if (isWeb) { webSaveRun(run); return; }
  getDB().runSync(
    `INSERT OR REPLACE INTO runs (id, date, duration_ms, distance_meters, participants, transcript)
     VALUES (?, ?, ?, ?, ?, ?)`,
    run.id, run.date, run.durationMs, run.distanceMeters,
    JSON.stringify(run.participants), JSON.stringify(run.transcript),
  );
}

export function getRuns(): SavedRun[] {
  if (isWeb) return webGetRuns();
  try {
    const rows = getDB().getAllSync<{
      id: string; date: number; duration_ms: number;
      distance_meters: number; participants: string; transcript: string;
    }>('SELECT * FROM runs ORDER BY date DESC');
    return rows.map(r => ({
      id: r.id, date: r.date, durationMs: r.duration_ms,
      distanceMeters: r.distance_meters,
      participants: JSON.parse(r.participants),
      transcript: JSON.parse(r.transcript),
    }));
  } catch { return []; }
}

export function getRun(id: string): SavedRun | null {
  if (isWeb) return webGetRuns().find(r => r.id === id) ?? null;
  try {
    const row = getDB().getFirstSync<{
      id: string; date: number; duration_ms: number;
      distance_meters: number; participants: string; transcript: string;
    }>('SELECT * FROM runs WHERE id = ?', id);
    if (!row) return null;
    return {
      id: row.id, date: row.date, durationMs: row.duration_ms,
      distanceMeters: row.distance_meters,
      participants: JSON.parse(row.participants),
      transcript: JSON.parse(row.transcript),
    };
  } catch { return null; }
}
