// Web Speech API engine. Runs entirely in the browser at zero cost: no audio
// service, no network, no keys. The narration is chunked into short
// sentence-sized utterances because desktop Chrome stalls on long ones; a
// watchdog advances past any chunk whose end event never fires.

const MAX_CHUNK = 220;
const SETTINGS_KEY = 'algonow-tts';

export function ttsAvailable() {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance !== 'undefined'
  );
}

function splitSentences(text) {
  const rough = text.match(/[^.!?]+[.!?]+["')\]]?\s*|[^.!?]+$/g) || [text];
  const chunks = [];
  let cur = '';
  for (const s of rough) {
    if ((cur + s).length <= MAX_CHUNK) {
      cur += s;
      continue;
    }
    if (cur) chunks.push(cur.trim());
    if (s.length <= MAX_CHUNK) {
      cur = s;
    } else {
      // A single very long sentence: split on commas, then hard-wrap.
      let piece = '';
      for (const part of s.split(/(?<=,)\s+/)) {
        if ((piece + part).length > MAX_CHUNK) {
          if (piece) chunks.push(piece.trim());
          piece = '';
        }
        while (part.length > MAX_CHUNK) {
          chunks.push(part.slice(0, MAX_CHUNK));
          // eslint-disable-next-line no-param-reassign
          part = part.slice(MAX_CHUNK);
        }
        piece += `${part} `;
      }
      cur = piece;
    }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

export function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
  } catch {
    return {};
  }
}

export function saveSettings(s) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // Storage may be unavailable; settings just do not persist.
  }
}

// Voices arrive asynchronously in Chrome. Calls cb at least once.
export function loadVoices(cb) {
  if (!ttsAvailable()) return cb([]);
  const synth = window.speechSynthesis;
  const pick = () => {
    const all = synth.getVoices().filter((v) => v.lang && v.lang.toLowerCase().startsWith('en'));
    // Natural / neural voices first, then Google, then the rest.
    const score = (v) =>
      (/natural|neural/i.test(v.name) ? 0 : /google/i.test(v.name) ? 1 : 2) +
      (v.lang.toLowerCase() === 'en-us' ? 0 : 0.5);
    cb(all.sort((a, b) => score(a) - score(b)).slice(0, 14));
  };
  pick();
  synth.onvoiceschanged = pick;
  return undefined;
}

// paragraphs: [{ section, text }]. Callbacks: onParagraph(index), onProgress
// (charsSpoken, totalChars, delta), onState('playing'|'paused'|'idle'),
// onFinish(completed).
export function createNarrator(paragraphs, callbacks) {
  const chunks = [];
  paragraphs.forEach((p, pi) => {
    for (const c of splitSentences(p.text)) chunks.push({ pi, text: c });
  });
  const totalChars = chunks.reduce((n, c) => n + c.text.length, 0);

  let at = 0;
  let spoken = 0;
  let sinceEvent = 0;
  let playing = false;
  let watchdog = 0;
  let voice = null;
  let rate = 1;

  const synth = ttsAvailable() ? window.speechSynthesis : null;

  function clearWatchdog() {
    if (watchdog) clearTimeout(watchdog);
    watchdog = 0;
  }

  function speakNext() {
    if (!playing) return;
    if (at >= chunks.length) {
      playing = false;
      clearWatchdog();
      callbacks.onProgress?.(spoken, totalChars, sinceEvent);
      sinceEvent = 0;
      callbacks.onState?.('idle');
      callbacks.onFinish?.(true);
      return;
    }
    const chunk = chunks[at];
    callbacks.onParagraph?.(chunk.pi);
    const u = new SpeechSynthesisUtterance(chunk.text);
    if (voice) u.voice = voice;
    u.rate = rate;
    const advance = () => {
      if (!playing) return;
      clearWatchdog();
      spoken += chunk.text.length;
      sinceEvent += chunk.text.length;
      at += 1;
      const paragraphDone = at >= chunks.length || chunks[at].pi !== chunk.pi;
      if (paragraphDone || sinceEvent > 1200) {
        callbacks.onProgress?.(spoken, totalChars, sinceEvent);
        sinceEvent = 0;
      }
      speakNext();
    };
    u.onend = advance;
    u.onerror = advance;
    clearWatchdog();
    // Watchdog: expected duration at ~12 chars/sec plus slack. If the engine
    // goes silent without an end event (a known Chrome failure), move on.
    watchdog = setTimeout(advance, (chunk.text.length / (10 * rate)) * 1000 + 6000);
    synth.speak(u);
  }

  return {
    totalChars,
    chunkForParagraph(pi) {
      const i = chunks.findIndex((c) => c.pi === pi);
      return i === -1 ? 0 : i;
    },
    charsSpoken: () => spoken,
    fractionDone: () => (totalChars ? spoken / totalChars : 0),
    isPlaying: () => playing,
    setVoice(v) {
      voice = v;
    },
    setRate(r) {
      rate = r;
    },
    playFrom(chunkIndex) {
      if (!synth) return;
      synth.cancel();
      at = Math.max(0, Math.min(chunkIndex, chunks.length - 1));
      spoken = chunks.slice(0, at).reduce((n, c) => n + c.text.length, 0);
      sinceEvent = 0;
      playing = true;
      callbacks.onState?.('playing');
      speakNext();
    },
    // Pause is implemented as cancel + remembered position: synth.pause() is
    // unreliable on Android and after tab switches, cancel/restart is not.
    pause() {
      if (!synth || !playing) return;
      playing = false;
      clearWatchdog();
      synth.cancel();
      callbacks.onProgress?.(spoken, totalChars, sinceEvent);
      sinceEvent = 0;
      callbacks.onState?.('paused');
    },
    resume() {
      if (!synth || playing) return;
      playing = true;
      callbacks.onState?.('playing');
      speakNext();
    },
    stop(silent) {
      if (!synth) return;
      playing = false;
      clearWatchdog();
      synth.cancel();
      if (!silent) {
        callbacks.onProgress?.(spoken, totalChars, sinceEvent);
        sinceEvent = 0;
        callbacks.onState?.('idle');
        callbacks.onFinish?.(false);
      }
    },
  };
}
