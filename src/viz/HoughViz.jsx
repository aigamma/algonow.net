import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// A 120 x 120 edge image: two planted lines of 30 noisy points each
// and 60 clutter points. Each tick, ten more points cast their votes,
// one sinusoid each, into the (theta, rho) accumulator on the right.
// The lines' points meet in two cells that brighten while the
// clutter smears its votes thin. At the end the two tallest peaks are
// read back as lines and drawn over the image (green), beside the
// planted lines (dashed) they are checked against.
const W = 640;
const H = 300;
const SEED = 20260926;
const SIZE = 120;
const N_LINE = 30;
const N_CLUTTER = 60;
const THETAS = 90; // 2-degree bins
const RHO_STEP = 2;
const POINTS_PER_TICK = 10;

function gauss(rand) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const planted = [];
  // two random points on different borders define a line that crosses the image
  const borderPoint = () => {
    const side = Math.floor(rand() * 4);
    const u = 10 + rand() * (SIZE - 20);
    return side === 0 ? [u, 0] : side === 1 ? [u, SIZE] : side === 2 ? [0, u] : [SIZE, u];
  };
  while (planted.length < 2) {
    const [x1, y1] = borderPoint();
    const [x2, y2] = borderPoint();
    if (Math.hypot(x2 - x1, y2 - y1) < 40) continue;
    let theta = Math.atan2(-(x2 - x1), y2 - y1);
    let rho = x1 * Math.cos(theta) + y1 * Math.sin(theta);
    if (rho < 0) {
      rho = -rho;
      theta += Math.PI;
    }
    theta = ((theta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    if (theta >= Math.PI) {
      theta -= Math.PI;
      rho = -rho;
    }
    const deg = (theta * 180) / Math.PI;
    if (planted.length === 1) {
      const d = Math.abs(planted[0].theta - deg);
      if (Math.min(d, 180 - d) < 25) continue;
    }
    planted.push({ rho, theta: deg });
  }
  const pts = [];
  for (const { rho, theta } of planted) {
    const th = (theta * Math.PI) / 180;
    const c = Math.cos(th);
    const s = Math.sin(th);
    let made = 0;
    let guard = 0;
    while (made < N_LINE && guard < 5000) {
      guard += 1;
      const t = (rand() - 0.5) * 2 * SIZE;
      const x = rho * c - t * s + gauss(rand) * 0.6;
      const y = rho * s + t * c + gauss(rand) * 0.6;
      if (x >= 0 && x < SIZE && y >= 0 && y < SIZE) {
        pts.push({ x, y, line: true });
        made += 1;
      }
    }
  }
  for (let i = 0; i < N_CLUTTER; i++) pts.push({ x: rand() * SIZE, y: rand() * SIZE, line: false });
  for (let i = pts.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pts[i], pts[j]] = [pts[j], pts[i]];
  }
  const rhoMax = Math.hypot(SIZE, SIZE);
  const nRho = Math.floor((2 * rhoMax) / RHO_STEP) + 1;
  const acc = Array.from({ length: nRho }, () => new Array(THETAS).fill(0));
  return { planted, pts, acc, rhoMax, nRho, voted: 0, detected: null, done: false };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  if (sc.voted < sc.pts.length) {
    const end = Math.min(sc.pts.length, sc.voted + POINTS_PER_TICK);
    for (let k = sc.voted; k < end; k++) {
      const { x, y } = sc.pts[k];
      for (let ti = 0; ti < THETAS; ti++) {
        const th = (ti * 2 * Math.PI) / 180;
        const rho = x * Math.cos(th) + y * Math.sin(th);
        const ri = Math.round((rho + sc.rhoMax) / RHO_STEP);
        if (ri >= 0 && ri < sc.nRho) sc.acc[ri][ti] += 1;
      }
    }
    sc.voted = end;
    return false;
  }
  // 3x3 sums, then the two best non-adjacent maxima
  const score = sc.acc.map((row, ri) => row.map((_, ti) => {
    let s = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dt = -1; dt <= 1; dt++) {
        let r2 = ri + dr;
        let t2 = ti + dt;
        if (t2 < 0 || t2 >= THETAS) {
          t2 = (t2 + THETAS) % THETAS;
          r2 = sc.nRho - 1 - r2;
        }
        if (r2 >= 0 && r2 < sc.nRho) s += sc.acc[r2][t2];
      }
    }
    return s;
  }));
  const cells = [];
  for (let ri = 0; ri < sc.nRho; ri++) for (let ti = 0; ti < THETAS; ti++) cells.push({ v: score[ri][ti], ri, ti });
  cells.sort((a, b) => b.v - a.v);
  const picked = [];
  for (const c of cells) {
    if (picked.length === 2) break;
    if (picked.some((p) => Math.abs(p.ri - c.ri) <= 4 && Math.min(Math.abs(p.ti - c.ti), THETAS - Math.abs(p.ti - c.ti)) <= 4)) continue;
    picked.push(c);
  }
  sc.detected = picked.map((c) => ({ rho: c.ri * RHO_STEP - sc.rhoMax, theta: c.ti * 2, votes: c.v }));
  sc.done = true;
  return true;
}

