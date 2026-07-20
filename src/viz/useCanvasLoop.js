import { useEffect, useRef } from 'react';

// Deterministic RNG so every visitor watches the same run and reduced-motion
// users see the same final state the animation would reach.
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

export function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

// Drives a viz model on a canvas: `model.tick(state)` advances (returns false
// when finished), `model.draw(ctx, state, w, h)` paints. Pauses offscreen and
// on hidden tabs. Under prefers-reduced-motion the model is run to completion
// synchronously (bounded) and drawn once, static.
//
// `deps`: re-init when these change (restart buttons bump a counter).
export function useCanvasLoop(canvasRef, { width, height, init, tick, draw, stepMs = 40, maxTicks = 20000 }, deps = []) {
  const stateRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const state = init();
    stateRef.current = state;

    if (prefersReducedMotion()) {
      let guard = 0;
      while (tick(state) !== false && guard < maxTicks) guard += 1;
      draw(ctx, state, width, height);
      return undefined;
    }

    let raf = 0;
    let timer = 0;
    let running = true;
    let visible = true;

    const paint = () => draw(ctx, state, width, height);

    const step = () => {
      if (!running || !visible || document.hidden) return;
      const more = tick(state);
      raf = requestAnimationFrame(paint);
      if (more === false) running = false;
    };

    timer = setInterval(step, stepMs);
    paint();

    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.05 }
    );
    io.observe(canvas);

    return () => {
      clearInterval(timer);
      cancelAnimationFrame(raf);
      io.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return stateRef;
}
