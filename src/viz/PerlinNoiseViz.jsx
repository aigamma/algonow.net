import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// A ten by four window onto a seeded Perlin lattice, one cell per tick, then
// three ticks adding octaves two to four. Invariant every tick: exactly zero
// at every lattice point through every octave, no sample outside the bound.
const W = 640;
const H = 300;
const SEED = 20261010;
const CELL = 56;
const COLS = 10;
const ROWS = 4;
const OX = 40;
const OY = 34;
const FW = CELL * COLS;
const FH = CELL * ROWS;
const OCTAVES = 4;
const S = Math.SQRT1_2;
const BOUND = Math.SQRT1_2;
const GRADS = [[1, 0], [-1, 0], [0, 1], [0, -1], [S, S], [-S, S], [S, -S], [-S, -S]];
const POINTS = (ROWS + 1) * (COLS + 1);

function fade(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export function makeLattice(rand) {
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const t = p[i];
    p[i] = p[j];
    p[j] = t;
  }
  const perm = p.concat(p);
  const index = (i, j) => perm[perm[i & 255] + (j & 255)] & 7;
  const noise = (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const tx = x - xi;
    const ty = y - yi;
    const g00 = GRADS[index(xi, yi)];
    const g10 = GRADS[index(xi + 1, yi)];
    const g01 = GRADS[index(xi, yi + 1)];
    const g11 = GRADS[index(xi + 1, yi + 1)];
    const n00 = g00[0] * tx + g00[1] * ty;
    const n10 = g10[0] * (tx - 1) + g10[1] * ty;
    const n01 = g01[0] * tx + g01[1] * (ty - 1);
    const n11 = g11[0] * (tx - 1) + g11[1] * (ty - 1);
    const u = fade(tx);
    const v = fade(ty);
    const nx0 = n00 + u * (n10 - n00);
    const nx1 = n01 + u * (n11 - n01);
    return nx0 + v * (nx1 - nx0);
  };
  return { index, noise };
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const lat = makeLattice(rand);
  const ox = Math.floor(rand() * 200);
  const oy = Math.floor(rand() * 200);
  return { lat, ox, oy, field: new Float32Array(FW * FH), filled: 0, octave: 1, norm: 1, version: 0, samples: 0, min: 0, max: 0, zeros: 0, done: false, ok: true, last: `lattice window at (${ox}, ${oy}); one cell per tick` };
}

function latticeZeros(sc) {
  let zeros = 0;
  for (let j = 0; j <= ROWS; j += 1) {
    for (let i = 0; i <= COLS; i += 1) {
      let total = 0;
      for (let o = 0; o < sc.octave; o += 1) total += 0.5 ** o * sc.lat.noise((sc.ox + i) * 2 ** o, (sc.oy + j) * 2 ** o);
      if (total === 0) zeros += 1;
    }
  }
  return zeros;
}

