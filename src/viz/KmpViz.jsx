import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The live comparison. Both panels scan the SAME mutated CA-repeat strand for
// the same 12-character pattern, one comparison at a time. Each cell's color
// is how many times that text character has been examined: once is blue, a
// couple of times amber, more is red. KMP's panel stays cool because its text
// finger never moves backward; the naive scan's panel heats up because every
// failed alignment re-reads what it already saw. Work counters use the same
// currency as the tested Python solution: one unit per character examined.
const COLS = 44;
const ROWS = 8;
const CELL = 14;
const N = COLS * ROWS;
const MARGIN = 12;
const LABEL_H = 18;
const PANEL_H = LABEL_H + ROWS * CELL;
const GAP = 16;
const W = MARGIN * 2 + COLS * CELL;
const H = 8 + PANEL_H + GAP + PANEL_H + 10;
const SEED = 20260827;
const PATTERN = 'CACACACACACA'; // (CA) x 6, period two, the strand's own repeat
const M = PATTERN.length;
const STEP_BUDGET = 5; // comparisons per tick per matcher

function makeStrand(seed) {
  const rand = mulberry32(seed);
  const chars = new Array(N);
  for (let i = 0; i < N; i++) chars[i] = i % 2 === 0 ? 'C' : 'A';
  for (let i = 0; i < N; i++) {
    if (rand() < 0.05) chars[i] = rand() < 0.5 ? 'G' : 'T';
  }
  return chars;
}

function failureFunction(p) {
  const fail = new Array(p.length + 1).fill(0);
  let k = 0;
  for (let j = 1; j < p.length; j++) {
    while (k > 0 && p[j] !== p[k]) k = fail[k];
    if (p[j] === p[k]) k += 1;
    fail[j + 1] = k;
  }
  return fail;
}

// Comparison-granular matchers, so the two panels advance in honest lockstep:
// one call to step() is exactly one character examined.
function makeKmp(text) {
  const fail = failureFunction(PATTERN);
  return {
    label: 'Knuth-Morris-Pratt',
    i: 0,
    j: 0,
    work: 0,
    touches: new Uint16Array(N),
    matched: new Uint8Array(N),
    matches: 0,
    done: false,
    cursor: 0,
    step() {
      if (this.done) return;
      if (this.i >= N) { this.done = true; return; }
      this.work += 1;
      this.touches[this.i] += 1;
      this.cursor = this.i;
      if (text[this.i] === PATTERN[this.j]) {
        this.j += 1;
        this.i += 1;
        if (this.j === M) {
          this.matches += 1;
          for (let k = this.i - M; k < this.i; k++) this.matched[k] = 1;
          this.j = fail[M];
        }
      } else if (this.j > 0) {
        this.j = fail[this.j]; // the text finger stays put
      } else {
        this.i += 1;
      }
      if (this.i >= N) this.done = true;
    },
  };
}

function makeNaive(text) {
  return {
    label: 'naive scan',
    s: 0,
    j: 0,
    work: 0,
    touches: new Uint16Array(N),
    matched: new Uint8Array(N),
    matches: 0,
    done: false,
    cursor: 0,
    step() {
      if (this.done) return;
      if (this.s > N - M) { this.done = true; return; }
      const idx = this.s + this.j;
      this.work += 1;
      this.touches[idx] += 1;
      this.cursor = idx;
      if (text[idx] === PATTERN[this.j]) {
        this.j += 1;
        if (this.j === M) {
          this.matches += 1;
          for (let k = this.s; k < this.s + M; k++) this.matched[k] = 1;
          this.s += 1; // slide by one: the finger falls back eleven places
          this.j = 0;
        }
      } else {
        this.s += 1;
        this.j = 0;
      }
      if (this.s > N - M) this.done = true;
    },
  };
}

