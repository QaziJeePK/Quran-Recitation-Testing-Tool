// ═══════════════════════════════════════════════════════════════
//  QuranPlayer — Full Quran Recitation Player
//  Filter by: Surah · Juz · Ayah Range · Custom
//  Features: Sequential playback, loop, speed, volume, seek
// ═══════════════════════════════════════════════════════════════

import { useState, useRef, useCallback, useEffect } from 'react';
import { surahMeta, SurahMeta } from '../data/quranMeta';
import { RECITERS, Reciter } from '../data/recitersData';
import { buildAyahUrl } from '../utils/audioPlayer';
import { fetchSurah } from '../utils/quranApi';

// Juz data — which surah:ayah each juz starts
const JUZ_START: { surah: number; ayah: number }[] = [
  { surah:1,  ayah:1   }, { surah:2,  ayah:142 }, { surah:2,  ayah:253 },
  { surah:3,  ayah:92  }, { surah:4,  ayah:24  }, { surah:4,  ayah:148 },
  { surah:5,  ayah:82  }, { surah:6,  ayah:111 }, { surah:7,  ayah:87  },
  { surah:8,  ayah:41  }, { surah:9,  ayah:93  }, { surah:11, ayah:6   },
  { surah:12, ayah:53  }, { surah:15, ayah:1   }, { surah:17, ayah:1   },
  { surah:18, ayah:75  }, { surah:21, ayah:1   }, { surah:23, ayah:1   },
  { surah:25, ayah:21  }, { surah:27, ayah:56  }, { surah:29, ayah:46  },
  { surah:33, ayah:31  }, { surah:36, ayah:28  }, { surah:39, ayah:32  },
  { surah:41, ayah:47  }, { surah:46, ayah:1   }, { surah:51, ayah:31  },
  { surah:58, ayah:1   }, { surah:67, ayah:1   }, { surah:78, ayah:1   },
];

type PlayState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';
type FilterMode = 'surah' | 'juz' | 'ayah_range' | 'custom';

interface Props {
  initialSurah?: SurahMeta | null;
  initialAyah?: number;
  onNavigate?: (surahNum: number, ayahNum: number) => void;
}

function fmt(s: number): string {
  if (!s || isNaN(s)) return '0:00';
  return `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`;
}

