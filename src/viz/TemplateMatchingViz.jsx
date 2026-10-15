import DiagramViewport from '../components/DiagramViewport.jsx';
import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// A 40 x 40 scene with an 8 x 8 pattern planted at a seeded position, then
// shown under a different gain and offset plus a little noise; the template
// is the pattern at its reference lighting. One tick scans one row of
// positions, scoring every window by normalized cross-correlation (blue)
// and by the sum of squared differences (amber). The invariant checked on
// every tick is that every NCC value lies in [-1, 1]; at the end, that the
// NCC peak sits on the plant.
const W = 640;
const H = 300;
const SEED = 20261010;
const S = 40;
const T = 8;
const P = S - T + 1;

function texture(rand, n, waves, fmax, noise) {
  const c = [];
  for (let k = 0; k < waves; k += 1) c.push([0.1 + rand() * fmax, 0.1 + rand() * fmax, rand() * 6.283, 0.4 + rand() * 0.6]);
  const img = [];
  let lo = Infinity;
  let hi = -Infinity;
  for (let y = 0; y < n; y += 1) {
    const row = [];
    for (let x = 0; x < n; x += 1) {
      let v = (rand() - 0.5) * noise;
      for (const [fx, fy, ph, a] of c) v += a * Math.cos(fx * x + fy * y + ph);
      row.push(v);
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    img.push(row);
  }
  return img.map((row) => row.map((v) => ((v - lo) * 255) / (hi - lo)));
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const scene = texture(rand, S, 10, 1.5, 1.2);
  const tmpl = texture(rand, T, 6, 0.9, 0.3);
  const px = Math.floor(rand() * P);
  const py = Math.floor(rand() * P);
  for (let i = 0; i < T; i += 1) for (let j = 0; j < T; j += 1) scene[py + i][px + j] = tmpl[i][j];
  const gain = 0.4 + rand() * 1.8;
  const offset = -60 + rand() * 120;
  const shown = scene.map((row) => row.map((v) => gain * v + offset + (rand() - 0.5) * 16));
  let st = 0;
  let stt = 0;
  for (const row of tmpl) for (const v of row) { st += v; stt += v * v; }
  const n = T * T;
  return {
    shown, tmpl, px, py, gain, offset, st, stt, tvar: stt - (st * st) / n,
    row: 0, ncc: [], ssd: [], ok: true, done: false,
    last: `plant at (${px}, ${py}); scene shown at gain ${gain.toFixed(2)} and offset ${offset >= 0 ? '+' : ''}${offset.toFixed(0)}; scanning`,
  };
}

function argbest(maps, hi) {
  let best = null;
  maps.forEach((row, y) => row.forEach((v, x) => {
    if (best === null || (hi ? v > best[0] : v < best[0])) best = [v, x, y];
  }));
  return best;
}

export function sceneTick(sc) {
  if (sc.done) return true;
  const n = T * T;
  const y = sc.row;
  const rn = [];
  const rs = [];
  for (let x = 0; x < P; x += 1) {
    let sf = 0;
    let sff = 0;
    let sft = 0;
    for (let i = 0; i < T; i += 1) {
      const r = sc.shown[y + i];
      const tr = sc.tmpl[i];
      for (let j = 0; j < T; j += 1) {
        const v = r[x + j];
        sf += v;
        sff += v * v;
        sft += v * tr[j];
      }
    }
    const fvar = sff - (sf * sf) / n;
    const den = Math.sqrt(Math.max(fvar, 0) * sc.tvar);
    const v = den > 1e-9 ? (sft - (sf * sc.st) / n) / den : 0;
    if (v > 1 + 1e-9 || v < -1 - 1e-9) sc.ok = false;
    rn.push(v);
    rs.push(sff - 2 * sft + sc.stt);
  }
  sc.ncc.push(rn);
  sc.ssd.push(rs);
  sc.row += 1;
  if (sc.row >= P) {
    const [nv, nx, ny] = argbest(sc.ncc, true);
    const [, sx, sy] = argbest(sc.ssd, false);
    sc.nccHit = nx === sc.px && ny === sc.py;
    sc.ssdHit = sx === sc.px && sy === sc.py;
    sc.peak = [nx, ny];
    sc.ssdPeak = [sx, sy];
    sc.ok = sc.ok && sc.nccHit;
    sc.done = true;
    sc.last = `done: NCC peak ${nv.toFixed(3)} at (${nx}, ${ny}) ${sc.nccHit ? 'on the plant' : 'OFF the plant'}; SSD minimum at (${sx}, ${sy}) ${sc.ssdHit ? 'on the plant' : 'misled by the lighting'}; every score inside [-1, 1]: ${sc.ok ? 'yes' : 'NO'}`;
    return true;
  }
  sc.last = `row ${sc.row} of ${P}: ${P} windows scored, each from the window mean and variance and the template dot product`;
  return false;
}

export default function TemplateMatchingViz() {
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
      stepMs: 140,
      init: () => ({ scene: makeScene(SEED + cycle.current * 7919), done: false, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s) * 2) {
            cycle.current += 1;
            Object.assign(s, { scene: makeScene(SEED + cycle.current * 7919), done: false, rest: 0 });
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
        ctx.fillText('scene under new lighting (left), template at reference lighting (middle), NCC map (right)', 12, 16);
        const k = 5;
        const ox = 12;
        const oy = 28;
        for (let y = 0; y < S; y += 1) {
          for (let x = 0; x < S; x += 1) {
            const g = Math.max(0, Math.min(255, Math.round(sc.shown[y][x])));
            ctx.fillStyle = `rgb(${g},${g},${g})`;
            ctx.fillRect(ox + x * k, oy + y * k, k, k);
          }
        }
        for (let y = 0; y < T; y += 1) {
          for (let x = 0; x < T; x += 1) {
            const g = Math.round(sc.tmpl[y][x]);
            ctx.fillStyle = `rgb(${g},${g},${g})`;
            ctx.fillRect(236 + x * k, oy + y * k, k, k);
          }
        }
        ctx.strokeStyle = good;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(ox + sc.px * k - 0.5, oy + sc.py * k - 0.5, T * k + 1, T * k + 1);
        if (!s.done) {
          ctx.strokeStyle = heur;
          ctx.strokeRect(ox - 0.5, oy + sc.row * k - 0.5, S * k + 1, T * k + 1);
        }
        const mx = 300;
        for (let y = 0; y < sc.ncc.length; y += 1) {
          for (let x = 0; x < P; x += 1) {
            const v = sc.ncc[y][x];
            ctx.fillStyle = v >= 0 ? algo : warn;
            ctx.globalAlpha = 0.1 + 0.9 * Math.min(1, Math.abs(v));
            ctx.fillRect(mx + x * k, oy + y * k, k, k);
          }
        }
        ctx.globalAlpha = 1;
        if (s.done) {
          ctx.strokeStyle = sc.nccHit ? good : warn;
          ctx.strokeRect(mx + sc.peak[0] * k - 1.5, oy + sc.peak[1] * k - 1.5, k + 3, k + 3);
          ctx.strokeStyle = sc.ssdHit ? heur : warn;
          ctx.strokeRect(ox + sc.ssdPeak[0] * k - 2.5, oy + sc.ssdPeak[1] * k - 2.5, T * k + 5, T * k + 5);
        }
        ctx.fillStyle = dim;
        ctx.fillText('green: planted template; amber: SSD minimum', 236, 214);
        ctx.fillText('NCC map: blue ≥ 0, red < 0; range [-1, 1]', 236, 230);
        ctx.fillText(`gain ${sc.gain.toFixed(2)}, offset ${sc.offset.toFixed(0)}`, 236, 246);
        ctx.fillText('NCC ignores positive gain and offset; SSD does not', 236, 262);
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? 'NCC inside [-1, 1]' : 'INVARIANT BROKEN', 12, 248);
        const line = sc.last;
        ctx.fillStyle = s.done ? (sc.ok ? good : warn) : ink;
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
          new scene
        </button>
        <span className="viz-stat">{snap.line || 'scanning…'}</span>
      </div>
    </>
  );
}
