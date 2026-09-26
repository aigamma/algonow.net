import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two short line sequences and the edit graph between them. Act 1: the
// full dynamic-programming table fills, one cell per tick, every cell
// paid whether or not the files are similar. Act 2: Myers' frontier
// advances one edit at a time: for each diagonal the furthest point
// reachable with D edits (blue dots), each step sliding along matches
// (the diagonal snakes), until a frontier touches the corner; the
// shortest edit script is drawn back in green. The counters compare
// cells to frontier extensions.
const W = 640;
const H = 300;
const SEED = 20260926;
const ALPHABET = 'abcdefgh'.split('');

function mutate(seq, rand, edits) {
  const s = [...seq];
  for (let i = 0; i < edits; i++) {
    if (s.length && rand() < 0.5) s.splice(Math.floor(rand() * s.length), 1);
    else s.splice(Math.floor(rand() * (s.length + 1)), 0, ALPHABET[Math.floor(rand() * ALPHABET.length)]);
  }
  return s;
}

export function dpTable(a, b) {
  const n = a.length;
  const m = b.length;
  const t = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) t[i][0] = i;
  for (let j = 0; j <= m; j++) t[0][j] = j;
  const order = [];
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      t[i][j] = a[i - 1] === b[j - 1] ? t[i - 1][j - 1] : 1 + Math.min(t[i - 1][j], t[i][j - 1]);
      order.push([i, j]);
    }
  }
  return { t, order, d: t[n][m] };
}

export function myersTrace(a, b) {
  const n = a.length;
  const m = b.length;
  const maxd = n + m;
  const off = maxd;
  const v = new Array(2 * maxd + 2).fill(0);
  const trace = [];
  const frontiers = [];      // per D: list of {k, x, y, snakeFrom:[x0,y0]}
  let cells = 0;
  for (let d = 0; d <= maxd; d++) {
    trace.push([...v]);
    const points = [];
    for (let k = -d; k <= d; k += 2) {
      cells += 1;
      let x;
      if (k === -d || (k !== d && v[off + k - 1] < v[off + k + 1])) x = v[off + k + 1];
      else x = v[off + k - 1] + 1;
      let y = x - k;
      const x0 = x;
      const y0 = y;
      while (x < n && y < m && a[x] === b[y]) { x += 1; y += 1; }
      v[off + k] = x;
      points.push({ k, x, y, x0, y0 });
      if (x >= n && y >= m) {
        frontiers.push(points);
        return { frontiers, d, cells, path: backtrack(a, b, trace, d, off) };
      }
    }
    frontiers.push(points);
  }
  return { frontiers, d: maxd, cells, path: [] };
}

function backtrack(a, b, trace, d, off) {
  let x = a.length;
  let y = b.length;
  const path = [[x, y]];
  for (let step = d; step > 0; step--) {
    const v = trace[step];
    const k = x - y;
    const prevK = k === -step || (k !== step && v[off + k - 1] < v[off + k + 1]) ? k + 1 : k - 1;
    const px = v[off + prevK];
    const py = px - prevK;
    while (x > px && y > py) { x -= 1; y -= 1; path.push([x, y]); }
    x = px;
    y = py;
    path.push([x, y]);
  }
  while (x > 0 && y > 0) { x -= 1; y -= 1; path.push([x, y]); }
  return path.reverse();
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const a = Array.from({ length: 9 }, () => ALPHABET[Math.floor(rand() * ALPHABET.length)]);
  const b = mutate(a, rand, 3);
  const dp = dpTable(a, b);
  const my = myersTrace(a, b);
  return { a, b, dp, my };
}

