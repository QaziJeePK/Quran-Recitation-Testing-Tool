// ═══════════════════════════════════════════════════════════════
//  Mistake Analyzer – Deep phoneme-level mistake classification
// ═══════════════════════════════════════════════════════════════

import {
  stripDiacritics,
  normalizeSurface,
  extractDiacritics,
  countMadd,
  countShaddah,
  hasTanwin,
  areSimilarLetters,
  charDiff,
} from './arabicNormalizer';

// ─── Mistake types ───────────────────────────────────────────────────────────

export type MistakeType =
  // Word-level
  | 'missed_word'
  | 'extra_word'
  | 'word_order'
  // Letter-level
  | 'wrong_letter'
  | 'similar_letter'      // confused phonetically similar letter (e.g. س↔ص)
  | 'missing_letter'
  | 'extra_letter'
  // Vowel-level
  | 'wrong_haraka'        // wrong short vowel (fatha/kasra/damma)
  | 'missing_haraka'      // dropped the vowel
  | 'extra_haraka'
  // Elongation
  | 'wrong_madd'          // elongation length/presence wrong
  | 'missing_madd'        // elongation letter dropped
  | 'extra_madd'          // elongation added where none
  // Emphasis
  | 'missing_shaddah'     // shaddah not applied
  | 'extra_shaddah'       // shaddah applied where none
  // Nasalization
  | 'wrong_ghunna'
  | 'tanwin_error'        // tanwin read wrong
  | 'sukoon_error'        // sukoon not applied
  // Ending
  | 'wrong_ending'
  | 'missing_ending'
  // Hamza
  | 'hamza_error'
  // General
  | 'pronunciation_close'; // correct enough, minor phonetic deviation

export interface MistakeSeverity {
  level: 'critical' | 'major' | 'minor' | 'cosmetic';
  score: number; // penalty 0–100
}

export const MISTAKE_SEVERITY: Record<MistakeType, MistakeSeverity> = {
  missed_word:       { level: 'critical', score: 100 },
  extra_word:        { level: 'major',    score: 60  },
  word_order:        { level: 'major',    score: 70  },
  wrong_letter:      { level: 'critical', score: 90  },
  similar_letter:    { level: 'major',    score: 50  },
  missing_letter:    { level: 'major',    score: 65  },
  extra_letter:      { level: 'minor',    score: 35  },
  wrong_haraka:      { level: 'major',    score: 55  },
  missing_haraka:    { level: 'minor',    score: 30  },
  extra_haraka:      { level: 'minor',    score: 20  },
  wrong_madd:        { level: 'major',    score: 60  },
  missing_madd:      { level: 'major',    score: 65  },
  extra_madd:        { level: 'minor',    score: 30  },
  missing_shaddah:   { level: 'major',    score: 60  },
  extra_shaddah:     { level: 'minor',    score: 30  },
  wrong_ghunna:      { level: 'major',    score: 55  },
  tanwin_error:      { level: 'minor',    score: 35  },
  sukoon_error:      { level: 'minor',    score: 30  },
  wrong_ending:      { level: 'major',    score: 55  },
  missing_ending:    { level: 'major',    score: 50  },
  hamza_error:       { level: 'minor',    score: 25  },
  pronunciation_close: { level: 'cosmetic', score: 10 },
};

export interface DetailedMistake {
  type: MistakeType;
  severity: MistakeSeverity;
  description: string;
  tip: string;
  originalPart?: string;
  spokenPart?: string;
}

// ─── Human-readable mistake descriptions ────────────────────────────────────

function describeLetterMistake(orig: string, spoken: string, isSimilar: boolean): DetailedMistake {
  if (isSimilar) {
    return {
      type: 'similar_letter',
      severity: MISTAKE_SEVERITY['similar_letter'],
      description: `Confused similar-sounding letter: said "${spoken}" instead of "${orig}"`,
      tip: `The letters "${orig}" and "${spoken}" sound alike but are distinct in Arabic. Focus on the exact articulation point (مخرج).`,
      originalPart: orig,
      spokenPart: spoken,
    };
  }
  return {
    type: 'wrong_letter',
    severity: MISTAKE_SEVERITY['wrong_letter'],
    description: `Wrong letter: said "${spoken}" instead of "${orig}"`,
    tip: `This is a letter substitution error. Learn the correct articulation (مخرج) for "${orig}".`,
    originalPart: orig,
    spokenPart: spoken,
  };
}

// ─── Main word analyzer ───────────────────────────────────────────────────────

export interface WordMistakeAnalysis {
  mistakes: DetailedMistake[];
  similarity: number; // 0–100
  status: 'correct' | 'partial' | 'wrong' | 'missed' | 'extra';
  phonetic_match: number; // 0–100
  haraka_match: number;   // 0–100
  madd_match: number;     // 0–100
  letter_match: number;   // 0–100
}