export function sceneTick(sc) {
  if (sc.done) return true;
  let min = Infinity;
  let max = -Infinity;
  if (sc.filled < COLS * ROWS) {
    const k = sc.filled;
    const cx = k % COLS;
    const cy = Math.floor(k / COLS);
    for (let py = cy * CELL; py < (cy + 1) * CELL; py += 1) {
      for (let px = cx * CELL; px < (cx + 1) * CELL; px += 1) {
        const v = sc.lat.noise(sc.ox + (px + 0.5) / CELL, sc.oy + (py + 0.5) / CELL);
        sc.field[py * FW + px] = v;
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
    sc.samples += CELL * CELL;
    if (k === 0 || min < sc.min) sc.min = min;
    if (k === 0 || max > sc.max) sc.max = max;
    const inBound = min >= -BOUND - 1e-9 && max <= BOUND + 1e-9;
    const cornerZeros = [[0, 0], [1, 0], [0, 1], [1, 1]].filter(([di, dj]) => sc.lat.noise(sc.ox + cx + di, sc.oy + cy + dj) === 0).length;
    sc.ok = sc.ok && inBound && cornerZeros === 4;
    sc.filled += 1;
    sc.version += 1;
    sc.last = `cell ${k + 1} of ${COLS * ROWS} at (${sc.ox + cx}, ${sc.oy + cy}): [${min.toFixed(3)}, ${max.toFixed(3)}] inside ±0.7071 ${inBound ? 'held' : 'BROKEN'}; corners zero: ${cornerZeros} of 4`;
    return false;
  }
  if (sc.octave < OCTAVES) {
    sc.octave += 1;
    const amp = 0.5 ** (sc.octave - 1);
    const freq = 2 ** (sc.octave - 1);
    for (let py = 0; py < FH; py += 1) {
      for (let px = 0; px < FW; px += 1) {
        const v = sc.field[py * FW + px] + amp * sc.lat.noise((sc.ox + (px + 0.5) / CELL) * freq, (sc.oy + (py + 0.5) / CELL) * freq);
        sc.field[py * FW + px] = v;
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
    sc.norm += amp;
    sc.samples += FW * FH;
    sc.min = min;
    sc.max = max;
    const inBound = min >= -BOUND * sc.norm - 1e-6 && max <= BOUND * sc.norm + 1e-6;
    sc.zeros = latticeZeros(sc);
    sc.ok = sc.ok && inBound && sc.zeros === POINTS;
    sc.version += 1;
    sc.last = `octave ${sc.octave}: frequency ×${freq}, amplitude ${amp}; sum [${min.toFixed(3)}, ${max.toFixed(3)}] against ±${(BOUND * sc.norm).toFixed(4)} ${inBound ? 'held' : 'BROKEN'}; ${sc.zeros} of ${POINTS} lattice points zero`;
    return false;
  }
  sc.done = true;
  sc.last = `done: ${OCTAVES} octaves, ${sc.samples.toLocaleString()} samples; normalized range [${(sc.min / sc.norm).toFixed(3)}, ${(sc.max / sc.norm).toFixed(3)}] inside ±0.7071; ${sc.zeros} of ${POINTS} lattice points zero; invariant ${sc.ok ? 'held' : 'BROKEN'}`;
  return true;
}

export default function PerlinNoiseViz() {
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
      stepMs: 320,
      init: () => ({ scene: makeScene(SEED + cycle.current * 7919), done: false, rest: 0, stopAtRest: isStill(), img: null, imgVersion: -1 }),
      tick: (s) => {
        if (s.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s) * 2) {
            cycle.current += 1;
            Object.assign(s, { scene: makeScene(SEED + cycle.current * 7919), done: false, rest: 0, imgVersion: -1 });
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
        if (!s.img) {
          s.img = document.createElement('canvas');
          s.img.width = FW;
          s.img.height = FH;
        }
        if (s.imgVersion !== sc.version) {
          const ictx = s.img.getContext('2d');
          const image = ictx.createImageData(FW, FH);
          const data = image.data;
          const scale = 170 / sc.norm;
          for (let py = 0; py < FH; py += 1) {
            for (let px = 0; px < FW; px += 1) {
              if (Math.floor(py / CELL) * COLS + Math.floor(px / CELL) >= sc.filled) continue;
              const o = (py * FW + px) * 4;
              const g = Math.max(8, Math.min(248, Math.round(128 + sc.field[py * FW + px] * scale)));
              data[o] = g;
              data[o + 1] = g;
              data[o + 2] = g;
              data[o + 3] = 255;
            }
          }
          ictx.putImageData(image, 0, 0);
          s.imgVersion = sc.version;
        }
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText('hashed unit gradients (blue); one cell per tick blended with the quintic fade; grey is the value', 12, 18);
        ctx.drawImage(s.img, OX, OY);
        if (!s.done && sc.filled > 0 && sc.filled <= COLS * ROWS) {
          const k = sc.filled - 1;
          ctx.strokeStyle = heur;
          ctx.lineWidth = 2;
          ctx.strokeRect(OX + (k % COLS) * CELL + 1, OY + Math.floor(k / COLS) * CELL + 1, CELL - 2, CELL - 2);
        }
        ctx.lineWidth = 2;
        for (let j = 0; j <= ROWS; j += 1) {
          for (let i = 0; i <= COLS; i += 1) {
            const g = GRADS[sc.lat.index(sc.ox + i, sc.oy + j)];
            const x = OX + i * CELL;
            const y = OY + j * CELL;
            ctx.strokeStyle = algo;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + g[0] * 14, y + g[1] * 14);
            ctx.stroke();
            ctx.fillStyle = good;
            ctx.beginPath();
            ctx.arc(x, y, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.fillStyle = dim;
        ctx.fillText(`octaves ${sc.octave} of ${OCTAVES}; samples ${sc.samples.toLocaleString()}; normalized range [${(sc.min / sc.norm).toFixed(3)}, ${(sc.max / sc.norm).toFixed(3)}]`, 12, 272);
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? 'invariant: exactly zero at every lattice point (green dots), every sample inside ±√2/2' : 'INVARIANT BROKEN', 12, 284);
        const line = sc.last;
        ctx.fillStyle = s.done ? (sc.ok ? good : warn) : ink;
        ctx.fillText(line.length > 100 ? `${line.slice(0, 99)}…` : line, 12, H - 4);
        statsRef.current = { line };
      },
    },
    [restart],
  );

  return (
    <>
      <canvas ref={canvasRef} style={{ aspectRatio: `${W} / ${H}` }} aria-hidden="true" />
      <div className="viz-controls">
        <button
          type="button"
          className="btn"
          onClick={() => {
            cycle.current += 1;
            setRestart((t) => t + 1);
          }}
        >
          new lattice
        </button>
        <span className="viz-stat">{snap.line || 'hashing gradients…'}</span>
      </div>
    </>
  );
}