export default function MyersDiffViz() {
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
      stepMs: 40,
      init: () => ({ scene: makeScene(SEED + cycle.current * 7919), act: 0, tick: 0, actRest: 0, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.act >= 2) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, { scene: makeScene(SEED + cycle.current * 7919), act: 0, tick: 0, actRest: 0, rest: 0 });
          }
          return true;
        }
        s.tick += 1;
        const len = s.act === 0 ? s.scene.dp.order.length + 6 : s.scene.my.frontiers.length * 14 + 20;
        if (s.tick >= len) {
          s.tick = len;
          s.actRest += 1;
          if (s.actRest > holdTicks(s)) {
            s.act += 1;
            s.tick = 0;
            s.actRest = 0;
          }
        }
        return true;
      },
      draw: (ctx, s) => {
        ctx.clearRect(0, 0, W, H);
        const css = getComputedStyle(document.documentElement);
        const algo = css.getPropertyValue('--algo').trim() || '#5da2ff';
        const heur = css.getPropertyValue('--heur').trim() || '#f0b94b';
        const good = css.getPropertyValue('--path').trim() || '#62d98a';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';
        const sc = s.scene;
        const done = s.act >= 2;
        const act = done ? 1 : s.act;
        const n = sc.a.length;
        const m = sc.b.length;
        const cell = 22;
        const gx = 60;
        const gy = 56;
        const px = (x, y) => [gx + x * cell, gy + y * cell];

        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(act === 0
          ? `act 1 · the full table: every one of ${n} × ${m} cells, similar files or not`
          : `act 2 · Myers: one frontier per edit count D, sliding along matches; stop at the first frontier that reaches the corner`, 14, 18);

        // labels: a along the top (x), b down the side (y)
        ctx.fillStyle = ink;
        ctx.font = '11px ui-monospace, monospace';
        for (let x = 0; x < n; x++) ctx.fillText(sc.a[x], gx + x * cell + 7, gy - 8);
        for (let y = 0; y < m; y++) ctx.fillText(sc.b[y], gx - 16, gy + y * cell + 15);
        // grid
        ctx.strokeStyle = `${dim}44`;
        ctx.lineWidth = 1;
        for (let x = 0; x <= n; x++) { const [X] = px(x, 0); ctx.beginPath(); ctx.moveTo(X, gy); ctx.lineTo(X, gy + m * cell); ctx.stroke(); }
        for (let y = 0; y <= m; y++) { const [, Y] = px(0, y); ctx.beginPath(); ctx.moveTo(gx, Y); ctx.lineTo(gx + n * cell, Y); ctx.stroke(); }
        // diagonals where a[x] == b[y]
        ctx.strokeStyle = `${dim}88`;
        for (let x = 0; x < n; x++) for (let y = 0; y < m; y++) if (sc.a[x] === sc.b[y]) {
          const [X1, Y1] = px(x, y);
          const [X2, Y2] = px(x + 1, y + 1);
          ctx.beginPath(); ctx.moveTo(X1, Y1); ctx.lineTo(X2, Y2); ctx.stroke();
        }

        let line;
        if (act === 0) {
          const k = Math.min(sc.dp.order.length, s.tick);
          for (let i = 0; i < k; i++) {
            const [ci, cj] = sc.dp.order[i];
            const [X, Y] = px(ci - 1, cj - 1);
            ctx.fillStyle = 'rgba(93,162,255,0.16)';
            ctx.fillRect(X + 1, Y + 1, cell - 2, cell - 2);
            ctx.fillStyle = dim;
            ctx.font = '9px ui-monospace, monospace';
            ctx.fillText(String(sc.dp.t[ci][cj]), X + 7, Y + 14);
          }
          line = k < sc.dp.order.length
            ? `cell ${k} of ${sc.dp.order.length}: each cell asks its three neighbors, none is skipped`
            : `table filled: ${sc.dp.order.length} cells to learn D = ${sc.dp.d}`;
          ctx.fillStyle = k < sc.dp.order.length ? ink : algo;
        } else {
          const step = done ? sc.my.frontiers.length : Math.min(sc.my.frontiers.length, Math.floor(s.tick / 14) + 1);
          let ext = 0;
          for (let d = 0; d < step; d++) {
            const pts = sc.my.frontiers[d];
            for (const p of pts) {
              ext += 1;
              const [X0, Y0] = px(p.x0, p.y0);
              const [X, Y] = px(p.x, p.y);
              ctx.strokeStyle = d === step - 1 ? algo : `${algo}66`;
              ctx.lineWidth = d === step - 1 ? 2.2 : 1.4;
              ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.lineTo(X, Y); ctx.stroke();
              ctx.fillStyle = d === step - 1 ? algo : `${algo}88`;
              ctx.beginPath(); ctx.arc(X, Y, d === step - 1 ? 4 : 3, 0, Math.PI * 2); ctx.fill();
            }
          }
          const finished = done || step >= sc.my.frontiers.length && s.tick >= sc.my.frontiers.length * 14 + 6;
          if (finished && sc.my.path.length) {
            ctx.strokeStyle = good;
            ctx.lineWidth = 2.6;
            ctx.beginPath();
            sc.my.path.forEach(([x, y], i) => { const [X, Y] = px(x, y); if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); });
            ctx.stroke();
          }
          line = finished
            ? `D = ${sc.my.d}: ${sc.my.cells} frontier extensions against ${sc.dp.order.length} table cells; the green path is the shortest edit script`
            : `D = ${step - 1}: ${sc.my.frontiers[step - 1].length} diagonals extended, each slid along its matches (the snakes)`;
          ctx.fillStyle = finished ? good : heur;
        }
        // ledger
        const lx = 330;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = ink;
        ctx.fillText(`A = ${sc.a.join('')}   B = ${sc.b.join('')}`, lx, 52);
        ctx.fillStyle = dim;
        ctx.fillText(`right = delete from A, down = insert from B, diagonal = match`, lx, 72);
        ctx.fillStyle = algo;
        ctx.fillText(`DP table: ${sc.dp.order.length} cells, D = ${sc.dp.d}`, lx, 100);
        ctx.fillStyle = heur;
        ctx.fillText(`Myers: ${sc.my.cells} extensions, D = ${sc.my.d}`, lx, 120);
        ctx.fillStyle = dim;
        ctx.font = '10px ui-monospace, monospace';
        ctx.fillText('a frontier keeps, per diagonal k = x − y, only the', lx, 148);
        ctx.fillText('furthest point reachable with D edits, then snakes', lx, 162);
        ctx.fillText('the first frontier to touch the corner is optimal', lx, 176);
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(line, 14, H - 8);
        statsRef.current = { line: done ? `shortest edit script D = ${sc.my.d}: ${sc.my.cells} extensions where the table paid ${sc.dp.order.length}` : line };
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
          new files
        </button>
        <span className="viz-stat">{snap.line || 'diffing…'}</span>
      </div>
    </>
  );
}