export function analyzeWordMistakes(
  original: string,
  spoken: string
): WordMistakeAnalysis {
  const mistakes: DetailedMistake[] = [];

  if (!spoken) {
    return {
      mistakes: [{ type: 'missed_word', severity: MISTAKE_SEVERITY['missed_word'], description: 'Word was not recited', tip: 'This word was completely skipped. Practice it in isolation first.' }],
      similarity: 0, status: 'missed',
      phonetic_match: 0, haraka_match: 0, madd_match: 0, letter_match: 0
    };
  }

  if (!original) {
    return {
      mistakes: [{ type: 'extra_word', severity: MISTAKE_SEVERITY['extra_word'], description: 'Extra word added that is not in the ayah', tip: 'You said a word that does not exist in this ayah. Stay focused on the text.' }],
      similarity: 0, status: 'extra',
      phonetic_match: 0, haraka_match: 0, madd_match: 0, letter_match: 0
    };
  }

  const origBare   = normalizeSurface(original);
  const spokBare   = normalizeSurface(spoken);
  const origStrip  = stripDiacritics(original).replace(/[أإآٱ]/g, 'ا').replace(/[ىی]/g, 'ي');
  const spokStrip  = stripDiacritics(spoken).replace(/[أإآٱ]/g, 'ا').replace(/[ىی]/g, 'ي');

  // ── 1. Letter-level diff ────────────────────────────────────────
  const diffs = charDiff(original, spoken);
  let letterMatches = 0;
  let letterTotal = 0;

  for (const d of diffs) {
    letterTotal++;
    if (d.type === 'match') {
      letterMatches++;
    } else if (d.type === 'substitute') {
      mistakes.push(describeLetterMistake(d.original!, d.spoken!, d.isSimilar || false));
    } else if (d.type === 'delete') {
      mistakes.push({
        type: 'missing_letter',
        severity: MISTAKE_SEVERITY['missing_letter'],
        description: `Missing letter "${d.original}" in recitation`,
        tip: `The letter "${d.original}" was dropped. Make sure to articulate every letter clearly.`,
        originalPart: d.original,
      });
    } else if (d.type === 'insert') {
      mistakes.push({
        type: 'extra_letter',
        severity: MISTAKE_SEVERITY['extra_letter'],
        description: `Extra letter "${d.spoken}" added`,
        tip: `You added "${d.spoken}" which is not in this word. Be careful not to insert extra sounds.`,
        spokenPart: d.spoken,
      });
    }
  }

  const letter_match = letterTotal > 0 ? Math.round((letterMatches / letterTotal) * 100) : 100;

  // ── 2. Haraka (vowel) check ──────────────────────────────────────
  const origDiacritics = extractDiacritics(original);
  const spokDiacritics = extractDiacritics(spoken);
  let harakaMatch = 100;

  if (origDiacritics && !spokDiacritics) {
    // Speech recognition strips diacritics so this is expected — check differently
    harakaMatch = 85; // Can't fully check — speech API doesn't return diacritics
  } else if (origDiacritics && spokDiacritics) {
    // If we somehow have diacritics from speech
    const oLen = origDiacritics.length;
    const sLen = spokDiacritics.length;
    let commonDiacritics = 0;
    for (let i = 0; i < Math.min(oLen, sLen); i++) {
      if (origDiacritics[i] === spokDiacritics[i]) commonDiacritics++;
    }
    harakaMatch = oLen > 0 ? Math.round((commonDiacritics / oLen) * 100) : 100;
  }

  // ── 3. Shaddah check ────────────────────────────────────────────
  const origShaddah = countShaddah(original);
  // Speech APIs usually reflect shaddah via double sound; check if spoken is longer
  if (origShaddah > 0 && spokStrip.length < origStrip.length) {
    mistakes.push({
      type: 'missing_shaddah',
      severity: MISTAKE_SEVERITY['missing_shaddah'],
      description: `Missing shaddah (ّ) — the word has ${origShaddah} shaddah(s) that must be stressed`,
      tip: 'Hold the shaddah letter for an extra beat — as if saying it twice.',
    });
  }

  // ── 4. Madd (elongation) check ──────────────────────────────────
  const origMadd = countMadd(original);
  const spokMadd = countMadd(spoken);
  let madd_match = 100;

  if (origMadd !== spokMadd) {
    madd_match = origMadd > 0 ? Math.round((Math.min(origMadd, spokMadd) / origMadd) * 100) : 50;
    if (origMadd > spokMadd) {
      mistakes.push({
        type: 'missing_madd',
        severity: MISTAKE_SEVERITY['missing_madd'],
        description: `Missing elongation letter — original has ${origMadd} madd letter(s), you had ${spokMadd}`,
        tip: 'Elongation letters (ا و ي) are important in Arabic. Dropping them changes the word meaning.',
      });
    } else {
      mistakes.push({
        type: 'extra_madd',
        severity: MISTAKE_SEVERITY['extra_madd'],
        description: `Extra elongation — you elongated where it should not be`,
        tip: 'Be careful not to add elongation that is not present in the original word.',
      });
    }
  }

  // ── 5. Tanwin check ─────────────────────────────────────────────
  const origTanwin = hasTanwin(original);
  if (origTanwin && spokBare === origBare) {
    // Bare form matches but tanwin might have been dropped — minor
    // (hard to detect without phonetic alphabet, so just note it)
  }

  // ── 6. Ending check ────────────────────────────────────────────
  if (origStrip.length > 1 && spokStrip.length > 1) {
    const origLast = origStrip[origStrip.length - 1];
    const spokLast = spokStrip[spokStrip.length - 1];
    if (origLast !== spokLast && !areSimilarLetters(origLast, spokLast)) {
      mistakes.push({
        type: 'wrong_ending',
        severity: MISTAKE_SEVERITY['wrong_ending'],
        description: `Wrong ending: word should end with "${origLast}" but you ended with "${spokLast}"`,
        tip: 'The ending of an Arabic word determines its grammatical case (إعراب). Recite each word ending carefully.',
        originalPart: origLast,
        spokenPart: spokLast,
      });
    } else if (origStrip.length > spokStrip.length + 1) {
      mistakes.push({
        type: 'missing_ending',
        severity: MISTAKE_SEVERITY['missing_ending'],
        description: 'Word ending was cut short',
        tip: 'Complete the full pronunciation of this word — do not stop mid-word.',
      });
    }
  }

  // ── 7. Hamza check ──────────────────────────────────────────────
  const origHamza = /[أإآءؤئٱ]/.test(original);
  const spokHamza = /[أإآءؤئٱ]/.test(spoken);
  if (origHamza !== spokHamza) {
    mistakes.push({
      type: 'hamza_error',
      severity: MISTAKE_SEVERITY['hamza_error'],
      description: origHamza ? 'Hamza not pronounced clearly' : 'Extra hamza added',
      tip: 'Hamza (ء) requires a clear glottal stop sound. It is not the same as alef (ا).',
    });
  }

  // ── 8. Calculate similarity ──────────────────────────────────────
  // Weighted: letters 60%, surface bare 30%, length 10%
  const surfaceSim = computeStringSimilarity(origBare, spokBare);
  const phonSim    = computeStringSimilarity(origStrip, spokStrip);
  const similarity = Math.round(letter_match * 0.5 + surfaceSim * 0.35 + phonSim * 0.15);

  // ── 9. Status ───────────────────────────────────────────────────
  let status: WordMistakeAnalysis['status'];
  if (similarity >= 90) status = 'correct';
  else if (similarity >= 65) status = 'partial';
  else status = 'wrong';

  return {
    mistakes,
    similarity,
    status,
    phonetic_match: phonSim,
    haraka_match: harakaMatch,
    madd_match,
    letter_match
  };
}

