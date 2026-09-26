import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// A small Reed-Solomon code drawn end to end: RS(15, 9) over GF(16),
// t = 3. Act 1: a codeword is hit by three symbol errors; the six
// syndromes are computed; Berlekamp-Massey grows the shortest LFSR one
// syndrome at a time (its length L and each step's discrepancy shown);
// the Chien search sweeps the fifteen positions and the locator's roots
// light the corrupted cells; Forney's values repair them. Act 2: four
// errors, and the decoder refuses (the locator's roots do not match its
// degree), which is the bound doing its job.
const W = 640;
const H = 300;
const SEED = 20260926;
const N = 15;
const K = 9;
const T = 3;
const PRIM = 0x13; // x^4 + x + 1

const EXP = new Array(32).fill(0);
const LOG = new Array(16).fill(0);
{
  let x = 1;
  for (let i = 0; i < 15; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x10) x ^= PRIM;
  }
  for (let i = 15; i < 32; i++) EXP[i] = EXP[i - 15];
}
const gmul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);
const ginv = (a) => EXP[15 - LOG[a]];

function polyMul(p, q) {
  const out = new Array(p.length + q.length - 1).fill(0);
  p.forEach((a, i) => q.forEach((b, j) => { out[i + j] ^= gmul(a, b); }));
  return out;
}
function polyEval(p, x) {
  let y = 0;
  for (const c of p) y = gmul(y, x) ^ c;
  return y;
}
const GEN = (() => {
  let g = [1];
  for (let i = 0; i < 2 * T; i++) g = polyMul(g, [1, EXP[i]]);
  return g;
})();

export function encode(msg) {
  const rem = [...msg, ...new Array(2 * T).fill(0)];
  for (let i = 0; i < K; i++) {
    const coef = rem[i];
    if (coef) for (let j = 1; j < GEN.length; j++) rem[i + j] ^= gmul(GEN[j], coef);
  }
  return [...msg, ...rem.slice(K)];
}

export function syndromes(r) {
  const S = [];
  for (let i = 0; i < 2 * T; i++) S.push(polyEval(r, EXP[i]));
  return S;
}

// Berlekamp-Massey with a trace of every step.
export function berlekampMassey(S) {
  let C = [1];
  let B = [1];
  let L = 0;
  let m = 1;
  let b = 1;
  const trace = [];
  for (let n = 0; n < S.length; n++) {
    let d = S[n];
    for (let i = 1; i <= L; i++) d ^= gmul(C[i] || 0, S[n - i]);
    if (d === 0) {
      m += 1;
      trace.push({ n, d, L, grew: false });
      continue;
    }
    const Tc = [...C];
    const coef = gmul(d, ginv(b));
    while (C.length < B.length + m) C.push(0);
    for (let i = 0; i < B.length; i++) C[i + m] ^= gmul(coef, B[i]);
    let grew = false;
    if (2 * L <= n) {
      L = n + 1 - L;
      B = Tc;
      b = d;
      m = 1;
      grew = true;
    } else m += 1;
    trace.push({ n, d, L, grew });
  }
  return { C: C.slice(0, L + 1), L, trace };
}

export function chien(C) {
  const roots = [];
  for (let i = 0; i < N; i++) {
    const x = EXP[(15 - i) % 15];
    if (polyEval([...C].reverse(), x) === 0) roots.push(i);
  }
  return roots;
}

