import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts of one walk. Act one: a short genome is shredded into
// k-mers, the k-mers wire themselves into a de Bruijn graph, and
// the Eulerian walk spells the genome back letter by letter: green
// when the reconstruction matches. Act two: the repeat trap: a
// motif planted three times collapses into one shared node, two
// interleaved loops hang off it, and two different walks: both
// using every k-mer exactly once: spell two different genomes:
// the truth is undecidable at this k, and raising k unties it.
const W = 640;
const H = 300;
const SEED = 20260827;
const END_HOLD = 70;

function kmerCounts(s, k) {
  const d = new Map();
  for (let i = 0; i + k <= s.length; i++) {
    const km = s.slice(i, i + k);
    d.set(km, (d.get(km) || 0) + 1);
  }
  return d;
}

export function assembleFrom(s, k, tiebreak) {
  const km = kmerCounts(s, k);
  const adj = new Map();
  const indeg = new Map();
  const outdeg = new Map();
  for (const [kmer, mult] of km) {
    const u = kmer.slice(0, -1);
    const v = kmer.slice(1);
    if (!adj.has(u)) adj.set(u, []);
    for (let m = 0; m < mult; m++) {
      adj.get(u).push(v);
      outdeg.set(u, (outdeg.get(u) || 0) + 1);
      indeg.set(v, (indeg.get(v) || 0) + 1);
    }
  }
  const nodes = new Set([...adj.keys(), ...indeg.keys()]);
  let start = null;
  for (const v of nodes) {
    const d = (outdeg.get(v) || 0) - (indeg.get(v) || 0);
    if (d === 1) start = v;
  }
  if (start === null) start = [...nodes].find((v) => (outdeg.get(v) || 0) > 0);
  const local = new Map();
  for (const [u, vs] of adj) local.set(u, [...vs].sort((a, b) => (tiebreak ? b.localeCompare(a) : a.localeCompare(b))));
  const stack = [start];
  const path = [];
  while (stack.length) {
    const v = stack[stack.length - 1];
    const l = local.get(v);
    if (l && l.length) stack.push(l.pop());
    else path.push(stack.pop());
  }
  path.reverse();
  const total = [...outdeg.values()].reduce((a, b) => a + b, 0);
  if (path.length !== total + 1) return null;
  return path[0] + path.slice(1).map((v) => v[v.length - 1]).join('');
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const bases = 'ACGT';
  const rnd = (n) => {
    let s = '';
    for (let i = 0; i < n; i++) s += bases[Math.floor(rand() * 4)];
    return s;
  };
  // Act 1: a repeat-free genome, k=6: the walk spells it back.
  let g1;
  for (;;) {
    g1 = rnd(46);
    const c5 = kmerCounts(g1, 5);
    if ([...c5.values()].every((v) => v === 1)) break;
  }
  const K1 = 6;
  const asm1 = assembleFrom(g1, K1, false);
  // Act 2: the repeat trap: motif planted three times, small k.
  const rep = rnd(6);
  let g2;
  let t1;
  let t2;
  let big;
  for (;;) {
    const a = rnd(8);
    const b = rnd(8);
    const c = rnd(8);
    const d = rnd(8);
    g2 = a + rep + b + rep + c + rep + d;
    t1 = assembleFrom(g2, 4, false);
    t2 = assembleFrom(g2, 4, true);
    big = assembleFrom(g2, 8, false);
    // require the trap at k=4 AND clean uniqueness at k=8 (flank
    // coincidences can extend the effective repeat: reroll them).
    if (t1 && t2 && t1 !== t2 && big === g2) break;
  }
  return { g1, K1, asm1, rep, g2, t1, t2, big };
}

