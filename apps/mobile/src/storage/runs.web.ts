// Web platform — uses localStorage, no expo-sqlite

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

const KEY = 'runlink_runs';

function all(): SavedRun[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; }
}

export function initDB() {}

export function saveRun(run: SavedRun) {
  localStorage.setItem(KEY, JSON.stringify([run, ...all().filter(r => r.id !== run.id)]));
}

export function getRuns(): SavedRun[] {
  return all();
}

export function getRun(id: string): SavedRun | null {
  return all().find(r => r.id === id) ?? null;
}
