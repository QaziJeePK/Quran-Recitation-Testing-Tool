// ═══════════════════════════════════════════════════════
//  Session History — stores recitation attempts in memory
// ═══════════════════════════════════════════════════════

export interface SessionAttempt {
  id: string;
  timestamp: number;
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  ayahText: string;
  spokenText: string;
  overallScore: number;
  grade: string;
  correctCount: number;
  partialCount: number;
  wrongCount: number;
  missedCount: number;
  extraCount: number;
  totalWords: number;
  letterScore: number;
  maddScore: number;
  harakaScore: number;
  completenessScore: number;
  mistakeTypes: Record<string, number>; // type -> count
  duration: number; // seconds
}

// In-memory store (survives component remounts via module scope)
let _history: SessionAttempt[] = [];

export function addAttempt(attempt: Omit<SessionAttempt, 'id' | 'timestamp'>): SessionAttempt {
  const full: SessionAttempt = {
    ...attempt,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
  };
  _history = [full, ..._history].slice(0, 50); // keep last 50
  return full;
}

export function getHistory(): SessionAttempt[] {
  return _history;
}

export function clearHistory(): void {
  _history = [];
}

// ── Chart data helpers ────────────────────────────────────────────────────────

export interface ScoreTrendPoint {
  index: number;
  label: string;
  score: number;
  grade: string;
  correct: number;
  wrong: number;
  missed: number;
}

export function getScoreTrend(limit = 10): ScoreTrendPoint[] {
  return [..._history]
    .slice(0, limit)
    .reverse()
    .map((a, i) => ({
      index: i,
      label: `S${a.surahNumber}:${a.ayahNumber}`,
      score: a.overallScore,
      grade: a.grade,
      correct: a.correctCount,
      wrong: a.wrongCount,
      missed: a.missedCount,
    }));
}

export interface MistakeFrequency {
  type: string;
  label: string;
  count: number;
  color: string;
}

const MISTAKE_LABELS: Record<string, { label: string; color: string }> = {
  wrong_word:        { label: 'Wrong Word',       color: '#ef4444' },
  missed_word:       { label: 'Missed Word',       color: '#6b7280' },
  extra_word:        { label: 'Extra Word',        color: '#f97316' },
  wrong_letter:      { label: 'Wrong Letter',      color: '#dc2626' },
  missing_letter:    { label: 'Missing Letter',    color: '#b91c1c' },
  extra_letter:      { label: 'Extra Letter',      color: '#ea580c' },
  similar_letter:    { label: 'Similar Letter',    color: '#d97706' },
  wrong_haraka:      { label: 'Wrong Vowel',       color: '#7c3aed' },
  wrong_madd:        { label: 'Wrong Elongation',  color: '#2563eb' },
  missing_madd:      { label: 'Missing Elongation',color: '#1d4ed8' },
  missing_shaddah:   { label: 'Missing Shaddah',   color: '#be185d' },
  wrong_ending:      { label: 'Wrong Ending',      color: '#9f1239' },
};

export function getMistakeFrequencies(): MistakeFrequency[] {
  const totals: Record<string, number> = {};
  for (const a of _history) {
    for (const [type, count] of Object.entries(a.mistakeTypes)) {
      totals[type] = (totals[type] || 0) + count;
    }
  }
  return Object.entries(totals)
    .map(([type, count]) => ({
      type,
      label: MISTAKE_LABELS[type]?.label || type,
      count,
      color: MISTAKE_LABELS[type]?.color || '#6b7280',
    }))
    .sort((a, b) => b.count - a.count);
}

export interface AyahStats {
  label: string;
  attempts: number;
  bestScore: number;
  avgScore: number;
  trend: 'up' | 'down' | 'stable';
}

export function getAyahStats(): AyahStats[] {
  const map: Record<string, SessionAttempt[]> = {};
  for (const a of _history) {
    const key = `S${a.surahNumber}:${a.ayahNumber}`;
    if (!map[key]) map[key] = [];
    map[key].push(a);
  }
  return Object.entries(map).map(([label, attempts]) => {
    const scores = attempts.map(a => a.overallScore);
    const best   = Math.max(...scores);
    const avg    = Math.round(scores.reduce((s, x) => s + x, 0) / scores.length);
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (scores.length >= 2) {
      const diff = scores[0] - scores[scores.length - 1];
      if (diff > 5) trend = 'up';
      else if (diff < -5) trend = 'down';
    }
    return { label, attempts: attempts.length, bestScore: best, avgScore: avg, trend };
  });
}
