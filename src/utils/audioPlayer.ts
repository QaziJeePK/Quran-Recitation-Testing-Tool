// ═══════════════════════════════════════════════════════
//  audioPlayer.ts — Singleton audio player for word,
//  ayah, and full surah playback from everyayah.com
// ═══════════════════════════════════════════════════════

export type AudioPlayState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

export interface AudioPlayerCallbacks {
  onStateChange?: (state: AudioPlayState) => void;
  onProgress?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onError?: (msg: string) => void;
}

// Default reciter folder for word/ayah preview
export const DEFAULT_RECITER_FOLDER = 'Alafasy_128kbps';

// Build URL for a single ayah
export function buildAyahUrl(
  surahNumber: number,
  ayahNumber: number,
  reciterFolder = DEFAULT_RECITER_FOLDER
): string {
  const s = String(surahNumber).padStart(3, '0');
  const a = String(ayahNumber).padStart(3, '0');
  return `https://everyayah.com/data/${reciterFolder}/${s}${a}.mp3`;
}

// ─── Singleton Audio Player ──────────────────────────────────────────────────

class SingletonAudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private rafId: number = 0;
  private callbacks: AudioPlayerCallbacks = {};
  private currentUrl = '';

  setCallbacks(cb: AudioPlayerCallbacks) {
    this.callbacks = cb;
  }

  getState(): AudioPlayState {
    if (!this.audio) return 'idle';
    if (this.audio.paused && this.audio.readyState === 0) return 'loading';
    if (this.audio.paused) return 'paused';
    return 'playing';
  }

  getCurrentUrl() { return this.currentUrl; }

  play(url: string, callbacks?: AudioPlayerCallbacks): void {
    if (callbacks) this.callbacks = callbacks;

    // If same URL is paused → resume
    if (this.currentUrl === url && this.audio && this.audio.paused && this.audio.readyState >= 2) {
      this.audio.play().then(() => {
        this.callbacks.onStateChange?.('playing');
        this._startProgress();
      }).catch(() => {
        this.callbacks.onStateChange?.('error');
        this.callbacks.onError?.('Playback failed.');
      });
      return;
    }

    // Stop previous
    this._stop(false);

    this.currentUrl = url;
    this.callbacks.onStateChange?.('loading');

    const audio = new Audio(url);
    this.audio = audio;

    audio.addEventListener('canplay', () => {
      audio.play().then(() => {
        this.callbacks.onStateChange?.('playing');
        this._startProgress();
      }).catch(() => {
        this.callbacks.onStateChange?.('error');
        this.callbacks.onError?.('Autoplay blocked. Tap play again.');
      });
    }, { once: true });

    audio.addEventListener('ended', () => {
      this._stopProgress();
      this.callbacks.onStateChange?.('idle');
      this.callbacks.onEnded?.();
    }, { once: true });

    audio.addEventListener('error', () => {
      this._stopProgress();
      this.callbacks.onStateChange?.('error');
      this.callbacks.onError?.('Audio not available for this selection.');
    }, { once: true });

    audio.load();
  }

  pause(): void {
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
      this._stopProgress();
      this.callbacks.onStateChange?.('paused');
    }
  }

  resume(): void {
    if (this.audio && this.audio.paused) {
      this.audio.play().then(() => {
        this.callbacks.onStateChange?.('playing');
        this._startProgress();
      }).catch(() => {});
    }
  }

  stop(): void {
    this._stop(true);
  }

  private _stop(notify: boolean): void {
    this._stopProgress();
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }
    this.currentUrl = '';
    if (notify) this.callbacks.onStateChange?.('idle');
  }

  private _startProgress(): void {
    this._stopProgress();
    const tick = () => {
      if (this.audio) {
        this.callbacks.onProgress?.(
          this.audio.currentTime,
          this.audio.duration || 0
        );
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private _stopProgress(): void {
    cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }
}

// Export singleton instance
export const audioPlayer = new SingletonAudioPlayer();

// ─── Surah Player — plays all ayahs sequentially ────────────────────────────

export interface SurahPlayerOptions {
  surahNumber: number;
  totalAyahs: number;
  startAyah?: number;
  reciterFolder?: string;
  onAyahChange?: (ayahNumber: number) => void;
  onStateChange?: (state: AudioPlayState) => void;
  onProgress?: (current: number, duration: number) => void;
  onComplete?: () => void;
  onError?: (msg: string) => void;
}

export class SurahPlayer {
  private audio: HTMLAudioElement | null = null;
  private rafId: number = 0;
  private opts: SurahPlayerOptions;
  private currentAyah: number = 1;
  private active = false;

  constructor(opts: SurahPlayerOptions) {
    this.opts = opts;
    this.currentAyah = opts.startAyah || 1;
  }

  getCurrentAyah() { return this.currentAyah; }
  isActive() { return this.active; }

  start(): void {
    this.active = true;
    this._playAyah(this.currentAyah);
  }

  pause(): void {
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
      cancelAnimationFrame(this.rafId);
      this.opts.onStateChange?.('paused');
    }
  }

  resume(): void {
    if (this.audio && this.audio.paused) {
      this.audio.play().then(() => {
        this.opts.onStateChange?.('playing');
        this._startProgress();
      }).catch(() => {});
    }
  }

  stop(): void {
    this.active = false;
    cancelAnimationFrame(this.rafId);
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }
    this.opts.onStateChange?.('idle');
  }

  seekToAyah(ayahNumber: number): void {
    this.currentAyah = ayahNumber;
    if (this.active) {
      if (this.audio) {
        this.audio.pause();
        this.audio.src = '';
        this.audio = null;
      }
      cancelAnimationFrame(this.rafId);
      this._playAyah(ayahNumber);
    }
  }

  private _playAyah(ayahNumber: number): void {
    if (!this.active) return;
    if (ayahNumber > this.opts.totalAyahs) {
      this.active = false;
      this.opts.onStateChange?.('idle');
      this.opts.onComplete?.();
      return;
    }

    this.currentAyah = ayahNumber;
    this.opts.onAyahChange?.(ayahNumber);
    this.opts.onStateChange?.('loading');

    const folder = this.opts.reciterFolder || DEFAULT_RECITER_FOLDER;
    const url = buildAyahUrl(this.opts.surahNumber, ayahNumber, folder);

    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
    }

    const audio = new Audio(url);
    this.audio = audio;

    audio.addEventListener('canplay', () => {
      if (!this.active) return;
      audio.play().then(() => {
        this.opts.onStateChange?.('playing');
        this._startProgress();
      }).catch(() => {
        this.opts.onError?.('Playback failed.');
      });
    }, { once: true });

    audio.addEventListener('ended', () => {
      cancelAnimationFrame(this.rafId);
      if (this.active) {
        // small pause between ayahs
        setTimeout(() => this._playAyah(ayahNumber + 1), 600);
      }
    }, { once: true });

    audio.addEventListener('error', () => {
      cancelAnimationFrame(this.rafId);
      this.opts.onError?.(`Could not load ayah ${ayahNumber}.`);
      // Skip to next ayah after 1s
      if (this.active) {
        setTimeout(() => this._playAyah(ayahNumber + 1), 1000);
      }
    }, { once: true });

    audio.load();
  }

  private _startProgress(): void {
    cancelAnimationFrame(this.rafId);
    const tick = () => {
      if (this.audio) {
        this.opts.onProgress?.(this.audio.currentTime, this.audio.duration || 0);
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }
}
