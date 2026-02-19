import { useState, useCallback, useEffect, useRef } from 'react';
import { surahMeta, SurahMeta } from './data/quranMeta';
import { fetchSurah, FetchedAyah } from './utils/quranApi';
import { compareRecitation, RecitationResult, WordResult, statusColorClasses, statusIcon } from './utils/recitationChecker';
import { ResultsPanel } from './components/ResultsPanel';
import { RecitersPanel } from './components/RecitersPanel';
import { VoiceComparison } from './components/VoiceComparison';
import { MistakesChart } from './components/MistakesChart';
import { QuranPlayer } from './components/QuranPlayer';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { addAttempt } from './utils/sessionHistory';
import { audioPlayer, buildAyahUrl } from './utils/audioPlayer';
import { RECITERS } from './data/recitersData';
import { TAJWEED_RULES } from './utils/tajweedEngine';

// Juz start data (surah:ayah for each of the 30 juz)
const JUZ_DATA: { surah: number; ayah: number; name: string }[] = [
  { surah:1,  ayah:1,  name:"Juz 1 — Al-Fatiha 1:1"      },
  { surah:2,  ayah:142,name:"Juz 2 — Al-Baqarah 2:142"   },
  { surah:2,  ayah:253,name:"Juz 3 — Al-Baqarah 2:253"   },
  { surah:3,  ayah:92, name:"Juz 4 — Ali 'Imran 3:92"    },
  { surah:4,  ayah:24, name:"Juz 5 — An-Nisa 4:24"       },
  { surah:4,  ayah:148,name:"Juz 6 — An-Nisa 4:148"      },
  { surah:5,  ayah:82, name:"Juz 7 — Al-Ma'idah 5:82"    },
  { surah:6,  ayah:111,name:"Juz 8 — Al-An'am 6:111"     },
  { surah:7,  ayah:87, name:"Juz 9 — Al-A'raf 7:87"      },
  { surah:8,  ayah:41, name:"Juz 10 — Al-Anfal 8:41"     },
  { surah:9,  ayah:93, name:"Juz 11 — At-Tawbah 9:93"    },
  { surah:11, ayah:6,  name:"Juz 12 — Hud 11:6"          },
  { surah:12, ayah:53, name:"Juz 13 — Yusuf 12:53"       },
  { surah:15, ayah:1,  name:"Juz 14 — Al-Hijr 15:1"      },
  { surah:17, ayah:1,  name:"Juz 15 — Al-Isra 17:1"      },
  { surah:18, ayah:75, name:"Juz 16 — Al-Kahf 18:75"     },
  { surah:21, ayah:1,  name:"Juz 17 — Al-Anbiya 21:1"    },
  { surah:23, ayah:1,  name:"Juz 18 — Al-Mu'minun 23:1"  },
  { surah:25, ayah:21, name:"Juz 19 — Al-Furqan 25:21"   },
  { surah:27, ayah:56, name:"Juz 20 — An-Naml 27:56"     },
  { surah:29, ayah:46, name:"Juz 21 — Al-'Ankabut 29:46" },
  { surah:33, ayah:31, name:"Juz 22 — Al-Ahzab 33:31"    },
  { surah:36, ayah:28, name:"Juz 23 — Ya-Sin 36:28"      },
  { surah:39, ayah:32, name:"Juz 24 — Az-Zumar 39:32"    },
  { surah:41, ayah:47, name:"Juz 25 — Fussilat 41:47"    },
  { surah:46, ayah:1,  name:"Juz 26 — Al-Ahqaf 46:1"     },
  { surah:51, ayah:31, name:"Juz 27 — Adh-Dhariyat 51:31"},
  { surah:58, ayah:1,  name:"Juz 28 — Al-Mujadila 58:1"  },
  { surah:67, ayah:1,  name:"Juz 29 — Al-Mulk 67:1"      },
  { surah:78, ayah:1,  name:"Juz 30 — An-Naba 78:1"      },
];

type MainTab = 'recite' | 'listen' | 'compare' | 'quranplayer';
type ResultTab = 'results' | 'history';

