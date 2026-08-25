// Motion preference. Every canvas figure on the site runs through
// useCanvasLoop, and this module decides two things for all of them at once:
// how fast a step goes, and how long a finished figure rests before it runs
// again.
//
// The rest is the part that matters most. A figure that rebuilds itself two
// seconds after finishing is nauseating to sit near, independently of how fast
// the drawing itself is, so the default holds the finished picture for two
// full minutes at normal drawing speed. Slowing the drawing is offered as a
// separate choice for readers who want that too, and still turns everything
// off for readers who want no motion at all.

const STORAGE_KEY = 'algonow:motion';

// stepScale multiplies the duration of each tick, so a larger number draws
// more slowly. restSeconds is wall-clock: the figure holds its finished state
// for that long before starting over, whatever its drawing speed. stepScale 0
// means the figure never animates and never repeats.
export const MOTION_LEVELS = [
  {
    key: 'still',
    label: 'still',
    hint: 'No animation at all. Every figure paints its finished state once and holds it.',
    stepScale: 0,
    restSeconds: 0,
  },
  {
    key: 'calm',
    label: 'calm',
    hint: 'The default. Normal drawing speed, then a two minute pause before anything repeats.',
    stepScale: 1,
    restSeconds: 120,
  },
  {
    key: 'slow',
    label: 'slow',
    hint: 'Half speed drawing, with the same two minute pause before anything repeats.',
    stepScale: 2.5,
    restSeconds: 120,
  },
  {
    key: 'standard',
    label: 'standard',
    hint: 'Full speed and a three second pause. The original pacing, and the busiest.',
    stepScale: 1,
    restSeconds: 3,
  },
];

export const DEFAULT_LEVEL = 'calm';

const byKey = (key) => MOTION_LEVELS.find((l) => l.key === key) || null;

export function systemPrefersReduced() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

let current = null;

function readStored() {
  if (typeof window === 'undefined') return null;
  try {
    return byKey(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    // Private browsing and blocked storage both land here. Not fatal.
    return null;
  }
}

// An explicit choice always wins. Without one, an operating-system request for
// reduced motion means still, and everybody else gets the calm default.
export function getLevel() {
  if (current) return current;
  current =
    readStored() ||
    byKey(systemPrefersReduced() ? 'still' : DEFAULT_LEVEL) ||
    byKey(DEFAULT_LEVEL);
  return current;
}

export function getLevelKey() {
  return getLevel().key;
}

const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function setLevel(key) {
  const next = byKey(key);
  if (!next) return;
  current = next;
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, next.key);
  } catch {
    // A reader who cannot persist still gets the setting for this page view.
  }
  applyAttr();
  listeners.forEach((fn) => fn(next));
}

// Mirrors the level onto <html data-motion> so CSS can quiet decorative
// animation without every component having to subscribe.
export function applyAttr() {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-motion', getLevel().key);
}

export function isStill() {
  return getLevel().stepScale === 0;
}

// How many ticks a figure should rest before repeating. Vizzes count their
// rest in ticks, but the promise to the reader is in seconds, so this converts
// using the pace useCanvasLoop stamped onto the state at init. Every figure
// therefore waits the same real time regardless of how fast it draws.
export const PACE_KEY = '__paceMs';

export function holdTicks(state) {
  const { restSeconds } = getLevel();
  if (!restSeconds) return 0;
  const pace = (state && state[PACE_KEY]) || 40;
  return Math.max(1, Math.ceil((restSeconds * 1000) / pace));
}
