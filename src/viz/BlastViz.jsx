import DiagramViewport from '../components/DiagramViewport.jsx';
import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Seed and extend on a dot plot: a seeded query of 36 bases against a subject
// of 72 bases holding a planted, mutated copy of the query. One tick looks up
// one query word (w = 7) in the subject's word index; every hit on a diagonal
// not yet covered is extended both ways without gaps until the score falls
// X = 40 below its best. Checked every tick: each HSP score recounts from its
// extents and never exceeds the Smith-Waterman score computed up front.
const W = 640;
const H = 300;
const SEED = 20261010;
const QL = 36;
const SL = 72;
const WORD = 7;
const XDROP = 40;
const MATCH = 5;
const MIS = -4;
const GAP = -6;
const BASES = 'ACGT';

function swScore(a, b) {
  let best = 0;
  let prev = new Array(b.length + 1).fill(0);
  for (let i = 0; i < a.length; i += 1) {
    const cur = new Array(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j += 1) {
      let v = prev[j - 1] + (a[i] === b[j - 1] ? MATCH : MIS);
      v = Math.max(v, prev[j] + GAP, cur[j - 1] + GAP, 0);
      cur[j] = v;
      if (v > best) best = v;
    }
    prev = cur;
  }
  return best;
}

function recount(q, s, qs, qe, diag) {
  let t = 0;
  for (let i = qs; i < qe; i += 1) t += q[i] === s[i + diag] ? MATCH : MIS;
  return t;
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const pick = () => BASES[Math.floor(rand() * 4)];
  let q = '';
  for (let i = 0; i < QL; i += 1) q += pick();
  const div = [0.1, 0.2, 0.3][Math.floor(rand() * 3)];
  let core = '';
  for (let i = 0; i < QL; i += 1) {
    const r = rand();
    if (r < div) core += BASES.replace(q[i], '')[Math.floor(rand() * 3)];
    else if (r < div * 1.1) core += rand() < 0.5 ? q[i] + pick() : '';
    else core += q[i];
  }
  const at = 8 + Math.floor(rand() * (SL - core.length - 16));
  let s = '';
  for (let i = 0; i < SL; i += 1) s += pick();
  s = s.slice(0, at) + core + s.slice(at + core.length);
  s = s.slice(0, SL);
  const index = new Map();
  for (let p = 0; p + WORD <= s.length; p += 1) {
    const w = s.slice(p, p + WORD);
    if (!index.has(w)) index.set(w, []);
    index.get(w).push(p);
  }
  return { q, s, div, at, index, sw: swScore(q, s), qp: 0, hsps: [], seeds: [], hits: 0, cells: 0, best: 0, ok: true, done: false, last: `planted copy at ${(div * 100).toFixed(0)}% divergence; Smith-Waterman score ${swScore(q, s)} from ${QL * SL} cells; scanning words of ${WORD}` };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  if (sc.qp + WORD > QL) {
    sc.done = true;
    const full = QL * SL;
    sc.last = `done: ${sc.hits} hits, ${sc.hsps.length} extensions, ${sc.cells} cells against ${full} for the full matrix; best HSP ${sc.best}; SW ${sc.sw}${sc.best === 0 ? ' (no seed fired: the homolog is invisible to this word size)' : ''}; invariant ${sc.ok ? 'holds' : 'BROKEN'}`;
    return true;
  }
  const qp = sc.qp;
  const word = sc.q.slice(qp, qp + WORD);
  let action = `word ${qp + 1} of ${QL - WORD + 1} (${word}): `;
  const hits = sc.index.get(word) || [];
  if (hits.length === 0) action += 'no hit';
  for (const sp of hits) {
    sc.hits += 1;
    const diag = sp - qp;
    sc.seeds.push({ qp, diag });
    if (sc.hsps.some((h) => h.diag === diag && h.qs <= qp && qp < h.qe)) {
      action += 'hit inside a known HSP; ';
      continue;
    }
    let score = WORD * MATCH;
    let best = score;
    let qe = qp + WORD;
    let i = qe;
    let cells = 0;
    while (i < QL && i + diag < SL) {
      cells += 1;
      score += sc.q[i] === sc.s[i + diag] ? MATCH : MIS;
      i += 1;
      if (score > best) { best = score; qe = i; } else if (best - score > XDROP) break;
    }
    score = best;
    let qs = qp;
    i = qp - 1;
    while (i >= 0 && i + diag >= 0) {
      cells += 1;
      score += sc.q[i] === sc.s[i + diag] ? MATCH : MIS;
      if (score > best) { best = score; qs = i; } else if (best - score > XDROP) break;
      i -= 1;
    }
    sc.cells += cells;
    sc.hsps.push({ qs, qe, diag, score: best });
    if (recount(sc.q, sc.s, qs, qe, diag) !== best || best > sc.sw) sc.ok = false;
    if (best > sc.best) sc.best = best;
    action += `hit at subject ${sp + 1}, extended to ${qe - qs} bases scoring ${best} in ${cells} cells; `;
  }
  sc.qp += 1;
  sc.last = action.replace(/; $/, '');
  return false;
}

