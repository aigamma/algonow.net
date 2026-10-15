import DiagramViewport from '../components/DiagramViewport.jsx';
import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Hysteresis, live. A 48 x 48 image of a disk and a ramped square under
// seeded noise is blurred, differentiated, and thinned at scene start;
// the ticks then run the breadth-first hysteresis one wave at a time from
// the strong pixels: strong pixels blue, weak pixels reached through them
// amber, and candidates above the low threshold that nothing strong leads
// to stay gray and are dropped at the end. The invariant checked every
// tick is that every amber pixel is above the low threshold and connected
// to a blue one through colored pixels.
const W = 640;
const H = 300;
const SEED = 20261010;
const N = 48;

function makeImage(rand, noise) {
  const img = [];
  for (let y = 0; y < N; y += 1) {
    const row = [];
    for (let x = 0; x < N; x += 1) {
      let v = 40;
      if ((x - 15) * (x - 15) + (y - 22) * (y - 22) <= 81) v = 160;
      if (x >= 28 && x <= 42 && y >= 10 && y <= 24) v = 70 + (90 * (x - 28)) / 14;
      // Box-Muller noise
      let u = 0;
      let w = 0;
      while (u === 0) u = rand();
      while (w === 0) w = rand();
      row.push(v + noise * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * w));
    }
    img.push(row);
  }
  return img;
}

function blur(img) {
  const k = [0.0545, 0.2442, 0.4026, 0.2442, 0.0545];
  const tmp = img.map((row) => row.map((_, x) => k.reduce((acc, w, i) => acc + w * row[Math.min(Math.max(x + i - 2, 0), N - 1)], 0)));
  return tmp.map((row, y) => row.map((_, x) => k.reduce((acc, w, i) => acc + w * tmp[Math.min(Math.max(y + i - 2, 0), N - 1)][x], 0)));
}

function sobelNms(b) {
  const mag = Array.from({ length: N }, () => new Array(N).fill(0));
  const gxs = Array.from({ length: N }, () => new Array(N).fill(0));
  const gys = Array.from({ length: N }, () => new Array(N).fill(0));
  for (let y = 1; y < N - 1; y += 1) {
    for (let x = 1; x < N - 1; x += 1) {
      const gx = (b[y - 1][x + 1] + 2 * b[y][x + 1] + b[y + 1][x + 1]) - (b[y - 1][x - 1] + 2 * b[y][x - 1] + b[y + 1][x - 1]);
      const gy = (b[y + 1][x - 1] + 2 * b[y + 1][x] + b[y + 1][x + 1]) - (b[y - 1][x - 1] + 2 * b[y - 1][x] + b[y - 1][x + 1]);
      gxs[y][x] = gx;
      gys[y][x] = gy;
      mag[y][x] = Math.hypot(gx, gy);
    }
  }
  const nms = Array.from({ length: N }, () => new Array(N).fill(0));
  let peak = 0;
  for (let y = 1; y < N - 1; y += 1) {
    for (let x = 1; x < N - 1; x += 1) {
      const m = mag[y][x];
      if (m === 0) continue;
      let a = (Math.atan2(gys[y][x], gxs[y][x]) * 180) / Math.PI;
      a = ((a % 180) + 180) % 180;
      let n1;
      let n2;
      if (a < 22.5 || a >= 157.5) [n1, n2] = [mag[y][x - 1], mag[y][x + 1]];
      else if (a < 67.5) [n1, n2] = [mag[y - 1][x - 1], mag[y + 1][x + 1]];
      else if (a < 112.5) [n1, n2] = [mag[y - 1][x], mag[y + 1][x]];
      else [n1, n2] = [mag[y + 1][x - 1], mag[y - 1][x + 1]];
      if (m > n1 && m >= n2) nms[y][x] = m;
      peak = Math.max(peak, m);
    }
  }
  return { nms, peak };
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const noise = 16 + (seed % 3) * 12; // 16, 28, 40
  const img = makeImage(rand, noise);
  const { nms, peak } = sobelNms(blur(img));
  const high = 0.5 * peak;
  const low = 0.4 * high;
  const state = Array.from({ length: N }, () => new Array(N).fill(0)); // 0 none, 1 candidate, 2 strong, 3 reached weak
  const frontier = [];
  let strong = 0;
  let candidates = 0;
  for (let y = 0; y < N; y += 1) {
    for (let x = 0; x < N; x += 1) {
      if (nms[y][x] >= high) {
        state[y][x] = 2;
        strong += 1;
        frontier.push([x, y]);
      } else if (nms[y][x] >= low) {
        state[y][x] = 1;
        candidates += 1;
      }
    }
  }
  return { nms, low, high, state, frontier, noise, strong, candidates, reached: 0, wave: 0, done: false, ok: true, last: `noise ${noise}: ${strong} strong pixels (blue) and ${candidates} candidates above the low threshold (gray); the waves start now` };
}

function connectedToStrong(sc) {
  // every reached weak pixel (3) must connect through 2/3 pixels to a 2
  const seen = Array.from({ length: N }, () => new Array(N).fill(false));
  const stack = [];
  for (let y = 0; y < N; y += 1) for (let x = 0; x < N; x += 1) if (sc.state[y][x] === 2) { seen[y][x] = true; stack.push([x, y]); }
  while (stack.length) {
    const [x, y] = stack.pop();
    for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < N && ny < N && !seen[ny][nx] && sc.state[ny][nx] === 3) { seen[ny][nx] = true; stack.push([nx, ny]); }
    }
  }
  for (let y = 0; y < N; y += 1) for (let x = 0; x < N; x += 1) {
    if (sc.state[y][x] === 3 && (!seen[y][x] || sc.nms[y][x] < sc.low)) return false;
  }
  return true;
}

