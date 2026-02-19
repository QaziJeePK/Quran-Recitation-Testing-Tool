// ═══════════════════════════════════════════════════════════════
//  Tajweed Engine – 20 rules with letter-level detection
// ═══════════════════════════════════════════════════════════════

import { stripDiacritics } from './arabicNormalizer';

export type TajweedRule =
  | 'Ghunna'
  | 'Ikhfa Haqiqi'
  | 'Ikhfa Shafawi'
  | 'Idgham Bighunna'
  | 'Idgham Bilaghunna'
  | 'Idgham Mutajanisayn'
  | 'Idgham Mutaqaribayn'
  | 'Iqlab'
  | 'Izhar Halqi'
  | 'Izhar Shafawi'
  | 'Qalqalah Sughra'
  | 'Qalqalah Kubra'
  | 'Madd Tabii'
  | 'Madd Wajib'
  | 'Madd Jaiz'
  | 'Madd Lazim'
  | 'Madd Arid'
  | 'Shaddah'
  | 'Lam Shamsiyyah'
  | 'Lam Qamariyyah'
  | 'Tafkhim'
  | 'Tarqiq'
  | 'Waqf'
  | 'Hamzat Wasl'
  | 'Sakt';

export interface TajweedRuleInfo {
  rule: TajweedRule;
  nameArabic: string;
  color: string;
  bgColor: string;
  textColor: string;
  description: string;
  howTo: string;
  commonMistake: string;
  counts?: number; // beat counts for madd
}

