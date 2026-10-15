import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

let nonce = 0;
async function mountLoop({ still = false, maxTicks = 20_000, finishAt = Infinity } = {}) {
  const effects = [];
  const restores = [];
  const install = (key, value) => {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
    restores.push(() => previous ? Object.defineProperty(globalThis, key, previous) : delete globalThis[key]);
  };
  const intervals = new Map();
  const frames = new Map();
  const queries = [];
  const observers = { resize: [], intersection: [] };
  let serial = 0;
  let ticks = 0;
  let draws = 0;
  const window = {
    devicePixelRatio: 1,
    localStorage: { getItem: () => null, setItem() {} },
    matchMedia(query) {
      const listeners = new Set();
      const result = {
        media: query, matches: false, listeners,
        addEventListener: (_, fn) => listeners.add(fn),
        removeEventListener: (_, fn) => listeners.delete(fn),
        change() { for (const fn of [...listeners]) fn(); },
      };
      queries.push(result);
      return result;
    },
  };
  install('window', window);
  install('document', { hidden: false, documentElement: { setAttribute() {} } });
  install('__canvasHookEffects', effects);
  install('setInterval', (fn) => { const id = ++serial; intervals.set(id, fn); return id; });
  install('clearInterval', (id) => intervals.delete(id));
  install('requestAnimationFrame', (fn) => { const id = ++serial; frames.set(id, fn); return id; });
  install('cancelAnimationFrame', (id) => frames.delete(id));
  for (const [key, group] of [['ResizeObserver', 'resize'], ['IntersectionObserver', 'intersection']]) {
    install(key, class {
      constructor(fn) { this.fn = fn; this.connected = false; observers[group].push(this); }
      observe() { this.connected = true; }
      disconnect() { this.connected = false; }
    });
  }
  const bundle = await build({
    stdin: {
      contents: "export { useCanvasLoop } from './src/viz/useCanvasLoop.js'; export { setLevel } from './src/lib/motion.js';",
      resolveDir: process.cwd(),
    },
    bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent',
    plugins: [{ name: 'hook-test', setup(builder) {
      builder.onResolve({ filter: /^react$/ }, () => ({ path: 'react', namespace: 'test' }));
      builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: `
        export const useRef = (value) => ({ current: value });
        export const useState = (value) => [value, () => {}];
        export const useEffect = (fn) => globalThis.__canvasHookEffects.push(fn);
      ` }));
    } }],
  });
  const mod = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text + `\n// ${nonce++}`).toString('base64')}`);
  mod.setLevel(still ? 'still' : 'calm');
  const context = { setTransform(...values) { this.transform = values; } };
  const canvas = { width: 300, height: 150, getContext: () => context };
  const state = mod.useCanvasLoop({ current: canvas }, {
    width: 640, height: 400, maxTicks,
    init: () => ({}),
    tick: () => { ticks += 1; return ticks < finishAt; },
    draw: () => { draws += 1; },
  });
  const cleanups = effects.map((effect) => effect());
  return {
    canvas, context, window, queries, observers, intervals, frames, state,
    get ticks() { return ticks; }, get draws() { return draws; },
    resize(width) { for (const observer of observers.resize) if (observer.connected) observer.fn([{ contentRect: { width } }]); },
    visible(value) { for (const observer of observers.intersection) if (observer.connected) observer.fn([{ isIntersecting: value }]); },
    step() { for (const fn of [...intervals.values()]) fn(); },
    paint() { const pending = [...frames.values()]; frames.clear(); pending.forEach((fn) => fn()); },
    close() { cleanups.reverse().forEach((fn) => fn?.()); restores.reverse().forEach((fn) => fn()); },
  };
}

test('canvas backing pixels track CSS width and density changes without a layout resize', async () => {
  const h = await mountLoop();
  try {
    h.resize(333.3);
    assert.equal(h.canvas.width, 333);
    assert.equal(h.canvas.height, 208);
    assert.deepEqual(h.context.transform, [333 / 640, 0, 0, 208 / 400, 0, 0]);
    h.window.devicePixelRatio = 2;
    h.queries.findLast((query) => query.media.startsWith('(resolution:'))?.change();
    assert.equal(h.canvas.width, 667, 'moving to a denser screen refits even when CSS size does not change');
    assert.equal(h.canvas.height, 417);
    h.window.devicePixelRatio = 4;
    h.queries.findLast((query) => query.media.startsWith('(resolution:'))?.change();
    assert.equal(h.canvas.width, 1000, 'density is capped at three to bound memory');
  } finally { h.close(); }
  assert.ok(h.queries.every((query) => query.listeners.size === 0));
  assert.ok([...h.observers.resize, ...h.observers.intersection].every((observer) => !observer.connected));
});

test('offscreen and hidden figures do not advance or paint queued animation frames', async () => {
  const h = await mountLoop();
  try {
    h.step();
    assert.equal(h.ticks, 0, 'wait for visibility and the initial canvas fit');
    h.resize(640);
    h.step();
    assert.equal(h.ticks, 0, 'a ResizeObserver report alone is not evidence of visibility');
    h.visible(true);
    h.step();
    assert.equal(h.ticks, 1);
    const priorDraws = h.draws;
    h.visible(false);
    h.paint();
    assert.equal(h.draws, priorDraws, 'a queued frame does not paint after scrolling offscreen');
    h.step();
    assert.equal(h.ticks, 1);
    h.visible(true);
    document.hidden = true;
    h.step();
    assert.equal(h.ticks, 1);
    document.hidden = false;
    h.step();
    h.paint();
    assert.equal(h.ticks, 2, 'resuming takes one step, without catching up hidden time');
  } finally { h.close(); }
  assert.equal(h.intervals.size, 0);
  assert.equal(h.frames.size, 0);
});

test('still figures have a strict work bound, no animation timer, and stay sharp after density changes', async () => {
  const h = await mountLoop({ still: true, maxTicks: 3 });
  try {
    assert.equal(h.ticks, 3);
    assert.equal(h.intervals.size, 0);
    h.resize(640);
    h.window.devicePixelRatio = 2;
    h.queries.findLast((query) => query.media.startsWith('(resolution:'))?.change();
    assert.equal(h.canvas.width, 1280);
    assert.equal(h.draws, 2);
    assert.equal(h.ticks, 3, 'refitting a still figure does not restart its model');
  } finally { h.close(); }
});

test('completed animated figures release their timer after painting the last state', async () => {
  const h = await mountLoop({ finishAt: 1 });
  try {
    h.resize(640);
    h.visible(true);
    h.step();
    h.paint();
    assert.equal(h.ticks, 1);
    assert.equal(h.intervals.size, 0);
    assert.ok(h.draws >= 2);
  } finally { h.close(); }
});
