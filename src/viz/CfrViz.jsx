import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// CFR on Kuhn poker, live: a batch of iterations per tick, bars of the
// current (amber) and average (blue) strategies against Kuhn's family, and
// the exact best-response exploitability of the average on a log scale.
const W = 640;
const H = 300;
const SEED = 20261010;
const TICKS = 80;
const BATCH = 25;
const ACTS = ['p', 'b'];
const DEALS = [];
for (let a = 0; a < 3; a += 1) for (let b = 0; b < 3; b += 1) if (a !== b) DEALS.push([a, b]);

function isTerminal(acts) {
  return acts === 'pp' || acts === 'bp' || acts === 'bb' || acts === 'pbp' || acts === 'pbb';
}

function utility(c0, c1, acts) {
  if (acts === 'pp') return c0 > c1 ? 1 : -1;
  if (acts === 'bp') return 1;
  if (acts === 'pbp') return -1;
  return c0 > c1 ? 2 : -2;
}

const player = (acts) => acts.length % 2;
const infoset = (c0, c1, acts) => 'JQK'[player(acts) === 0 ? c0 : c1] + acts;

function matching(R) {
  const p = Math.max(R.p, 0);
  const b = Math.max(R.b, 0);
  const t = p + b;
  return t > 0 ? { p: p / t, b: b / t } : { p: 0.5, b: 0.5 };
}

function average(st, I) {
  const S = st.sum.get(I);
  if (!S) return { p: 0.5, b: 0.5 };
  const t = S.p + S.b;
  return t > 0 ? { p: S.p / t, b: S.b / t } : { p: 0.5, b: 0.5 };
}

function cfr(st, c0, c1, acts, p0, p1) {
  st.nodes += 1;
  if (isTerminal(acts)) return utility(c0, c1, acts);
  const p = player(acts);
  const I = infoset(c0, c1, acts);
  if (!st.regret.has(I)) st.regret.set(I, { p: 0, b: 0 });
  if (!st.sum.has(I)) st.sum.set(I, { p: 0, b: 0 });
  const R = st.regret.get(I);
  const s = matching(R);
  const vals = {};
  for (const a of ACTS) vals[a] = cfr(st, c0, c1, acts + a, p === 0 ? p0 * s[a] : p0, p === 1 ? p1 * s[a] : p1);
  const v = s.p * vals.p + s.b * vals.b;
  const own = p === 0 ? p0 : p1;
  const opp = (p === 0 ? p1 : p0) / 6;
  const sign = p === 0 ? 1 : -1;
  const S = st.sum.get(I);
  for (const a of ACTS) {
    R[a] += opp * sign * (vals[a] - v);
    S[a] += own * s[a];
  }
  return v;
}

export function bestResponse(st, i) {
  const cf = new Map();
  const members = new Map();
  const reach = (c0, c1, acts, w) => {
    const key = `${c0}${c1}${acts}`;
    cf.set(key, w);
    if (isTerminal(acts)) return;
    if (player(acts) === i) {
      const I = infoset(c0, c1, acts);
      if (!members.has(I)) members.set(I, []);
      members.get(I).push(key);
      for (const a of ACTS) reach(c0, c1, acts + a, w);
    } else {
      const s = average(st, infoset(c0, c1, acts));
      for (const a of ACTS) reach(c0, c1, acts + a, w * s[a]);
    }
  };
  for (const [c0, c1] of DEALS) reach(c0, c1, '', 1 / 6);
  const sign = i === 0 ? 1 : -1;
  const choice = new Map();
  const memo = new Map();
  const val = (key) => {
    if (memo.has(key)) return memo.get(key);
    const c0 = Number(key[0]);
    const c1 = Number(key[1]);
    const acts = key.slice(2);
    let v;
    if (isTerminal(acts)) v = cf.get(key) * sign * utility(c0, c1, acts);
    else if (player(acts) === i) {
      const I = infoset(c0, c1, acts);
      if (!choice.has(I)) {
        let best = null;
        let bv = -Infinity;
        for (const a of ACTS) {
          let tot = 0;
          for (const g of members.get(I)) tot += val(g + a);
          if (tot > bv) {
            bv = tot;
            best = a;
          }
        }
        choice.set(I, best);
      }
      v = val(key + choice.get(I));
    } else {
      v = 0;
      for (const a of ACTS) v += val(key + a);
    }
    memo.set(key, v);
    return v;
  };
  let total = 0;
  for (const [c0, c1] of DEALS) total += val(`${c0}${c1}`);
  return total;
}

export function exploitability(st) {
  return (bestResponse(st, 0) + bestResponse(st, 1)) / 2;
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const st = { regret: new Map(), sum: new Map(), nodes: 0, t: 0 };
  for (const [c0, c1] of DEALS) {
    for (const acts of ['', 'p', 'b', 'pb']) {
      const I = infoset(c0, c1, acts);
      if (!st.regret.has(I)) st.regret.set(I, { p: rand() * 0.5, b: rand() * 0.5 });
    }
  }
  return { st, tick: 0, curve: [], last: 'twelve information sets, random starting regrets; the average strategy is empty', done: false, ok: true };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  if (sc.tick >= TICKS) {
    sc.done = true;
    return true;
  }
  const st = sc.st;
  for (let k = 0; k < BATCH; k += 1) {
    st.t += 1;
    for (const [c0, c1] of DEALS) cfr(st, c0, c1, '', 1, 1);
  }
  const e = exploitability(st);
  sc.curve.push([st.t, e]);
  const alpha = average(st, 'J').b;
  const kBet = average(st, 'K').b;
  sc.ok = Number.isFinite(e) && e >= -1e-9;
  sc.last = `iteration ${st.t.toLocaleString()}: exploitability ${e.toFixed(4)}; P(bet|J) ${alpha.toFixed(2)}, P(bet|K) ${kBet.toFixed(2)} (3 alpha ${(3 * alpha).toFixed(2)})`;
  sc.tick += 1;
  return false;
}