export const TAJWEED_RULES: Record<TajweedRule, TajweedRuleInfo> = {
  'Ghunna': {
    rule: 'Ghunna',
    nameArabic: 'غُنَّة',
    color: '#059669',
    bgColor: '#d1fae5',
    textColor: '#065f46',
    description: 'Nasalization on ن or م with Shaddah — 2 counts through nose',
    howTo: 'Close your mouth, block airflow at the letters م or ن, and let the sound resonate through your nose for 2 counts.',
    commonMistake: 'Not nasalizing enough, or holding for only 1 count instead of 2.'
  },
  'Ikhfa Haqiqi': {
    rule: 'Ikhfa Haqiqi',
    nameArabic: 'إخفاء حقيقي',
    color: '#3b82f6',
    bgColor: '#dbeafe',
    textColor: '#1e40af',
    description: 'Concealing ن sakin/tanwin before 15 letters with ghunna',
    howTo: 'Do not fully pronounce the nun. Hold it in the nasal passage and glide into the next letter. Duration: 2 counts.',
    commonMistake: 'Either pronouncing the nun too clearly (Izhar mistake) or merging it fully (Idgham mistake).'
  },
  'Ikhfa Shafawi': {
    rule: 'Ikhfa Shafawi',
    nameArabic: 'إخفاء شفوي',
    color: '#60a5fa',
    bgColor: '#eff6ff',
    textColor: '#1d4ed8',
    description: 'Concealing م sakin before ب with ghunna',
    howTo: 'Hold م in nasal resonance without closing lips fully before ب. 2 counts.',
    commonMistake: 'Closing lips too strongly, turning it into a clear م sound.'
  },
  'Idgham Bighunna': {
    rule: 'Idgham Bighunna',
    nameArabic: 'إدغام بغنة',
    color: '#8b5cf6',
    bgColor: '#ede9fe',
    textColor: '#5b21b6',
    description: 'Merging ن/م sakin into ي ن م و with ghunna (2 counts)',
    howTo: 'The nun/meem disappears completely into the next letter while maintaining a 2-count nasal resonance.',
    commonMistake: 'Pronouncing the nun before merging, or skipping the ghunna.'
  },
  'Idgham Bilaghunna': {
    rule: 'Idgham Bilaghunna',
    nameArabic: 'إدغام بلا غنة',
    color: '#6d28d9',
    bgColor: '#f5f3ff',
    textColor: '#4c1d95',
    description: 'Merging ن sakin into ل ر WITHOUT ghunna',
    howTo: 'The nun merges completely into ل or ر with no nasal sound. The following letter gets a strong emphasis.',
    commonMistake: 'Adding a ghunna sound after the nun.'
  },
  'Idgham Mutajanisayn': {
    rule: 'Idgham Mutajanisayn',
    nameArabic: 'إدغام متجانسين',
    color: '#7c3aed',
    bgColor: '#f3e8ff',
    textColor: '#581c87',
    description: 'Two letters of same articulation point merging (e.g. ت+د, ذ+ظ)',
    howTo: 'When the same-origin letters meet, the first merges fully into the second. Do not separate them.',
    commonMistake: 'Pronouncing both letters separately.'
  },
  'Idgham Mutaqaribayn': {
    rule: 'Idgham Mutaqaribayn',
    nameArabic: 'إدغام متقاربين',
    color: '#a855f7',
    bgColor: '#faf5ff',
    textColor: '#6b21a8',
    description: 'Two close-origin letters merging (e.g. ل+ر, ق+ك)',
    howTo: 'The first of the two close-origin letters merges partially into the second.',
    commonMistake: 'Fully separating the two letters instead of merging.'
  },
  'Iqlab': {
    rule: 'Iqlab',
    nameArabic: 'إقلاب',
    color: '#f59e0b',
    bgColor: '#fef3c7',
    textColor: '#92400e',
    description: 'Converting ن sakin/tanwin → م sound before ب, with ghunna',
    howTo: 'When ن or tanwin appears before ب, convert it to a م sound with lips slightly apart, maintaining 2 counts ghunna.',
    commonMistake: 'Pronouncing a full nun before ب instead of converting it to meem.'
  },
  'Izhar Halqi': {
    rule: 'Izhar Halqi',
    nameArabic: 'إظهار حلقي',
    color: '#06b6d4',
    bgColor: '#cffafe',
    textColor: '#164e63',
    description: 'Clear ن sakin/tanwin pronunciation before throat letters: ء ه ع ح غ خ',
    howTo: 'Pronounce the nun clearly and completely with NO ghunna before throat letters.',
    commonMistake: 'Adding ghunna or slight nasalization before these throat letters.'
  },
  'Izhar Shafawi': {
    rule: 'Izhar Shafawi',
    nameArabic: 'إظهار شفوي',
    color: '#0891b2',
    bgColor: '#e0f7fa',
    textColor: '#0c4a6e',
    description: 'Clear م sakin before all letters except م and ب',
    howTo: 'Pronounce م clearly and completely without any nasal sound before non-م/ب letters.',
    commonMistake: 'Adding a hidden ghunna to the meem when it should be clear.'
  },
  'Qalqalah Sughra': {
    rule: 'Qalqalah Sughra',
    nameArabic: 'قلقلة صغرى',
    color: '#ef4444',
    bgColor: '#fee2e2',
    textColor: '#991b1b',
    description: 'Minor echo/bounce on ق ط ب ج د with sukoon in middle of word',
    howTo: 'After pronouncing the Qalqalah letter with sukoon, release with a very slight bounce/echo. The echo should be subtle.',
    commonMistake: 'Making the bounce too strong (Kubra) or not bouncing at all.'
  },
  'Qalqalah Kubra': {
    rule: 'Qalqalah Kubra',
    nameArabic: 'قلقلة كبرى',
    color: '#dc2626',
    bgColor: '#fecaca',
    textColor: '#7f1d1d',
    description: 'Major echo/bounce on ق ط ب ج د at end of word (waqf)',
    howTo: 'At the stopping point, the Qalqalah letter gets a strong, clear bounce. Exaggerate it more than Sughra.',
    commonMistake: 'Stopping without any bounce, or not giving enough bounce energy.'
  },
  'Madd Tabii': {
    rule: 'Madd Tabii',
    nameArabic: 'مدّ طبيعي',
    color: '#ec4899',
    bgColor: '#fce7f3',
    textColor: '#9d174d',
    description: 'Natural elongation: ا after فتحة, و after ضمة, ي after كسرة — 2 counts',
    howTo: 'Stretch the vowel sound for exactly 2 counts (one "beat"). Do not shorten or over-lengthen.',
    commonMistake: 'Shortening to 1 count or over-extending beyond 2 counts.',
    counts: 2
  },
  'Madd Wajib': {
    rule: 'Madd Wajib',
    nameArabic: 'مدّ واجب متصل',
    color: '#f97316',
    bgColor: '#ffedd5',
    textColor: '#9a3412',
    description: 'Mandatory elongation 4-5 counts: madd letter + hamza in SAME word',
    howTo: 'When a madd letter is followed by hamza in the same word, extend for 4 to 5 counts. This is obligatory.',
    commonMistake: 'Only extending for 2 counts (treating it like Madd Tabii).',
    counts: 5
  },
  'Madd Jaiz': {
    rule: 'Madd Jaiz',
    nameArabic: 'مدّ جائز منفصل',
    color: '#fb923c',
    bgColor: '#fff7ed',
    textColor: '#7c2d12',
    description: 'Permissible elongation 2-4 counts: madd letter + hamza in NEXT word',
    howTo: 'When the madd letter is at the end of one word and hamza starts the next, you may extend 2 or 4 counts (your choice).',
    commonMistake: 'Inconsistently applying — choose one length and be consistent.',
    counts: 4
  },
  'Madd Lazim': {
    rule: 'Madd Lazim',
    nameArabic: 'مدّ لازم',
    color: '#dc2626',
    bgColor: '#fff1f2',
    textColor: '#881337',
    description: 'Compulsory 6-count elongation: madd letter followed by sukoon or shaddah',
    howTo: 'Hold the elongation for exactly 6 counts. This is mandatory whenever a madd letter is followed by a letter with sukoon or shaddah.',
    commonMistake: 'Extending only 4 counts instead of the required 6.',
    counts: 6
  },
  'Madd Arid': {
    rule: 'Madd Arid',
    nameArabic: 'مدّ عارض',
    color: '#e11d48',
    bgColor: '#ffe4e6',
    textColor: '#9f1239',
    description: 'Elongation 2-6 counts when stopping at word with natural madd',
    howTo: 'When stopping at a word that ends with a madd letter, you may extend 2, 4, or 6 counts. Most commonly 4 or 6.',
    commonMistake: 'Not elongating at all when stopping.',
    counts: 6
  },
  'Shaddah': {
    rule: 'Shaddah',
    nameArabic: 'شدّة',
    color: '#7c3aed',
    bgColor: '#ede9fe',
    textColor: '#4c1d95',
    description: 'Doubled letter — stress and hold like saying the letter twice',
    howTo: 'A shaddah doubles the letter. Hold your tongue/lips in position for an extra count before releasing.',
    commonMistake: 'Not holding long enough, making the shaddah sound like a single letter.'
  },
  'Lam Shamsiyyah': {
    rule: 'Lam Shamsiyyah',
    nameArabic: 'لام شمسية',
    color: '#0ea5e9',
    bgColor: '#e0f2fe',
    textColor: '#075985',
    description: 'The ل of ال merges into sun letters: ت ث د ذ ر ز س ش ص ض ط ظ ل ن',
    howTo: 'Do NOT pronounce the ل. Instead, go directly to the next letter and give it a shaddah-like emphasis.',
    commonMistake: 'Pronouncing the ل clearly before sun letters (should be silent).'
  },
  'Lam Qamariyyah': {
    rule: 'Lam Qamariyyah',
    nameArabic: 'لام قمرية',
    color: '#14b8a6',
    bgColor: '#ccfbf1',
    textColor: '#134e4a',
    description: 'The ل of ال is clearly pronounced before moon letters: ا ب ج ح خ ع غ ف ق ك م ه و ي',
    howTo: 'Pronounce the ل clearly and distinctly before moon letters.',
    commonMistake: 'Swallowing the ل sound or making it too soft.'
  },
  'Tafkhim': {
    rule: 'Tafkhim',
    nameArabic: 'تفخيم',
    color: '#b45309',
    bgColor: '#fef3c7',
    textColor: '#78350f',
    description: 'Heavy/full-mouth pronunciation: ص ض ط ظ غ خ ق and Allah/Ra in certain contexts',
    howTo: 'Raise the back of the tongue toward the soft palate, fill the mouth, and give these letters a deep, heavy sound.',
    commonMistake: 'Pronouncing heavy letters with a thin, light voice (Tarqiq mistake).'
  },
  'Tarqiq': {
    rule: 'Tarqiq',
    nameArabic: 'ترقيق',
    color: '#65a30d',
    bgColor: '#ecfccb',
    textColor: '#3f6212',
    description: 'Thin/light pronunciation: most letters, Ra with kasra, Lam in Allah after kasra',
    howTo: 'Keep the tongue flat and forward. Produce a thin, light sound without filling the mouth.',
    commonMistake: 'Adding heaviness (Tafkhim) to letters that should be light.'
  },
  'Waqf': {
    rule: 'Waqf',
    nameArabic: 'وقف',
    color: '#64748b',
    bgColor: '#f1f5f9',
    textColor: '#1e293b',
    description: 'Stopping — complete breath pause at end of ayah or waqf marks',
    howTo: 'Stop breathing entirely. Drop the final vowel (if any) and hold the last consonant. Then restart with a fresh breath.',
    commonMistake: 'Not stopping at waqf marks, or continuing with the wrong vowel sound at the stop.'
  },
  'Hamzat Wasl': {
    rule: 'Hamzat Wasl',
    nameArabic: 'همزة وصل',
    color: '#0f766e',
    bgColor: '#ccfbf1',
    textColor: '#134e4a',
    description: 'Connecting hamza: pronounced when starting, silent when continuing',
    howTo: 'When beginning recitation, pronounce the hamzat wasl. When connecting from a previous word, skip it entirely.',
    commonMistake: 'Pronouncing the hamzat wasl even when connecting it to the previous word.'
  },
  'Sakt': {
    rule: 'Sakt',
    nameArabic: 'سكت',
    color: '#475569',
    bgColor: '#f8fafc',
    textColor: '#0f172a',
    description: 'Brief pause without breath — specific places in the Quran',
    howTo: 'Stop your voice briefly without taking a breath. Only in specific marked positions.',
    commonMistake: 'Taking a breath during Sakt (should be breathless stop).'
  }
};