// ─── String similarity (Levenshtein-based) ───────────────────────────────────

export function computeStringSimilarity(a: string, b: string): number {
  if (a === b) return 100;
  if (!a || !b) return 0;
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return Math.max(0, Math.round((1 - dist / maxLen) * 100));
}

export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

// ─── Sequence alignment (Needleman-Wunsch adapted) ───────────────────────────

const GAP_ORIG   = -25; // penalty for skipping a required word (missed)
const GAP_SPOKEN = -12; // penalty for an extra spoken word

export function alignSequences(
  origWords: string[],
  spokenWords: string[]
): Array<{ orig: string | null; spoken: string | null }> {
  const n = origWords.length;
  const m = spokenWords.length;

  const score = (o: string, s: string) =>
    computeStringSimilarity(
      normalizeSurface(o),
      normalizeSurface(s)
    );

  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) dp[i][0] = dp[i-1][0] + GAP_ORIG;
  for (let j = 1; j <= m; j++) dp[0][j] = dp[0][j-1] + GAP_SPOKEN;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const matchScore = dp[i-1][j-1] + score(origWords[i-1], spokenWords[j-1]);
      const skipOrig   = dp[i-1][j] + GAP_ORIG;
      const skipSpoken = dp[i][j-1] + GAP_SPOKEN;
      dp[i][j] = Math.max(matchScore, skipOrig, skipSpoken);
    }
  }

  const alignment: Array<{ orig: string | null; spoken: string | null }> = [];
  let i = n, j = m;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const diag = dp[i-1][j-1] + score(origWords[i-1], spokenWords[j-1]);
      if (dp[i][j] === diag) {
        alignment.unshift({ orig: origWords[i-1], spoken: spokenWords[j-1] });
        i--; j--;
        continue;
      }
    }
    if (i > 0 && (j === 0 || dp[i][j] === dp[i-1][j] + GAP_ORIG)) {
      alignment.unshift({ orig: origWords[i-1], spoken: null });
      i--;
    } else {
      alignment.unshift({ orig: null, spoken: spokenWords[j-1] });
      j--;
    }
  }

  return alignment;
}