export function forney(S, C, positions) {
  const omega = new Array(2 * T).fill(0);
  C.forEach((c, i) => S.forEach((s, j) => { if (i + j < 2 * T) omega[i + j] ^= gmul(c, s); }));
  const dC = [];
  for (let i = 1; i < C.length; i++) dC.push(i % 2 === 1 ? C[i] : 0);
  const values = {};
  for (const pos of positions) {
    const xinv = EXP[(15 - pos) % 15];
    const num = polyEval([...omega].reverse(), xinv);
    const den = polyEval([...dC].reverse(), xinv);
    values[pos] = gmul(EXP[pos], gmul(num, ginv(den)));
  }
  return values;
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const msg = Array.from({ length: K }, () => Math.floor(rand() * 16));
  const cw = encode(msg);
  const acts = [];
  for (const e of [T, T + 1]) {
    const r = [...cw];
    const positions = [];
    while (positions.length < e) {
      const p = Math.floor(rand() * N);
      if (!positions.includes(p)) positions.push(p);
    }
    for (const p of positions) r[p] ^= 1 + Math.floor(rand() * 15);
    const S = syndromes(r);
    const bm = berlekampMassey(S);
    const roots = chien(bm.C);
    const ok = roots.length === bm.L && bm.L <= T;
    const values = ok ? forney(S, bm.C, roots) : {};
    const fixed = [...r];
    if (ok) for (const pos of roots) fixed[N - 1 - pos] ^= values[pos];
    const clean = syndromes(fixed).every((s) => s === 0);
    acts.push({ e, r, positions: positions.sort((a, b) => a - b), S, bm, roots, ok, fixed, clean, exact: clean && fixed.every((v, i) => v === cw[i]) });
  }
  return { msg, cw, acts };
}