// ─── Letter classification ───────────────────────────────────────────────────

const SUN_LETTERS   = new Set(['ت','ث','د','ذ','ر','ز','س','ش','ص','ض','ط','ظ','ل','ن']);
const MOON_LETTERS  = new Set(['ا','ب','ج','ح','خ','ع','غ','ف','ق','ك','م','ه','و','ي']);
const THROAT_LETTERS = new Set(['ء','ه','ع','ح','غ','خ']);
const QALQALAH     = new Set(['ق','ط','ب','ج','د']);
const HEAVY_LETTERS = new Set(['ص','ض','ط','ظ','غ','خ','ق']);

// Letters where ن sakin/tanwin causes Ikhfa
const IKHFA_LETTERS = new Set(['ت','ث','ج','د','ذ','ز','س','ش','ص','ض','ط','ظ','ف','ق','ك']);

// Letters where ن sakin causes Idgham Bighunna
const IDGHAM_GHUNNA = new Set(['ي','ن','م','و']);

// Letters where ن sakin causes Idgham Bilaghunna
const IDGHAM_NO_GHUNNA = new Set(['ل','ر']);

// ─── Word-level Tajweed detection ────────────────────────────────────────────

export interface TajweedAnnotation {
  rule: TajweedRule;
  info: TajweedRuleInfo;
  position?: 'word' | 'junction'; // word-internal or junction with next word
}