export default function DeBruijnViz() {
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
      stepMs: 45,
      init: () => ({
        scene: makeScene(SEED + cycle.current * 7919),
        act: 0,
        tick: 0,
        rest: 0,
        stopAtRest: isStill(),
      }),
      tick: (s) => {
        if (s.act >= 2) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, {
              scene: makeScene(SEED + cycle.current * 7919),
              act: 0,
              tick: 0,
              rest: 0,
            });
          }
          return true;
        }
        s.tick += 1;
        const len = s.act === 0 ? s.scene.g1.length * 5 + 60 + END_HOLD : 5 * 60 + END_HOLD;
        if (s.tick >= len) {
          // Hold the finished act for the full rest before the next
          // act begins: every burst of motion earns its two minutes.
          s.tick = len;
          s.actRest = (s.actRest || 0) + 1;
          if (s.actRest > holdTicks(s)) {
            s.tick = 0;
            s.act += 1;
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
        const actIdx = done ? 1 : s.act;
        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';

        if (actIdx === 0) {
          const n = sc.g1.length;
          const shredEnd = 60;
          const t = done ? n * 5 + shredEnd : Math.min(s.tick, n * 5 + shredEnd);
          ctx.fillText(`act 1 · shred into ${sc.K1}-mers, wire prefix to suffix, walk every edge once`, 14, 20);

          // The hidden genome (revealed as assembled).
          const assembled = t > shredEnd ? Math.min(n, Math.ceil((t - shredEnd) / 5) + sc.K1 - 1) : 0;
          ctx.font = '13px ui-monospace, monospace';
          for (let i = 0; i < n; i++) {
            const on = i < assembled;
            ctx.fillStyle = on ? good : 'rgba(154,165,189,0.25)';
            ctx.fillText(on ? sc.asm1[i] : '·', 20 + i * 13, 240);
          }
          // k-mer confetti during shredding.
          if (t < shredEnd) {
            const nShown = Math.floor((t / shredEnd) * 12);
            for (let i = 0; i < nShown; i++) {
              const x = 40 + (i % 4) * 150;
              const y = 60 + Math.floor(i / 4) * 40;
              ctx.fillStyle = heur;
              ctx.font = '12px ui-monospace, monospace';
              ctx.fillText(sc.g1.slice(i * 3, i * 3 + sc.K1), x, y);
            }
          } else {
            // The walk: current k-mer sliding.
            const pos = Math.min(n - sc.K1, Math.floor((t - shredEnd) / 5));
            ctx.strokeStyle = algo;
            ctx.lineWidth = 2;
            ctx.strokeRect(18 + pos * 13, 226, sc.K1 * 13 + 2, 18);
            ctx.fillStyle = algo;
            ctx.font = '11px ui-monospace, monospace';
            ctx.fillText(`edge ${pos + 1}: ${sc.g1.slice(pos, pos + sc.K1)}`, 40, 120);
            ctx.fillStyle = dim;
            ctx.fillText('each k-mer: an edge from its 5-prefix to its 5-suffix: adjacency is free', 40, 144);
          }

          let line;
          if (done || t >= n * 5 + shredEnd) {
            line = `walk complete: assembly == genome, all ${n} bases: the Eulerian path IS the sequence`;
            ctx.fillStyle = good;
          } else if (t < shredEnd) {
            line = 'shredding: order lost, k-mers kept…';
            ctx.fillStyle = heur;
          } else {
            line = `walking: every edge exactly once, spelling one base per step`;
            ctx.fillStyle = ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = { line };
        } else {
          const phase = done ? 4 : Math.min(Math.floor(s.tick / 60), 4);
          ctx.fillText('act 2 · a 6-base motif planted three times, read at k = 4: the trap', 14, 20);

          // The collapsed node with two loops.
          ctx.strokeStyle = heur;
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.arc(320, 100, 22, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = heur;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText('the repeat,', 292, 96);
          ctx.fillText('collapsed', 296, 110);
          ctx.strokeStyle = 'rgba(154,165,189,0.5)';
          ctx.lineWidth = 1.6;
          // in from A, out to D, two loops B and C.
          ctx.beginPath();
          ctx.moveTo(120, 100);
          ctx.lineTo(296, 100);
          ctx.moveTo(344, 100);
          ctx.lineTo(540, 100);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(320, 55, 28, 0.3, Math.PI - 0.3, false);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(320, 145, 28, Math.PI + 0.3, -0.3, false);
          ctx.stroke();
          ctx.fillStyle = dim;
          ctx.fillText('A →', 120, 92);
          ctx.fillText('→ D', 545, 92);
          ctx.fillText('loop B', 350, 40);
          ctx.fillText('loop C', 350, 168);

          ctx.font = '11px ui-monospace, monospace';
          if (phase >= 1) {
            ctx.fillStyle = warn;
            ctx.fillText(`walk 1: A · B · C · D → …${sc.t1.slice(8, 34)}…`, 60, 205);
          }
          if (phase >= 2) {
            ctx.fillStyle = warn;
            ctx.fillText(`walk 2: A · C · B · D → …${sc.t2.slice(8, 34)}…`, 60, 225);
          }
          if (phase >= 3) {
            ctx.fillStyle = ink;
            ctx.fillText('both use every k-mer exactly once: the spectrum cannot tell them apart', 60, 247);
          }
          if (phase >= 4 || done) {
            ctx.fillStyle = good;
            ctx.fillText(`raise k past the repeat (k = 8): copies separate: unique walk == genome: ${sc.big === sc.g2 ? 'exact' : ''}`, 60, 267);
          }

          let line;
          if (done || phase >= 4) {
            line = 'repeats longer than k−1 are invisible: read length is not a detail, it is the theorem';
            ctx.fillStyle = warn;
          } else {
            line = ['the two middle segments hang as loops off one collapsed node…', 'first walk: B before C', 'second walk: C before B: same k-mers, different genome', 'two truths, one spectrum'][phase];
            ctx.fillStyle = phase >= 2 ? warn : ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = {
            line: done
              ? 'adjacency for free, ambiguity at the repeats: k is the whole bargain'
              : line,
          };
        }
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
          new genome
        </button>
        <span className="viz-stat">
          {snap.line || 'shredding the reads…'}
        </span>
      </div>
    </>
  );
}
