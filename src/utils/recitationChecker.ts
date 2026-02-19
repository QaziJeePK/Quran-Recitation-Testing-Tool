// ═══════════════════════════════════════════════════════════════
//  Quranic Recitation Checker – Master Engine
//  Integrates: Arabic Normalizer + Tajweed Engine + Mistake Analyzer
// ═══════════════════════════════════════════════════════════════

import { tokenizeArabic, normalizeSurface } from './arabicNormalizer';
import { annotateAyah, summarizeTajweed, TajweedSummary, WordTajweedResult } from './tajweedEngine';
import {
  analyzeWordMistakes,
  alignSequences,
  WordMistakeAnalysis,
  DetailedMistake,
} from './mistakeAnalyzer';

export type { TajweedSummary, WordTajweedResult };
export type { DetailedMistake };
export type { WordMistakeAnalysis };

// ─── Result types ─────────────────────────────────────────────────────────────

export interface WordResult {
  // Original ayah word
  original: string;
  originalIndex: number;

  // What user said
  spoken: string;

  // Status
  status: 'correct' | 'partial' | 'wrong' | 'missed' | 'extra';

  // Scores
  similarity: number;       // 0–100 overall
  letter_match: number;     // 0–100
  madd_match: number;       // 0–100
  haraka_match: number;     // 0–100

  // Mistakes
  mistakes: DetailedMistake[];
  hasCritical: boolean;
  hasMajor: boolean;

  // Tajweed for this word
  tajweed: WordTajweedResult;
}

export interface RecitationResult {
  // Score
  overallScore: number;
  grade: 'Excellent' | 'Very Good' | 'Good' | 'Fair' | 'Needs Practice' | 'Keep Trying';
  gradeArabic: string;

  // Word results
  wordResults: WordResult[];

  // Counts
  totalOriginalWords: number;
  totalSpokenWords: number;
  correctCount: number;
  partialCount: number;
  wrongCount: number;
  missedCount: number;
  extraCount: number;

  // Missed / Extra lists
  missedWords: string[];
  extraWords: string[];

  // Tajweed
  tajweedAnnotations: WordTajweedResult[];
  tajweedSummary: TajweedSummary[];

  // Feedback
  detailedFeedback: FeedbackItem[];

  // Per-category scores
  letterScore: number;
  maddScore: number;
  harakaScore: number;
  completenessScore: number;
}

export interface FeedbackItem {
  icon: string;
  text: string;
  severity: 'success' | 'warning' | 'error' | 'info';
}

// ─── Grade logic ──────────────────────────────────────────────────────────────

type Grade = RecitationResult['grade'];

function gradeScore(score: number): { grade: Grade; gradeArabic: string } {
  if (score >= 95) return { grade: 'Excellent',       gradeArabic: 'ممتاز' };
  if (score >= 85) return { grade: 'Very Good',       gradeArabic: 'جيد جداً' };
  if (score >= 72) return { grade: 'Good',            gradeArabic: 'جيد' };
  if (score >= 55) return { grade: 'Fair',            gradeArabic: 'مقبول' };
  if (score >= 35) return { grade: 'Needs Practice',  gradeArabic: 'يحتاج تدريب' };
  return           { grade: 'Keep Trying',            gradeArabic: 'استمر في المحاولة' };
}

// ─── Feedback generation ──────────────────────────────────────────────────────

