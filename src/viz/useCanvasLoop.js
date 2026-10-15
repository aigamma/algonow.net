import { useEffect, useRef, useState } from 'react';
import { getLevel, isStill, subscribe, PACE_KEY } from '../lib/motion.js';

// Re-exported so a viz can reach the motion helpers it needs without importing
// two modules.
export { holdTicks, isStill } from '../lib/motion.js';


// Deterministic RNG so every visitor watches the same run and still readers
// see the same final state the animation would reach.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Drives a viz model on a canvas: `model.tick(state)` advances (returns false
// when finished), `model.draw(ctx, state, w, h)` paints. Pauses offscreen and
// on hidden tabs. The reader's motion preference scales `stepMs`, and at the
// still setting the model is run to completion synchronously (bounded) and
// drawn once, static.
//
// `deps`: re-init when these change (restart buttons bump a counter).
export function useCanvasLoop(canvasRef, { width, height, init, tick, draw, stepMs = 40, maxTicks = 20000 }, deps = []) {
  const stateRef = useRef(null);
  const [motionNonce, setMotionNonce] = useState(0);

  // Changing the speed re-initializes the figure, so the new pace applies to
  // the one the reader is looking at rather than only to the next run.
  useEffect(() => subscribe(() => setMotionNonce((n) => n + 1)), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    // Crispness: the model draws in logical width x height units, but
    // the CSS box is usually wider (the canvas fills its frame), so a
    // backing store of only width x height gets upscaled and blurs.
    // Size the store from the RENDERED box times devicePixelRatio and
    // scale the context, so one logical unit maps to >= 1 device
    // pixel and text and lines stay sharp at every zoom level.
    //
    // The rendered width comes from the ResizeObserver entry rather than from
    // getBoundingClientRect. Both give the same number; only one of them costs
    // a forced synchronous layout. Reading the box out of the effect meant the
    // read landed right after the page's own JavaScript had run, which made it
    // a Layout inside a late script task, and Lighthouse's Speed Index is
    // 1.4 * observed + 0.4 * (weighted end time of script tasks containing a
    // Layout). On PSI's mobile profile the real page was visually done at
    // 1076ms while that pessimistic term sat at 5984ms, which is what held
    // Speed Index at 3.9s and the score at 98. An observer callback already
    // runs after layout, so taking the width from the entry forces nothing.
    let fitted = false;
    let cssWidth = width;
    const fitTo = (cssW) => {
      if (!(cssW > 0)) return;
      cssWidth = cssW;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const scale = (cssWidth / width) * dpr;
      const pw = Math.max(1, Math.round(width * scale));
      const ph = Math.max(1, Math.round(height * scale));
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
      }
      ctx.setTransform(pw / width, 0, 0, ph / height, 0, 0);
      fitted = true;
    };
    const widthOf = (entry) =>
      entry?.contentRect?.width ?? entry?.contentBoxSize?.[0]?.inlineSize ?? width;

    // A slower preference stretches every step. The floor keeps a pathological
    // setting from starving the interval. The pace is stamped onto the state so
    // holdTicks can turn a rest promised in seconds into a tick count.
    const pace = Math.max(16, Math.round(stepMs * getLevel().stepScale));

    const state = init();
    state[PACE_KEY] = pace;
    stateRef.current = state;

    const paint = () => {
      if (fitted) draw(ctx, state, width, height);
    };
    const ro = new ResizeObserver((entries) => {
      fitTo(widthOf(entries[0]));
      paint();
    });
    ro.observe(canvas);

    // Moving a window between screens can change density without changing its
    // CSS box, so ResizeObserver alone cannot keep the backing store sharp.
    let densityQuery = null;
    const watchDensity = () => {
      densityQuery?.removeEventListener?.('change', densityChanged);
      densityQuery = window.matchMedia?.(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
      densityQuery?.addEventListener?.('change', densityChanged);
    };
    const densityChanged = () => {
      if (fitted) {
        fitTo(cssWidth);
        paint();
      }
      watchDensity();
    };
    watchDensity();
    const disconnectSizing = () => {
      ro.disconnect();
      densityQuery?.removeEventListener?.('change', densityChanged);
    };

    if (isStill()) {
      for (let guard = 0; guard < maxTicks; guard += 1) {
        if (tick(state) === false) break;
      }
      // The observer delivers once as soon as it starts observing, so the
      // first fit and the first draw both ride that callback. It also keeps
      // the figure crisp if the column reflows (window resize, zoom).
      return disconnectSizing;
    }

    let raf = 0;
    let timer = 0;
    let running = true;
    let visible = false;

    // Nothing is drawn until the observer has reported a size, because the
    // context transform comes from it. That is one frame, not a wait.
    const paintFrame = () => {
      raf = 0;
      if (visible && !document.hidden) paint();
    };

    const step = () => {
      if (!running || !fitted || !visible || document.hidden) return;
      const more = tick(state);
      if (!raf) raf = requestAnimationFrame(paintFrame);
      if (more === false) {
        running = false;
        clearInterval(timer);
      }
    };

    timer = setInterval(step, pace);

    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
        if (visible && !document.hidden) paint();
      },
      { threshold: 0.05 }
    );
    io.observe(canvas);

    return () => {
      clearInterval(timer);
      cancelAnimationFrame(raf);
      io.disconnect();
      disconnectSizing();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, motionNonce]);

  return stateRef;
}