export default function CfrViz() {
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
      stepMs: 180,
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
        const st = sc.st;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(`Kuhn poker, ${BATCH} iterations per tick; amber: strategy now, blue: the average; green ticks: Kuhn's family`, 12, 18);
        // left: bars
        const groups = [
          { title: 'player one, first decision: P(bet)', keys: ['J', 'Q', 'K'], target: (alpha) => [alpha, 0, 3 * alpha], y: 60 },
          { title: 'player two, facing a bet: P(call)', keys: ['Jb', 'Qb', 'Kb'], target: () => [0, 1 / 3, 1], y: 170 },
        ];
        const alpha = average(st, 'J').b;
        for (const g of groups) {
          ctx.fillStyle = dim;
          ctx.fillText(g.title, 20, g.y - 8);
          const targets = g.target(alpha);
          g.keys.forEach((I, i) => {
            const bx = 24 + i * 100;
            const by = g.y + 80;
            const avgB = average(st, I).b;
            const nowB = st.regret.has(I) ? matching(st.regret.get(I)).b : 0.5;
            ctx.fillStyle = `${dim}33`;
            ctx.fillRect(bx, g.y, 60, 80);
            ctx.fillStyle = algo;
            ctx.fillRect(bx, by - avgB * 80, 36, avgB * 80);
            ctx.fillStyle = heur;
            ctx.fillRect(bx + 40, by - nowB * 80, 14, nowB * 80);
            ctx.strokeStyle = good;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(bx - 4, by - targets[i] * 80);
            ctx.lineTo(bx + 60, by - targets[i] * 80);
            ctx.stroke();
            ctx.lineWidth = 1;
            ctx.fillStyle = ink;
            ctx.fillText(`${I[0]} ${avgB.toFixed(2)}`, bx, by + 14);
          });
        }
        // right: exploitability curve, log scale
        const x0 = 360;
        const y0 = 250;
        const pw = 260;
        const ph = 190;
        const tMax = TICKS * BATCH;
        const X = (t) => x0 + (Math.log10(Math.max(t, BATCH)) - Math.log10(BATCH)) / (Math.log10(tMax) - Math.log10(BATCH)) * pw;
        const Y = (e) => y0 - ((Math.log10(Math.max(e, 1e-4)) + 4) / 3.5) * ph;
        ctx.strokeStyle = `${dim}88`;
        ctx.strokeRect(x0, y0 - ph, pw, ph);
        ctx.fillStyle = dim;
        ctx.fillText('exploitability of the average (log)', x0, y0 - ph - 6);
        for (const e of [0.1, 0.01, 0.001]) {
          ctx.fillText(String(e), x0 - 34, Y(e) + 3);
        }
        if (sc.curve.length > 0) {
          const [t1, e1] = sc.curve[0];
          ctx.strokeStyle = `${dim}99`;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(X(t1), Y(e1));
          ctx.lineTo(X(tMax), Y(e1 / Math.sqrt(tMax / t1)));
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = dim;
          ctx.fillText('1/sqrt(T)', X(tMax) - 60, Y(e1 / Math.sqrt(tMax / t1)) - 6);
          ctx.strokeStyle = algo;
          ctx.lineWidth = 2;
          ctx.beginPath();
          sc.curve.forEach(([t, e], i) => {
            if (i === 0) ctx.moveTo(X(t), Y(e));
            else ctx.lineTo(X(t), Y(e));
          });
          ctx.stroke();
          ctx.lineWidth = 1;
        }
        ctx.fillStyle = dim;
        ctx.fillText(`iteration ${st.t.toLocaleString()} of ${tMax.toLocaleString()}; ${st.nodes.toLocaleString()} nodes`, x0, y0 + 14);
        let line;
        if (s.done) {
          const e = sc.curve[sc.curve.length - 1][1];
          line = `after ${st.t.toLocaleString()} iterations: exploitability ${e.toFixed(4)} (from ${sc.curve[0][1].toFixed(4)}); P(bet|J) ${alpha.toFixed(2)}, P(bet|K) ${average(st, 'K').b.toFixed(2)}, P(call|Q) ${average(st, 'Qb').b.toFixed(2)}; the file: 0.0015 at 10,000`;
          ctx.fillStyle = good;
        } else {
          line = sc.last;
          ctx.fillStyle = sc.ok ? ink : warn;
        }
        ctx.fillText(line.length > 96 ? `${line.slice(0, 95)}…` : line, 12, H - 6);
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
          new starting point
        </button>
        <span className="viz-stat">{snap.line || 'iterating…'}</span>
      </div>
    </>
  );
}
