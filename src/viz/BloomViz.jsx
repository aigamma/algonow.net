import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks } from './useCanvasLoop.js';

// The live comparison. Both panels hold the SAME 1,200-bit array budget and
// remember the SAME 100 keys; the only difference is k, the number of bits
// each key lights. Then the same 600 strangers knock on both doors. A blue
// cell is a set bit; the outlined cells are the probes of the latest query;
// a red flash is a false positive, a lie. The k = 1 panel stays nearly dark
// and lies constantly (one coincidence is enough); the k = 8 panel runs half
// lit and almost never lies, which is the optimum the lesson derives.
const COLS = 40;
const ROWS = 30;
const M = COLS * ROWS; // 1,200 bits
const CELL = 7;
const PANEL_W = COLS * CELL;
const PANEL_H = ROWS * CELL;
const MARGIN = 12;
const GAP = 26;
const LABEL_H = 18;
const W = MARGIN * 2 + PANEL_W * 2 + GAP;
const H = 8 + LABEL_H + PANEL_H + 12;
const SEED = 20260827;
const KEYS = 100;
const STRANGERS = 600;

function h32(x) {
  x = (x + 0x9e3779b9) | 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return x >>> 0;
}

function positions(key, k, salt) {
  const out = [];
  for (let i = 0; i < k; i++) {
    out.push(h32(key ^ h32(i * 40503 + salt)) % M);
  }
  return out;
}

function makeFilter(k, salt, label) {
  return {
    k,
    salt,
    label,
    bits: new Uint8Array(M),
    setCount: 0,
    inserted: 0,
    queried: 0,
    lies: 0,
    lastProbes: [],
    lastLie: false,
    done: false,
    insertOne() {
      for (const p of positions(this.inserted, this.k, this.salt)) {
        if (!this.bits[p]) {
          this.bits[p] = 1;
          this.setCount += 1;
        }
      }
      this.inserted += 1;
    },
    queryOne() {
      // Strangers live far above the inserted key range.
      const key = 10_000 + this.queried;
      const probes = [];
      let allSet = true;
      for (const p of positions(key, this.k, this.salt)) {
        probes.push(p);
        if (!this.bits[p]) {
          allSet = false; // a zero is a certain no: stop
          break;
        }
      }
      this.lastProbes = probes;
      this.lastLie = allSet;
      if (allSet) this.lies += 1;
      this.queried += 1;
    },
    step() {
      if (this.done) return;
      if (this.inserted < KEYS) this.insertOne();
      else if (this.queried < STRANGERS) this.queryOne();
      else {
        this.done = true;
        this.lastProbes = [];
        this.lastLie = false;
      }
    },
  };
}

function drawPanel(ctx, f, x0, colors) {
  const { algo, warn, dim, ink } = colors;
  ctx.fillStyle = dim;
  ctx.font = '11px ui-monospace, monospace';
  const phase = f.done
    ? 'done'
    : f.inserted < KEYS
      ? `storing key ${f.inserted + 1}/${KEYS}`
      : `stranger ${f.queried + 1}/${STRANGERS}`;
  const fill = Math.round((f.setCount / M) * 100);
  ctx.fillText(
    `${f.label} · fill ${fill}% · lies ${f.lies} · ${phase}`,
    x0,
    8 + 11,
  );
  const y0 = 8 + LABEL_H;
  for (let i = 0; i < M; i++) {
    const x = x0 + (i % COLS) * CELL;
    const y = y0 + Math.floor(i / COLS) * CELL;
    ctx.fillStyle = f.bits[i] ? `${algo}90` : 'rgba(255,255,255,0.05)';
    ctx.fillRect(x, y, CELL - 1, CELL - 1);
  }
  ctx.lineWidth = 1.5;
  for (const p of f.lastProbes) {
    const x = x0 + (p % COLS) * CELL;
    const y = y0 + Math.floor(p / COLS) * CELL;
    ctx.strokeStyle = f.lastLie ? warn : ink;
    ctx.strokeRect(x - 0.5, y - 0.5, CELL, CELL);
  }
  if (f.lastLie) {
    ctx.strokeStyle = warn;
    ctx.lineWidth = 2;
    ctx.strokeRect(x0 - 3, y0 - 3, PANEL_W + 5, PANEL_H + 5);
  }
}

export default function BloomViz() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);
  const statsRef = useRef({ lies8: 0, lies1: 0, phase: 'storing' });
  const [restart, setRestart] = useState(0);
  const [snap, setSnap] = useState({ lies8: 0, lies1: 0, phase: 'storing' });

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
        const salt = SEED + cycle.current * 7919;
        return {
          tuned: makeFilter(8, salt, 'k = 8 (tuned)'),
          lazy: makeFilter(1, salt, 'k = 1 (lazy)'),
          rest: 0,
          stopAtRest: isStill(),
        };
      },
      tick: (s) => {
        if (s.tuned.done && s.lazy.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            const salt = SEED + cycle.current * 7919;
            s.tuned = makeFilter(8, salt, 'k = 8 (tuned)');
            s.lazy = makeFilter(1, salt, 'k = 1 (lazy)');
            s.rest = 0;
          }
          return true;
        }
        const budget = s.tuned.inserted < KEYS ? 2 : 3;
        for (let b = 0; b < budget; b++) {
          s.tuned.step();
          s.lazy.step();
        }
        statsRef.current = {
          lies8: s.tuned.lies,
          lies1: s.lazy.lies,
          phase: s.tuned.inserted < KEYS ? 'storing' : 'querying',
        };
        return true;
      },
      draw: (ctx, s) => {
        ctx.clearRect(0, 0, W, H);
        const css = getComputedStyle(document.documentElement);
        const colors = {
          algo: css.getPropertyValue('--algo').trim() || '#5da2ff',
          warn: css.getPropertyValue('--warn').trim() || '#e06767',
          dim: css.getPropertyValue('--ink-dim').trim() || '#9aa5bd',
          ink: css.getPropertyValue('--ink').trim() || '#e9edf6',
        };
        drawPanel(ctx, s.tuned, MARGIN, colors);
        drawPanel(ctx, s.lazy, MARGIN + PANEL_W + GAP, colors);
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
          new keys
        </button>
        <span className="viz-stat">
          {snap.phase === 'storing'
            ? 'same 1,200 bits, same 100 keys, different k…'
            : <>same 600 strangers at both doors · k = 1 lied <strong>{snap.lies1}</strong> times, k = 8 lied <strong>{snap.lies8}</strong></>}
        </span>
      </div>
    </>
  );
}