function buildFeedback(result: Omit<RecitationResult, 'detailedFeedback'>): FeedbackItem[] {
  const items: FeedbackItem[] = [];
  const { overallScore, correctCount, partialCount, wrongCount, missedCount, wordResults, tajweedSummary } = result;

  // Overall
  if (overallScore >= 95) items.push({ icon: '🌟', text: 'MashaAllah! Near-perfect recitation! Keep it up!', severity: 'success' });
  else if (overallScore >= 85) items.push({ icon: '👍', text: 'Very good recitation! Just a few refinements needed.', severity: 'success' });
  else if (overallScore >= 72) items.push({ icon: '💪', text: 'Good effort! Review the highlighted mistakes and practice again.', severity: 'info' });
  else if (overallScore >= 55) items.push({ icon: '📖', text: 'Fair attempt. Listen to a reciter first, then try again.', severity: 'warning' });
  else items.push({ icon: '🤲', text: 'Keep practicing! Listen carefully to master reciters and repeat daily.', severity: 'error' });

  // Completeness
  if (missedCount > 0) {
    const missed = wordResults.filter(w => w.status === 'missed').map(w => w.original);
    items.push({
      icon: '⬜',
      text: `${missedCount} word(s) were missed: ${missed.slice(0, 4).join(' ، ')}${missed.length > 4 ? '…' : ''}`,
      severity: 'error'
    });
  }

  if (wrongCount > 0) {
    items.push({ icon: '❌', text: `${wrongCount} word(s) were incorrect — review pronunciation carefully.`, severity: 'error' });
  }

  if (partialCount > 0) {
    items.push({ icon: '🔶', text: `${partialCount} word(s) were close but not exact — fine-tune them.`, severity: 'warning' });
  }

  if (correctCount === result.totalOriginalWords) {
    items.push({ icon: '✅', text: 'All words recited correctly! Excellent accuracy.', severity: 'success' });
  }

  // Specific mistake patterns
  const hasMaddErrors = wordResults.some(w => w.mistakes.some(m => m.type === 'missing_madd' || m.type === 'wrong_madd'));
  const hasSimilarErrors = wordResults.some(w => w.mistakes.some(m => m.type === 'similar_letter'));
  const hasEndingErrors = wordResults.some(w => w.mistakes.some(m => m.type === 'wrong_ending'));
  const hasShaddahErrors = wordResults.some(w => w.mistakes.some(m => m.type === 'missing_shaddah'));

  if (hasMaddErrors) {
    items.push({ icon: '〰️', text: 'Pay close attention to elongation (مد) letters — ا و ي must be pronounced correctly.', severity: 'warning' });
  }
  if (hasSimilarErrors) {
    items.push({ icon: '🔤', text: 'Some similar-sounding letters were confused (e.g. س/ص, ح/ه, ط/ت). Learn their مخارج (articulation points).', severity: 'warning' });
  }
  if (hasEndingErrors) {
    items.push({ icon: '🔚', text: 'Word endings (إعراب) need attention — the last letter of each word affects meaning.', severity: 'warning' });
  }
  if (hasShaddahErrors) {
    items.push({ icon: '🎵', text: 'Shaddah (ّ) was not applied clearly on some words. Double the stressed letter.', severity: 'warning' });
  }

  // Tajweed
  if (tajweedSummary.length > 0) {
    const rules = tajweedSummary.slice(0, 3).map(t => t.rule).join(', ');
    items.push({ icon: '📚', text: `Tajweed rules in this ayah: ${rules}${tajweedSummary.length > 3 ? ` +${tajweedSummary.length - 3} more` : ''}. See details below.`, severity: 'info' });
  }

  return items;
}

// ─── Main comparison function ─────────────────────────────────────────────────