export function detectWordTajweed(word: string): TajweedAnnotation[] {
  const annotations: TajweedAnnotation[] = [];
  const bare = stripDiacritics(word);
  const add = (rule: TajweedRule) => {
    if (!annotations.find(a => a.rule === rule)) {
      annotations.push({ rule, info: TAJWEED_RULES[rule], position: 'word' });
    }
  };

  // Shaddah
  if (/ّ/.test(word)) add('Shaddah');

  // Ghunna: ن or م with shaddah
  if (/[نم]ّ/.test(word)) add('Ghunna');

  // Lam Shamsiyyah / Qamariyyah
  if (/^ال/.test(bare)) {
    const afterLam = bare[2];
    if (afterLam && SUN_LETTERS.has(afterLam))  add('Lam Shamsiyyah');
    if (afterLam && MOON_LETTERS.has(afterLam)) add('Lam Qamariyyah');
  }

  // Qalqalah Sughra (sukoon mid-word)
  for (let i = 0; i < bare.length - 1; i++) {
    if (QALQALAH.has(bare[i])) {
      // Check if there's a sukoon on this letter in the original
      const sukoonIdx = word.indexOf(bare[i]);
      if (sukoonIdx !== -1 && word[sukoonIdx + 1] === '\u0652') {
        add('Qalqalah Sughra');
        break;
      }
    }
  }

  // Qalqalah Kubra (last letter is Qalqalah)
  const lastBare = bare[bare.length - 1];
  if (lastBare && QALQALAH.has(lastBare)) add('Qalqalah Kubra');

  // Madd Tabii: madd letter with matching vowel before it
  if (/\u064Eا/.test(word) || /\u064Fو/.test(word) || /\u0650ي/.test(word)) add('Madd Tabii');

  // Madd Wajib: madd letter + hamza in same word
  if (/[اوي][أإءؤئ]/.test(bare) || /[اوي][\u0654\u0655]/.test(word)) add('Madd Wajib');

  // Madd Lazim: madd letter + sukoon in same word
  if (/[اوي]\u0652/.test(word)) add('Madd Lazim');

  // Madd Lazim: madd letter + shaddah
  if (/[اوي]ّ/.test(word)) add('Madd Lazim');

  // Tafkhim: heavy letters
  for (const ch of bare) {
    if (HEAVY_LETTERS.has(ch)) { add('Tafkhim'); break; }
  }

  // Allah tafkhim
  if (/الله/.test(bare)) add('Tafkhim');

  // Ra tafkhim (Ra with fatha or damma)
  if (/ر[\u064E\u064F]/.test(word)) add('Tafkhim');

  // Ra tarqiq (Ra with kasra)
  if (/ر\u0650/.test(word) || /\u0650ر/.test(word)) add('Tarqiq');

  // Hamzat Wasl
  if (/^ٱ/.test(word) || /^اِ/.test(word)) add('Hamzat Wasl');

  // Waqf marker
  if (/[ۚۖۗ۩ۘۙ]/.test(word)) add('Waqf');

  return annotations;
}

