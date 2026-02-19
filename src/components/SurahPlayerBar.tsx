// ═══════════════════════════════════════════════════════
//  SurahPlayerBar — Play full surah sequentially
//  with ayah-by-ayah tracking and reciter selection
// ═══════════════════════════════════════════════════════
import { useState, useRef, useCallback, useEffect } from 'react';
import { SurahPlayer, AudioPlayState, buildAyahUrl } from '../utils/audioPlayer';
import { RECITERS, Reciter } from '../data/recitersData';
import { SurahMeta } from '../data/quranMeta';

interface SurahPlayerBarProps {
  surah: SurahMeta | null;
  currentAyah: number;
  onAyahChange: (ayah: number) => void;
}

export function SurahPlayerBar({ surah, currentAyah, onAyahChange }: SurahPlayerBarProps) {
  const [playState, setPlayState]         = useState<AudioPlayState>('idle');
  const [playingAyah, setPlayingAyah]     = useState(1);
  const [progress, setProgress]           = useState(0);
  const [currentTime, setCurrentTime]     = useState(0);
  const [duration, setDuration]           = useState(0);
  const [selectedReciter, setSelectedReciter] = useState<Reciter>(RECITERS[0]);
  const [showReciterMenu, setShowReciterMenu] = useState(false);
  const [error, setError]                 = useState('');
  const [loopAyah, setLoopAyah]           = useState(false);
  const [playMode, setPlayMode]           = useState<'ayah' | 'surah'>('ayah');
  const [volume, setVolume]               = useState(0.85);
  const [speed, setSpeed]                 = useState(1);

  const surahPlayerRef = useRef<SurahPlayer | null>(null);
  const singleAudioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef         = useRef<number>(0);
  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5];

  useEffect(() => {
    return () => {
      stopAll();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stop when surah changes
  useEffect(() => {
    stopAll();
    setPlayingAyah(currentAyah);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surah?.number]);

  const stopAll = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    surahPlayerRef.current?.stop();
    surahPlayerRef.current = null;
    if (singleAudioRef.current) {
      singleAudioRef.current.pause();
      singleAudioRef.current.src = '';
      singleAudioRef.current = null;
    }
    setPlayState('idle');
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
    setError('');
  }, []);

  const fmt = (s: number) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // ── Play single ayah ──────────────────────────────────────────────────────
  const playSingleAyah = useCallback((ayahNum: number) => {
    if (!surah) return;
    stopAll();
    setError('');
    setPlayState('loading');
    setPlayingAyah(ayahNum);

    const url = buildAyahUrl(surah.number, ayahNum, selectedReciter.everyayahFolder);
    const audio = new Audio(url);
    audio.volume = volume;
    audio.playbackRate = speed;
    singleAudioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));

    audio.addEventListener('canplay', () => {
      audio.play().then(() => {
        setPlayState('playing');
        const tick = () => {
          if (singleAudioRef.current) {
            setCurrentTime(singleAudioRef.current.currentTime);
            setProgress(singleAudioRef.current.duration > 0
              ? (singleAudioRef.current.currentTime / singleAudioRef.current.duration) * 100
              : 0);
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      }).catch(() => setPlayState('error'));
    }, { once: true });

    audio.addEventListener('ended', () => {
      cancelAnimationFrame(rafRef.current);
      if (loopAyah) {
        playSingleAyah(ayahNum);
      } else if (playMode === 'surah' && surah && ayahNum < surah.ayahCount) {
        const next = ayahNum + 1;
        onAyahChange(next);
        setTimeout(() => playSingleAyah(next), 500);
      } else {
        setPlayState('idle');
        setProgress(0);
        setCurrentTime(0);
      }
    }, { once: true });

    audio.addEventListener('error', () => {
      cancelAnimationFrame(rafRef.current);
      setPlayState('error');
      setError('Audio not available for this ayah.');
    }, { once: true });

    audio.load();
  }, [surah, selectedReciter, volume, speed, loopAyah, playMode, onAyahChange, stopAll]);

  const handlePlay = useCallback(() => {
    if (!surah) return;

    if (playState === 'playing') {
      singleAudioRef.current?.pause();
      cancelAnimationFrame(rafRef.current);
      setPlayState('paused');
      return;
    }
    if (playState === 'paused') {
      singleAudioRef.current?.play().then(() => {
        setPlayState('playing');
        const tick = () => {
          if (singleAudioRef.current) {
            setCurrentTime(singleAudioRef.current.currentTime);
            setProgress(singleAudioRef.current.duration > 0
              ? (singleAudioRef.current.currentTime / singleAudioRef.current.duration) * 100 : 0);
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      });
      return;
    }

    playSingleAyah(currentAyah);
  }, [surah, playState, currentAyah, playSingleAyah]);

  const handlePrev = useCallback(() => {
    if (!surah || currentAyah <= 1) return;
    const prev = currentAyah - 1;
    onAyahChange(prev);
    if (playState !== 'idle') playSingleAyah(prev);
  }, [surah, currentAyah, playState, onAyahChange, playSingleAyah]);

  const handleNext = useCallback(() => {
    if (!surah || currentAyah >= surah.ayahCount) return;
    const next = currentAyah + 1;
    onAyahChange(next);
    if (playState !== 'idle') playSingleAyah(next);
  }, [surah, currentAyah, playState, onAyahChange, playSingleAyah]);

  const handleSeek = useCallback((pct: number) => {
    if (singleAudioRef.current?.duration) {
      singleAudioRef.current.currentTime = (pct / 100) * singleAudioRef.current.duration;
      setProgress(pct);
    }
  }, []);

  if (!surah) return null;

  const isPlaying = playState === 'playing';
  const playIcon = playState === 'loading'
    ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
    : isPlaying ? '⏸' : '▶';

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-emerald-100 overflow-hidden">

      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎵</span>
          <div>
            <p className="text-white font-bold text-sm">
              {surah.nameArabic} — {surah.name}
            </p>
            <p className="text-slate-400 text-xs">
              {surah.ayahCount} Ayahs · {surah.revelationType}
            </p>
          </div>
        </div>

        {/* Reciter picker */}
        <div className="relative">
          <button
            onClick={() => setShowReciterMenu(p => !p)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white text-xs font-semibold transition-all border border-white/20"
          >
            <span>{selectedReciter.flag}</span>
            <span className="hidden sm:inline">{selectedReciter.name.split(' ')[0]}</span>
            <span>▾</span>
          </button>
          {showReciterMenu && (
            <div className="absolute top-full right-0 mt-1 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 min-w-[200px]">
              <p className="text-xs text-gray-400 font-semibold px-2 mb-1">Reciter for playback:</p>
              {RECITERS.filter(r => r.isPopular).map(r => (
                <button
                  key={r.id}
                  onClick={() => { setSelectedReciter(r); setShowReciterMenu(false); stopAll(); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-left transition hover:bg-emerald-50 ${r.id === selectedReciter.id ? 'bg-emerald-100 font-bold text-emerald-700' : 'text-gray-700'}`}
                >
                  <span>{r.flag}</span>
                  <span className="flex-1 truncate">{r.name}</span>
                  {r.id === selectedReciter.id && <span className="text-emerald-500 text-xs">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">

        {/* ── Mode toggle ── */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-gray-100 rounded-full p-0.5 gap-0.5">
            <button
              onClick={() => setPlayMode('ayah')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${playMode === 'ayah' ? 'bg-white text-emerald-700 shadow' : 'text-gray-500'}`}
            >
              🎵 Single Ayah
            </button>
            <button
              onClick={() => setPlayMode('surah')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${playMode === 'surah' ? 'bg-white text-emerald-700 shadow' : 'text-gray-500'}`}
            >
              📖 Full Surah
            </button>
          </div>

          {/* Loop toggle */}
          <button
            onClick={() => setLoopAyah(p => !p)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${loopAyah ? 'bg-emerald-100 border-emerald-300 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
          >
            🔁 Loop
          </button>
        </div>

        {/* ── Ayah navigation + main controls ── */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Prev */}
          <button
            onClick={handlePrev}
            disabled={currentAyah <= 1}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-sm disabled:opacity-30 transition-all"
            title="Previous ayah"
          >◀</button>

          {/* Play/Pause */}
          <button
            onClick={handlePlay}
            disabled={playState === 'loading'}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-white font-bold text-sm transition-all shadow-md hover:scale-105 active:scale-95 disabled:opacity-60 ${
              isPlaying ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            <span>{playIcon}</span>
            <span>
              {playState === 'loading' ? 'Loading…'
                : isPlaying          ? `Pause (Ayah ${playingAyah})`
                : playState === 'paused' ? 'Resume'
                : playMode === 'surah' ? `Play Surah from Ayah ${currentAyah}`
                : `Play Ayah ${currentAyah}`}
            </span>
          </button>

          {/* Stop */}
          {playState !== 'idle' && (
            <button onClick={stopAll} className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center text-sm transition-all" title="Stop">
              ⏹
            </button>
          )}

          {/* Next */}
          <button
            onClick={handleNext}
            disabled={currentAyah >= surah.ayahCount}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-sm disabled:opacity-30 transition-all"
            title="Next ayah"
          >▶</button>

          {/* Ayah counter */}
          <span className="text-xs text-gray-500 ml-auto">
            Ayah {isPlaying ? playingAyah : currentAyah} / {surah.ayahCount}
          </span>
        </div>

        {/* ── Progress bar ── */}
        {(isPlaying || playState === 'paused') && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-mono w-10">{fmt(currentTime)}</span>
            <div
              className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden cursor-pointer relative"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                handleSeek(((e.clientX - rect.left) / rect.width) * 100);
              }}
            >
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 font-mono w-10 text-right">{fmt(duration)}</span>
          </div>
        )}

        {/* ── Volume + Speed controls ── */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm">{volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}</span>
            <input
              type="range" min="0" max="1" step="0.05" value={volume}
              onChange={e => {
                const v = parseFloat(e.target.value);
                setVolume(v);
                if (singleAudioRef.current) singleAudioRef.current.volume = v;
              }}
              className="w-20 cursor-pointer"
              style={{ accentColor: '#059669' }}
            />
            <span className="text-xs text-gray-400 w-8">{Math.round(volume * 100)}%</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-gray-500 font-semibold">Speed:</span>
            {SPEEDS.map(s => (
              <button
                key={s}
                onClick={() => {
                  setSpeed(s);
                  if (singleAudioRef.current) singleAudioRef.current.playbackRate = s;
                }}
                className={`text-xs px-2 py-1 rounded-full font-bold transition-all ${speed === s ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>

        {/* ── Surah mode: mini ayah list ── */}
        {playMode === 'surah' && (
          <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
            <p className="text-xs text-emerald-700 font-semibold mb-2">
              📖 Playing full {surah.name} — ayah by ayah
              {isPlaying && <span className="text-amber-600 ml-2">▶ Now: Ayah {playingAyah}</span>}
            </p>
            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
              {Array.from({ length: surah.ayahCount }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  onClick={() => { onAyahChange(n); playSingleAyah(n); }}
                  className={`w-7 h-7 rounded-full text-xs font-bold transition-all ${
                    n === (isPlaying ? playingAyah : currentAyah)
                      ? 'bg-emerald-600 text-white shadow'
                      : 'bg-white text-gray-600 hover:bg-emerald-100 border border-gray-200'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <p className="text-xs text-red-600 bg-red-50 p-2 rounded-xl flex items-center gap-1.5 border border-red-100">
            <span>⚠️</span> {error}
          </p>
        )}

        {/* ── Tip ── */}
        {playState === 'idle' && (
          <p className="text-xs text-gray-400 text-center">
            💡 Also click any word in the ayah above to hear just that word
          </p>
        )}
      </div>
    </div>
  );
}
