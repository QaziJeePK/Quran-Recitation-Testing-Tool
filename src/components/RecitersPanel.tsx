import { useState, useRef, useEffect, useCallback } from 'react';
import { RECITERS, Reciter, buildEveryayahUrl } from '../data/recitersData';

interface RecitersPanelProps {
  surahNumber: number;
  ayahNumber: number;
  surahName: string;
  ayahText: string;
}

type PlayState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

export function RecitersPanel({ surahNumber, ayahNumber, surahName, ayahText }: RecitersPanelProps) {
  const [selectedReciter, setSelectedReciter] = useState<Reciter>(RECITERS[0]);
  const [playState, setPlayState]             = useState<PlayState>('idle');
  const [progress, setProgress]               = useState(0);
  const [duration, setDuration]               = useState(0);
  const [currentTime, setCurrentTime]         = useState(0);
  const [volume, setVolume]                   = useState(0.85);
  const [playbackRate, setPlaybackRate]       = useState(1);
  const [showAll, setShowAll]                 = useState(false);
  const [errorMsg, setErrorMsg]               = useState('');
  const [waveActive, setWaveActive]           = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number>(0);

  const displayedReciters = showAll ? RECITERS : RECITERS.filter(r => r.isPopular);

  // ── Cleanup on unmount ──────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // ── Reset when surah/ayah changes ──────────────────────────────
  useEffect(() => {
    stopAudio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surahNumber, ayahNumber]);

  // ── Progress loop ───────────────────────────────────────────────
  const startProgressLoop = useCallback(() => {
    const loop = () => {
      if (audioRef.current) {
        const cur = audioRef.current.currentTime;
        const dur = audioRef.current.duration || 0;
        setCurrentTime(cur);
        setProgress(dur > 0 ? (cur / dur) * 100 : 0);
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
  }, []);

  const stopProgressLoop = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
  }, []);

  // ── Stop / reset audio ──────────────────────────────────────────
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    stopProgressLoop();
    setPlayState('idle');
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
    setWaveActive(false);
    setErrorMsg('');
  }, [stopProgressLoop]);

  // ── Play ────────────────────────────────────────────────────────
  const playReciter = useCallback((reciter: Reciter) => {
    // Stop any existing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    stopProgressLoop();
    setPlayState('loading');
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
    setWaveActive(false);
    setErrorMsg('');
    setSelectedReciter(reciter);

    const url = buildEveryayahUrl(reciter, surahNumber, ayahNumber);
    const audio = new Audio(url);
    audio.volume  = volume;
    audio.playbackRate = playbackRate;
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
    });

    audio.addEventListener('canplay', () => {
      audio.play().then(() => {
        setPlayState('playing');
        setWaveActive(true);
        startProgressLoop();
      }).catch(() => {
        setPlayState('error');
        setErrorMsg('Playback blocked – click play again.');
      });
    });

    audio.addEventListener('ended', () => {
      setPlayState('idle');
      setWaveActive(false);
      setProgress(100);
      stopProgressLoop();
    });

    audio.addEventListener('error', () => {
      setPlayState('error');
      setWaveActive(false);
      setErrorMsg('Audio not available for this reciter/ayah.');
      stopProgressLoop();
    });

    audio.load();
  }, [surahNumber, ayahNumber, volume, playbackRate, startProgressLoop, stopProgressLoop]);

  // ── Pause / Resume ──────────────────────────────────────────────
  const togglePause = useCallback(() => {
    if (!audioRef.current) return;
    if (playState === 'playing') {
      audioRef.current.pause();
      setPlayState('paused');
      setWaveActive(false);
      stopProgressLoop();
    } else if (playState === 'paused') {
      audioRef.current.play().then(() => {
        setPlayState('playing');
        setWaveActive(true);
        startProgressLoop();
      });
    }
  }, [playState, startProgressLoop, stopProgressLoop]);

  // ── Volume ──────────────────────────────────────────────────────
  const handleVolume = useCallback((v: number) => {
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  // ── Playback rate ────────────────────────────────────────────────
  const handleRate = useCallback((r: number) => {
    setPlaybackRate(r);
    if (audioRef.current) audioRef.current.playbackRate = r;
  }, []);

  // ── Seek ─────────────────────────────────────────────────────────
  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const pct = parseFloat(e.target.value);
    if (audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime = (pct / 100) * audioRef.current.duration;
      setProgress(pct);
    }
  }, []);

  const fmt = (s: number) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const isActive = (rid: string) => selectedReciter.id === rid && playState !== 'idle';

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-emerald-100 overflow-hidden">
      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-700 to-emerald-700 px-6 py-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-white font-bold text-xl flex items-center gap-2">
              <span className="text-2xl">🎧</span> Famous Reciters – Listen & Learn
            </h3>
            <p className="text-emerald-200 text-sm mt-0.5">
              Listen to masters recite the selected ayah — use as a reference for your own recitation
            </p>
          </div>
          {ayahText && (
            <div className="text-right">
              <p className="text-emerald-300 text-xs font-medium">{surahName} • Ayah {ayahNumber}</p>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* ── No ayah selected ── */}
        {!ayahText && (
          <div className="text-center py-8 text-gray-400">
            <div className="text-5xl mb-3">🎵</div>
            <p className="text-base">Select a Surah and Ayah above to listen to famous reciters</p>
          </div>
        )}

        {ayahText && (
          <>
            {/* ── Now playing panel ── */}
            {playState !== 'idle' && (
              <NowPlayingBar
                reciter={selectedReciter}
                playState={playState}
                progress={progress}
                currentTime={currentTime}
                duration={duration}
                volume={volume}
                playbackRate={playbackRate}
                waveActive={waveActive}
                onTogglePause={togglePause}
                onStop={stopAudio}
                onVolume={handleVolume}
                onRate={handleRate}
                onSeek={handleSeek}
                fmt={fmt}
                errorMsg={errorMsg}
              />
            )}

            {/* ── Reciter grid ── */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-gray-800 flex items-center gap-2 text-base">
                  <span>🌟</span> Choose a Reciter to Listen
                </h4>
                <button
                  onClick={() => setShowAll(p => !p)}
                  className="text-sm text-emerald-600 hover:text-emerald-800 font-semibold underline underline-offset-2 transition-colors"
                >
                  {showAll ? 'Show Popular Only' : `Show All (${RECITERS.length})`}
                </button>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {displayedReciters.map(reciter => (
                  <ReciterCard
                    key={reciter.id}
                    reciter={reciter}
                    isActive={isActive(reciter.id)}
                    playState={isActive(reciter.id) ? playState : 'idle'}
                    onPlay={() => {
                      if (isActive(reciter.id)) {
                        togglePause();
                      } else {
                        playReciter(reciter);
                      }
                    }}
                    onStop={stopAudio}
                  />
                ))}
              </div>
            </div>

            {/* ── Style legend ── */}
            <StyleLegend />

            {/* ── Tips ── */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
              <h5 className="font-bold text-blue-800 text-sm mb-2 flex items-center gap-2">
                <span>💡</span> How to Use Reciters for Practice
              </h5>
              <ul className="text-xs text-blue-700 space-y-1.5">
                {[
                  'Listen to the ayah 2–3 times with your eyes on the Arabic text above',
                  'Use 0.75× speed to slow it down and catch every word clearly',
                  'Notice how the reciter applies Tajweed rules highlighted in the analysis',
                  'Pause after each word and try to repeat it before moving on',
                  'Al-Husary and Al-Minshawi are best for learning precise Tajweed',
                  'After listening, record your own recitation and click Check to compare',
                ].map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-blue-400 font-bold flex-shrink-0">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Now Playing Bar ─────────────────────────────────────────────────────────

interface NowPlayingBarProps {
  reciter: Reciter;
  playState: PlayState;
  progress: number;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  waveActive: boolean;
  onTogglePause: () => void;
  onStop: () => void;
  onVolume: (v: number) => void;
  onRate: (r: number) => void;
  onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fmt: (s: number) => string;
  errorMsg: string;
}

function NowPlayingBar({
  reciter, playState, progress, currentTime, duration, volume,
  playbackRate, waveActive, onTogglePause, onStop, onVolume, onRate, onSeek, fmt, errorMsg
}: NowPlayingBarProps) {
  const RATES = [0.5, 0.75, 1, 1.25, 1.5];

  return (
    <div
      className="rounded-2xl p-5 border-2 shadow-lg"
      style={{ borderColor: reciter.color, background: `linear-gradient(135deg, ${reciter.color}10, ${reciter.color}05)` }}
    >
      {/* Reciter info + controls */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Avatar */}
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-md"
          style={{ background: reciter.color }}
        >
          {reciter.flag}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-gray-900 text-base leading-tight">{reciter.name}</p>
            {playState === 'loading' && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin inline-block"></span> Loading...
              </span>
            )}
            {playState === 'playing' && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse inline-block"></span> Playing
              </span>
            )}
            {playState === 'paused' && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-semibold">Paused</span>
            )}
            {playState === 'error' && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">Error</span>
            )}
          </div>
          <p className="text-sm text-gray-500" style={{ fontFamily: "'Amiri', serif" }}>{reciter.nameArabic}</p>
          {/* Waveform */}
          {waveActive && <AudioWave color={reciter.color} active={waveActive} />}
        </div>

        {/* Play/Pause & Stop */}
        <div className="flex items-center gap-2">
          {playState !== 'error' && (
            <button
              onClick={onTogglePause}
              disabled={playState === 'loading'}
              className="w-12 h-12 rounded-full text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95 disabled:opacity-50"
              style={{ background: reciter.color }}
              title={playState === 'playing' ? 'Pause' : 'Resume'}
            >
              {playState === 'loading'
                ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                : playState === 'playing' ? '⏸' : '▶'}
            </button>
          )}
          <button
            onClick={onStop}
            className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center justify-center transition-transform hover:scale-110 text-lg"
            title="Stop"
          >⏹</button>
        </div>
      </div>

      {/* Error */}
      {playState === 'error' && errorMsg && (
        <p className="text-sm text-red-600 mt-3 flex items-center gap-2">
          <span>⚠️</span> {errorMsg}
        </p>
      )}

      {/* Progress bar */}
      {(playState === 'playing' || playState === 'paused') && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 font-mono w-10">{fmt(currentTime)}</span>
            <input
              type="range" min="0" max="100" step="0.1"
              value={progress}
              onChange={onSeek}
              className="flex-1 h-2 rounded-full accent-emerald-500 cursor-pointer"
              style={{ accentColor: reciter.color }}
            />
            <span className="text-xs text-gray-500 font-mono w-10 text-right">{fmt(duration)}</span>
          </div>

          {/* Volume + Speed */}
          <div className="flex items-center gap-5 flex-wrap">
            {/* Volume */}
            <div className="flex items-center gap-2">
              <span className="text-base">{volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}</span>
              <input
                type="range" min="0" max="1" step="0.05"
                value={volume}
                onChange={e => onVolume(parseFloat(e.target.value))}
                className="w-20 h-1.5 rounded-full cursor-pointer"
                style={{ accentColor: reciter.color }}
              />
              <span className="text-xs text-gray-400 w-8">{Math.round(volume * 100)}%</span>
            </div>

            {/* Speed */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-600 font-semibold">Speed:</span>
              {RATES.map(r => (
                <button
                  key={r}
                  onClick={() => onRate(r)}
                  className={`text-xs px-2.5 py-1 rounded-full font-bold transition-all ${
                    playbackRate === r
                      ? 'text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  style={playbackRate === r ? { background: reciter.color } : {}}
                >
                  {r}×
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reciter Card ─────────────────────────────────────────────────────────────

interface ReciterCardProps {
  reciter: Reciter;
  isActive: boolean;
  playState: PlayState;
  onPlay: () => void;
  onStop: () => void;
}

function ReciterCard({ reciter, isActive, playState, onPlay }: ReciterCardProps) {
  return (
    <div
      className={`relative rounded-2xl border-2 p-4 cursor-pointer transition-all duration-200 hover:shadow-lg group ${
        isActive
          ? 'shadow-lg scale-[1.02]'
          : 'border-gray-100 hover:border-gray-200 bg-white'
      }`}
      style={isActive ? { borderColor: reciter.color, background: `linear-gradient(135deg, ${reciter.color}12, ${reciter.color}05)` } : {}}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Flag circle */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 shadow-sm border-2 border-white"
            style={{ background: `${reciter.color}20` }}
          >
            {reciter.flag}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-900 text-sm leading-tight truncate">{reciter.name}</p>
            <p className="text-xs text-gray-400 truncate" style={{ fontFamily: "'Amiri', serif" }}>{reciter.nameArabic}</p>
          </div>
        </div>

        {/* Play button */}
        <button
          onClick={onPlay}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md transition-transform hover:scale-110 active:scale-95 flex-shrink-0"
          style={{ background: reciter.color }}
          title={isActive && playState === 'playing' ? 'Pause' : 'Play'}
        >
          {isActive && playState === 'loading'
            ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            : isActive && playState === 'playing'
              ? <span className="text-xs">⏸</span>
              : <span className="text-xs">▶</span>
          }
        </button>
      </div>

      {/* Style badge + nationality */}
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <span
          className="text-xs px-2.5 py-0.5 rounded-full text-white font-semibold"
          style={{ background: reciter.color }}
        >
          {reciter.style}
        </span>
        <span className="text-xs text-gray-400">{reciter.nationality}</span>
        {reciter.isPopular && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">
            ⭐ Popular
          </span>
        )}
      </div>

      {/* Bio */}
      <p className="text-xs text-gray-500 mt-2 leading-relaxed line-clamp-2">{reciter.bio}</p>

      {/* Playing indicator */}
      {isActive && playState === 'playing' && (
        <AudioWave color={reciter.color} active small />
      )}

      {/* Active glow */}
      {isActive && (
        <div
          className="absolute inset-0 rounded-2xl opacity-10 pointer-events-none"
          style={{ background: `radial-gradient(circle at center, ${reciter.color}, transparent)` }}
        />
      )}
    </div>
  );
}

// ─── Audio Wave Animation ─────────────────────────────────────────────────────

function AudioWave({ color, active, small = false }: { color: string; active: boolean; small?: boolean }) {
  const bars = small ? 5 : 8;
  return (
    <div className={`flex items-end gap-0.5 ${small ? 'h-4 mt-2' : 'h-5 mt-2'}`}>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all ${small ? 'w-0.5' : 'w-1'}`}
          style={{
            backgroundColor: color,
            height: active ? `${30 + Math.random() * 70}%` : '20%',
            animation: active ? `wave ${0.5 + (i % 4) * 0.15}s ease-in-out infinite alternate` : 'none',
            animationDelay: `${i * 0.07}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes wave {
          0%   { height: 15%; }
          100% { height: 90%; }
        }
      `}</style>
    </div>
  );
}

// ─── Style Legend ─────────────────────────────────────────────────────────────

function StyleLegend() {
  const styles = [
    { name: 'Murattal', nameAr: 'مرتل', desc: 'Measured, clear recitation — best for learning & following along', color: '#059669' },
    { name: 'Mujawwad', nameAr: 'مجوّد', desc: 'Melodious, slow recitation with full voice modulation', color: '#7c3aed' },
  ];
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {styles.map(s => (
        <div key={s.name} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
          <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{ background: s.color }} />
          <div>
            <p className="font-bold text-sm text-gray-800">
              {s.name} <span className="font-normal text-gray-400" style={{ fontFamily: "'Amiri', serif" }}>({s.nameAr})</span>
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
