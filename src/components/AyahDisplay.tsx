// ═══════════════════════════════════════════════════════════════════
//  AyahDisplay
//  • CLICK a word  → plays just that word (segment of ayah MP3)
//  • ▶ Play Ayah   → plays full ayah
//  • Hover tooltip → shows word info / tajweed / mistakes
// ═══════════════════════════════════════════════════════════════════

import { useState, useRef, useCallback, useEffect } from 'react';
import { WordResult, statusColorClasses, statusIcon } from '../utils/recitationChecker';
import { TAJWEED_RULES } from '../utils/tajweedEngine';
import { audioPlayer, buildAyahUrl, AudioPlayState } from '../utils/audioPlayer';
import { playWord, stopWord } from '../utils/wordAudio';
import { RECITERS } from '../data/recitersData';

interface AyahDisplayProps {
  ayahText:     string;
  ayahNumber:   number;
  surahNumber:  number;
  surahName:    string;
  wordResults?: WordResult[];
  showResults:  boolean;
}

type WordPlayState = 'idle' | 'loading' | 'playing';

export function AyahDisplay({
  ayahText,
  ayahNumber,
  surahNumber,
  surahName,
  wordResults,
  showResults,
}: AyahDisplayProps) {

  // ── Ayah player state ────────────────────────────────────────────────────
  const [ayahPlayState,      setAyahPlayState]      = useState<AudioPlayState>('idle');
  const [ayahProgress,       setAyahProgress]       = useState(0);
  const [ayahTime,           setAyahTime]           = useState(0);
  const [ayahDuration,       setAyahDuration]       = useState(0);
  const [selectedReciterId,  setSelectedReciterId]  = useState('mishary');
  const [showReciterPicker,  setShowReciterPicker]  = useState(false);

  // ── Word audio state ─────────────────────────────────────────────────────
  const [wordPlayState,  setWordPlayState]  = useState<WordPlayState>('idle');
  const [playingWordIdx, setPlayingWordIdx] = useState(-1);
  const [hoveredWord,    setHoveredWord]    = useState(-1);

  const ayahStateRef   = useRef<AudioPlayState>('idle');
  ayahStateRef.current = ayahPlayState;

  const popularReciters = RECITERS.filter(r => r.isPopular);
  const selectedReciter = RECITERS.find(r => r.id === selectedReciterId) ?? RECITERS[0];

  const fmt = (s: number) => {
    if (!s || isNaN(s)) return '0:00';
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  };

  // ── Reset on ayah/surah change ───────────────────────────────────────────
  useEffect(() => {
    stopWord();
    audioPlayer.stop();
    setAyahPlayState('idle');
    setAyahProgress(0);
    setAyahTime(0);
    setAyahDuration(0);
    setWordPlayState('idle');
    setPlayingWordIdx(-1);
    setHoveredWord(-1);
  }, [surahNumber, ayahNumber]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => () => { stopWord(); audioPlayer.stop(); }, []);

  // ── Words array ──────────────────────────────────────────────────────────
  const words = ayahText ? ayahText.split(/\s+/).filter(Boolean) : [];
  const totalWords = words.length;

  // ── CLICK WORD → play word segment ──────────────────────────────────────
  const handleWordClick = useCallback((wordIndex: number) => {
    // If already playing this word → stop it
    if (playingWordIdx === wordIndex && wordPlayState !== 'idle') {
      stopWord();
      setWordPlayState('idle');
      setPlayingWordIdx(-1);
      return;
    }

    // Stop full ayah if playing
    if (ayahStateRef.current === 'playing' || ayahStateRef.current === 'paused') {
      audioPlayer.stop();
      setAyahPlayState('idle');
      setAyahProgress(0);
      setAyahTime(0);
    }

    // Stop previous word
    stopWord();
    setWordPlayState('loading');
    setPlayingWordIdx(wordIndex);

    playWord(surahNumber, ayahNumber, wordIndex, totalWords, {
      onLoading: () => {
        setWordPlayState('loading');
        setPlayingWordIdx(wordIndex);
      },
      onPlaying: () => {
        setWordPlayState('playing');
        setPlayingWordIdx(wordIndex);
      },
      onEnded: () => {
        setWordPlayState('idle');
        setPlayingWordIdx(-1);
      },
      onError: () => {
        setWordPlayState('idle');
        setPlayingWordIdx(-1);
      },
    });
  }, [surahNumber, ayahNumber, totalWords, playingWordIdx, wordPlayState]);

  // ── Play / Pause full ayah ───────────────────────────────────────────────
  const playAyah = useCallback(() => {
    // Stop word audio first
    stopWord();
    setWordPlayState('idle');
    setPlayingWordIdx(-1);

    if (ayahStateRef.current === 'playing') { audioPlayer.pause(); return; }
    if (ayahStateRef.current === 'paused')  { audioPlayer.resume(); return; }

    const url = buildAyahUrl(surahNumber, ayahNumber, selectedReciter.everyayahFolder);
    audioPlayer.play(url, {
      onStateChange: s => {
        setAyahPlayState(s);
        if (s === 'idle' || s === 'error') { setAyahProgress(0); setAyahTime(0); }
      },
      onProgress: (cur, dur) => {
        setAyahTime(cur);
        setAyahDuration(dur);
        setAyahProgress(dur > 0 ? (cur / dur) * 100 : 0);
      },
      onEnded: () => { setAyahPlayState('idle'); setAyahProgress(0); setAyahTime(0); },
      onError: () => setAyahPlayState('error'),
    });
  }, [surahNumber, ayahNumber, selectedReciter]);

  const stopAyah = useCallback(() => {
    audioPlayer.stop();
    setAyahPlayState('idle');
    setAyahProgress(0);
    setAyahTime(0);
  }, []);

  // ── Word styling from results ────────────────────────────────────────────
  const origResults = wordResults ? wordResults.filter(w => w.original !== '') : [];

  const getWordResultStyle = (index: number) => {
    if (!showResults || !origResults.length) return '';
    const r = origResults[index];
    if (!r) return '';
    switch (r.status) {
      case 'correct': return 'text-green-700 bg-green-50 ring-2 ring-green-300';
      case 'partial': return 'text-amber-700 bg-amber-50 ring-2 ring-amber-300';
      case 'wrong':   return 'text-red-700 bg-red-50 ring-2 ring-red-400 underline decoration-red-400 decoration-wavy';
      case 'missed':  return 'text-gray-400 bg-gray-100 ring-1 ring-gray-200 line-through opacity-50';
      default:        return '';
    }
  };

  if (!ayahText) {
    return (
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-8 border border-emerald-100 text-center">
        <div className="text-5xl mb-3">📖</div>
        <p className="text-emerald-600 text-sm font-medium">Select a Surah and Ayah to begin</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 rounded-2xl border border-emerald-100 shadow-md">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-emerald-700 to-teal-600 px-4 py-2 rounded-t-2xl flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-sm">{surahName}</span>
          <span className="text-emerald-200 text-xs bg-black/20 px-2 py-0.5 rounded-full">Ayah {ayahNumber}</span>
        </div>
        <span className="text-emerald-100 text-[10px] bg-black/20 px-2 py-0.5 rounded-full">
          👆 Click word = word audio &nbsp;|&nbsp; ▶ button = full ayah
        </span>
      </div>

      {/* ── Audio Player Bar ────────────────────────────────────────────── */}
      <div className="bg-white border-b border-emerald-100 px-3 py-2 flex items-center gap-2 flex-wrap">

        {/* Reciter picker */}
        <div className="relative">
          <button
            onClick={() => setShowReciterPicker(p => !p)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-full text-xs font-semibold text-emerald-700 transition-all"
          >
            <span>{selectedReciter.flag}</span>
            <span className="hidden sm:inline max-w-[80px] truncate">{selectedReciter.name.split(' ')[0]}</span>
            <span className="text-emerald-400 text-[10px]">▾</span>
          </button>
          {showReciterPicker && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-2xl shadow-2xl border border-emerald-100 p-2 min-w-[220px]">
              <p className="text-[10px] text-gray-400 font-bold px-2 mb-1 uppercase tracking-wide">Choose Reciter</p>
              {popularReciters.map(r => (
                <button
                  key={r.id}
                  onClick={() => { setSelectedReciterId(r.id); setShowReciterPicker(false); stopAyah(); }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm text-left hover:bg-emerald-50 transition-all ${r.id === selectedReciterId ? 'bg-emerald-100 font-bold text-emerald-700' : 'text-gray-700'}`}
                >
                  <span>{r.flag}</span>
                  <span className="flex-1 truncate text-xs">{r.name}</span>
                  {r.id === selectedReciterId && <span className="text-emerald-500 text-xs">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Play full ayah */}
        <button
          onClick={playAyah}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-xs font-bold transition-all shadow-sm hover:scale-105 active:scale-95 ${
            ayahPlayState === 'playing' ? 'bg-amber-500 hover:bg-amber-600' :
            ayahPlayState === 'paused'  ? 'bg-blue-500 hover:bg-blue-600'  :
            'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          {ayahPlayState === 'loading' ? (
            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>{ayahPlayState === 'playing' ? '⏸' : '▶'}</span>
          )}
          <span>
            {ayahPlayState === 'loading' ? 'Loading…' :
             ayahPlayState === 'playing' ? 'Pause' :
             ayahPlayState === 'paused'  ? 'Resume' : 'Play Ayah'}
          </span>
        </button>

        {(ayahPlayState === 'playing' || ayahPlayState === 'paused') && (
          <button onClick={stopAyah} className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full text-xs font-bold transition-all">
            ⏹
          </button>
        )}

        {/* Progress */}
        {(ayahPlayState === 'playing' || ayahPlayState === 'paused') && (
          <div className="flex items-center gap-1 flex-1 min-w-[100px]">
            <span className="text-[10px] text-gray-500 font-mono w-8 text-right">{fmt(ayahTime)}</span>
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-100" style={{ width: `${ayahProgress}%` }} />
            </div>
            <span className="text-[10px] text-gray-400 font-mono w-8">{fmt(ayahDuration)}</span>
          </div>
        )}

        {ayahPlayState === 'error' && <span className="text-xs text-red-500">⚠️ Audio unavailable</span>}

        {/* Word audio indicator */}
        {wordPlayState !== 'idle' && (
          <div className="flex items-center gap-1.5 ml-auto bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-full">
            {wordPlayState === 'loading' ? (
              <span className="w-3 h-3 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="flex gap-0.5 items-end h-3">
                {[0.4, 0.7, 1, 0.7, 0.4].map((h, i) => (
                  <span key={i} className="w-0.5 rounded-full bg-teal-500"
                    style={{ height: `${h * 100}%`, animation: `wordWave ${0.3 + i * 0.07}s ease-in-out infinite alternate` }} />
                ))}
              </span>
            )}
            <span className="text-[10px] text-teal-700 font-semibold">
              {wordPlayState === 'loading' ? 'Loading…' : '🔊 Playing word'}
            </span>
          </div>
        )}
      </div>

      {/* ── Arabic Ayah Text ────────────────────────────────────────────── */}
      <div className="px-4 py-5" dir="rtl">
        <p
          className="text-center leading-[4.5rem]"
          style={{ fontFamily: "'Amiri Quran', 'Amiri', 'Scheherazade New', serif", fontSize: 'clamp(1.4rem, 2.8vw, 2rem)' }}
        >
          {words.map((word, index) => {
            const isPlaying  = playingWordIdx === index && wordPlayState === 'playing';
            const isLoading  = playingWordIdx === index && wordPlayState === 'loading';
            const isHovered  = hoveredWord === index;
            const r          = showResults ? origResults[index] : undefined;

            return (
              <span
                key={`${surahNumber}-${ayahNumber}-${index}`}
                className={[
                  'relative inline-block mx-1.5 px-1.5 py-0.5 rounded-xl cursor-pointer transition-all duration-150 select-none',
                  getWordResultStyle(index),
                  isPlaying ? 'ring-2 ring-teal-400 bg-teal-50 scale-110 shadow-lg z-20' : '',
                  isLoading ? 'ring-2 ring-amber-300 bg-amber-50 scale-105 animate-pulse z-20' : '',
                  !isPlaying && !isLoading ? 'hover:ring-2 hover:ring-teal-300 hover:bg-teal-50 hover:scale-105 hover:shadow-md hover:z-10' : '',
                ].filter(Boolean).join(' ')}
                onMouseEnter={() => setHoveredWord(index)}
                onMouseLeave={() => setHoveredWord(-1)}
                onClick={() => handleWordClick(index)}
                title={`Click to hear word ${index + 1}`}
              >
                {word}

                {/* Playing wave animation below word */}
                {isPlaying && (
                  <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex gap-0.5 items-end h-4 z-10 pointer-events-none">
                    {[0.4, 0.7, 1, 0.7, 0.4].map((h, i) => (
                      <span key={i} className="w-0.5 bg-teal-500 rounded-full"
                        style={{ height: `${h * 100}%`, animation: `wordWave ${0.25 + i * 0.06}s ease-in-out infinite alternate`, animationDelay: `${i * 0.04}s` }} />
                    ))}
                  </span>
                )}

                {/* Loading spinner below word */}
                {isLoading && (
                  <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                    <span className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin block" />
                  </span>
                )}

                {/* Click hint badge above word (on hover) */}
                {isHovered && !isPlaying && !isLoading && (
                  <span className="absolute -top-7 left-1/2 -translate-x-1/2 z-30 pointer-events-none bg-teal-700 text-white text-[9px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shadow-lg">
                    👆 Click to hear
                  </span>
                )}

                {/* Word playing badge */}
                {isPlaying && (
                  <span className="absolute -top-7 left-1/2 -translate-x-1/2 z-30 pointer-events-none bg-teal-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-lg">
                    🔊 Playing
                  </span>
                )}

                {/* Tajweed dots */}
                {r && r.tajweed.annotations.length > 0 && (
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-0.5 pointer-events-none z-10">
                    {r.tajweed.annotations.slice(0, 3).map((ann, ai) => (
                      <span key={ai} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ann.info.color }} />
                    ))}
                  </span>
                )}

                {/* Status badge */}
                {r && r.status !== 'correct' && (
                  <span className="absolute -top-1 -right-1 text-[9px] z-10 pointer-events-none">{statusIcon(r.status)}</span>
                )}

                {/* Hover tooltip with word details */}
                {isHovered && (
                  <span
                    className="absolute hidden sm:block z-50 bottom-full mb-8 right-0 min-w-[190px] max-w-[240px] bg-gray-900 text-white text-xs rounded-2xl p-3 shadow-2xl text-left pointer-events-none"
                    dir="ltr"
                  >
                    <span className="block font-bold text-base mb-1 text-right" style={{ fontFamily: "'Amiri', serif", direction: 'rtl' }}>
                      {word}
                    </span>
                    <span className="block text-teal-400 text-[10px] mb-2 border-b border-gray-700 pb-1.5">
                      Word {index + 1} of {totalWords} &nbsp;|&nbsp; 👆 Click to hear
                    </span>
                    {r ? (
                      <>
                        <span className="block text-gray-200 text-[11px] mb-1">
                          {statusIcon(r.status)} <span className="capitalize font-semibold">{r.status}</span>
                          {r.similarity != null ? ` — ${r.similarity}% match` : ''}
                        </span>
                        {r.spoken && r.status !== 'correct' && r.status !== 'missed' && (
                          <span className="block text-yellow-300 text-[11px] mb-1">
                            You said: <span style={{ fontFamily: "'Amiri', serif" }}>{r.spoken}</span>
                          </span>
                        )}
                        {r.mistakes.slice(0, 2).map((m, mi) => (
                          <span key={mi} className="block text-red-300 text-[10px] mt-0.5">• {m.description}</span>
                        ))}
                        {r.tajweed.annotations.length > 0 && (
                          <span className="block mt-2 pt-1.5 border-t border-gray-700 text-[10px]">
                            <span className="text-gray-400 block mb-1">Tajweed:</span>
                            {r.tajweed.annotations.slice(0, 3).map((ann, ai) => (
                              <span key={ai} className="inline-block mr-1 mb-0.5 px-1.5 py-0.5 rounded-full text-white text-[9px] font-bold"
                                style={{ backgroundColor: ann.info.color }}>
                                {ann.rule}
                              </span>
                            ))}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-400 text-[10px]">Recite to see mistake analysis</span>
                    )}
                  </span>
                )}
              </span>
            );
          })}
        </p>

        {/* Mobile hint */}
        <p className="text-center text-[10px] text-gray-400 mt-6 sm:hidden">
          👆 Tap any word to hear it
        </p>
      </div>

      {/* ── Word-by-Word Result Strip ───────────────────────────────────── */}
      {showResults && wordResults && wordResults.length > 0 && (
        <div className="border-t border-emerald-100 px-3 py-3 bg-white/70 rounded-b-2xl">
          <h4 className="text-[11px] font-bold text-emerald-700 mb-2 uppercase tracking-wide">🔍 Word Analysis</h4>
          <div className="flex flex-wrap gap-1.5 justify-end" dir="rtl">
            {wordResults.filter(r => r.original).map((result, index) => (
              <div
                key={index}
                onClick={() => handleWordClick(words.indexOf(result.original))}
                className={`relative group px-2 py-1 rounded-xl border-2 cursor-pointer hover:scale-105 transition-all ${statusColorClasses(result.status)}`}
              >
                <div className="font-bold text-base text-right leading-tight" style={{ fontFamily: "'Amiri', serif" }}>
                  {result.original}
                </div>
                <div className="flex items-center justify-between mt-0.5 gap-1">
                  <span className="text-[9px]">{statusIcon(result.status)}</span>
                  {result.similarity != null && (
                    <span className="text-[9px] font-bold">{result.similarity}%</span>
                  )}
                </div>

                {/* Tajweed dots */}
                {result.tajweed.annotations.length > 0 && (
                  <div className="absolute -top-1 -right-1 flex gap-0.5">
                    {result.tajweed.annotations.slice(0, 2).map((ann, ai) => (
                      <span key={ai} className="w-1.5 h-1.5 rounded-full border border-white shadow" style={{ backgroundColor: ann.info.color }} />
                    ))}
                  </div>
                )}

                {/* Hover tooltip */}
                <div className="absolute hidden group-hover:block z-30 bottom-full mb-1 right-0 w-52 bg-gray-900 text-white text-[10px] rounded-xl p-2.5 shadow-2xl pointer-events-none" dir="ltr">
                  <p className="text-sm font-bold mb-1 text-right" style={{ fontFamily: "'Amiri', serif", direction: 'rtl' }}>{result.original}</p>
                  <p className="text-gray-300">{statusIcon(result.status)} <span className="capitalize">{result.status}</span> — {result.similarity}%</p>
                  {result.spoken && result.status !== 'correct' && (
                    <p className="text-yellow-300 mt-0.5">Said: <span style={{ fontFamily: "'Amiri', serif" }}>{result.spoken}</span></p>
                  )}
                  {result.mistakes.slice(0, 2).map((m, mi) => (
                    <p key={mi} className="text-red-300 mt-0.5">• {m.description}</p>
                  ))}
                  <p className="text-teal-400 mt-1 text-[9px]">👆 Click to hear this word</p>
                </div>
              </div>
            ))}
          </div>

          {/* Tajweed legend */}
          {wordResults.some(w => w.tajweed.annotations.length > 0) && (
            <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-gray-100">
              {Array.from(new Set(wordResults.flatMap(w => w.tajweed.annotations.map(a => a.rule)))).map(rule => {
                const info = TAJWEED_RULES[rule];
                if (!info) return null;
                return (
                  <span key={rule} className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full text-white font-semibold"
                    style={{ backgroundColor: info.color }}>
                    {rule}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes wordWave {
          0%   { transform: scaleY(0.2); }
          100% { transform: scaleY(1.0); }
        }
      `}</style>
    </div>
  );
}