// ─── Junction (between two words) Tajweed detection ──────────────────────────

export function detectJunctionTajweed(
  prevWord: string,
  nextWord: string
): TajweedAnnotation[] {
  const annotations: TajweedAnnotation[] = [];
  const add = (rule: TajweedRule) => {
    annotations.push({ rule, info: TAJWEED_RULES[rule], position: 'junction' });
  };

  const prevBare = stripDiacritics(prevWord);
  const nextBare = stripDiacritics(nextWord);
  const nextFirst = nextBare[0] || '';

  // Check if previous word ends with ن sakin or tanwin
  const endsWithNoonSakin  = /ن\u0652$/.test(prevWord) || prevBare.endsWith('ن') && /\u0652$/.test(prevWord);
  const endsWithTanwin     = /[\u064B\u064C\u064D]$/.test(prevWord);
  const hasNoonContext     = endsWithNoonSakin || endsWithTanwin;

  // Check if previous word ends with م sakin
  const endsWithMeemSakin  = /م\u0652/.test(prevWord) || (prevBare.endsWith('م') && /\u0652/.test(prevWord.slice(-2)));

  if (hasNoonContext && nextFirst) {
    if (THROAT_LETTERS.has(nextFirst))          add('Izhar Halqi');
    else if (IDGHAM_GHUNNA.has(nextFirst))      add('Idgham Bighunna');
    else if (IDGHAM_NO_GHUNNA.has(nextFirst))   add('Idgham Bilaghunna');
    else if (nextFirst === 'ب')                 add('Iqlab');
    else if (IKHFA_LETTERS.has(nextFirst))      add('Ikhfa Haqiqi');
  }

  if (endsWithMeemSakin && nextFirst) {
    if (nextFirst === 'ب')                      add('Ikhfa Shafawi');
    else if (nextFirst === 'م')                 add('Idgham Bighunna');
    else                                        add('Izhar Shafawi');
  }

  // Madd Jaiz: madd at word end, hamza at next word start
  const prevLastBare = prevBare[prevBare.length - 1];
  if (['ا','و','ي'].includes(prevLastBare) && ['أ','إ','ا','ء','ؤ','ئ'].includes(nextFirst)) {
    add('Madd Jaiz');
  }

  // Madd Arid: word ends with madd letter at waqf position
  if (['ا','و','ي'].includes(prevLastBare)) add('Madd Arid');

  // Idgham Mutajanisayn
  const mutajanisaynPairs = [['ت','د'],['ت','ط'],['د','ت'],['ط','ت'],['ذ','ظ'],['ظ','ذ'],['ث','ذ'],['ذ','ث']];
  if (mutajanisaynPairs.some(([a,b]) => prevLastBare === a && nextFirst === b)) {
    add('Idgham Mutajanisayn');
  }

  // Idgham Mutaqaribayn
  const mutaqaribaynPairs = [['ل','ر'],['ق','ك']];
  if (mutaqaribaynPairs.some(([a,b]) => prevLastBare === a && nextFirst === b)) {
    add('Idgham Mutaqaribayn');
  }

  return annotations;
}