export function matches(sc) {
  return sc.planted.map(({ rho, theta }) =>
    sc.detected.some((d) => {
      const dTheta = Math.abs(d.theta - theta);
      return (dTheta <= 4 && Math.abs(d.rho - rho) <= 4) || (180 - dTheta <= 4 && Math.abs(d.rho + rho) <= 4);
    }),
  );
}

export default function HoughViz() {
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
      stepMs: 420,
      init: () => ({ scene: makeScene(SEED + cycle.current * 7919), done: false, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
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
        ctx.fillText(`${sc.pts.length} edge points (two lines of ${N_LINE}, ${N_CLUTTER} clutter); ${POINTS_PER_TICK} points vote per tick, one sinusoid each`, 12, 18);
        // image
        const ix = 20;
        const iy = 40;
        const scale = 1.9;
        ctx.strokeStyle = `${dim}55`;
        ctx.strokeRect(ix, iy, SIZE * scale, SIZE * scale);
        sc.pts.forEach((p, k) => {
          ctx.fillStyle = k < sc.voted ? (p.line ? algo : `${dim}aa`) : `${dim}33`;
          ctx.beginPath();
          ctx.arc(ix + p.x * scale, iy + p.y * scale, 1.8, 0, Math.PI * 2);
          ctx.fill();
        });
        const drawLine = (rho, theta, color, dash) => {
          const th = (theta * Math.PI) / 180;
          const c = Math.cos(th);
          const st = Math.sin(th);
          const p1 = [rho * c - 200 * st, rho * st + 200 * c];
          const p2 = [rho * c + 200 * st, rho * st - 200 * c];
          ctx.save();
          ctx.beginPath();
          ctx.rect(ix, iy, SIZE * scale, SIZE * scale);
          ctx.clip();
          ctx.strokeStyle = color;
          ctx.lineWidth = dash ? 1 : 2;
          if (dash) ctx.setLineDash([4, 3]);
          ctx.beginPath();
          ctx.moveTo(ix + p1[0] * scale, iy + p1[1] * scale);
          ctx.lineTo(ix + p2[0] * scale, iy + p2[1] * scale);
          ctx.stroke();
          ctx.restore();
        };
        for (const { rho, theta } of sc.planted) drawLine(rho, theta, `${ink}77`, true);
        if (sc.detected) for (const d of sc.detected) drawLine(d.rho, d.theta, good, false);
        // accumulator
        const ax = 280;
        const ay = 40;
        const aw = 340;
        const ah = 200;
        const cw = aw / THETAS;
        const ch = ah / sc.nRho;
        let vmax = 1;
        for (const row of sc.acc) for (const v of row) if (v > vmax) vmax = v;
        for (let ri = 0; ri < sc.nRho; ri++) {
          for (let ti = 0; ti < THETAS; ti++) {
            const v = sc.acc[ri][ti];
            if (v === 0) continue;
            ctx.fillStyle = `rgba(240, 185, 75, ${Math.min(1, 0.08 + 0.92 * (v / vmax))})`;
            ctx.fillRect(ax + ti * cw, ay + ri * ch, Math.ceil(cw), Math.ceil(ch));
          }
        }
        ctx.strokeStyle = `${dim}55`;
        ctx.strokeRect(ax, ay, aw, ah);
        ctx.fillStyle = dim;
        ctx.fillText('theta: 0° to 180° →', ax, ay + ah + 14);
        ctx.fillText('rho ↓', ax + aw + 4, ay + 12);
        if (sc.detected) {
          for (const d of sc.detected) {
            const ti = d.theta / 2;
            const ri = Math.round((d.rho + sc.rhoMax) / RHO_STEP);
            ctx.strokeStyle = good;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(ax + ti * cw - 4, ay + ri * ch - 4, 8, 8);
            ctx.lineWidth = 1;
          }
        }
        ctx.fillStyle = dim;
        ctx.fillText(`brightest cell: ${vmax} votes`, ax, 268);
        ctx.fillText('the file: 3 lines of 40 points in 200 clutter, peaks 101 / 100 / 86 vs clutter 50', 12, 268);
        let line;
        if (s.done) {
          const m = matches(sc);
          const hits = m.filter(Boolean).length;
          line = `${hits} of 2 planted lines at the two tallest peaks (${sc.detected.map((d) => `${d.votes} votes at rho ${d.rho.toFixed(0)}, theta ${d.theta}°`).join('; ')})`;
          ctx.fillStyle = hits === 2 ? good : warn;
        } else {
          line = `${sc.voted} of ${sc.pts.length} points have voted; a line's points cross in one cell, clutter spreads thin`;
          ctx.fillStyle = ink;
        }
        ctx.fillText(line, 12, H - 8);
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
          new image
        </button>
        <span className="viz-stat">{snap.line || 'voting…'}</span>
      </div>
    </>
  );
}
