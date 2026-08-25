// Motion preference. Every canvas figure on the site runs through
// useCanvasLoop, and this module decides two things for all of them at once:
// how long a single step lasts, and how long a finished run rests before it
// repeats.
//
// The default is deliberately the calmest animated setting rather than the
// briskest one. A reader sensitive to motion should not have to find a control
// before the site is comfortable to sit with, and an operating-system request
// for reduced motion takes it the rest of the way to fully still.

const STORAGE_KEY = 'algonow:motion';

// stepScale multiplies the duration of each tick, so a larger number is
// slower. restScale multiplies the pause a figure holds after it finishes,
// on top of the slowdown the steps already contribute. stepScale 0 means the
// figure never animates: it paints its finished state once.
export const MOTION_LEVELS = [
  {
    key: 'still',
    label: 'still',
    hint: 'No animation at all. Every figure paints its finished state once and holds it.',
    stepScale: 0,
    restScale: 0,
  },
  {
    key: 'very-slow',
    label: 'very slow',
    hint: 'The default. About a quarter speed, with a long rest before anything repeats.',
    stepScale: 4,
    restScale: 3,
  },
  {
    key: 'slow',
    label: 'slow',
    hint: 'About half speed, with a doubled rest before anything repeats.',
    stepScale: 2.2,
    restScale: 2,
  },
  {
    key: 'standard',
    label: 'standard',
    hint: 'Full speed, with a short rest. The briskest setting, and the loudest.',
    stepScale: 1,
    restScale: 1,
  },
];

export const DEFAULT_LEVEL = 'very-slow';

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

// Scales a figure's rest, which each viz measures in ticks, by the current
// preference. Vizzes call this instead of writing a bare number.
export function holdTicks(base) {
  return Math.round(base * getLevel().restScale);
}
