// ═══════════════════════════════════════════════════════════════
//  Arabic Normalizer – Deep phonetic normalization for Quranic
//  recitation comparison (handles all script variations)
// ═══════════════════════════════════════════════════════════════

// All Arabic diacritics (tashkeel)
export const DIACRITIC_RANGE = /[\u064B-\u065F\u0610-\u061A\u06D6-\u06ED\u0670]/g;

// Remove ALL diacritics
export function stripDiacritics(text: string): string {
  return text.replace(DIACRITIC_RANGE, '').replace(/[\u200F\u200E\u200B\uFEFF]/g, '').trim();
}

// Normalize hamza forms → ا
export function normalizeHamza(text: string): string {
  return text
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ؤ]/g, 'و')
    .replace(/[ئ]/g, 'ي')
    .replace(/[ء]/g, '');
}

// Normalize alef forms
export function normalizeAlef(text: string): string {
  return text.replace(/[أإآٱا]/g, 'ا');
}

// Normalize ya/alef maqsura
export function normalizeYa(text: string): string {
  return text.replace(/[ىی]/g, 'ي');
}

// Normalize ta marbuta → ha
export function normalizeTaMarbuta(text: string): string {
  return text.replace(/ة/g, 'ه');
}

// Normalize waw
export function normalizeWaw(text: string): string {
  return text.replace(/[ؤو]/g, 'و');
}

// Full surface normalization (for display matching)
export function normalizeSurface(text: string): string {
  return stripDiacritics(text)
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ىی]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

// Deep phonetic normalization (for comparison – maximum tolerance)
export function normalizePhonetic(text: string): string {
  return normalizeSurface(text)
    .replace(/ء/g, '')          // drop standalone hamza
    .replace(/ّ/g, '')           // ignore shaddah in bare form
    .replace(/[اوي]/g, '')      // drop madd letters (length comparison done separately)
    .replace(/ه$/g, '')         // drop final ha (often silent)
    .replace(/ن$/g, 'ن')        // keep final nun
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract just consonants (for skeleton comparison)
export function extractConsonants(text: string): string {
  return stripDiacritics(text)
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ىی]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي');
}

// Extract diacritics string from a word
export function extractDiacritics(text: string): string {
  const matches = text.match(DIACRITIC_RANGE) || [];
  return matches.join('');
}

// Count madd (elongation) letters in a word
export function countMadd(text: string): number {
  const bare = stripDiacritics(text);
  return (bare.match(/[اوي]/g) || []).length;
}

// Count shaddah occurrences
export function countShaddah(text: string): number {
  return (text.match(/ّ/g) || []).length;
}

// Check if word has tanwin
export function hasTanwin(text: string): boolean {
  return /[\u064B\u064C\u064D]/.test(text);
}

// Check if word has sukoon
export function hasSukoon(text: string): boolean {
  return /\u0652/.test(text);
}

// Phoneme groups – letters that sound similar and may be confused
export const PHONEME_GROUPS: Record<string, string[]> = {
  // Emphatic pairs
  emphatic: ['ص', 'س', 'ز'],
  emphatic2: ['ط', 'ت', 'د'],
  emphatic3: ['ظ', 'ذ', 'ث', 'ز'],
  emphatic4: ['ض', 'ظ'],

  // Guttural/throat
  throat: ['ح', 'ه', 'خ', 'ع', 'غ'],
  throat2: ['ع', 'أ', 'ا'],

  // Alef-like
  alef: ['ا', 'أ', 'إ', 'آ', 'ٱ'],

  // Ya-like
  ya: ['ي', 'ى', 'ئ'],

  // Waw-like
  waw: ['و', 'ؤ'],

  // Nun-meem (nasal)
  nasal: ['ن', 'م'],

  // Qaf-Kaf
  velar: ['ق', 'ك'],

  // Ra-lam
  liquid: ['ر', 'ل'],

  // Sheen-seen
  sibilant: ['ش', 'س'],

  // Fa-ba
  labial: ['ف', 'ب', 'م', 'و'],
};

// Check if two letters are phonetically similar
export function areSimilarLetters(a: string, b: string): boolean {
  if (a === b) return true;
  for (const group of Object.values(PHONEME_GROUPS)) {
    if (group.includes(a) && group.includes(b)) return true;
  }
  return false;
}

// Tokenize Arabic text into words (removing Bismillah prefix if needed)
export function tokenizeArabic(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

// Compute detailed character-level diff between two Arabic words
export interface CharDiff {
  type: 'match' | 'substitute' | 'insert' | 'delete';
  original?: string;
  spoken?: string;
  isSimilar?: boolean;
}

export function charDiff(original: string, spoken: string): CharDiff[] {
  const a = stripDiacritics(original).replace(/[أإآٱ]/g, 'ا').replace(/[ىی]/g, 'ي');
  const b = stripDiacritics(spoken).replace(/[أإآٱ]/g, 'ا').replace(/[ىی]/g, 'ي');

  const m = a.length;
  const n = b.length;

  // DP table
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  // Traceback
  const diffs: CharDiff[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      diffs.unshift({ type: 'match', original: a[i - 1], spoken: b[j - 1] });
      i--; j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      diffs.unshift({
        type: 'substitute',
        original: a[i - 1],
        spoken: b[j - 1],
        isSimilar: areSimilarLetters(a[i - 1], b[j - 1])
      });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j] === dp[i][j - 1] + 1)) {
      diffs.unshift({ type: 'insert', spoken: b[j - 1] });
      j--;
    } else {
      diffs.unshift({ type: 'delete', original: a[i - 1] });
      i--;
    }
  }

  return diffs;
}