function drawPanel(ctx, run, text, y0, colors) {
  const { algo, heur, warn, path, dim, ink } = colors;
  ctx.fillStyle = dim;
  ctx.font = '11px ui-monospace, monospace';
  const status = run.done ? ' · done' : '';
  ctx.fillText(
    `${run.label} · chars examined ${run.work.toLocaleString()} · matches ${run.matches}${status}`,
    MARGIN,
    y0 + 12,
  );
  ctx.font = '10px ui-monospace, monospace';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const idx = r * COLS + c;
      const x = MARGIN + c * CELL;
      const y = y0 + LABEL_H + r * CELL;
      const t = run.touches[idx];
      if (t === 0) ctx.fillStyle = 'rgba(255,255,255,0.03)';
      else if (t === 1) ctx.fillStyle = `${algo}48`;
      else if (t <= 3) ctx.fillStyle = `${heur}55`;
      else ctx.fillStyle = `${warn}${Math.min(40 + t * 8, 200).toString(16).padStart(2, '0')}`;
      ctx.fillRect(x, y, CELL - 1, CELL - 1);
      const mutated = text[idx] === 'G' || text[idx] === 'T';
      ctx.fillStyle = mutated ? ink : dim;
      ctx.fillText(text[idx], x + 3.5, y + 10.5);
      if (run.matched[idx]) {
        ctx.fillStyle = path;
        ctx.fillRect(x, y + CELL - 3, CELL - 1, 2);
      }
    }
  }
  if (!run.done) {
    const r = Math.floor(run.cursor / COLS);
    const c = run.cursor % COLS;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(MARGIN + c * CELL - 0.5, y0 + LABEL_H + r * CELL - 0.5, CELL, CELL);
  }
}

export default function KmpViz() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);
  const statsRef = useRef({ kmp: 0, naive: 0 });
  const [restart, setRestart] = useState(0);
  const [snap, setSnap] = useState({ kmp: 0, naive: 0 });

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
      init: () => {
        const text = makeStrand(SEED + cycle.current * 7919);
        return {
          text,
          kmp: makeKmp(text),
          naive: makeNaive(text),
          rest: 0,
          stopAtRest: isStill(),
        };
      },
      tick: (s) => {
        if (s.kmp.done && s.naive.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            const text = makeStrand(SEED + cycle.current * 7919);
            s.text = text;
            s.kmp = makeKmp(text);
            s.naive = makeNaive(text);
            s.rest = 0;
          }
          return true;
        }
        for (let b = 0; b < STEP_BUDGET; b++) s.kmp.step();
        for (let b = 0; b < STEP_BUDGET; b++) s.naive.step();
        statsRef.current = { kmp: s.kmp.work, naive: s.naive.work };
        return true;
      },
      draw: (ctx, s) => {
        ctx.clearRect(0, 0, W, H);
        const css = getComputedStyle(document.documentElement);
        const colors = {
          algo: (css.getPropertyValue('--algo').trim() || '#5da2ff'),
          heur: (css.getPropertyValue('--heur').trim() || '#f0b94b'),
          warn: (css.getPropertyValue('--warn').trim() || '#ff6b6b'),
          path: (css.getPropertyValue('--path').trim() || '#62d98a'),
          dim: (css.getPropertyValue('--ink-dim').trim() || '#9aa5bd'),
          ink: (css.getPropertyValue('--ink').trim() || '#e8ecf5'),
        };
        drawPanel(ctx, s.kmp, s.text, 8, colors);
        drawPanel(ctx, s.naive, s.text, 8 + PANEL_H + GAP, colors);
      },
    },
    [restart],
  );

  const ratio = snap.kmp > 0 ? (snap.naive / snap.kmp).toFixed(1) : null;

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
          new strand
        </button>
        <span className="viz-stat">
          {ratio
            ? <>same strand, same pattern · the naive scan has examined <strong>{ratio}×</strong> the characters</>
            : 'reading the strand forward…'}
        </span>
      </div>
    </>
  );
}