// ─── Full ayah annotation ────────────────────────────────────────────────────

export interface WordTajweedResult {
  word: string;
  wordIndex: number;
  annotations: TajweedAnnotation[];
}

export function annotateAyah(ayahText: string): WordTajweedResult[] {
  const words = ayahText.trim().split(/\s+/).filter(Boolean);
  const results: WordTajweedResult[] = words.map((word, i) => ({
    word,
    wordIndex: i,
    annotations: detectWordTajweed(word)
  }));

  // Add junction annotations to the preceding word
  for (let i = 0; i < words.length - 1; i++) {
    const junctionAnnotations = detectJunctionTajweed(words[i], words[i + 1]);
    for (const ann of junctionAnnotations) {
      if (!results[i].annotations.find(a => a.rule === ann.rule)) {
        results[i].annotations.push(ann);
      }
    }
  }

  return results;
}

// ─── Summarize tajweed rules across an ayah ──────────────────────────────────

export interface TajweedSummary {
  rule: TajweedRule;
  info: TajweedRuleInfo;
  wordIndices: number[];
  words: string[];
}

export function summarizeTajweed(annotated: WordTajweedResult[]): TajweedSummary[] {
  const map = new Map<TajweedRule, TajweedSummary>();

  for (const wr of annotated) {
    for (const ann of wr.annotations) {
      if (!map.has(ann.rule)) {
        map.set(ann.rule, {
          rule: ann.rule,
          info: ann.info,
          wordIndices: [],
          words: []
        });
      }
      const entry = map.get(ann.rule)!;
      entry.wordIndices.push(wr.wordIndex);
      entry.words.push(wr.word);
    }
  }

  return Array.from(map.values());
}