export default function BlastViz() {
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
        const x0 = 40;
        const y0 = 34;
        const cw = 7;
        const ch = 5;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(`subject ${SL} × query ${QL}; gray: matches; amber: ${WORD}-base hits; blue: ungapped extensions`, 12, 18);
        for (let i = 0; i < QL; i += 1) {
          for (let j = 0; j < SL; j += 1) {
            if (sc.q[i] === sc.s[j]) {
              ctx.fillStyle = `${dim}55`;
              ctx.fillRect(x0 + j * cw + 2, y0 + i * ch + 1, 3, 3);
            }
          }
        }
        ctx.fillStyle = `${good}33`;
        ctx.fillRect(x0 + sc.at * cw, y0 - 3, Math.min(QL, SL - sc.at) * cw, 3);
        for (const h of sc.hsps) {
          ctx.strokeStyle = h.score === sc.best && s.done ? good : algo;
          ctx.lineWidth = h.score === sc.best && s.done ? 3 : 2;
          ctx.beginPath();
          ctx.moveTo(x0 + (h.qs + h.diag) * cw + 3, y0 + h.qs * ch + 2);
          ctx.lineTo(x0 + (h.qe + h.diag) * cw + 3, y0 + h.qe * ch + 2);
          ctx.stroke();
        }
        for (const sd of sc.seeds) {
          ctx.fillStyle = heur;
          for (let k = 0; k < WORD; k += 1) ctx.fillRect(x0 + (sd.qp + k + sd.diag) * cw + 2, y0 + (sd.qp + k) * ch + 1, 3, 3);
        }
        if (!s.done) {
          ctx.fillStyle = ink;
          ctx.fillRect(x0 - 8, y0 + sc.qp * ch, 5, WORD * ch);
        }
        const ty = y0 + QL * ch + 18;
        ctx.fillStyle = heur;
        ctx.fillText(`word hits ${sc.hits}`, 40, ty);
        ctx.fillStyle = algo;
        ctx.fillText(`extensions ${sc.hsps.length}, cells ${sc.cells} (full matrix ${QL * SL})`, 170, ty);
        ctx.fillStyle = sc.best > 0 ? good : dim;
        ctx.fillText(`best HSP ${sc.best}; SW ${sc.sw}`, 420, ty);
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? 'invariant: every HSP recounts and never exceeds Smith-Waterman' : 'INVARIANT BROKEN', 40, ty + 16);
        ctx.fillStyle = dim;
        ctx.fillText(`green bar: the planted copy, ${(sc.div * 100).toFixed(0)}% divergent; the file: 4.2 million cells against 5,408`, 40, ty + 32);
        ctx.fillStyle = s.done ? (sc.ok ? good : warn) : ink;
        const line = sc.last;
        ctx.fillText(line.length > 100 ? `${line.slice(0, 99)}…` : line, 12, H - 6);
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
          new query
        </button>
        <span className="viz-stat">{snap.line || 'seeding…'}</span>
      </div>
    </>
  );
}
