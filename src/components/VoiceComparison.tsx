import { useState, useRef, useEffect, useCallback } from 'react';
import { RECITERS, Reciter, buildEveryayahUrl } from '../data/recitersData';
import { AudioRecorder, RecordingResult, RecorderState } from '../utils/audioRecorder';

interface VoiceComparisonProps {
  surahNumber: number;
  ayahNumber: number;
  surahName: string;
  ayahText: string;
}

type PlayTarget = 'reciter' | 'myvoice' | null;

// ─── Recitation step flow ─────────────────────────────────────────────────────
type Step = 'select' | 'listen' | 'record' | 'compare';

export function VoiceComparison({
  surahNumber, ayahNumber, surahName, ayahText
}: VoiceComparisonProps) {
  const [step, setStep]                       = useState<Step>('select');
  const [selectedReciter, setSelectedReciter] = useState<Reciter>(RECITERS[0]);

  // Reciter audio player state
  const [reciterPlaying, setReciterPlaying]   = useState(false);
  const [reciterLoading, setReciterLoading]   = useState(false);
  const [reciterError, setReciterError]       = useState('');
  const [reciterProgress, setReciterProgress] = useState(0);
  const [reciterTime, setReciterTime]         = useState(0);
  const [reciterDuration, setReciterDuration] = useState(0);
  const [reciterVolume, setReciterVolume]     = useState(0.85);
  const [reciterRate, setReciterRate]         = useState(1);
  const [reciterLoopCount, setReciterLoopCount] = useState(0);
  const reciterAudioRef                       = useRef<HTMLAudioElement | null>(null);
  const reciterRafRef                         = useRef<number>(0);

  // My voice recorder state
  const [recorderState, setRecorderState]     = useState<RecorderState>('idle');
  const [recording, setRecording]             = useState<RecordingResult | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [micVolume, setMicVolume]             = useState(0);
  const [recorderError, setRecorderError]     = useState('');
  const recorderRef                           = useRef<AudioRecorder | null>(null);

  // Playback comparison state
  const [playing, setPlaying]                 = useState<PlayTarget>(null);
  const [myProgress, setMyProgress]           = useState(0);
  const [myTime, setMyTime]                   = useState(0);
  const [myDuration, setMyDuration]           = useState(0);
  const [myVolume, setMyVolume]               = useState(0.85);
  const [syncPlay, setSyncPlay]               = useState(false);
  const myAudioRef                            = useRef<HTMLAudioElement | null>(null);
  const myRafRef                              = useRef<number>(0);

  const recorderSupported                     = AudioRecorder.isSupported();
  const RATES = [0.5, 0.75, 1, 1.25];

  // ── Reset everything when surah/ayah changes ──────────────────────────────
  useEffect(() => {
    stopReciterAudio();
    stopMyAudio();
    setStep('select');
    setRecording(null);
    setRecordingDuration(0);
    setMicVolume(0);
    setRecorderError('');
    setReciterError('');
    setReciterLoopCount(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surahNumber, ayahNumber]);

  useEffect(() => {
    return () => {
      stopReciterAudio();
      stopMyAudio();
      recorderRef.current?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Reciter audio controls ─────────────────────────────────────────────────
  const stopReciterAudio = useCallback(() => {
    cancelAnimationFrame(reciterRafRef.current);
    if (reciterAudioRef.current) {
      reciterAudioRef.current.pause();
      reciterAudioRef.current.src = '';
      reciterAudioRef.current = null;
    }
    setReciterPlaying(false);
    setReciterLoading(false);
    setReciterProgress(0);
    setReciterTime(0);
    setReciterDuration(0);
  }, []);

  const playReciterAudio = useCallback(() => {
    stopReciterAudio();
    setReciterError('');
    setReciterLoading(true);

    const url = buildEveryayahUrl(selectedReciter, surahNumber, ayahNumber);
    const audio = new Audio(url);
    audio.volume = reciterVolume;
    audio.playbackRate = reciterRate;
    reciterAudioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => setReciterDuration(audio.duration));

    audio.addEventListener('canplay', () => {
      setReciterLoading(false);
      audio.play().then(() => {
        setReciterPlaying(true);
        const loop = () => {
          if (audio) {
            setReciterTime(audio.currentTime);
            setReciterProgress(audio.duration > 0 ? (audio.currentTime / audio.duration) * 100 : 0);
          }
          reciterRafRef.current = requestAnimationFrame(loop);
        };
        reciterRafRef.current = requestAnimationFrame(loop);
      }).catch(() => setReciterError('Playback blocked. Click play again.'));
    });

    audio.addEventListener('ended', () => {
      cancelAnimationFrame(reciterRafRef.current);
      setReciterPlaying(false);
      setReciterProgress(100);
      setReciterLoopCount(c => c + 1);
    });

    audio.addEventListener('error', () => {
      setReciterLoading(false);
      setReciterError('Audio not available for this reciter/ayah.');
    });

    audio.load();
  }, [selectedReciter, surahNumber, ayahNumber, reciterVolume, reciterRate, stopReciterAudio]);

  const pauseReciterAudio = useCallback(() => {
    if (reciterAudioRef.current) {
      reciterAudioRef.current.pause();
      setReciterPlaying(false);
      cancelAnimationFrame(reciterRafRef.current);
    }
  }, []);

  const resumeReciterAudio = useCallback(() => {
    if (reciterAudioRef.current) {
      reciterAudioRef.current.play().then(() => {
        setReciterPlaying(true);
        const loop = () => {
          if (reciterAudioRef.current) {
            setReciterTime(reciterAudioRef.current.currentTime);
            setReciterProgress(reciterAudioRef.current.duration > 0
              ? (reciterAudioRef.current.currentTime / reciterAudioRef.current.duration) * 100 : 0);
          }
          reciterRafRef.current = requestAnimationFrame(loop);
        };
        reciterRafRef.current = requestAnimationFrame(loop);
      });
    }
  }, []);

  const handleReciterSeek = useCallback((pct: number) => {
    if (reciterAudioRef.current?.duration) {
      reciterAudioRef.current.currentTime = (pct / 100) * reciterAudioRef.current.duration;
      setReciterProgress(pct);
    }
  }, []);

  // ── My voice audio controls ────────────────────────────────────────────────
  const stopMyAudio = useCallback(() => {
    cancelAnimationFrame(myRafRef.current);
    if (myAudioRef.current) {
      myAudioRef.current.pause();
      myAudioRef.current = null;
    }
    setPlaying(null);
    setMyProgress(0);
    setMyTime(0);
  }, []);

  const playMyAudio = useCallback(() => {
    if (!recording) return;
    stopMyAudio();
    const audio = new Audio(recording.url);
    audio.volume = myVolume;
    myAudioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => setMyDuration(audio.duration));
    audio.addEventListener('canplay', () => {
      audio.play().then(() => {
        setPlaying('myvoice');
        const loop = () => {
          if (audio) {
            setMyTime(audio.currentTime);
            setMyProgress(audio.duration > 0 ? (audio.currentTime / audio.duration) * 100 : 0);
          }
          myRafRef.current = requestAnimationFrame(loop);
        };
        myRafRef.current = requestAnimationFrame(loop);
      });
    });
    audio.addEventListener('ended', () => {
      cancelAnimationFrame(myRafRef.current);
      setPlaying(null);
      setMyProgress(100);
    });
    audio.load();
  }, [recording, myVolume, stopMyAudio]);

  const pauseMyAudio = useCallback(() => {
    if (myAudioRef.current) {
      myAudioRef.current.pause();
      setPlaying(null);
      cancelAnimationFrame(myRafRef.current);
    }
  }, []);

  // ── Sync play: both at once ────────────────────────────────────────────────
  const playSyncBoth = useCallback(() => {
    if (!recording) return;
    // Play reciter
    playReciterAudio();
    // Play my voice after tiny delay
    setTimeout(() => playMyAudio(), 100);
    setSyncPlay(true);
  }, [recording, playReciterAudio, playMyAudio]);

  const stopBoth = useCallback(() => {
    stopReciterAudio();
    stopMyAudio();
    setSyncPlay(false);
  }, [stopReciterAudio, stopMyAudio]);

  // ── Voice Recorder ─────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (!recorderSupported) return;
    setRecorderError('');
    setRecording(null);
    setRecordingDuration(0);

    const recorder = new AudioRecorder({
      onStateChange: setRecorderState,
      onVolumeChange: setMicVolume,
      onDurationUpdate: setRecordingDuration,
      onDone: (result) => {
        setRecording(result);
        setMyDuration(result.duration);
        setStep('compare');
      },
      onError: setRecorderError,
    });

    recorderRef.current = recorder;
    await recorder.start();
  }, [recorderSupported]);

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
    setMicVolume(0);
  }, []);

  const fmt = (s: number) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (!ayahText) {
    return (
      <div className="bg-white/90 rounded-2xl shadow border border-emerald-100 p-12 text-center text-gray-400">
        <div className="text-5xl mb-3">🎙️</div>
        <p className="text-lg">Select a Surah & Ayah to start the voice comparison</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Step indicator ── */}
      <StepIndicator current={step} hasRecording={!!recording} />

      {/* ── Step 1: Select Reciter ── */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-emerald-100 overflow-hidden">
        <SectionHeader
          icon="🌟"
          title="Step 1 — Choose Your Reference Reciter"
          subtitle="Pick a famous reciter to compare your recitation against"
          color="emerald"
          step={1}
        />
        <div className="p-5">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {RECITERS.filter(r => r.isPopular).map(r => (
              <ReciterSelectCard
                key={r.id}
                reciter={r}
                isSelected={selectedReciter.id === r.id}
                onSelect={() => { setSelectedReciter(r); setStep('listen'); }}
              />
            ))}
          </div>
          {/* Show all toggle */}
          <details className="mt-3">
            <summary className="text-sm text-emerald-600 cursor-pointer hover:text-emerald-800 font-semibold">
              Show all reciters ({RECITERS.length}) ▾
            </summary>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
              {RECITERS.filter(r => !r.isPopular).map(r => (
                <ReciterSelectCard
                  key={r.id}
                  reciter={r}
                  isSelected={selectedReciter.id === r.id}
                  onSelect={() => { setSelectedReciter(r); setStep('listen'); }}
                />
              ))}
            </div>
          </details>
        </div>
      </div>

      {/* ── Step 2: Listen to Reciter ── */}
      <div className={`bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border overflow-hidden transition-all ${step === 'select' ? 'opacity-50 pointer-events-none' : 'border-blue-200'}`}>
        <SectionHeader
          icon="🎧"
          title={`Step 2 — Listen to ${selectedReciter.name}`}
          subtitle="Listen carefully multiple times before recording your own"
          color="blue"
          step={2}
        />
        <div className="p-5">
          {/* Reciter info */}
          <div
            className="flex items-center gap-4 p-4 rounded-2xl mb-5 border-2"
            style={{ borderColor: selectedReciter.color, background: `${selectedReciter.color}10` }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-md flex-shrink-0"
              style={{ background: selectedReciter.color }}
            >
              {selectedReciter.flag}
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900 text-lg">{selectedReciter.name}</p>
              <p className="text-sm text-gray-400" style={{ fontFamily: "'Amiri', serif" }}>{selectedReciter.nameArabic}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded-full text-white font-semibold" style={{ background: selectedReciter.color }}>
                  {selectedReciter.style}
                </span>
                <span className="text-xs text-gray-500">{selectedReciter.nationality}</span>
                {reciterLoopCount > 0 && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                    Listened ×{reciterLoopCount}
                  </span>
                )}
              </div>
            </div>
            {/* Big play/stop */}
            <div className="flex items-center gap-2">
              {!reciterPlaying && !reciterLoading ? (
                <button
                  onClick={playReciterAudio}
                  className="w-14 h-14 rounded-full text-white text-2xl flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                  style={{ background: selectedReciter.color }}
                >▶</button>
              ) : (
                <button
                  onClick={reciterPlaying ? pauseReciterAudio : resumeReciterAudio}
                  disabled={reciterLoading}
                  className="w-14 h-14 rounded-full text-white text-2xl flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                  style={{ background: selectedReciter.color }}
                >
                  {reciterLoading
                    ? <span className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : reciterPlaying ? '⏸' : '▶'}
                </button>
              )}
              <button
                onClick={stopReciterAudio}
                className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center justify-center text-xl"
              >⏹</button>
            </div>
          </div>

          {/* Progress bar + time */}
          <div className="space-y-3 mb-5">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 font-mono w-10">{fmt(reciterTime)}</span>
              <div className="flex-1 relative h-3 bg-gray-100 rounded-full overflow-hidden cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = ((e.clientX - rect.left) / rect.width) * 100;
                  handleReciterSeek(pct);
                }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${reciterProgress}%`, background: selectedReciter.color }}
                />
                {/* Playhead dot */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md transition-all"
                  style={{ left: `calc(${reciterProgress}% - 8px)`, background: selectedReciter.color }}
                />
              </div>
              <span className="text-xs text-gray-500 font-mono w-10 text-right">{fmt(reciterDuration)}</span>
            </div>

            {/* Speed + Volume */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 font-semibold">Speed:</span>
                {RATES.map(r => (
                  <button
                    key={r}
                    onClick={() => {
                      setReciterRate(r);
                      if (reciterAudioRef.current) reciterAudioRef.current.playbackRate = r;
                    }}
                    className={`text-xs px-2.5 py-1 rounded-full font-bold transition-all ${reciterRate === r ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    style={reciterRate === r ? { background: selectedReciter.color } : {}}
                  >{r}×</button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">{reciterVolume < 0.3 ? '🔉' : '🔊'}</span>
                <input type="range" min="0" max="1" step="0.05" value={reciterVolume}
                  onChange={e => {
                    const v = parseFloat(e.target.value);
                    setReciterVolume(v);
                    if (reciterAudioRef.current) reciterAudioRef.current.volume = v;
                  }}
                  className="w-24 cursor-pointer" style={{ accentColor: selectedReciter.color }}
                />
                <span className="text-xs text-gray-400 w-8">{Math.round(reciterVolume * 100)}%</span>
              </div>
            </div>
          </div>

          {/* Waveform visualization (CSS animated) */}
          {reciterPlaying && <AnimatedWaveform color={selectedReciter.color} bars={32} />}

          {/* Error */}
          {reciterError && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl flex items-center gap-2">
              <span>⚠️</span> {reciterError}
            </p>
          )}

          {/* CTA to next step */}
          {reciterLoopCount >= 1 && step === 'listen' && (
            <div className="mt-5 text-center">
              <button
                onClick={() => setStep('record')}
                className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-full shadow-lg transition-all hover:scale-105"
              >
                ✅ I've Listened — Ready to Record! →
              </button>
            </div>
          )}
          {step === 'listen' && reciterLoopCount === 0 && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setStep('record')}
                className="px-6 py-2.5 border-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-semibold rounded-full transition-all text-sm"
              >
                Skip listening → Go to Record
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Step 3: Record My Voice ── */}
      <div className={`bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border overflow-hidden transition-all ${step === 'select' || step === 'listen' ? 'opacity-50 pointer-events-none' : 'border-red-200'}`}>
        <SectionHeader
          icon="🎙️"
          title="Step 3 — Record Your Recitation"
          subtitle="Now recite the ayah yourself — we'll record your voice"
          color="red"
          step={3}
        />
        <div className="p-5">
          {!recorderSupported ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
              ⚠️ Audio recording not supported in this browser. Please use <strong>Chrome</strong> or <strong>Edge</strong>.
            </div>
          ) : (
            <>
              {/* Ayah reference */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-5 text-center">
                <p className="text-xs text-emerald-600 font-semibold mb-2">{surahName} — Ayah {ayahNumber}</p>
                <p className="text-2xl leading-loose text-emerald-900" dir="rtl"
                  style={{ fontFamily: "'Amiri Quran', 'Amiri', serif" }}>{ayahText}</p>
              </div>

              {/* Recording controls */}
              <div className="flex flex-wrap items-center justify-center gap-4 mb-5">
                {recorderState !== 'recording' ? (
                  <button
                    onClick={startRecording}
                    disabled={recorderState === 'processing'}
                    className="relative px-10 py-5 bg-red-500 hover:bg-red-600 text-white font-bold text-lg rounded-full shadow-xl transition-all hover:scale-105 disabled:opacity-50"
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-2xl">🎙️</span>
                      {recorderState === 'requesting' ? 'Requesting mic…'
                        : recorderState === 'processing' ? 'Processing…'
                        : recording ? '🔄 Record Again' : 'Start Recording'}
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="relative px-10 py-5 bg-red-600 text-white font-bold text-lg rounded-full shadow-xl animate-pulse"
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-4 h-4 bg-white rounded-full animate-ping inline-block" />
                      ⏹ Stop Recording
                      <span className="text-sm opacity-80 font-mono">{fmt(recordingDuration)}</span>
                    </span>
                    <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-20 pointer-events-none" />
                  </button>
                )}
              </div>

              {/* Mic volume meter */}
              {recorderState === 'recording' && (
                <div className="mb-5">
                  <MicVolumeMeter volume={micVolume} duration={recordingDuration} />
                </div>
              )}

              {/* Recorder error */}
              {recorderError && (
                <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl flex items-center gap-2 mb-4">
                  <span>⚠️</span> {recorderError}
                </p>
              )}

              {/* Recording done: show playback */}
              {recording && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                      ✓
                    </div>
                    <div>
                      <p className="font-bold text-green-800">Recording saved! ✅</p>
                      <p className="text-sm text-green-600">Duration: {fmt(recording.duration)} • Ready to compare</p>
                    </div>
                    <div className="ml-auto flex gap-2">
                      <button
                        onClick={playing === 'myvoice' ? pauseMyAudio : playMyAudio}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-full text-sm font-bold transition-all"
                      >
                        {playing === 'myvoice' ? '⏸ Pause' : '▶ Play My Voice'}
                      </button>
                      {playing === 'myvoice' && (
                        <button onClick={stopMyAudio}
                          className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full text-sm font-bold">
                          ⏹
                        </button>
                      )}
                    </div>
                  </div>

                  {/* My voice progress */}
                  {playing === 'myvoice' && (
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 font-mono w-10">{fmt(myTime)}</span>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${myProgress}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 font-mono w-10 text-right">{fmt(myDuration)}</span>
                    </div>
                  )}

                  {/* Volume control */}
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-sm">🔊</span>
                    <input type="range" min="0" max="1" step="0.05" value={myVolume}
                      onChange={e => {
                        const v = parseFloat(e.target.value);
                        setMyVolume(v);
                        if (myAudioRef.current) myAudioRef.current.volume = v;
                      }}
                      className="w-24 cursor-pointer" style={{ accentColor: '#22c55e' }}
                    />
                    <span className="text-xs text-gray-400">{Math.round(myVolume * 100)}%</span>
                  </div>

                  {/* CTA to compare */}
                  <button
                    onClick={() => setStep('compare')}
                    className="mt-4 px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-full shadow-lg transition-all hover:scale-105 w-full text-center"
                  >
                    🆚 Compare with Reciter →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Step 4: Compare ── */}
      {recording && (
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border-2 border-purple-200 overflow-hidden">
          <SectionHeader
            icon="🆚"
            title="Step 4 — Side-by-Side Voice Comparison"
            subtitle="Listen to both voices and spot the differences"
            color="purple"
            step={4}
          />
          <div className="p-5 space-y-5">

            {/* Sync play button */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={syncPlay ? stopBoth : playSyncBoth}
                className={`px-8 py-4 rounded-full font-bold text-base text-white shadow-xl transition-all hover:scale-105 ${syncPlay ? 'bg-red-500 hover:bg-red-600' : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'}`}
              >
                {syncPlay ? '⏹ Stop Both' : '▶▶ Play Both Simultaneously'}
              </button>
              <button
                onClick={() => { stopBoth(); setRecording(null); setStep('record'); }}
                className="px-5 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full font-bold text-sm transition-all"
              >
                🔄 Re-record
              </button>
            </div>

            {/* Side-by-side players */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Reciter side */}
              <ComparePlayerCard
                title="📖 Reference Reciter"
                name={selectedReciter.name}
                nameAr={selectedReciter.nameArabic}
                flag={selectedReciter.flag}
                color={selectedReciter.color}
                isPlaying={reciterPlaying}
                isLoading={reciterLoading}
                progress={reciterProgress}
                currentTime={reciterTime}
                duration={reciterDuration}
                onPlay={playReciterAudio}
                onPause={pauseReciterAudio}
                onResume={resumeReciterAudio}
                onStop={stopReciterAudio}
                onSeek={handleReciterSeek}
                fmt={fmt}
                badge={`${selectedReciter.style} • ${selectedReciter.nationality}`}
                error={reciterError}
              />

              {/* My voice side */}
              <ComparePlayerCard
                title="🎙️ My Voice"
                name="Your Recitation"
                nameAr="تلاوتك"
                flag="🎤"
                color="#22c55e"
                isPlaying={playing === 'myvoice'}
                isLoading={false}
                progress={myProgress}
                currentTime={myTime}
                duration={myDuration}
                onPlay={playMyAudio}
                onPause={pauseMyAudio}
                onResume={playMyAudio}
                onStop={stopMyAudio}
                onSeek={(pct) => {
                  if (myAudioRef.current?.duration) {
                    myAudioRef.current.currentTime = (pct / 100) * myAudioRef.current.duration;
                    setMyProgress(pct);
                  }
                }}
                fmt={fmt}
                badge={`Duration: ${fmt(recording.duration)}`}
                error=""
              />
            </div>

            {/* Comparison tips */}
            <ComparisonTipsCard reciter={selectedReciter} />

            {/* Score/Feedback placeholder */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-5 border border-purple-100">
              <h4 className="font-bold text-purple-800 text-base mb-3 flex items-center gap-2">
                <span>🎯</span> What to Listen For
              </h4>
              <div className="grid sm:grid-cols-2 gap-3">
                {COMPARISON_TIPS.map((tip, i) => (
                  <div key={i} className="flex items-start gap-3 bg-white rounded-xl p-3 border border-purple-100 shadow-sm">
                    <span className="text-2xl flex-shrink-0">{tip.icon}</span>
                    <div>
                      <p className="font-bold text-sm text-gray-800">{tip.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{tip.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step Indicator ──────────────────────────────────────────────────────────

function StepIndicator({ current, hasRecording }: { current: Step; hasRecording: boolean }) {
  const steps: { key: Step; label: string; icon: string }[] = [
    { key: 'select', label: 'Select Reciter', icon: '🌟' },
    { key: 'listen', label: 'Listen', icon: '🎧' },
    { key: 'record', label: 'Record', icon: '🎙️' },
    { key: 'compare', label: 'Compare', icon: '🆚' },
  ];
  const idx = steps.findIndex(s => s.key === current);

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow border border-emerald-100">
      <div className="flex items-center justify-between relative">
        {/* Progress line */}
        <div className="absolute top-5 left-8 right-8 h-1 bg-gray-200 rounded-full z-0" />
        <div
          className="absolute top-5 left-8 h-1 bg-gradient-to-r from-emerald-500 to-purple-500 rounded-full z-0 transition-all duration-500"
          style={{ width: `${(idx / (steps.length - 1)) * calc100()}%` }}
        />

        {steps.map((s, i) => {
          const done = i < idx || (s.key === 'compare' && hasRecording);
          const active = s.key === current;
          return (
            <div key={s.key} className="flex flex-col items-center z-10">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                done ? 'bg-emerald-500 border-emerald-500 text-white'
                  : active ? 'bg-purple-500 border-purple-500 text-white scale-110 shadow-lg'
                  : 'bg-white border-gray-200 text-gray-400'
              }`}>
                {done ? '✓' : s.icon}
              </div>
              <span className={`text-xs mt-1 font-semibold ${active ? 'text-purple-700' : done ? 'text-emerald-600' : 'text-gray-400'}`}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
// tiny helper so eslint doesn't complain about literal 100
function calc100() { return 100; }

// ─── Section Header ──────────────────────────────────────────────────────────

function SectionHeader({ icon, title, subtitle, color, step }: {
  icon: string; title: string; subtitle: string; color: string; step: number;
}) {
  const gradMap: Record<string, string> = {
    emerald: 'from-emerald-700 to-teal-600',
    blue:    'from-blue-700 to-blue-500',
    red:     'from-red-700 to-red-500',
    purple:  'from-purple-700 to-indigo-600',
  };
  return (
    <div className={`bg-gradient-to-r ${gradMap[color] || gradMap.emerald} px-6 py-4`}>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          {step}
        </div>
        <div>
          <h3 className="text-white font-bold text-base flex items-center gap-2">
            <span>{icon}</span> {title}
          </h3>
          <p className="text-white/70 text-xs mt-0.5">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Reciter Select Card ─────────────────────────────────────────────────────

function ReciterSelectCard({ reciter, isSelected, onSelect }: {
  reciter: Reciter; isSelected: boolean; onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-2xl border-2 p-4 transition-all hover:shadow-lg ${
        isSelected
          ? 'shadow-lg scale-[1.02]'
          : 'border-gray-100 bg-white hover:border-gray-200'
      }`}
      style={isSelected ? { borderColor: reciter.color, background: `${reciter.color}12` } : {}}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm flex-shrink-0"
          style={{ background: isSelected ? reciter.color : `${reciter.color}25` }}
        >
          <span style={isSelected ? { filter: 'brightness(10)' } : {}}>{reciter.flag}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-gray-900 text-sm truncate">{reciter.name}</p>
          <p className="text-xs text-gray-400 truncate" style={{ fontFamily: "'Amiri', serif" }}>
            {reciter.nameArabic}
          </p>
          <p className="text-xs mt-1">
            <span className="text-xs px-2 py-0.5 rounded-full text-white font-semibold"
              style={{ background: reciter.color }}>{reciter.style}</span>
          </p>
        </div>
        {isSelected && (
          <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-sm flex-shrink-0 shadow"
            style={{ color: reciter.color }}>✓</span>
        )}
      </div>
    </button>
  );
}

// ─── Compare Player Card ──────────────────────────────────────────────────────

function ComparePlayerCard({
  title, name, nameAr, flag, color, isPlaying, isLoading,
  progress, currentTime, duration, onPlay, onPause, onResume,
  onStop, onSeek, fmt, badge, error,
}: {
  title: string; name: string; nameAr: string; flag: string; color: string;
  isPlaying: boolean; isLoading: boolean; progress: number; currentTime: number;
  duration: number; onPlay: () => void; onPause: () => void; onResume: () => void;
  onStop: () => void; onSeek: (pct: number) => void; fmt: (s: number) => string;
  badge: string; error: string;
}) {
  return (
    <div
      className="rounded-2xl border-2 p-5 flex flex-col gap-4"
      style={{ borderColor: color, background: `${color}08` }}
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-md flex-shrink-0"
          style={{ background: color }}>
          <span style={{ filter: 'brightness(10)' }}>{flag}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{title}</p>
          <p className="font-bold text-gray-900 text-base truncate">{name}</p>
          <p className="text-xs text-gray-400" style={{ fontFamily: "'Amiri', serif" }}>{nameAr}</p>
          <p className="text-xs mt-1" style={{ color }}>{badge}</p>
        </div>
      </div>

      {/* Waveform */}
      {isPlaying && <AnimatedWaveform color={color} bars={24} height={40} />}

      {/* Progress */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-gray-500 font-mono">{fmt(currentTime)}</span>
          <div
            className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              onSeek(((e.clientX - rect.left) / rect.width) * 100);
            }}
          >
            <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: color }} />
          </div>
          <span className="text-xs text-gray-500 font-mono">{fmt(duration)}</span>
        </div>

        <div className="flex items-center justify-center gap-3">
          {!isPlaying && !isLoading ? (
            <button onClick={onPlay}
              className="px-6 py-2.5 rounded-full text-white font-bold text-sm transition-all hover:scale-105 shadow-md"
              style={{ background: color }}>▶ Play</button>
          ) : (
            <button onClick={isPlaying ? onPause : onResume}
              disabled={isLoading}
              className="px-6 py-2.5 rounded-full text-white font-bold text-sm transition-all hover:scale-105 shadow-md disabled:opacity-50"
              style={{ background: color }}>
              {isLoading
                ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Loading</span>
                : isPlaying ? '⏸ Pause' : '▶ Resume'}
            </button>
          )}
          <button onClick={onStop}
            className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full font-bold text-sm transition-all">
            ⏹ Stop
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg flex items-center gap-1">
          <span>⚠️</span> {error}
        </p>
      )}
    </div>
  );
}

// ─── Mic Volume Meter ─────────────────────────────────────────────────────────

function MicVolumeMeter({ volume, duration }: { volume: number; duration: number }) {
  const bars = 20;
  const activeBars = Math.round((volume / 100) * bars);
  const fmt = (s: number) => {
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-900 rounded-2xl p-5 text-center">
      <div className="flex items-center justify-center gap-1 mb-3" style={{ height: 48 }}>
        {Array.from({ length: bars }).map((_, i) => (
          <div
            key={i}
            className="w-2 rounded-full transition-all duration-75"
            style={{
              height: i < activeBars ? `${30 + (i / activeBars) * 70}%` : '15%',
              background: i < activeBars * 0.5
                ? '#22c55e'
                : i < activeBars * 0.8
                ? '#f59e0b'
                : '#ef4444',
            }}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-red-400 font-bold flex items-center gap-1">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse inline-block" />
          REC
        </span>
        <span className="text-green-400 font-mono font-bold text-lg">{fmt(duration)}</span>
        <span className="text-gray-400">{Math.round(volume)}% vol</span>
      </div>
    </div>
  );
}

// ─── Animated Waveform ────────────────────────────────────────────────────────

function AnimatedWaveform({ color, bars = 20, height = 32 }: { color: string; bars?: number; height?: number }) {
  return (
    <div className="flex items-end justify-center gap-0.5" style={{ height }}>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className="rounded-full flex-shrink-0"
          style={{
            width: `${100 / bars}%`,
            maxWidth: 8,
            backgroundColor: color,
            opacity: 0.8,
            animation: `wave ${0.4 + (i % 5) * 0.12}s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.04}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes wave {
          0%   { height: 12%; }
          100% { height: 95%; }
        }
      `}</style>
    </div>
  );
}

// ─── Comparison Tips Card ─────────────────────────────────────────────────────

function ComparisonTipsCard({ reciter }: { reciter: Reciter }) {
  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
      <h5 className="font-bold text-amber-800 text-sm mb-3 flex items-center gap-2">
        <span>🎓</span> Tips for Comparing Your Voice with {reciter.name}
      </h5>
      <ul className="text-xs text-amber-900 space-y-1.5">
        {[
          'Use the "Play Both Simultaneously" button to hear both voices at the same time',
          'Listen for differences in elongation (مد) — the reciter holds certain vowels longer',
          'Notice Ghunna (nasal sounds) — the reciter resonates through the nose on ن and م',
          'Compare word endings — each word should end with the same sound as the reciter',
          'Use 0.75× speed in the reciter player to slow it down and catch each letter',
          'Record again after each listen session — improvement comes with repetition',
        ].map((tip, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-amber-500 font-bold flex-shrink-0">•</span>
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Comparison focus points ──────────────────────────────────────────────────

const COMPARISON_TIPS = [
  { icon: '〰️', title: 'Madd (Elongation)', desc: 'Does your elongation match the reciter? Count the beats — ا و ي held for 2–6 counts.' },
  { icon: '👃', title: 'Ghunna (Nasalization)', desc: 'The nasal hum on ن and م should resonate 2 full counts through your nose.' },
  { icon: '🔤', title: 'Letter Clarity', desc: 'Each Arabic letter has a precise articulation point (مخرج). Are yours matching?' },
  { icon: '🎵', title: 'Shaddah Stress', desc: 'Doubled letters (ّ) should sound heavier and held longer — like saying the letter twice.' },
  { icon: '⏹', title: 'Word Endings', desc: 'The final vowel/letter of each word must match exactly — this changes meaning.' },
  { icon: '💨', title: 'Breath & Rhythm', desc: 'The reciter\'s rhythm and breath pauses guide when to stop and start.' },
];