function fmtDur(s: number) {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${sec.toString().padStart(2,'0')}`;
}

function VolumeBars({ volume, active }: { volume: number; active: boolean }) {
  const BARS = 10;
  return (
    <div className="flex items-end gap-px" style={{ height: 16 }}>
      {Array.from({ length: BARS }, (_, i) => {
        const threshold = (i / BARS) * 100;
        const lit = active && volume > threshold;
        const h = 2 + Math.round((i / BARS) * 13);
        const color = lit
          ? i < BARS * 0.5 ? '#10b981' : i < BARS * 0.8 ? '#f59e0b' : '#ef4444'
          : '#e5e7eb';
        return (
          <div key={i} className="w-1 rounded-full transition-all duration-75"
            style={{ height: active ? `${h}px` : '2px', backgroundColor: color }} />
        );
      })}
    </div>
  );
}

// ── AyahWords: hover tooltip + click plays FULL AYAH ───────────────────────
function AyahWords({
  ayahText, surahNumber, ayahNumber, wordResults, showResults, reciterFolder,
}: {
  ayahText: string; surahNumber: number; ayahNumber: number;
  wordResults?: WordResult[]; showResults: boolean; reciterFolder: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [ayahPlaying, setAyahPlaying] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const words = ayahText.split(/\s+/).filter(Boolean);
  const origResults = wordResults ? wordResults.filter(w => w.original !== '') : [];

  // Click plays full ayah
  const handleWordClick = useCallback(() => {
    if (ayahPlaying) {
      audioPlayer.pause();
      setAyahPlaying(false);
      return;
    }
    const url = buildAyahUrl(surahNumber, ayahNumber, reciterFolder);
    setAyahPlaying(true);
    audioPlayer.play(url, {
      onStateChange: (s) => { if (s === 'idle' || s === 'error' || s === 'paused') setAyahPlaying(false); },
      onEnded: () => setAyahPlaying(false),
      onError: () => setAyahPlaying(false),
    });
  }, [surahNumber, ayahNumber, reciterFolder, ayahPlaying]);

  const handleWordHover = useCallback((idx: number) => {
    setHovered(idx);
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
  }, []);

  const handleWordLeave = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHovered(null), 200);
  }, []);

  // Stop ayah when ayah changes
  useEffect(() => {
    audioPlayer.stop();
    setAyahPlaying(false);
  }, [surahNumber, ayahNumber]);

  const getWordStyle = (idx: number) => {
    if (!showResults || !origResults.length) return '';
    const r = origResults[idx];
    if (!r) return '';
    switch (r.status) {
      case 'correct': return 'text-green-700 bg-green-100';
      case 'partial': return 'text-amber-700 bg-amber-100';
      case 'wrong':   return 'text-red-700 bg-red-100 underline decoration-red-400 decoration-wavy';
      case 'missed':  return 'text-gray-400 bg-gray-100 line-through opacity-60';
      default: return '';
    }
  };

  return (
    <div className="text-center leading-[3.8] tracking-wide select-none py-2 px-2"
      style={{ fontFamily:"'Amiri Quran','Amiri',serif", fontSize:'clamp(1.25rem,3.2vw,2rem)' }}
      dir="rtl"
    >
      {words.map((word, idx) => {
        const isHovered = hovered === idx;
        const r = showResults ? origResults[idx] : undefined;
        return (
          <span
            key={idx}
            className={`
              relative inline-block mx-1 cursor-pointer rounded-lg px-1 transition-all duration-150
              ${getWordStyle(idx)}
              ${isHovered ? 'bg-amber-50 scale-110 shadow-md ring-2 ring-amber-300' : ''}
              ${ayahPlaying && isHovered ? 'ring-2 ring-emerald-400 bg-emerald-50' : ''}
            `}
            onMouseEnter={() => handleWordHover(idx)}
            onMouseLeave={handleWordLeave}
            onClick={handleWordClick}
            title="Click to hear full ayah"
          >
            {word}

            {/* Hover badge */}
            {isHovered && (
              <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap z-20 shadow pointer-events-none">
                {ayahPlaying ? '⏸ pause' : '▶ play ayah'}
              </span>
            )}

            {/* Playing wave */}
            {ayahPlaying && isHovered && (
              <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 flex gap-0.5 items-end h-2.5 pointer-events-none">
                {[1,2,3].map(i => (
                  <span key={i} className="w-0.5 bg-emerald-500 rounded-full"
                    style={{ animation:`wave ${0.4+i*0.1}s ease-in-out infinite alternate`, animationDelay:`${i*0.07}s`, height:'60%' }} />
                ))}
              </span>
            )}

            {/* Result badge */}
            {r && r.status !== 'correct' && (
              <span className="absolute -top-1 -right-1 text-[9px] z-10 pointer-events-none">{statusIcon(r.status)}</span>
            )}

            {/* Tajweed dot */}
            {r && r.tajweed.annotations.length > 0 && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full pointer-events-none"
                style={{ backgroundColor: r.tajweed.annotations[0].info.color }} />
            )}

            {/* Hover tooltip */}
            {isHovered && (
              <span className="absolute hidden sm:block z-30 bottom-full mb-5 right-0 min-w-[180px] max-w-[230px] bg-gray-900 text-white text-xs rounded-xl p-2.5 shadow-2xl text-left pointer-events-none" dir="ltr">
                <span className="block font-bold text-base mb-1 text-right" style={{ fontFamily:"'Amiri',serif", direction:'rtl' }}>{word}</span>
                <span className="block text-emerald-400 text-xs mb-1 font-semibold">🔊 Click → plays full ayah</span>
                {r && (
                  <>
                    <span className="block text-gray-300 mb-0.5">{statusIcon(r.status)} {r.status} — {r.similarity}%</span>
                    {r.spoken && r.status !== 'correct' && r.status !== 'missed' && (
                      <span className="block text-yellow-300 text-xs" style={{ fontFamily:"'Amiri',serif" }}>You said: {r.spoken}</span>
                    )}
                    {r.mistakes.slice(0,2).map((m,mi) => (
                      <span key={mi} className="block text-red-300 text-[10px] mt-0.5">• {m.description}</span>
                    ))}
                    {r.tajweed.annotations.length > 0 && (
                      <span className="block text-gray-400 text-[10px] mt-1 border-t border-gray-700 pt-1">{r.tajweed.annotations[0].rule}</span>
                    )}
                  </>
                )}
                {!r && <span className="block text-gray-400 text-[10px]">Hover · Click to hear full ayah</span>}
              </span>
            )}
          </span>
        );
      })}
      <style>{`@keyframes wave { 0% { height:20%; } 100% { height:100%; } }`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  MAIN APP
// ═══════════════════════════════════════════════════════════════════════
export function App() {
  const [mainTab, setMainTab] = useState<MainTab>('recite');
  const [resultTab, setResultTab] = useState<ResultTab>('results');

  // Surah/ayah
  const [selectedSurah, setSelectedSurah] = useState<SurahMeta | null>(surahMeta[0]);
  const [selectedAyahNum, setSelectedAyahNum] = useState(1);
  const [ayahs, setAyahs] = useState<FetchedAyah[]>([]);
  const [currentAyah, setCurrentAyah] = useState<FetchedAyah | null>(null);
  const [loadingAyahs, setLoadingAyahs] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Results
  const [result, setResult] = useState<RecitationResult | null>(null);
  const [wordResults, setWordResults] = useState<WordResult[] | undefined>(undefined);
  const [showResults, setShowResults] = useState(false);
  const [checking, setChecking] = useState(false);
  const [chartKey, setChartKey] = useState(0);

  // Manual mode
  const [useManual, setUseManual] = useState(false);
  const [manualText, setManualText] = useState('');

  // Ayah audio
  const [ayahPlaying, setAyahPlaying] = useState(false);
  const [ayahLoading, setAyahLoading] = useState(false);
  const [ayahProgress, setAyahProgress] = useState(0);
  const [ayahTime, setAyahTime] = useState(0);
  const [ayahDur, setAyahDur] = useState(0);
  const [selectedReciterId, setSelectedReciterId] = useState('mishary');
  const [showReciterPicker, setShowReciterPicker] = useState(false);

  // Juz/filter
  const [filterMode, setFilterMode] = useState<'surah'|'juz'|'custom'>('surah');
  const [selectedJuz, setSelectedJuz] = useState(1);

  const [srState, srControls] = useSpeechRecognition();
  const { isListening, transcript, interimTranscript, error: srError, isSupported, permission, duration, volume } = srState;
  const { start: srStart, stop: srStop, reset: srReset } = srControls;

  const activeText = useManual ? manualText : transcript;
  const hasText = activeText.trim().length > 0;
  const selectedReciter = RECITERS.find(r => r.id === selectedReciterId) || RECITERS[0];

  // ── Load surah ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedSurah) return;
    setLoadingAyahs(true);
    setApiError(null);
    setCurrentAyah(null);
    setAyahs([]);
    setResult(null);
    setWordResults(undefined);
    setShowResults(false);
    srReset();
    setManualText('');
    stopAyahAudio();
    fetchSurah(selectedSurah.number)
      .then(fetched => {
        setAyahs(fetched);
        const first = fetched[0] || null;
        setCurrentAyah(first);
        setSelectedAyahNum(first?.number ?? 1);
      })
      .catch(err => setApiError(String(err)))
      .finally(() => setLoadingAyahs(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSurah]);

  const handleAyahChange = useCallback((num: number) => {
    setSelectedAyahNum(num);
    const ayah = ayahs.find(a => a.number === num) || null;
    setCurrentAyah(ayah);
    setResult(null);
    setWordResults(undefined);
    setShowResults(false);
    srReset();
    setManualText('');
    stopAyahAudio();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ayahs, srReset]);

  // Juz navigation
  const handleJuzChange = useCallback((juzIdx: number) => {
    setSelectedJuz(juzIdx + 1);
    const juz = JUZ_DATA[juzIdx];
    if (!juz) return;
    const surah = surahMeta.find(s => s.number === juz.surah);
    if (surah) {
      setSelectedSurah(surah);
      // ayah will be set after surah loads
      setTimeout(() => setSelectedAyahNum(juz.ayah), 600);
    }
  }, []);

  // ── Ayah audio ──────────────────────────────────────────────────────
  const stopAyahAudio = useCallback(() => {
    audioPlayer.stop();
    setAyahPlaying(false);
    setAyahLoading(false);
    setAyahProgress(0);
    setAyahTime(0);
    setAyahDur(0);
  }, []);

  const toggleAyahPlay = useCallback(() => {
    if (ayahPlaying) { audioPlayer.pause(); setAyahPlaying(false); return; }
    const url = buildAyahUrl(selectedSurah?.number ?? 1, selectedAyahNum, selectedReciter.everyayahFolder);
    setAyahLoading(true);
    audioPlayer.play(url, {
      onStateChange: (s) => {
        setAyahLoading(s === 'loading');
        setAyahPlaying(s === 'playing');
        if (s === 'idle' || s === 'error') { setAyahProgress(0); setAyahTime(0); setAyahPlaying(false); setAyahLoading(false); }
      },
      onProgress: (cur, dur) => { setAyahTime(cur); setAyahDur(dur); setAyahProgress(dur > 0 ? (cur/dur)*100 : 0); },
      onEnded: () => { setAyahPlaying(false); setAyahProgress(0); setAyahTime(0); },
      onError: () => { setAyahPlaying(false); setAyahLoading(false); },
    });
  }, [ayahPlaying, selectedSurah, selectedAyahNum, selectedReciter]);

  // ── Check recitation ────────────────────────────────────────────────
  const handleCheck = useCallback(() => {
    if (!currentAyah || !activeText.trim()) return;
    if (isListening) srStop();
    setChecking(true);
    setTimeout(() => {
      try {
        const res = compareRecitation(currentAyah.text, activeText.trim());
        setResult(res);
        setWordResults(res.wordResults);
        setShowResults(true);
        setResultTab('results');
        const mistakeTypes: Record<string, number> = {};
        for (const wr of res.wordResults) for (const m of wr.mistakes) mistakeTypes[m.type] = (mistakeTypes[m.type] || 0) + 1;
        addAttempt({
          surahNumber: selectedSurah?.number ?? 0, surahName: selectedSurah?.name ?? '',
          ayahNumber: selectedAyahNum, ayahText: currentAyah.text, spokenText: activeText.trim(),
          overallScore: res.overallScore, grade: res.grade,
          correctCount: res.correctCount, partialCount: res.partialCount,
          wrongCount: res.wrongCount, missedCount: res.missedCount, extraCount: res.extraCount,
          totalWords: res.totalOriginalWords,
          letterScore: res.letterScore, maddScore: res.maddScore, harakaScore: res.harakaScore,
          completenessScore: res.completenessScore, mistakeTypes, duration,
        });
        setChartKey(k => k + 1);
      } catch (e) { console.error(e); } finally { setChecking(false); }
    }, 80);
  }, [currentAyah, activeText, isListening, srStop, selectedSurah, selectedAyahNum, duration]);

  const handleReset = useCallback(() => {
    if (isListening) srStop();
    srReset(); setManualText(''); setResult(null); setWordResults(undefined); setShowResults(false);
  }, [isListening, srStop, srReset]);

  const handleStart = useCallback(async () => {
    setResult(null); setWordResults(undefined); setShowResults(false);
    await srStart();
  }, [srStart]);

  const scoreColor = result
    ? result.overallScore >= 85 ? 'text-green-600' : result.overallScore >= 60 ? 'text-amber-600' : 'text-red-500'
    : '';

  const fmt = (s: number) => {
    if (!s || isNaN(s)) return '0:00';
    return `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex flex-col">

      {/* ══ HEADER ════════════════════════════════════════════════════════════ */}
      <header className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-700 text-white flex-shrink-0">
        {/* Prayer bar */}
        <div className="bg-emerald-950/60 border-b border-emerald-700/40 px-3 py-1">
          <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-1 text-[11px]">
            <span className="text-amber-300 font-medium flex items-center gap-1">
              🤲 Please pray for <strong className="text-amber-200">SM Talha</strong> — may Allah accept this Sadaqah Jariyah
            </span>
            <div className="flex items-center gap-2 text-emerald-400">
              <a href="https://darsenizami.net" target="_blank" rel="noopener noreferrer"
                className="hover:text-amber-300 transition-colors font-semibold underline underline-offset-1">
                🌐 darsenizami.net
              </a>
              <a href="mailto:smtalhadv@gmail.com" className="hover:text-white transition-colors">✉️ smtalhadv@gmail.com</a>
            </div>
          </div>
        </div>
        {/* Title */}
        <div className="max-w-5xl mx-auto px-3 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🕌</span>
            <div>
              <h1 className="text-base md:text-lg font-black leading-tight">Quran Recitation Checker</h1>
              <p className="text-emerald-300 text-[11px]">مدقق التلاوة · AI Tajweed · 114 Surahs · 12 Reciters</p>
            </div>
          </div>
          <span className="hidden sm:block text-[11px] text-emerald-300 bg-emerald-700/50 px-2 py-0.5 rounded-full">
            Click any word → hears full ayah
          </span>
        </div>
      </header>

      {/* ══ MAIN NAV TABS ══════════════════════════════════════════════════════ */}
      <div className="bg-white border-b border-gray-200 flex-shrink-0 shadow-sm">
        <div className="max-w-5xl mx-auto flex gap-0">
          {([
            { id: 'recite'      as MainTab, label: '🎤 Recite & Check', color: 'border-emerald-500 text-emerald-700' },
            { id: 'listen'      as MainTab, label: '🎧 Famous Reciters', color: 'border-blue-500 text-blue-700' },
            { id: 'compare'     as MainTab, label: '🆚 Voice Compare', color: 'border-purple-500 text-purple-700' },
            { id: 'quranplayer' as MainTab, label: '📖 Full Quran', color: 'border-amber-500 text-amber-700' },
          ] as { id: MainTab; label: string; color: string }[]).map(t => (
            <button key={t.id} onClick={() => setMainTab(t.id)}
              className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition-all
                ${mainTab === t.id ? t.color + ' bg-white' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══ CONTENT ════════════════════════════════════════════════════════════ */}
      <main className="max-w-5xl mx-auto w-full px-2 py-3 flex-1 flex flex-col gap-3">

        {apiError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm flex items-center gap-2">
            <span>⚠️</span><span>{apiError}</span>
            <button onClick={() => window.location.reload()} className="ml-auto underline text-xs">Reload</button>
          </div>
        )}

        {/* ── RECITE TAB ─────────────────────────────────────────────────────── */}
        {mainTab === 'recite' && (
          <div className="flex flex-col gap-3">

            {/* Selector Row */}
            <div className="bg-white rounded-2xl shadow-md border border-emerald-100 p-3 flex flex-wrap items-center gap-2">
              {/* Filter tabs */}
              <div className="flex bg-gray-100 rounded-full p-0.5 gap-0.5 flex-shrink-0">
                {(['surah','juz','custom'] as const).map(f => (
                  <button key={f} onClick={() => setFilterMode(f)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all capitalize
                      ${filterMode === f ? 'bg-emerald-600 text-white shadow' : 'text-gray-500 hover:text-gray-700'}`}>
                    {f === 'juz' ? 'Juz' : f === 'custom' ? 'Custom' : 'Surah'}
                  </button>
                ))}
              </div>

              {/* Juz filter */}
              {filterMode === 'juz' && (
                <select value={selectedJuz - 1} onChange={e => handleJuzChange(parseInt(e.target.value))}
                  className="flex-1 min-w-[160px] px-2 py-1.5 rounded-lg border border-emerald-200 text-sm focus:border-emerald-400 focus:outline-none bg-white font-medium">
                  {JUZ_DATA.map((j, i) => <option key={i} value={i}>{j.name}</option>)}
                </select>
              )}

              {/* Surah/Custom filter */}
              {(filterMode === 'surah' || filterMode === 'custom') && (
                <select value={selectedSurah?.number ?? ''}
                  onChange={e => { const s = surahMeta.find(x => x.number === parseInt(e.target.value)); if (s) setSelectedSurah(s); }}
                  className="flex-1 min-w-[160px] px-2 py-1.5 rounded-lg border border-emerald-200 text-sm focus:border-emerald-400 focus:outline-none bg-white font-medium">
                  {surahMeta.map(s => <option key={s.number} value={s.number}>{s.number}. {s.name} — {s.nameArabic}</option>)}
                </select>
              )}

              {/* Ayah */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <label className="text-xs font-bold text-emerald-700">آية</label>
                <select value={selectedAyahNum} onChange={e => handleAyahChange(parseInt(e.target.value))}
                  disabled={!selectedSurah || loadingAyahs}
                  className="w-16 px-1.5 py-1.5 rounded-lg border border-emerald-200 text-sm focus:border-emerald-400 focus:outline-none bg-white font-medium disabled:opacity-50">
                  {Array.from({ length: selectedSurah?.ayahCount ?? 0 }, (_, i) => i+1).map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              {/* Reciter picker */}
              <div className="relative flex-shrink-0">
                <button onClick={() => setShowReciterPicker(p => !p)}
                  className="flex items-center gap-1 px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-700">
                  <span>{selectedReciter.flag}</span>
                  <span className="hidden sm:inline max-w-[60px] truncate">{selectedReciter.name.split(' ')[0]}</span>
                  <span>▾</span>
                </button>
                {showReciterPicker && (
                  <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-xl shadow-2xl border border-emerald-100 p-2 min-w-[190px]">
                    <p className="text-[10px] text-gray-400 font-bold px-2 mb-1">Reciter for ayah audio:</p>
                    {RECITERS.filter(r => r.isPopular).map(r => (
                      <button key={r.id} onClick={() => { setSelectedReciterId(r.id); setShowReciterPicker(false); stopAyahAudio(); }}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-left transition hover:bg-emerald-50
                          ${r.id === selectedReciterId ? 'bg-emerald-100 font-bold text-emerald-700' : 'text-gray-700'}`}>
                        <span>{r.flag}</span><span className="flex-1 truncate">{r.name}</span>
                        {r.id === selectedReciterId && <span className="text-emerald-500">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Play ayah button */}
              <button onClick={toggleAyahPlay}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-bold transition-all shadow flex-shrink-0
                  ${ayahPlaying ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                {ayahLoading
                  ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                  : ayahPlaying ? '⏸' : '▶'}
                <span>{ayahLoading ? 'Loading…' : ayahPlaying ? 'Pause' : '▶ Play'}</span>
              </button>

              {/* Progress */}
              {(ayahPlaying || ayahProgress > 0) && (
                <div className="flex items-center gap-1.5 flex-1 min-w-[80px]">
                  <span className="text-[10px] text-gray-500 font-mono">{fmt(ayahTime)}</span>
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${ayahProgress}%` }} />
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">{fmt(ayahDur)}</span>
                </div>
              )}

              {loadingAyahs && (
                <div className="flex items-center gap-1 text-xs text-emerald-600">
                  <span className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin inline-block" />Loading…
                </div>
              )}
            </div>

            {/* Ayah Display + Recording — full width */}
            {!loadingAyahs && currentAyah && (
              <div className="flex flex-col gap-3">

                {/* ── AYAH DISPLAY ── */}
                <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 rounded-2xl shadow-lg border border-emerald-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-emerald-700 to-teal-600 px-3 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-sm">{selectedSurah?.name} — {selectedSurah?.nameArabic}</span>
                      <span className="text-emerald-200 text-xs">Ayah {selectedAyahNum}</span>
                    </div>
                    {showResults && (
                      <div className="flex items-center gap-2 text-[10px] text-white">
                        {[['bg-green-400','Correct'],['bg-amber-400','Partial'],['bg-red-400','Wrong'],['bg-gray-400','Missed']].map(([c,l]) => (
                          <span key={l} className="flex items-center gap-0.5">
                            <span className={`w-2 h-2 rounded-full ${c} inline-block`}/>{l}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-center text-[10px] text-emerald-600 bg-emerald-50/80 py-0.5 border-b border-emerald-100">
                    💡 Hover any word for details · Click to hear full ayah
                  </div>
                  <AyahWords
                    ayahText={currentAyah.text}
                    surahNumber={selectedSurah?.number ?? 1}
                    ayahNumber={selectedAyahNum}
                    wordResults={wordResults}
                    showResults={showResults}
                    reciterFolder={selectedReciter.everyayahFolder}
                  />

                  {/* Word-by-word strip */}
                  {showResults && wordResults && wordResults.length > 0 && (
                    <div className="border-t border-emerald-100 px-3 py-2 bg-white/60">
                      <div className="flex flex-wrap gap-1.5 justify-end" dir="rtl">
                        {wordResults.filter(w => w.original).map((wr, idx) => (
                          <div key={idx}
                            className={`px-2 py-1 rounded-lg border text-sm font-bold cursor-pointer hover:scale-105 transition-all ${statusColorClasses(wr.status)}`}
                            title={`${wr.status} · ${wr.similarity}%${wr.spoken ? ` · You said: ${wr.spoken}` : ''}`}
                            style={{ fontFamily:"'Amiri',serif" }}>
                            {wr.original}
                            <div className="text-[10px] font-normal opacity-70 text-center">{wr.similarity}%</div>
                          </div>
                        ))}
                      </div>
                      {wordResults.some(w => w.tajweed.annotations.length > 0) && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {Array.from(new Set(wordResults.flatMap(w => w.tajweed.annotations.map(a => a.rule)))).slice(0,6).map(rule => {
                            const info = TAJWEED_RULES[rule];
                            return <span key={rule} className="text-[10px] px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: info.color }}>{rule}</span>;
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── RECORDING PANEL ── */}
                <div className="bg-white rounded-2xl shadow-lg border border-emerald-100 overflow-hidden">
                  <div className={`px-3 py-2 flex items-center justify-between gap-2 transition-colors ${isListening ? 'bg-red-600' : 'bg-emerald-700'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{isListening ? '🎙️' : '🎤'}</span>
                      <div>
                        <h2 className="text-white font-bold text-sm leading-tight">
                          {isListening ? 'Recording — Recite now…' : 'Your Recitation'}
                        </h2>
                        <p className={`text-[10px] ${isListening ? 'text-red-200' : 'text-emerald-300'}`}>
                          {useManual ? 'Type Arabic text' : isListening ? 'Speak clearly in Arabic' : 'Voice or Type your recitation'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isListening && (
                        <div className="flex items-center gap-1.5 bg-white/20 px-2 py-1 rounded-full border border-white/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-white" style={{ animation:'recDot 1s ease infinite' }} />
                          <span className="text-white text-[11px] font-bold font-mono">REC {fmtDur(duration)}</span>
                        </div>
                      )}
                      {!isListening && (
                        <div className="flex bg-white/20 rounded-lg p-0.5 gap-0.5">
                          <button onClick={() => setUseManual(false)}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all ${!useManual ? 'bg-white text-emerald-800' : 'text-white/80 hover:text-white'}`}>
                            🎤 Voice
                          </button>
                          <button onClick={() => { setUseManual(true); if (isListening) srStop(); }}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all ${useManual ? 'bg-white text-emerald-800' : 'text-white/80 hover:text-white'}`}>
                            ⌨️ Type
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-3 space-y-2">
                    {/* VOICE MODE */}
                    {!useManual && (
                      <>
                        {!isSupported && (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center text-xs">
                            <p className="font-bold text-amber-800">⚠️ Speech recognition not supported</p>
                            <p className="text-amber-600 mt-1">Use <strong>Chrome</strong> or <strong>Edge</strong> · Or switch to ⌨️ Type mode</p>
                          </div>
                        )}
                        {isSupported && permission === 'denied' && (
                          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
                            <p className="font-bold">🔒 Microphone Blocked</p>
                            <p>Click 🔒 lock icon → Microphone → Allow → Refresh page</p>
                          </div>
                        )}
                        {srError && permission !== 'denied' && (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-2 flex items-center gap-2 text-xs text-amber-800">
                            <span>⚠️</span><span className="flex-1">{srError}</span>
                            <button onClick={handleReset} className="text-xs bg-amber-200 hover:bg-amber-300 px-2 py-0.5 rounded-full font-bold">↺</button>
                          </div>
                        )}
                        {isSupported && permission !== 'denied' && (
                          <>
                            <div className={`relative rounded-xl border-2 p-3 min-h-[72px] bg-white transition-all duration-300
                              ${isListening ? 'border-red-400 ring-2 ring-red-100'
                                : showResults && result
                                  ? result.overallScore >= 85 ? 'border-green-400 ring-2 ring-green-100'
                                    : result.overallScore >= 60 ? 'border-amber-400 ring-2 ring-amber-100'
                                    : 'border-red-300 ring-2 ring-red-100'
                                : hasText ? 'border-emerald-400' : 'border-dashed border-gray-200'}`}
                              dir="rtl">
                              <div className="absolute top-2 left-2" dir="ltr">
                                <VolumeBars volume={volume} active={isListening} />
                              </div>
                              {(transcript || interimTranscript) ? (
                                <div className="pt-5">
                                  {transcript && (
                                    <p className="text-xl text-gray-800 text-right leading-[3]" style={{ fontFamily:"'Amiri Quran','Amiri',serif" }}>
                                      {transcript}
                                    </p>
                                  )}
                                  {interimTranscript && (
                                    <p className="text-lg text-gray-400 text-right italic leading-[2.8]" style={{ fontFamily:"'Amiri Quran','Amiri',serif" }}>
                                      {interimTranscript}
                                    </p>
                                  )}
                                  {showResults && result && (
                                    <div className="mt-1.5 pt-1 border-t border-gray-100 flex items-center justify-between" dir="ltr">
                                      <span className="text-[11px] text-gray-400">{fmtDur(duration)}</span>
                                      <span className={`text-sm font-black ${scoreColor}`}>{result.overallScore}% — {result.grade}</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center h-10 gap-1" dir="ltr">
                                  {isListening ? (
                                    <>
                                      <div className="flex items-end gap-1 h-5">
                                        {[1,2,3,4,5].map(i => (
                                          <div key={i} className="w-1 bg-red-400 rounded-full"
                                            style={{ animation:`micBar 0.7s ease-in-out infinite alternate`, animationDelay:`${i*0.1}s`, height:'50%' }} />
                                        ))}
                                      </div>
                                      <p className="text-emerald-600 text-xs font-semibold">🟢 Listening…</p>
                                    </>
                                  ) : (
                                    <p className="text-gray-400 text-xs text-center">
                                      {permission === 'granted' ? 'Tap "Start" and recite the ayah' : 'Tap "Start" — browser will ask for mic access'}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <button onClick={isListening ? srStop : handleStart} disabled={checking}
                                className={`relative flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm transition-all shadow disabled:opacity-50
                                  ${isListening ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:scale-105 active:scale-95'}`}>
                                {isListening ? <><span className="w-2.5 h-2.5 bg-white rounded-sm flex-shrink-0" />Stop</> : <><span>🎤</span> Start</>}
                              </button>
                              <button onClick={handleCheck} disabled={!hasText || isListening || checking}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow transition-all hover:scale-105 active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:scale-100">
                                {checking ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />Checking…</> : <><span>🔍</span> Check</>}
                              </button>
                              {(transcript || showResults) && !isListening && (
                                <button onClick={handleReset} className="flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200">
                                  ↺ Reset
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </>
                    )}

                    {/* TYPE MODE */}
                    {useManual && (
                      <>
                        <textarea value={manualText}
                          onChange={e => { setManualText(e.target.value); setShowResults(false); setResult(null); setWordResults(undefined); }}
                          placeholder="اكتب تلاوتك هنا…" dir="rtl" rows={2}
                          className="w-full rounded-xl border-2 border-emerald-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 p-3 text-xl leading-[3] resize-none outline-none"
                          style={{ fontFamily:"'Amiri Quran','Amiri',serif" }} />
                        <div className="flex flex-wrap gap-2">
                          <button onClick={handleCheck} disabled={!hasText || checking}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow transition-all hover:scale-105 disabled:bg-gray-300 disabled:cursor-not-allowed">
                            {checking ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />Checking…</> : <><span>🔍</span> Check</>}
                          </button>
                          {(manualText || showResults) && (
                            <button onClick={() => { setManualText(''); setResult(null); setWordResults(undefined); setShowResults(false); }}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200">
                              ↺ Clear
                            </button>
                          )}
                        </div>
                        {showResults && result && (
                          <div className={`text-center py-1.5 px-3 rounded-xl font-black text-sm border-2
                            ${result.overallScore >= 85 ? 'bg-green-50 border-green-200 text-green-700'
                              : result.overallScore >= 60 ? 'bg-amber-50 border-amber-200 text-amber-700'
                              : 'bg-red-50 border-red-200 text-red-700'}`}>
                            {result.overallScore}% — {result.grade} ({result.gradeArabic})
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* ── RESULTS / HISTORY tabs ── */}
                {(showResults || chartKey > 0) && (
                  <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                    <div className="flex border-b border-gray-100">
                      {([
                        { id: 'results' as ResultTab, label: '📊 Results' },
                        { id: 'history' as ResultTab, label: '📈 History' },
                      ]).map(t => (
                        <button key={t.id} onClick={() => setResultTab(t.id)}
                          className={`flex-1 py-2 text-xs font-bold border-b-2 transition-all
                            ${resultTab === t.id ? 'border-emerald-500 text-emerald-700 bg-white' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}>
                          {t.label}
                          {t.id === 'results' && result && (
                            <span className={`ml-1 inline-block w-4 h-4 rounded-full text-white text-[9px] font-black align-middle
                              ${result.overallScore >= 85 ? 'bg-green-500' : result.overallScore >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}>
                              {result.overallScore >= 85 ? '✓' : '!'}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="p-2">
                      {resultTab === 'results' && result && <ResultsPanel result={result} />}
                      {resultTab === 'results' && !result && (
                        <div className="text-center py-8 text-gray-400">
                          <div className="text-3xl mb-2">📊</div>
                          <p className="text-sm">Record or type your recitation and click Check</p>
                        </div>
                      )}
                      {resultTab === 'history' && <MistakesChart refreshKey={chartKey} />}
                    </div>
                  </div>
                )}
              </div>
            )}

            {loadingAyahs && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-emerald-700 font-semibold text-sm">Loading Quran text…</p>
              </div>
            )}
          </div>
        )}

        {/* ── LISTEN TAB (Famous Reciters) ────────────────────────────────────── */}
        {mainTab === 'listen' && currentAyah && (
          <div className="flex flex-col gap-3">
            {/* Ayah display compact */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 p-3 text-center" dir="rtl">
              <p className="text-xs text-emerald-600 font-semibold mb-1">{selectedSurah?.name} · Ayah {selectedAyahNum}</p>
              <p className="text-2xl leading-[3.5]" style={{ fontFamily:"'Amiri Quran','Amiri',serif" }}>{currentAyah.text}</p>
            </div>
            <RecitersPanel surahNumber={selectedSurah?.number ?? 1} ayahNumber={selectedAyahNum}
              surahName={selectedSurah ? `${selectedSurah.name} (${selectedSurah.nameArabic})` : ''} ayahText={currentAyah.text} />
          </div>
        )}

        {/* ── COMPARE TAB — full width center ─────────────────────────────────── */}
        {mainTab === 'compare' && (
          <div className="flex flex-col gap-3">
            {currentAyah && (
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 p-3 text-center" dir="rtl">
                <p className="text-xs text-emerald-600 font-semibold mb-1">{selectedSurah?.name} · Ayah {selectedAyahNum}</p>
                <p className="text-2xl leading-[3.5]" style={{ fontFamily:"'Amiri Quran','Amiri',serif" }}>{currentAyah.text}</p>
              </div>
            )}
            <VoiceComparison surahNumber={selectedSurah?.number ?? 1} ayahNumber={selectedAyahNum}
              surahName={selectedSurah ? `${selectedSurah.name} (${selectedSurah.nameArabic})` : ''}
              ayahText={currentAyah?.text ?? ''} />
          </div>
        )}

        {/* ── FULL QURAN PLAYER TAB ───────────────────────────────────────────── */}
        {mainTab === 'quranplayer' && (
          <QuranPlayer
            initialSurah={selectedSurah}
            initialAyah={selectedAyahNum}
            onNavigate={(surahNum: number, ayahNum: number) => {
              const surah = surahMeta.find(s => s.number === surahNum);
              if (surah) { setSelectedSurah(surah); setSelectedAyahNum(ayahNum); }
            }}
          />
        )}
      </main>

      {/* ══ FOOTER ════════════════════════════════════════════════════════════ */}
      <footer className="bg-emerald-900 text-white flex-shrink-0">
        <div className="max-w-5xl mx-auto px-3 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-emerald-400 flex-wrap">
            <span>🤲 Pray for</span>
            <strong className="text-amber-300">SM Talha</strong>
            <span>—</span>
            <a href="https://darsenizami.net" target="_blank" rel="noopener noreferrer"
              className="text-amber-300 hover:text-white underline underline-offset-1 font-semibold">darsenizami.net</a>
            <span>|</span>
            <a href="mailto:smtalhadv@gmail.com" className="hover:text-white">smtalhadv@gmail.com</a>
            <span>|</span>
            <a href="tel:+923132020392" className="hover:text-white">+92 313 2020392</a>
          </div>
          <p className="text-emerald-600">© {new Date().getFullYear()} <strong className="text-emerald-400">Syed Muhammad Talha</strong> — Built with ❤️ for the Ummah</p>
        </div>
      </footer>

      <style>{`
        @keyframes recDot { 0%,100% { opacity:1; } 50% { opacity:0.2; } }
        @keyframes micBar { 0% { height:20%; } 100% { height:90%; } }
        @keyframes wave   { 0% { height:20%; } 100% { height:100%; } }
      `}</style>
    </div>
  );
}
