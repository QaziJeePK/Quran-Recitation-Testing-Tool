// ═══════════════════════════════════════════════════════
//  useSpeechRecognition — Bulletproof Arabic SR hook
//  Fixed: white screen, Infinity:NaN volume, auto-restart
// ═══════════════════════════════════════════════════════
import { useRef, useState, useCallback, useEffect } from 'react';

export type MicPermission = 'unknown' | 'granted' | 'denied' | 'prompt';

export interface SpeechState {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  isSupported: boolean;
  permission: MicPermission;
  duration: number;
  volume: number; // 0-100
}

export interface SpeechControls {
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
}

// Detect SR support ONCE at module load — never throws
function detectSR(): boolean {
  try {
    return typeof window !== 'undefined' &&
      !!(
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition
      );
  } catch {
    return false;
  }
}

const SR_SUPPORTED = detectSR();

function getSRClass(): any {
  try {
    return (window as any).SpeechRecognition ||
           (window as any).webkitSpeechRecognition ||
           null;
  } catch {
    return null;
  }
}

export function useSpeechRecognition(): [SpeechState, SpeechControls] {
  const [isListening, setIsListening]             = useState(false);
  const [transcript, setTranscript]               = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError]                         = useState<string | null>(null);
  const [permission, setPermission]               = useState<MicPermission>('unknown');
  const [duration, setDuration]                   = useState(0);
  const [volume, setVolume]                       = useState(0);

  // Refs — never cause re-renders
  const activeRef     = useRef(false);
  const finalTextRef  = useRef('');
  const recRef        = useRef<any>(null);
  const restartTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const durationTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef  = useRef(0);
  const retryCount    = useRef(0);
  const mounted       = useRef(true);

  // Audio/volume refs
  const audioCtxRef   = useRef<AudioContext | null>(null);
  const analyserRef   = useRef<AnalyserNode | null>(null);
  const streamRef     = useRef<MediaStream | null>(null);
  const rafRef        = useRef<number | null>(null);
  const bufRef        = useRef<Uint8Array | null>(null);

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  useEffect(() => {
    mounted.current = true;

    // Check mic permission WITHOUT crashing
    try {
      if (navigator.permissions) {
        navigator.permissions
          .query({ name: 'microphone' as PermissionName })
          .then(s => {
            if (!mounted.current) return;
            setPermission(s.state as MicPermission);
            s.onchange = () => {
              if (mounted.current) setPermission(s.state as MicPermission);
            };
          })
          .catch(() => { /* permissions API not available — ignore */ });
      }
    } catch { /* ignore any permission API errors */ }

    return () => {
      mounted.current = false;
      _hardStop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Volume meter (AudioContext + AnalyserNode) ────────────────────────────
  function _startVolume(stream: MediaStream) {
    try {
      // Clean up any previous context
      _stopVolume();

      const ctx      = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize              = 256;
      analyser.smoothingTimeConstant = 0.7;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      bufRef.current      = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        if (!mounted.current || !activeRef.current || !analyserRef.current || !bufRef.current) {
          if (mounted.current) setVolume(0);
          return;
        }
        analyserRef.current.getByteFrequencyData(bufRef.current as Uint8Array<ArrayBuffer>);

        // RMS calculation → 0-100
        let sum = 0;
        const len = bufRef.current.length;
        for (let i = 0; i < len; i++) {
          sum += bufRef.current[i] * bufRef.current[i];
        }
        const rms = Math.sqrt(sum / len);          // 0 – 128
        const vol = Math.min(100, Math.round((rms / 60) * 100));
        setVolume(vol);

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    } catch {
      // AudioContext not available — volume stays 0, app still works
    }
  }

  function _stopVolume() {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch { /* ignore */ }
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => { try { t.stop(); } catch { /* ignore */ } });
      streamRef.current = null;
    }
    analyserRef.current = null;
    bufRef.current      = null;
    if (mounted.current) setVolume(0);
  }

  // ── SR session management ─────────────────────────────────────────────────
  function _killRec() {
    if (restartTimer.current) {
      clearTimeout(restartTimer.current);
      restartTimer.current = null;
    }
    const r: any = recRef.current;
    if (r) {
      r.onstart  = null;
      r.onresult = null;
      r.onerror  = null;
      r.onend    = null;
      try { r.abort(); } catch { /* ignore */ }
      recRef.current = null;
    }
  }

  function _hardStop() {
    activeRef.current = false;
    _killRec();
    _stopVolume();
    if (durationTimer.current) {
      clearInterval(durationTimer.current);
      durationTimer.current = null;
    }
  }

  function _scheduleRestart(ms = 150) {
    if (restartTimer.current) clearTimeout(restartTimer.current);
    restartTimer.current = setTimeout(() => {
      restartTimer.current = null;
      if (activeRef.current && mounted.current) _newSession();
    }, ms);
  }

  function _newSession() {
    const SRClass = getSRClass();
    if (!SRClass || !activeRef.current || !mounted.current) return;
    _killRec();

    let rec: any;
    try {
      rec = new SRClass();
    } catch {
      if (mounted.current) setError('Could not start speech recognition. Please refresh and try again.');
      return;
    }

    rec.continuous      = false;   // More reliable than true
    rec.interimResults  = true;
    rec.lang            = 'ar-SA';
    rec.maxAlternatives = 5;
    recRef.current      = rec;

    rec.onstart = () => {
      if (!mounted.current) return;
      retryCount.current = 0;
      if (mounted.current) {
        setIsListening(true);
        setError(null);
      }
    };

    rec.onresult = (e: any) => {
      if (!mounted.current) return;
      let addedFinal = '';
      let interim    = '';

      try {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const result = e.results[i];
          if (result.isFinal) {
            // Pick highest-confidence alternative
            let best = result[0].transcript as string;
            let bestConf = Number(result[0].confidence) || 0;
            for (let k = 1; k < result.length; k++) {
              const c = Number(result[k].confidence) || 0;
              if (c > bestConf) {
                bestConf = c;
                best = result[k].transcript as string;
              }
            }
            addedFinal += ' ' + best.trim();
          } else {
            interim += result[0].transcript;
          }
        }
      } catch { /* ignore malformed event */ }

      if (addedFinal.trim()) {
        finalTextRef.current = (finalTextRef.current + ' ' + addedFinal.trim()).trim();
        setTranscript(finalTextRef.current);
      }
      setInterimTranscript(interim.trim());
    };

    rec.onerror = (e: any) => {
      if (!mounted.current) return;
      const code: string = e?.error || '';

      if (code === 'no-speech' || code === 'aborted') {
        // Benign — restart silently
        if (activeRef.current) _scheduleRestart(300);
        return;
      }
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        activeRef.current = false;
        setPermission('denied');
        setIsListening(false);
        setError('Microphone blocked. Click the lock icon in your browser address bar → set Microphone to Allow → refresh the page.');
        _hardStop();
        return;
      }
      if (code === 'audio-capture') {
        activeRef.current = false;
        setIsListening(false);
        setError('No microphone detected. Please plug in a microphone and try again.');
        _hardStop();
        return;
      }
      if (code === 'network') {
        if (retryCount.current < 5 && activeRef.current) {
          retryCount.current++;
          _scheduleRestart(2000);
        } else {
          setError('Network error. Check your internet connection.');
          _hardStop();
          setIsListening(false);
        }
        return;
      }
      // Unknown error — retry up to 3×
      if (retryCount.current < 3 && activeRef.current) {
        retryCount.current++;
        _scheduleRestart(800);
      }
    };

    rec.onend = () => {
      if (!mounted.current) return;
      setInterimTranscript('');
      if (activeRef.current) {
        // Auto-restart while still supposed to be listening
        _scheduleRestart(120);
      } else {
        setIsListening(false);
      }
    };

    try {
      rec.start();
    } catch {
      if (activeRef.current) _scheduleRestart(700);
    }
  }

  // ── Public: start ─────────────────────────────────────────────────────────
  const start = useCallback(async () => {
    if (!SR_SUPPORTED) {
      setError('Speech recognition requires Google Chrome or Microsoft Edge. Please switch browsers.');
      return;
    }
    if (activeRef.current) return; // already running

    // Clear previous state
    setError(null);
    setTranscript('');
    setInterimTranscript('');
    setDuration(0);
    setVolume(0);
    finalTextRef.current = '';
    retryCount.current   = 0;

    // Request mic FIRST — this also grants SR permission
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation:  true,
          noiseSuppression:  true,
          autoGainControl:   true,
          channelCount:      1,
        },
        video: false,
      });
      streamRef.current = stream;
      setPermission('granted');
    } catch (err: any) {
      const name: string = err?.name || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setPermission('denied');
        setError('Microphone access denied. Click the 🔒 lock icon in the address bar → set Microphone to Allow → refresh.');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setError('No microphone found. Please connect a microphone and try again.');
      } else {
        setError(`Could not access microphone: ${name || 'Unknown error'}. Check browser settings.`);
      }
      return;
    }

    // Mark as active and start volume meter
    activeRef.current = true;
    setIsListening(true);
    _startVolume(stream);

    // Duration counter
    startTimeRef.current = Date.now();
    if (durationTimer.current) clearInterval(durationTimer.current);
    durationTimer.current = setInterval(() => {
      if (mounted.current && activeRef.current) {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 500);

    // Start speech recognition
    _newSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Public: stop ──────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    activeRef.current = false;
    _killRec();
    _stopVolume();
    if (durationTimer.current) {
      clearInterval(durationTimer.current);
      durationTimer.current = null;
    }
    setIsListening(false);
    setInterimTranscript('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Public: reset ─────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    _hardStop();
    finalTextRef.current = '';
    setTranscript('');
    setInterimTranscript('');
    setIsListening(false);
    setError(null);
    setDuration(0);
    setVolume(0);
    retryCount.current = 0;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [
    {
      isListening,
      transcript,
      interimTranscript,
      error,
      isSupported: SR_SUPPORTED,
      permission,
      duration,
      volume,
    },
    { start, stop, reset },
  ];
}
