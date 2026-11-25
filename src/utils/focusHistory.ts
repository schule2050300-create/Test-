import { AmbientSoundType, FocusSessionRecord } from '../types';

const FOCUS_HISTORY_KEY = 'webclock_focus_history_v1';
const MAX_HISTORY_RECORDS = 500;

const VALID_SOUNDS: AmbientSoundType[] = [
  'none',
  'rain',
  'forest',
  'white_noise',
  'pink_noise',
  'waves',
  'fireplace',
];

export function toLocalDateKey(timestampMs: number): string {
  const d = new Date(timestampMs);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function loadFocusHistory(): FocusSessionRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(FOCUS_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is FocusSessionRecord =>
          item &&
          typeof item.id === 'string' &&
          typeof item.completedAt === 'number' &&
          typeof item.durationMinutes === 'number' &&
          item.durationMinutes > 0
      )
      .map((item) => ({
        id: item.id,
        completedAt: item.completedAt,
        dateKey:
          typeof item.dateKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.dateKey)
            ? item.dateKey
            : toLocalDateKey(item.completedAt),
        durationMinutes: Math.max(1, Math.min(240, Math.round(item.durationMinutes))),
        sound: VALID_SOUNDS.includes(item.sound) ? item.sound : 'none',
        completed: typeof item.completed === 'boolean' ? item.completed : true,
      }))
      .sort((a, b) => b.completedAt - a.completedAt);
  } catch {
    return [];
  }
}

function persistFocusHistory(records: FocusSessionRecord[]): FocusSessionRecord[] {
  const trimmed = records.slice(0, MAX_HISTORY_RECORDS);
  try {
    localStorage.setItem(FOCUS_HISTORY_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore storage quota errors
  }
  return trimmed;
}

export function addFocusSessionRecord(input: {
  durationMinutes: number;
  sound: AmbientSoundType;
  completed: boolean;
  completedAt?: number;
}): FocusSessionRecord[] {
  const now = input.completedAt ?? Date.now();
  const newRecord: FocusSessionRecord = {
    id: `fs-${now}-${Math.random().toString(36).slice(2, 7)}`,
    completedAt: now,
    dateKey: toLocalDateKey(now),
    durationMinutes: Math.max(1, Math.min(240, Math.round(input.durationMinutes))),
    sound: VALID_SOUNDS.includes(input.sound) ? input.sound : 'none',
    completed: input.completed,
  };
  const existing = loadFocusHistory();
  return persistFocusHistory([newRecord, ...existing]);
}

export function deleteFocusSessionRecord(id: string): FocusSessionRecord[] {
  const existing = loadFocusHistory();
  return persistFocusHistory(existing.filter((item) => item.id !== id));
}

export function clearFocusSessionHistory(): FocusSessionRecord[] {
  try {
    localStorage.removeItem(FOCUS_HISTORY_KEY);
  } catch {
    // Ignore
  }
  return [];
}

export interface DailyProductivePoint {
  dateKey: string;
  shortLabel: string; // e.g., "Mo" or "24.11"
  axisLabel: string; // e.g., "24.11."
  fullDateLabel: string; // e.g., "Dienstag, 24. Nov"
  totalMinutes: number;
  sessionCount: number;
  isToday: boolean;
}

export function getDailyProductiveSeries(
  history: FocusSessionRecord[],
  daysCount: 7 | 14 | 30,
  locale: string = 'de-DE'
): DailyProductivePoint[] {
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayKey = toLocalDateKey(todayMidnight.getTime());

  // Aggregate minutes & session counts by dateKey
  const byDate = new Map<string, { minutes: number; count: number }>();
  for (const rec of history) {
    const prev = byDate.get(rec.dateKey) || { minutes: 0, count: 0 };
    byDate.set(rec.dateKey, {
      minutes: prev.minutes + rec.durationMinutes,
      count: prev.count + 1,
    });
  }

  const points: DailyProductivePoint[] = [];
  for (let offset = daysCount - 1; offset >= 0; offset--) {
    const d = new Date(todayMidnight);
    d.setDate(todayMidnight.getDate() - offset);
    const key = toLocalDateKey(d.getTime());
    const agg = byDate.get(key) || { minutes: 0, count: 0 };

    const weekdayShort = new Intl.DateTimeFormat(locale, { weekday: 'short' })
      .format(d)
      .replace('.', '');
    const dayMonth = `${d.getDate()}.${d.getMonth() + 1}.`;
    const fullDateLabel = new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(d);

    points.push({
      dateKey: key,
      shortLabel: daysCount === 7 ? weekdayShort : dayMonth,
      axisLabel: dayMonth,
      fullDateLabel,
      totalMinutes: agg.minutes,
      sessionCount: agg.count,
      isToday: key === todayKey,
    });
  }

  return points;
}

export function calculateFocusStreak(history: FocusSessionRecord[]): number {
  if (history.length === 0) return 0;
  const activeDates = new Set(history.map((r) => r.dateKey));
  const now = new Date();
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // If no session today yet, check starting from yesterday so an ongoing streak stays alive
  if (!activeDates.has(toLocalDateKey(cursor.getTime()))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!activeDates.has(toLocalDateKey(cursor.getTime()))) {
      return 0;
    }
  }

  let streak = 0;
  while (activeDates.has(toLocalDateKey(cursor.getTime()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function getMostUsedFocusSound(history: FocusSessionRecord[]): AmbientSoundType | null {
  if (history.length === 0) return null;
  const counts = new Map<AmbientSoundType, number>();
  for (const rec of history) {
    if (rec.sound && rec.sound !== 'none') {
      counts.set(rec.sound, (counts.get(rec.sound) || 0) + rec.durationMinutes);
    }
  }
  let topSound: AmbientSoundType | null = null;
  let topMinutes = 0;
  for (const [sound, mins] of counts.entries()) {
    if (mins > topMinutes) {
      topMinutes = mins;
      topSound = sound;
    }
  }
  return topSound;
}

export function formatMinutesAsDuration(totalMinutes: number): string {
  const rounded = Math.max(0, Math.round(totalMinutes));
  if (rounded < 60) return `${rounded} Min`;
  const hrs = Math.floor(rounded / 60);
  const mins = rounded % 60;
  return mins === 0 ? `${hrs} Std` : `${hrs} Std ${mins} Min`;
}