export function compareRecitation(
  originalText: string,
  spokenText: string
): RecitationResult {
  const origWords   = tokenizeArabic(originalText);
  const spokenWords = tokenizeArabic(spokenText);

  // Annotate tajweed on the original ayah
  const tajweedAnnotations = annotateAyah(originalText);
  const tajweedSummary     = summarizeTajweed(tajweedAnnotations);

  if (origWords.length === 0) {
    return makeEmpty(tajweedAnnotations, tajweedSummary);
  }

  if (spokenWords.length === 0) {
    return makeAllMissed(origWords, tajweedAnnotations, tajweedSummary);
  }

  // Align spoken words to original
  const alignment = alignSequences(origWords, spokenWords);

  // Build word results
  const wordResults: WordResult[] = [];
  const missedWords: string[] = [];
  const extraWords: string[]  = [];

  let origIdx = 0;

  for (const pair of alignment) {
    const tajweed = tajweedAnnotations[origIdx] || {
      word: pair.orig || '',
      wordIndex: origIdx,
      annotations: []
    };

    const analysis: WordMistakeAnalysis = analyzeWordMistakes(
      pair.orig || '',
      pair.spoken || ''
    );

    if (pair.orig && pair.spoken) {
      wordResults.push({
        original: pair.orig,
        originalIndex: origIdx,
        spoken: pair.spoken,
        status: analysis.status,
        similarity: analysis.similarity,
        letter_match: analysis.letter_match,
        madd_match: analysis.madd_match,
        haraka_match: analysis.haraka_match,
        mistakes: analysis.mistakes,
        hasCritical: analysis.mistakes.some(m => m.severity.level === 'critical'),
        hasMajor: analysis.mistakes.some(m => m.severity.level === 'major'),
        tajweed
      });
      origIdx++;
    } else if (pair.orig && !pair.spoken) {
      missedWords.push(pair.orig);
      wordResults.push({
        original: pair.orig,
        originalIndex: origIdx,
        spoken: '',
        status: 'missed',
        similarity: 0,
        letter_match: 0,
        madd_match: 0,
        haraka_match: 0,
        mistakes: analysis.mistakes,
        hasCritical: true,
        hasMajor: true,
        tajweed
      });
      origIdx++;
    } else if (!pair.orig && pair.spoken) {
      extraWords.push(pair.spoken);
      wordResults.push({
        original: '',
        originalIndex: -1,
        spoken: pair.spoken,
        status: 'extra',
        similarity: 0,
        letter_match: 0,
        madd_match: 0,
        haraka_match: 0,
        mistakes: analysis.mistakes,
        hasCritical: false,
        hasMajor: true,
        tajweed: { word: '', wordIndex: -1, annotations: [] }
      });
    }
  }

  // Counts
  const totalOriginalWords = origWords.length;
  const totalSpokenWords   = spokenWords.length;
  const correctCount = wordResults.filter(w => w.status === 'correct').length;
  const partialCount = wordResults.filter(w => w.status === 'partial').length;
  const wrongCount   = wordResults.filter(w => w.status === 'wrong').length;
  const missedCount  = wordResults.filter(w => w.status === 'missed').length;
  const extraCount   = wordResults.filter(w => w.status === 'extra').length;

  // Scores
  const completenessScore = Math.round(
    ((correctCount + partialCount * 0.5) / Math.max(totalOriginalWords, 1)) * 100
  );

  const letterScore = wordResults
    .filter(w => w.original)
    .reduce((acc, w) => acc + w.letter_match, 0) /
    Math.max(wordResults.filter(w => w.original).length, 1);

  const maddScore = wordResults
    .filter(w => w.original)
    .reduce((acc, w) => acc + w.madd_match, 0) /
    Math.max(wordResults.filter(w => w.original).length, 1);

  const harakaScore = wordResults
    .filter(w => w.original)
    .reduce((acc, w) => acc + w.haraka_match, 0) /
    Math.max(wordResults.filter(w => w.original).length, 1);

  // Weighted overall score
  const overallScore = Math.round(
    completenessScore * 0.45 +
    letterScore       * 0.30 +
    maddScore         * 0.15 +
    harakaScore       * 0.10
  );

  const { grade, gradeArabic } = gradeScore(overallScore);

  const partial: Omit<RecitationResult, 'detailedFeedback'> = {
    overallScore, grade, gradeArabic,
    wordResults,
    totalOriginalWords, totalSpokenWords,
    correctCount, partialCount, wrongCount, missedCount, extraCount,
    missedWords, extraWords,
    tajweedAnnotations, tajweedSummary,
    letterScore: Math.round(letterScore),
    maddScore: Math.round(maddScore),
    harakaScore: Math.round(harakaScore),
    completenessScore,
  };

  return { ...partial, detailedFeedback: buildFeedback(partial) };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEmpty(
  tajweedAnnotations: WordTajweedResult[],
  tajweedSummary: TajweedSummary[]
): RecitationResult {
  return {
    overallScore: 0, grade: 'Keep Trying', gradeArabic: 'استمر في المحاولة',
    wordResults: [],
    totalOriginalWords: 0, totalSpokenWords: 0,
    correctCount: 0, partialCount: 0, wrongCount: 0, missedCount: 0, extraCount: 0,
    missedWords: [], extraWords: [],
    tajweedAnnotations, tajweedSummary,
    letterScore: 0, maddScore: 0, harakaScore: 0, completenessScore: 0,
    detailedFeedback: [{ icon: '⚠️', text: 'No ayah selected.', severity: 'error' }]
  };
}

function makeAllMissed(
  origWords: string[],
  tajweedAnnotations: WordTajweedResult[],
  tajweedSummary: TajweedSummary[]
): RecitationResult {
  const wordResults: WordResult[] = origWords.map((word, i) => ({
    original: word, originalIndex: i,
    spoken: '', status: 'missed' as const,
    similarity: 0, letter_match: 0, madd_match: 0, haraka_match: 0,
    mistakes: [{ type: 'missed_word' as const, severity: { level: 'critical' as const, score: 100 }, description: 'Word not recited', tip: 'Practice this word separately.' }],
    hasCritical: true, hasMajor: true,
    tajweed: tajweedAnnotations[i] || { word, wordIndex: i, annotations: [] }
  }));

  return {
    overallScore: 0, grade: 'Keep Trying', gradeArabic: 'استمر في المحاولة',
    wordResults,
    totalOriginalWords: origWords.length, totalSpokenWords: 0,
    correctCount: 0, partialCount: 0, wrongCount: 0, missedCount: origWords.length, extraCount: 0,
    missedWords: origWords, extraWords: [],
    tajweedAnnotations, tajweedSummary,
    letterScore: 0, maddScore: 0, harakaScore: 0, completenessScore: 0,
    detailedFeedback: [
      { icon: '🎤', text: 'No recitation detected. Allow microphone access and try again.', severity: 'error' },
      { icon: '💡', text: 'Tip: Use Chrome or Edge for best Arabic speech recognition results.', severity: 'info' }
    ]
  };
}

// ─── UI helpers (used by components) ─────────────────────────────────────────

export function statusColorClasses(status: WordResult['status']): string {
  switch (status) {
    case 'correct': return 'bg-green-100 text-green-800 border-green-400 ring-green-200';
    case 'partial': return 'bg-amber-100 text-amber-800 border-amber-400 ring-amber-200';
    case 'wrong':   return 'bg-red-100 text-red-800 border-red-400 ring-red-200';
    case 'missed':  return 'bg-gray-100 text-gray-500 border-gray-300 ring-gray-200';
    case 'extra':   return 'bg-orange-100 text-orange-800 border-orange-400 ring-orange-200';
    default:        return 'bg-white text-gray-700 border-gray-200';
  }
}

export function statusIcon(status: WordResult['status']): string {
  switch (status) {
    case 'correct': return '✅';
    case 'partial': return '🔶';
    case 'wrong':   return '❌';
    case 'missed':  return '⬜';
    case 'extra':   return '➕';
    default:        return '•';
  }
}

export function gradeColorConfig(grade: Grade): {
  ring: string; gradient: string; text: string; emoji: string;
} {
  switch (grade) {
    case 'Excellent':      return { ring: 'ring-green-300',  gradient: 'from-green-400 to-emerald-600',  text: 'text-green-700',  emoji: '🌟' };
    case 'Very Good':      return { ring: 'ring-teal-300',   gradient: 'from-teal-400 to-emerald-500',   text: 'text-teal-700',   emoji: '⭐' };
    case 'Good':           return { ring: 'ring-blue-300',   gradient: 'from-blue-400 to-teal-500',      text: 'text-blue-700',   emoji: '👍' };
    case 'Fair':           return { ring: 'ring-yellow-300', gradient: 'from-yellow-400 to-orange-500',  text: 'text-yellow-700', emoji: '💪' };
    case 'Needs Practice': return { ring: 'ring-orange-300', gradient: 'from-orange-400 to-red-500',     text: 'text-orange-700', emoji: '📖' };
    case 'Keep Trying':    return { ring: 'ring-red-300',    gradient: 'from-red-400 to-red-600',        text: 'text-red-700',    emoji: '🤲' };
  }
}

// Re-export normalizeSurface for use in components
export { normalizeSurface };
