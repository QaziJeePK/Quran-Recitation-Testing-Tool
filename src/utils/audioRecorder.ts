// ═══════════════════════════════════════════════════════════════
//  Audio Recorder – MediaRecorder wrapper for voice capture
//  Records user's recitation as a Blob for playback & comparison
// ═══════════════════════════════════════════════════════════════

export interface RecordingResult {
  blob: Blob;
  url: string;
  duration: number; // seconds
  mimeType: string;
}

export type RecorderState = 'idle' | 'requesting' | 'recording' | 'processing' | 'done' | 'error';

export interface RecorderCallbacks {
  onStateChange: (state: RecorderState) => void;
  onVolumeChange: (volume: number) => void; // 0–100
  onDone: (result: RecordingResult) => void;
  onError: (msg: string) => void;
  onDurationUpdate: (seconds: number) => void;
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private analyser: AnalyserNode | null = null;
  private audioCtx: AudioContext | null = null;
  private volumeInterval: ReturnType<typeof setInterval> | null = null;
  private durationInterval: ReturnType<typeof setInterval> | null = null;
  private startTime = 0;
  private callbacks: RecorderCallbacks;
  private mimeType = '';

  constructor(callbacks: RecorderCallbacks) {
    this.callbacks = callbacks;
  }

  static isSupported(): boolean {
    if (typeof navigator === 'undefined') return false;
    if (!navigator.mediaDevices?.getUserMedia) return false;
    return true;
  }

  private getBestMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4',
      '',
    ];
    for (const t of types) {
      if (!t || MediaRecorder.isTypeSupported(t)) return t;
    }
    return '';
  }

  async start(): Promise<void> {
    this.callbacks.onStateChange('requesting');
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
          channelCount: 1,
        },
      });
    } catch (err) {
      const msg = (err as Error).name === 'NotAllowedError'
        ? 'Microphone access denied. Please allow microphone in browser settings.'
        : 'Could not access microphone. Check your device settings.';
      this.callbacks.onError(msg);
      this.callbacks.onStateChange('error');
      return;
    }

    // Set up analyser for volume visualization
    try {
      this.audioCtx = new AudioContext();
      const source = this.audioCtx.createMediaStreamSource(this.stream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);
    } catch {
      // Volume visualization optional
    }

    this.mimeType = this.getBestMimeType();
    this.chunks = [];

    const opts: MediaRecorderOptions = {};
    if (this.mimeType) opts.mimeType = this.mimeType;

    try {
      this.mediaRecorder = new MediaRecorder(this.stream, opts);
    } catch {
      this.mediaRecorder = new MediaRecorder(this.stream);
    }

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };

    this.mediaRecorder.onstop = () => {
      this.callbacks.onStateChange('processing');
      const blob = new Blob(this.chunks, {
        type: this.mimeType || 'audio/webm',
      });
      const url = URL.createObjectURL(blob);
      const duration = (Date.now() - this.startTime) / 1000;
      this.cleanup();
      this.callbacks.onStateChange('done');
      this.callbacks.onDone({ blob, url, duration, mimeType: this.mimeType });
    };

    this.mediaRecorder.start(100); // collect in 100ms chunks
    this.startTime = Date.now();
    this.callbacks.onStateChange('recording');

    // Volume polling
    this.volumeInterval = setInterval(() => {
      if (!this.analyser) {
        this.callbacks.onVolumeChange(0);
        return;
      }
      const data = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      this.callbacks.onVolumeChange(Math.min(100, (avg / 128) * 100));
    }, 50);

    // Duration polling
    this.durationInterval = setInterval(() => {
      this.callbacks.onDurationUpdate((Date.now() - this.startTime) / 1000);
    }, 100);
  }

  stop(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    if (this.volumeInterval) clearInterval(this.volumeInterval);
    if (this.durationInterval) clearInterval(this.durationInterval);
  }

  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    this.analyser = null;
  }

  destroy(): void {
    this.stop();
    this.cleanup();
  }
}

// ─── Utility: draw waveform from audio blob ──────────────────────────────────

export async function drawWaveformFromBlob(
  blob: Blob,
  canvas: HTMLCanvasElement,
  color: string
): Promise<void> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new AudioContext();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  await audioCtx.close();

  const data = audioBuffer.getChannelData(0);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  const step = Math.ceil(data.length / W);
  const mid = H / 2;

  ctx.clearRect(0, 0, W, H);
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;

  for (let x = 0; x < W; x++) {
    let min = 1, max = -1;
    for (let s = 0; s < step; s++) {
      const val = data[x * step + s] || 0;
      if (val < min) min = val;
      if (val > max) max = val;
    }
    ctx.moveTo(x, mid + min * mid * 0.9);
    ctx.lineTo(x, mid + max * mid * 0.9);
  }
  ctx.stroke();
}

// ─── Utility: draw animated live waveform bars ───────────────────────────────

export function createLiveVisualizer(
  canvas: HTMLCanvasElement,
  stream: MediaStream,
  color: string
): () => void {
  const audioCtx = new AudioContext();
  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 128;
  source.connect(analyser);
  const data = new Uint8Array(analyser.frequencyBinCount);
  const ctx = canvas.getContext('2d')!;
  let rafId = 0;

  const draw = () => {
    analyser.getByteFrequencyData(data);
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const barW = W / data.length * 2.5;
    let x = 0;
    data.forEach(val => {
      const h = (val / 255) * H;
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.roundRect(x, H - h, barW - 1, h, 2);
      ctx.fill();
      x += barW + 1;
    });
    rafId = requestAnimationFrame(draw);
  };

  draw();
  return () => {
    cancelAnimationFrame(rafId);
    audioCtx.close().catch(() => {});
  };
}