export function sceneTick(sc) {
  if (sc.done) return true;
  if (sc.frontier.length === 0) {
    sc.done = true;
    let dropped = 0;
    for (let y = 0; y < N; y += 1) for (let x = 0; x < N; x += 1) if (sc.state[y][x] === 1) dropped += 1;
    sc.ok = connectedToStrong(sc);
    sc.last = `done after ${sc.wave} waves: ${sc.strong} strong + ${sc.reached} rescued weak pixels kept, ${dropped} unanchored candidates dropped; every weak pixel kept is connected to a strong one`;
    return true;
  }
  const next = [];
  for (const [x, y] of sc.frontier) {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < N && ny < N && sc.state[ny][nx] === 1) {
          sc.state[ny][nx] = 3;
          sc.reached += 1;
          next.push([nx, ny]);
        }
      }
    }
  }
  sc.frontier = next;
  sc.wave += 1;
  sc.ok = connectedToStrong(sc);
  sc.last = `wave ${sc.wave}: ${next.length} weak pixel${next.length === 1 ? '' : 's'} reached from the strong set (${sc.reached} so far); frontier ${next.length}`;
  return false;
}

export default function CannyViz() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);
  const statsRef = useRef({ line: '' });
  const [restart, setRestart] = useState(0);
  const [snap, setSnap] = useState({ line: '' });

  useEffect(() => {
    const id = setInterval(() => setSnap({ ...statsRef.current }), 400);
    return () => clearInterval(id);
  }, []);

  useCanvasLoop(
    canvasRef,
    {
      width: W,
      height: H,
      stepMs: 450,
      init: () => ({ scene: makeScene(SEED + cycle.current), done: false, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s) * 2) {
            cycle.current += 1;
            Object.assign(s, { scene: makeScene(SEED + cycle.current), done: false, rest: 0 });
          }
          return true;
        }
        if (sceneTick(s.scene)) s.done = true;
        return true;
      },
      draw: (ctx, s) => {
        ctx.clearRect(0, 0, W, H);
        const css = getComputedStyle(document.documentElement);
        const algo = css.getPropertyValue('--algo').trim() || '#5da2ff';
        const heur = css.getPropertyValue('--heur').trim() || '#f0b94b';
        const good = css.getPropertyValue('--path').trim() || '#62d98a';
        const warn = css.getPropertyValue('--warn').trim() || '#e2606c';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';
        const sc = s.scene;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText('hysteresis: blue strong pixels, amber connected weak pixels, gray unanchored weak', 12, 18);
        const cell = 5;
        const ox = 20;
        const oy = 36;
        // left: the thinned magnitude as a grayscale, with the state overlay
        for (let y = 0; y < N; y += 1) {
          for (let x = 0; x < N; x += 1) {
            const st = sc.state[y][x];
            if (st === 2) ctx.fillStyle = algo;
            else if (st === 3) ctx.fillStyle = heur;
            else if (st === 1) ctx.fillStyle = s.done ? `${dim}22` : `${dim}99`;
            else {
              const v = Math.min(1, sc.nms[y][x] / (sc.high * 2));
              ctx.fillStyle = v > 0 ? `rgba(154,165,189,${(0.1 + 0.3 * v).toFixed(2)})` : `${dim}11`;
            }
            ctx.fillRect(ox + x * cell, oy + y * cell, cell - 1, cell - 1);
          }
        }
        const tx = 300;
        ctx.fillStyle = ink;
        ctx.fillText(`noise ${sc.noise} gray levels`, tx, 60);
        ctx.fillStyle = dim;
        ctx.fillText(`high ${sc.high.toFixed(0)} (half the peak), low ${sc.low.toFixed(0)}`, tx, 78);
        ctx.fillStyle = algo;
        ctx.fillText(`${sc.strong} strong pixels`, tx, 100);
        ctx.fillStyle = heur;
        ctx.fillText(`${sc.reached} weak pixels rescued`, tx, 118);
        ctx.fillStyle = dim;
        ctx.fillText(`${sc.candidates - sc.reached} candidates still unanchored`, tx, 136);
        ctx.fillText(`wave ${sc.wave}`, tx, 154);
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? 'invariant: every amber pixel connects to blue' : 'INVARIANT BROKEN', tx, 184);
        ctx.fillStyle = dim;
        ctx.fillText('the file: F1 0.937 at noise 40 against 0.895 (high only)', tx, 212);
        ctx.fillText('and 0.495 (low only); 751 pixels for 248 true', tx, 228);
        let line;
        if (s.done) {
          line = sc.last;
          ctx.fillStyle = sc.ok ? good : warn;
        } else {
          line = sc.last;
          ctx.fillStyle = ink;
        }
        ctx.fillText(line.length > 96 ? `${line.slice(0, 95)}…` : line, 12, H - 6);
        statsRef.current = { line };
      },
    },
    [restart],
  );

  return (
    <>
      <DiagramViewport width={W}>
        <canvas ref={canvasRef} style={{ aspectRatio: `${W} / ${H}` }} aria-hidden="true" />
      </DiagramViewport>
      <div className="viz-controls">
        <button
          type="button"
          className="btn"
          onClick={() => {
            cycle.current += 1;
            setRestart((t) => t + 1);
          }}
        >
          new noise
        </button>
        <span className="viz-stat">{snap.line || 'thresholding…'}</span>
      </div>
    </>
  );
}
