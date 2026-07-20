// TTS usage telemetry. Anonymous by construction: a random per-pageload id,
// no cookies, no storage, no user identifiers. Events batch client-side and
// flush over sendBeacon to /api/tel (same origin). Browsers signalling Do Not
// Track or Global Privacy Control are never recorded. Costs are NOT computed
// here: the browser reports characters spoken and the engine used; pricing
// stays server/desk-side so no fabricated dollars ever enter telemetry.

const ENDPOINT = '/api/tel';
const FLUSH_AT = 12;
const FLUSH_MS = 25000;

const enabled = (() => {
  if (typeof window === 'undefined') return false;
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return false;
  if (navigator.globalPrivacyControl) return false;
  const h = window.location.hostname;
  return h === 'algonow.net' || h === 'algohome.net' || h.endsWith('.netlify.app');
})();

const sid = enabled && window.crypto?.randomUUID ? window.crypto.randomUUID() : 'anon';

let queue = [];
let slugFor = '';
let timer = 0;

function flush() {
  if (!queue.length) return;
  const body = JSON.stringify({ v: 1, sid, slug: slugFor, events: queue });
  queue = [];
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'text/plain' }));
    } else {
      fetch(ENDPOINT, { method: 'POST', body, keepalive: true }).catch(() => {});
    }
  } catch {
    // Telemetry must never surface to the user.
  }
}

export function initTelemetry(slug) {
  slugFor = slug;
  if (!enabled) return;
  addEventListener('pagehide', flush);
  addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}

export function flushNow() {
  flush();
}

// e: 'play' | 'progress' | 'complete' | 'stop'. chars is the number of
// narration characters newly spoken since the previous event (a delta, so
// the server can sum without double counting).
export function record(e, { chars = 0, voice = '', rate = 1 } = {}) {
  if (!enabled) return;
  queue.push({ e, chars: Math.round(chars), voice: String(voice).slice(0, 80), rate, t: Date.now() });
  if (queue.length >= FLUSH_AT) flush();
  if (!timer) {
    timer = setTimeout(() => {
      timer = 0;
      flush();
    }, FLUSH_MS);
  }
}
