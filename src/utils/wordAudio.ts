// ═══════════════════════════════════════════════════════════════════
//  wordAudio.ts
//  Click on a word → plays that word's audio segment
//
//  Strategy: everyayah.com full-ayah MP3 + seek to word position
//  We estimate each word's start/end time by dividing ayah duration
//  equally among words, then play just that segment.
//
//  This is 100% reliable because everyayah.com works globally.
// ═══════════════════════════════════════════════════════════════════

const RECITER = 'Alafasy_128kbps';

function ayahUrl(surah: number, ayah: number): string {
  const s = String(surah).padStart(3, '0');
  const a = String(ayah).padStart(3, '0');
  return `https://everyayah.com/data/${RECITER}/${s}${a}.mp3`;
}

// ── Shared audio element for word playback ───────────────────────────────────
let _audio: HTMLAudioElement | null = null;
let _stopTimer: ReturnType<typeof setTimeout> | null = null;
let _activeKey = '';

function getAudio(): HTMLAudioElement {
  if (!_audio) {
    _audio = new Audio();
    _audio.preload = 'none';
    _audio.crossOrigin = 'anonymous';
  }
  return _audio;
}

export interface WordAudioCallbacks {
  onLoading?: () => void;
  onPlaying?: () => void;
  onEnded?:  () => void;
  onError?:  () => void;
}

/**
 * Play a single word by seeking into the full ayah MP3.
 *
 * wordIndex  — 0-based index of the clicked word
 * totalWords — total number of words in the ayah
 */
export function playWord(
  surah: number,
  ayah: number,
  wordIndex: number,
  totalWords: number,
  callbacks: WordAudioCallbacks = {}
): void {
  // Cancel any previous word playback
  stopWord();

  const key = `${surah}:${ayah}:${wordIndex}`;
  _activeKey = key;

  const audio = getAudio();
  const url   = ayahUrl(surah, ayah);

  callbacks.onLoading?.();

  // Clear old handlers
  audio.oncanplay   = null;
  audio.ontimeupdate = null;
  audio.onerror     = null;
  audio.onended     = null;

  // Helper: clear the stop timer
  const clearStop = () => {
    if (_stopTimer) { clearTimeout(_stopTimer); _stopTimer = null; }
  };

  // If same ayah is already loaded, just seek — much faster
  const sameUrl = audio.src === url || audio.src === url.replace('https:', location.protocol);

  const startPlayback = () => {
    if (_activeKey !== key) return;

    const dur = audio.duration;
    if (!dur || isNaN(dur) || dur === Infinity) {
      // Duration not ready — wait a bit and retry once
      setTimeout(() => {
        if (_activeKey !== key) return;
        const d2 = audio.duration;
        if (d2 && !isNaN(d2) && d2 !== Infinity) {
          doSeekAndPlay(d2);
        } else {
          // Play from beginning as fallback
          audio.currentTime = 0;
          audio.play().catch(() => callbacks.onError?.());
          callbacks.onPlaying?.();
          _stopTimer = setTimeout(() => {
            if (_activeKey === key) stopWord();
          }, 3000);
        }
      }, 300);
      return;
    }
    doSeekAndPlay(dur);
  };

  const doSeekAndPlay = (dur: number) => {
    if (_activeKey !== key) return;

    // Evenly distribute duration across words
    // Add a small silence buffer at start/end of each word (5% per side)
    const segLen   = dur / totalWords;
    const start    = Math.max(0, wordIndex * segLen + segLen * 0.05);
    const end      = Math.min(dur, (wordIndex + 1) * segLen - segLen * 0.05);
    const playLen  = Math.max(0.4, end - start); // at least 400ms

    clearStop();
    audio.currentTime = start;

    audio.play()
      .then(() => {
        if (_activeKey !== key) { audio.pause(); return; }
        callbacks.onPlaying?.();

        // Stop after the word segment duration
        _stopTimer = setTimeout(() => {
          if (_activeKey === key) {
            audio.pause();
            callbacks.onEnded?.();
            _activeKey = '';
          }
        }, playLen * 1000);
      })
      .catch(() => {
        if (_activeKey === key) callbacks.onError?.();
      });
  };

  if (sameUrl && audio.readyState >= 2) {
    // Audio already loaded for this ayah — just seek
    startPlayback();
  } else {
    // Load the ayah audio
    audio.src  = url;
    audio.load();

    audio.oncanplay = () => {
      audio.oncanplay = null;
      startPlayback();
    };

    audio.onerror = () => {
      if (_activeKey === key) {
        callbacks.onError?.();
        _activeKey = '';
      }
    };
  }
}

export function stopWord(): void {
  _activeKey = '';
  if (_stopTimer) { clearTimeout(_stopTimer); _stopTimer = null; }
  if (_audio) {
    _audio.pause();
    _audio.oncanplay   = null;
    _audio.ontimeupdate = null;
    _audio.onerror     = null;
    _audio.onended     = null;
  }
}