export function QuranPlayer({ initialSurah, initialAyah = 1, onNavigate }: Props) {
  const [filterMode, setFilterMode]           = useState<FilterMode>('surah');
  const [selectedSurah, setSelectedSurah]     = useState<SurahMeta>(initialSurah || surahMeta[0]);
  const [selectedJuz, setSelectedJuz]         = useState(0);
  const [fromSurah, setFromSurah]             = useState(surahMeta[0]);
  const [toSurah, setToSurah]                 = useState(surahMeta[13]);
  const [fromAyah, setFromAyah]               = useState(1);
  const [toAyah, setToAyah]                   = useState(7);
  const [selectedReciter, setSelectedReciter] = useState<Reciter>(RECITERS[0]);
  const [showReciterPicker, setShowReciterPicker] = useState(false);

  // Playback state
  const [playState, setPlayState]             = useState<PlayState>('idle');
  const [currentSurah, setCurrentSurah]       = useState(selectedSurah.number);
  const [currentAyah, setCurrentAyah]         = useState(initialAyah);
  const [currentAyahText, setCurrentAyahText] = useState('');
  const [progress, setProgress]               = useState(0);
  const [currentTime, setCurrentTime]         = useState(0);
  const [duration, setDuration]               = useState(0);
  const [volume, setVolume]                   = useState(0.85);
  const [speed, setSpeed]                     = useState(1);
  const [loop, setLoop]                       = useState(false);
  const [loopSurah, setLoopSurah]             = useState(false);
  const [error, setError]                     = useState('');
  const [loadingText, setLoadingText]         = useState(false);

  // Playlist state
  const [playlist, setPlaylist]               = useState<{ surah: number; ayah: number }[]>([]);
  const [playlistIdx, setPlaylistIdx]         = useState(0);
  const [totalInPlaylist, setTotalInPlaylist] = useState(0);

  const audioRef  = useRef<HTMLAudioElement | null>(null);
  const rafRef    = useRef<number>(0);
  const activeRef = useRef(false);
  const SPEEDS    = [0.5, 0.75, 1, 1.25, 1.5];

  // ── Build playlist from current filter ─────────────────────────────────────
  const buildPlaylist = useCallback((): { surah: number; ayah: number }[] => {
    if (filterMode === 'surah') {
      return Array.from({ length: selectedSurah.ayahCount }, (_, i) => ({ surah: selectedSurah.number, ayah: i + 1 }));
    }
    if (filterMode === 'juz') {
      const start = JUZ_START[selectedJuz];
      const end   = JUZ_START[selectedJuz + 1] || { surah: 114, ayah: surahMeta[113].ayahCount + 1 };
      const list: { surah: number; ayah: number }[] = [];
      for (let s = start.surah; s <= Math.min(end.surah, 114); s++) {
        const sm   = surahMeta.find(x => x.number === s)!;
        const aStart = s === start.surah ? start.ayah : 1;
        const aEnd   = s === end.surah ? end.ayah - 1 : sm.ayahCount;
        for (let a = aStart; a <= aEnd; a++) list.push({ surah: s, ayah: a });
      }
      return list;
    }
    if (filterMode === 'ayah_range') {
      const list: { surah: number; ayah: number }[] = [];
      for (let a = fromAyah; a <= Math.min(toAyah, selectedSurah.ayahCount); a++) {
        list.push({ surah: selectedSurah.number, ayah: a });
      }
      return list;
    }
    if (filterMode === 'custom') {
      const list: { surah: number; ayah: number }[] = [];
      for (let s = fromSurah.number; s <= toSurah.number; s++) {
        const sm = surahMeta.find(x => x.number === s)!;
        for (let a = 1; a <= sm.ayahCount; a++) list.push({ surah: s, ayah: a });
      }
      return list;
    }
    return [];
  }, [filterMode, selectedSurah, selectedJuz, fromAyah, toAyah, fromSurah, toSurah]);

  // ── Stop all ────────────────────────────────────────────────────────────────
  const stopAll = useCallback(() => {
    activeRef.current = false;
    cancelAnimationFrame(rafRef.current);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    setPlayState('idle');
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
    setError('');
  }, []);

  // Refs for loop/loopSurah so closures always see latest values
  const loopRef      = useRef(loop);
  const loopSurahRef = useRef(loopSurah);
  loopRef.current      = loop;
  loopSurahRef.current = loopSurah;

  // ── Play a specific playlist item ───────────────────────────────────────────
  const playItem = useCallback((idx: number, list: { surah: number; ayah: number }[]) => {
    if (!activeRef.current) return;
    if (idx < 0 || idx >= list.length) {
      if (loopSurahRef.current && list.length > 0) {
        setTimeout(() => playItem(0, list), 400);
        return;
      }
      setPlayState('idle');
      setProgress(0);
      return;
    }

    const item = list[idx];
    setPlaylistIdx(idx);
    setCurrentSurah(item.surah);
    setCurrentAyah(item.ayah);
    onNavigate?.(item.surah, item.ayah);

    // Fetch ayah text for display
    setLoadingText(true);
    fetchSurah(item.surah).then(ayahs => {
      const found = ayahs.find(a => a.number === item.ayah);
      setCurrentAyahText(found?.text || '');
    }).catch(() => setCurrentAyahText('')).finally(() => setLoadingText(false));

    // Stop old audio
    cancelAnimationFrame(rafRef.current);
    if (audioRef.current) {
      audioRef.current.oncanplay = null;
      audioRef.current.onended  = null;
      audioRef.current.onerror  = null;
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    setPlayState('loading');
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
    setError('');

    const url = buildAyahUrl(item.surah, item.ayah, selectedReciter.everyayahFolder);
    const audio = new Audio(url);
    audio.volume = volume;
    audio.playbackRate = speed;
    audioRef.current = audio;

    audio.onloadedmetadata = () => setDuration(audio.duration);

    audio.oncanplay = () => {
      if (!activeRef.current || audioRef.current !== audio) return;
      audio.oncanplay = null;
      audio.play().then(() => {
        if (!activeRef.current || audioRef.current !== audio) return;
        setPlayState('playing');
        const tick = () => {
          if (audioRef.current === audio) {
            setCurrentTime(audio.currentTime);
            setProgress(audio.duration > 0 ? (audio.currentTime / audio.duration) * 100 : 0);
            rafRef.current = requestAnimationFrame(tick);
          }
        };
        rafRef.current = requestAnimationFrame(tick);
      }).catch(() => {
        if (audioRef.current === audio) {
          setPlayState('error');
          setError('Playback blocked. Click play again.');
        }
      });
    };

    audio.onended = () => {
      if (audioRef.current !== audio) return;
      cancelAnimationFrame(rafRef.current);
      if (!activeRef.current) return;
      if (loopRef.current) {
        // Loop current ayah
        setTimeout(() => playItem(idx, list), 100);
        return;
      }
      if (idx + 1 < list.length) {
        // Play next ayah
        setTimeout(() => playItem(idx + 1, list), 500);
      } else if (loopSurahRef.current) {
        // Loop entire playlist
        setTimeout(() => playItem(0, list), 500);
      } else {
        setPlayState('idle');
        setProgress(0);
      }
    };

    audio.onerror = () => {
      if (audioRef.current !== audio) return;
      cancelAnimationFrame(rafRef.current);
      setError(`Could not load ayah ${item.ayah} — skipping.`);
      if (activeRef.current && idx + 1 < list.length) {
        setTimeout(() => playItem(idx + 1, list), 800);
      } else if (activeRef.current) {
        setPlayState('error');
      }
    };

    audio.load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedReciter, volume, speed, onNavigate]);

  // ── Start playback ──────────────────────────────────────────────────────────
  const handlePlay = useCallback(() => {
    const list = buildPlaylist();
    setPlaylist(list);
    setTotalInPlaylist(list.length);
    if (list.length === 0) { setError('No ayahs in selection.'); return; }
    activeRef.current = true;
    setError('');
    playItem(0, list);
  }, [buildPlaylist, playItem]);

  // ── Pause/Resume ────────────────────────────────────────────────────────────
  const handlePauseResume = useCallback(() => {
    if (!audioRef.current) return;
    if (playState === 'playing') {
      audioRef.current.pause();
      cancelAnimationFrame(rafRef.current);
      setPlayState('paused');
    } else if (playState === 'paused') {
      audioRef.current.play().then(() => {
        setPlayState('playing');
        const tick = () => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
            setProgress(audioRef.current.duration > 0 ? (audioRef.current.currentTime / audioRef.current.duration) * 100 : 0);
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      });
    }
  }, [playState]);

  // ── Skip prev/next ──────────────────────────────────────────────────────────
  const handlePrev = useCallback(() => {
    if (playlist.length === 0) return;
    const newIdx = Math.max(0, playlistIdx - 1);
    playItem(newIdx, playlist);
  }, [playlist, playlistIdx, playItem]);

  const handleNext = useCallback(() => {
    if (playlist.length === 0) return;
    const newIdx = Math.min(playlist.length - 1, playlistIdx + 1);
    playItem(newIdx, playlist);
  }, [playlist, playlistIdx, playItem]);

  // ── Seek ────────────────────────────────────────────────────────────────────
  const handleSeek = useCallback((pct: number) => {
    if (audioRef.current?.duration) {
      audioRef.current.currentTime = (pct / 100) * audioRef.current.duration;
      setProgress(pct);
    }
  }, []);

  // ── Volume/Speed ────────────────────────────────────────────────────────────
  const handleVolume = useCallback((v: number) => {
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  const handleSpeed = useCallback((s: number) => {
    setSpeed(s);
    if (audioRef.current) audioRef.current.playbackRate = s;
  }, []);

  // Cleanup
  useEffect(() => {
    return () => { activeRef.current = false; stopAll(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isPlaying = playState === 'playing';
  const isLoading = playState === 'loading';
  const currentSurahMeta = surahMeta.find(s => s.number === currentSurah);

  return (
    <div className="flex flex-col gap-4">

      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-amber-700 to-amber-600 rounded-2xl p-4 text-white">
        <div className="flex items-center gap-3">
          <span className="text-3xl">📖</span>
          <div>
            <h2 className="font-black text-lg leading-tight">Full Quran Player</h2>
            <p className="text-amber-200 text-xs">Listen to the complete Quran · Filter by Surah, Juz, Ayah range or Custom</p>
          </div>
        </div>
      </div>

      {/* ── Filter selection ── */}
      <div className="bg-white rounded-2xl shadow-md border border-amber-100 p-4">
        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><span>🔍</span> Filter Selection</h3>

        {/* Filter mode tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1 mb-4">
          {([
            { id: 'surah'      as FilterMode, label: '📖 By Surah'    },
            { id: 'juz'        as FilterMode, label: '📚 By Juz'      },
            { id: 'ayah_range' as FilterMode, label: '📌 Ayah Range'  },
            { id: 'custom'     as FilterMode, label: '✏️ Custom'       },
          ]).map(t => (
            <button key={t.id} onClick={() => { setFilterMode(t.id); stopAll(); }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all
                ${filterMode === t.id ? 'bg-amber-500 text-white shadow' : 'text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* SURAH filter */}
        {filterMode === 'surah' && (
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Select Surah</label>
              <select value={selectedSurah.number}
                onChange={e => { const s = surahMeta.find(x => x.number === parseInt(e.target.value))!; setSelectedSurah(s); stopAll(); }}
                className="w-full px-3 py-2 rounded-xl border-2 border-amber-200 focus:border-amber-400 focus:outline-none text-sm font-medium bg-white">
                {surahMeta.map(s => <option key={s.number} value={s.number}>{s.number}. {s.name} — {s.nameArabic} ({s.ayahCount} ayahs)</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 w-full text-xs text-amber-800">
                <p className="font-bold text-base mb-0.5">{selectedSurah.name} — {selectedSurah.nameArabic}</p>
                <p>{selectedSurah.nameTranslation} · {selectedSurah.ayahCount} Ayahs · {selectedSurah.revelationType}</p>
              </div>
            </div>
          </div>
        )}

        {/* JUZ filter */}
        {filterMode === 'juz' && (
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Select Juz</label>
              <select value={selectedJuz}
                onChange={e => { setSelectedJuz(parseInt(e.target.value)); stopAll(); }}
                className="w-full px-3 py-2 rounded-xl border-2 border-amber-200 focus:border-amber-400 focus:outline-none text-sm font-medium bg-white">
                {JUZ_START.map((j, i) => {
                  const sm = surahMeta.find(s => s.number === j.surah)!;
                  return <option key={i} value={i}>Juz {i + 1} — {sm.name} {j.surah}:{j.ayah}</option>;
                })}
              </select>
            </div>
            <div className="flex items-end">
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 w-full text-xs text-amber-800">
                <p className="font-bold">Juz {selectedJuz + 1}</p>
                <p>Starts at {surahMeta.find(s => s.number === JUZ_START[selectedJuz].surah)?.name} {JUZ_START[selectedJuz].surah}:{JUZ_START[selectedJuz].ayah}</p>
              </div>
            </div>
          </div>
        )}

        {/* AYAH RANGE filter */}
        {filterMode === 'ayah_range' && (
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Surah</label>
              <select value={selectedSurah.number}
                onChange={e => { const s = surahMeta.find(x => x.number === parseInt(e.target.value))!; setSelectedSurah(s); setFromAyah(1); setToAyah(s.ayahCount); stopAll(); }}
                className="w-full px-3 py-2 rounded-xl border-2 border-amber-200 focus:border-amber-400 focus:outline-none text-sm font-medium bg-white">
                {surahMeta.map(s => <option key={s.number} value={s.number}>{s.number}. {s.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">From Ayah</label>
                <input type="number" min={1} max={selectedSurah.ayahCount} value={fromAyah}
                  onChange={e => { setFromAyah(Math.max(1, parseInt(e.target.value) || 1)); stopAll(); }}
                  className="w-full px-3 py-2 rounded-xl border-2 border-amber-200 focus:border-amber-400 focus:outline-none text-sm font-medium" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">To Ayah</label>
                <input type="number" min={fromAyah} max={selectedSurah.ayahCount} value={toAyah}
                  onChange={e => { setToAyah(Math.min(selectedSurah.ayahCount, parseInt(e.target.value) || selectedSurah.ayahCount)); stopAll(); }}
                  className="w-full px-3 py-2 rounded-xl border-2 border-amber-200 focus:border-amber-400 focus:outline-none text-sm font-medium" />
              </div>
            </div>
          </div>
        )}

        {/* CUSTOM filter */}
        {filterMode === 'custom' && (
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">From Surah</label>
              <select value={fromSurah.number}
                onChange={e => { const s = surahMeta.find(x => x.number === parseInt(e.target.value))!; setFromSurah(s); stopAll(); }}
                className="w-full px-3 py-2 rounded-xl border-2 border-amber-200 focus:border-amber-400 focus:outline-none text-sm font-medium bg-white">
                {surahMeta.map(s => <option key={s.number} value={s.number}>{s.number}. {s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">To Surah</label>
              <select value={toSurah.number}
                onChange={e => { const s = surahMeta.find(x => x.number === parseInt(e.target.value))!; setToSurah(s); stopAll(); }}
                className="w-full px-3 py-2 rounded-xl border-2 border-amber-200 focus:border-amber-400 focus:outline-none text-sm font-medium bg-white">
                {surahMeta.filter(s => s.number >= fromSurah.number).map(s => <option key={s.number} value={s.number}>{s.number}. {s.name}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Reciter selection */}
        <div className="mt-4">
          <label className="text-xs font-semibold text-gray-600 block mb-2">🎙️ Reciter</label>
          <div className="relative">
            <button onClick={() => setShowReciterPicker(p => !p)}
              className="flex items-center gap-2 px-3 py-2 bg-amber-50 border-2 border-amber-200 rounded-xl text-sm font-semibold text-amber-800 hover:bg-amber-100 transition-all w-full text-left">
              <span className="text-lg">{selectedReciter.flag}</span>
              <span className="flex-1">{selectedReciter.name}</span>
              <span className="text-xs text-amber-500 font-normal">{selectedReciter.style}</span>
              <span>▾</span>
            </button>
            {showReciterPicker && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-2xl shadow-2xl border border-amber-100 p-2 w-full">
                <div className="grid sm:grid-cols-2 gap-1">
                  {RECITERS.map(r => (
                    <button key={r.id} onClick={() => { setSelectedReciter(r); setShowReciterPicker(false); stopAll(); }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-left transition hover:bg-amber-50
                        ${r.id === selectedReciter.id ? 'bg-amber-100 font-bold text-amber-800 border border-amber-200' : 'text-gray-700'}`}>
                      <span className="text-lg">{r.flag}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{r.name}</p>
                        <p className="text-gray-400 truncate" style={{ fontFamily:"'Amiri',serif" }}>{r.nameArabic}</p>
                      </div>
                      <span className="text-xs px-1.5 py-0.5 rounded-full text-white" style={{ background: r.color }}>{r.style}</span>
                      {r.id === selectedReciter.id && <span className="text-amber-500">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Player controls ── */}
      <div className="bg-white rounded-2xl shadow-lg border border-amber-100 p-4">

        {/* Now playing info */}
        {(isPlaying || playState === 'paused' || isLoading) && (
          <div className="mb-4 p-3 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg shadow flex-shrink-0"
                style={{ background: selectedReciter.color }}>
                {selectedReciter.flag}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-amber-600 font-semibold">Now Playing</p>
                <p className="font-bold text-gray-900 text-sm">
                  {currentSurahMeta?.name} — Ayah {currentAyah}
                  <span className="text-amber-500 ml-1" style={{ fontFamily:"'Amiri',serif" }}>({currentSurahMeta?.nameArabic})</span>
                </p>
                <p className="text-xs text-gray-400">
                  {playlistIdx + 1} / {totalInPlaylist} · {selectedReciter.name}
                </p>
              </div>
              {/* Wave animation */}
              {isPlaying && (
                <div className="flex items-end gap-0.5 h-8 flex-shrink-0">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="w-1 rounded-full"
                      style={{ background: selectedReciter.color, opacity: 0.8,
                        animation: `wave ${0.4+(i%4)*0.12}s ease-in-out infinite alternate`,
                        animationDelay: `${i*0.05}s` }} />
                  ))}
                </div>
              )}
            </div>

            {/* Ayah text */}
            {currentAyahText && !loadingText && (
              <div className="mt-2 pt-2 border-t border-amber-100">
                <p className="text-right text-xl leading-loose text-gray-800" dir="rtl"
                  style={{ fontFamily:"'Amiri Quran','Amiri',serif" }}>
                  {currentAyahText}
                </p>
              </div>
            )}
            {loadingText && (
              <div className="mt-2 text-center text-xs text-amber-500">Loading ayah text…</div>
            )}
          </div>
        )}

        {/* Progress bar */}
        {(isPlaying || playState === 'paused') && (
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-gray-500 font-mono w-10">{fmt(currentTime)}</span>
              <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden cursor-pointer"
                onClick={e => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  handleSeek(((e.clientX - rect.left) / rect.width) * 100);
                }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: selectedReciter.color }} />
              </div>
              <span className="text-xs text-gray-400 font-mono w-10 text-right">{fmt(duration)}</span>
            </div>
          </div>
        )}

        {/* Main playback controls */}
        <div className="flex items-center justify-center gap-3 mb-4">
          {/* Prev */}
          <button onClick={handlePrev} disabled={playlistIdx === 0 || playState === 'idle'}
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center font-bold disabled:opacity-30 transition-all">
            ◀◀
          </button>

          {/* Play/Pause/Stop */}
          {playState === 'idle' || playState === 'error' ? (
            <button onClick={handlePlay}
              className="flex items-center gap-2 px-8 py-3 rounded-full text-white font-bold text-base shadow-xl transition-all hover:scale-105 active:scale-95"
              style={{ background: `linear-gradient(135deg, ${selectedReciter.color}, #065f46)` }}>
              <span>▶</span>
              <span>Play</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={handlePauseResume}
                className="flex items-center gap-2 px-6 py-3 rounded-full text-white font-bold text-base shadow-xl transition-all hover:scale-105"
                style={{ background: selectedReciter.color }}>
                {isLoading
                  ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Loading</>
                  : isPlaying ? '⏸ Pause' : '▶ Resume'}
              </button>
              <button onClick={stopAll}
                className="w-12 h-12 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center justify-center text-xl font-bold transition-all">
                ⏹
              </button>
            </div>
          )}

          {/* Next */}
          <button onClick={handleNext} disabled={playlistIdx >= playlist.length - 1 || playState === 'idle'}
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center font-bold disabled:opacity-30 transition-all">
            ▶▶
          </button>
        </div>

        {/* Volume, Speed, Loop controls */}
        <div className="grid sm:grid-cols-3 gap-3">
          {/* Volume */}
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-2.5 border border-gray-100">
            <span className="text-sm">{volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}</span>
            <input type="range" min={0} max={1} step={0.05} value={volume} onChange={e => handleVolume(parseFloat(e.target.value))}
              className="flex-1 cursor-pointer" style={{ accentColor: selectedReciter.color }} />
            <span className="text-xs text-gray-400 w-8">{Math.round(volume*100)}%</span>
          </div>

          {/* Speed */}
          <div className="flex items-center gap-1.5 bg-gray-50 rounded-xl p-2.5 border border-gray-100 flex-wrap">
            <span className="text-xs text-gray-500 font-semibold">⚡</span>
            {SPEEDS.map(s => (
              <button key={s} onClick={() => handleSpeed(s)}
                className={`text-xs px-2 py-1 rounded-full font-bold transition-all
                  ${speed === s ? 'text-white shadow' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
                style={speed === s ? { background: selectedReciter.color } : {}}>
                {s}×
              </button>
            ))}
          </div>

          {/* Loop controls */}
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-2.5 border border-gray-100">
            <button onClick={() => setLoop(p => !p)}
              className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-xs font-bold transition-all border
                ${loop ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-gray-200 text-gray-500'}`}>
              🔂 Loop Ayah
            </button>
            <button onClick={() => setLoopSurah(p => !p)}
              className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-xs font-bold transition-all border
                ${loopSurah ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-gray-200 text-gray-500'}`}>
              🔁 Loop All
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 flex items-center gap-2">
            <span>⚠️</span><span>{error}</span>
          </div>
        )}
      </div>

      {/* ── Playlist preview ── */}
      {playlist.length > 0 && (
        <div className="bg-white rounded-2xl shadow border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-700">📋 Playlist ({playlist.length} ayahs)</h3>
            <span className="text-xs text-gray-400">{playlistIdx + 1} / {playlist.length} playing</span>
          </div>
          <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
            {playlist.map((item, i) => {
              const sm = surahMeta.find(s => s.number === item.surah);
              const isCurrent = i === playlistIdx && playState !== 'idle';
              return (
                <button key={i} onClick={() => playItem(i, playlist)}
                  className={`text-xs px-2 py-1 rounded-lg font-semibold transition-all border
                    ${isCurrent ? 'text-white shadow ring-2 ring-offset-1' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-amber-50 hover:border-amber-200'}`}
                  style={isCurrent ? { background: selectedReciter.color, borderColor: selectedReciter.color } : {}}>
                  {sm?.number}:{item.ayah}
                  {isCurrent && ' ▶'}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Tips ── */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-100">
        <h4 className="font-bold text-amber-800 text-sm mb-2 flex items-center gap-2"><span>💡</span> Tips for Listening</h4>
        <div className="grid sm:grid-cols-2 gap-2 text-xs text-amber-900">
          {[
            '🎧 Use headphones for the best Quran listening experience',
            '⚡ Use 0.75× speed to slow down and follow along with the text',
            '🔂 Loop a single ayah to memorize it step by step',
            '📖 Select "Ayah Range" to practice specific verses you are memorizing',
            '🌙 Al-Husary is ideal for learning correct Tajweed pronunciation',
            '📚 Listen to Juz 30 daily — great for beginners to build confidence',
          ].map((tip, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <span className="flex-shrink-0 mt-0.5">•</span>
              <span>{tip}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`@keyframes wave { 0% { height:15%; } 100% { height:90%; } }`}</style>
    </div>
  );
}