export default function ReedSolomonViz() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);
  const statsRef = useRef({ line: '' });
  const [restart, setRestart] = useState(0);
  const [snap, setSnap] = useState({ line: '' });

  useEffect(() => {
    const id = setInterval(() => setSnap({ ...statsRef.current }), 400);
    return () => clearInterval(id);
  }, []);

  // phases within an act: 0 corrupt (12) · 1 syndromes (6 x 6) · 2 BM (6 x 8) · 3 chien (15 x 3) · 4 repair (16)
  const ACT_LEN = 12 + 36 + 48 + 45 + 16;

  useCanvasLoop(
    canvasRef,
    {
      width: W,
      height: H,
      stepMs: 45,
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
        if (s.tick >= ACT_LEN) {
          s.tick = ACT_LEN;
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
        const warn = css.getPropertyValue('--warn').trim() || '#e2606c';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';
        const sc = s.scene;
        const done = s.act >= 2;
        const a = sc.acts[Math.min(s.act, 1)];
        const t = done ? ACT_LEN : s.tick;
        const phase = t < 12 ? 0 : t < 48 ? 1 : t < 96 ? 2 : t < 141 ? 3 : 4;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(`act ${Math.min(s.act, 1) + 1} · RS(15, 9) over GF(16), t = 3: ${a.e} symbol error${a.e === 1 ? '' : 's'} ${a.e <= T ? 'inside the bound' : 'past the bound'}`, 14, 18);

        // codeword cells
        const cw = 36;
        const x0 = 32;
        const y0 = 46;
        const showFixed = phase === 4 && a.ok && (done || t - 141 >= 8);
        for (let i = 0; i < N; i++) {
          const pos = N - 1 - i;             // polynomial position (degree) of cell i
          const corrupted = a.positions.includes(i) && t >= 4;
          const located = phase >= 3 && a.roots.includes(pos) && (done || phase === 4 || t - 96 >= 3 * (pos + 1));
          const val = showFixed ? a.fixed[i] : t >= 4 ? a.r[i] : sc.cw[i];
          ctx.fillStyle = i < K ? 'rgba(93,162,255,0.10)' : 'rgba(240,185,75,0.10)';
          ctx.fillRect(x0 + i * cw, y0, cw - 3, 34);
          ctx.strokeStyle = showFixed && a.positions.includes(i) ? good : corrupted ? warn : located ? heur : i < K ? algo : heur;
          ctx.lineWidth = corrupted || located || (showFixed && a.positions.includes(i)) ? 2.2 : 1;
          ctx.strokeRect(x0 + i * cw, y0, cw - 3, 34);
          ctx.fillStyle = ink;
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(val.toString(16).toUpperCase(), x0 + i * cw + 12, y0 + 22);
        }
        ctx.fillStyle = dim;
        ctx.font = '10px ui-monospace, monospace';
        ctx.fillText('9 message symbols (blue) + 6 parity symbols (amber); red = corrupted; amber ring = located; green = repaired', x0, y0 + 50);

        // syndromes
        const sy = 128;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText('syndromes S(j) = r(α^j):', x0, sy);
        const shownS = phase === 0 ? 0 : phase === 1 ? Math.min(6, Math.floor((t - 12) / 6) + 1) : 6;
        for (let j = 0; j < shownS; j++) {
          ctx.fillStyle = a.S[j] ? heur : dim;
          ctx.fillText(a.S[j].toString(16).toUpperCase(), x0 + 180 + j * 26, sy);
        }
        if (phase === 1 && shownS < 6) {
          ctx.fillStyle = dim;
          ctx.fillText('…', x0 + 180 + shownS * 26, sy);
        }

        // Berlekamp-Massey trace
        const by = 156;
        ctx.fillStyle = dim;
        ctx.fillText('Berlekamp-Massey: shortest LFSR that generates the syndromes', x0, by);
        const shownB = phase < 2 ? 0 : phase === 2 ? Math.min(6, Math.floor((t - 48) / 8) + 1) : 6;
        for (let k = 0; k < shownB; k++) {
          const st = a.bm.trace[k];
          ctx.fillStyle = st.d === 0 ? dim : st.grew ? heur : ink;
          ctx.fillText(`n=${st.n}: d=${st.d.toString(16).toUpperCase()}${st.d === 0 ? ' (fits)' : st.grew ? ` L→${st.L}` : ' patch'}`, x0 + k * 100, by + 18);
        }
        if (shownB === 6) {
          ctx.fillStyle = heur;
          ctx.fillText(`locator degree L = ${a.bm.L}: Λ(x) = [${a.bm.C.map((c) => c.toString(16).toUpperCase()).join(' ')}]`, x0, by + 38);
        }

        // Chien search
        const cy = 222;
        if (phase >= 3) {
          const swept = done || phase === 4 ? N : Math.min(N, Math.floor((t - 96) / 3) + 1);
          ctx.fillStyle = dim;
          ctx.fillText(`Chien search: try α^-i for every position i (${swept} of ${N})`, x0, cy);
          for (let i = 0; i < swept; i++) {
            const isRoot = a.roots.includes(i);
            ctx.fillStyle = isRoot ? heur : `${dim}77`;
            ctx.fillRect(x0 + 300 + i * 18, cy - 10, 14, 12);
          }
        }

        let line;
        if (phase === 0) line = t < 4 ? 'a clean codeword: every syndrome would be zero' : `${a.e} symbols hit: positions ${a.positions.join(', ')}`;
        else if (phase === 1) line = 'evaluate the received word at the generator’s roots: nonzero syndromes mean errors';
        else if (phase === 2) line = 'each syndrome is checked against the recurrence so far; a discrepancy patches it, and every other patch lengthens it';
        else if (phase === 3) line = `roots found so far: ${a.roots.filter((r) => r <= (done ? N : Math.floor((t - 96) / 3))).length}, locator degree ${a.bm.L}`;
        else if (a.ok) line = `${a.roots.length} roots match degree ${a.bm.L}: Forney values applied, syndromes all zero, message recovered exactly: ${a.exact ? 'yes' : 'no'}`;
        else line = `${a.roots.length} roots for a degree-${a.bm.L} locator: the decoder refuses rather than guess: ${a.e} errors exceed t = ${T}`;
        ctx.fillStyle = phase === 4 ? (a.ok ? good : warn) : phase === 0 && t >= 4 ? warn : ink;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(line, 14, H - 8);
        statsRef.current = { line: done ? 'three errors repaired exactly, four refused: the syndromes only know what 2t equations can say' : line };
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
          new codeword
        </button>
        <span className="viz-stat">{snap.line || 'encoding…'}</span>
      </div>
    </>
  );
}
