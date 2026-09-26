import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// One bloated automaton, minimized two ways. Act 1: Moore's rounds: every
// state is re-signed by its block and its successors' blocks, and the
// whole machine is recolored each round until nothing changes. Act 2:
// Hopcroft's refinement: a splitter block and a letter are taken from
// the queue, the states that lead into the splitter are found through
// the inverse transitions, every block they straddle is split, and only
// the SMALLER piece of each split joins the queue. Both end on the same
// partition; the counters show what each paid.
const W = 640;
const H = 300;
const SEED = 20260926;
const BASE = 18;
const DUPS = 12;
const K = 2;

export function randomDfa(rand) {
  const n = BASE;
  const delta = Array.from({ length: n }, () => Array.from({ length: K }, () => Math.floor(rand() * n)));
  const accept = Array.from({ length: n }, () => rand() < 0.35);
  const order = [];
  for (let i = 1; i < n; i++) order.push(i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  let prev = 0;
  for (const s of order) {
    delta[prev][0] = s;
    prev = s;
  }
  for (let d = 0; d < DUPS; d++) {
    const incoming = new Map();
    for (let q = 0; q < delta.length; q++) {
      for (let a = 0; a < K; a++) {
        const t = delta[q][a];
        if (!incoming.has(t)) incoming.set(t, []);
        incoming.get(t).push([q, a]);
      }
    }
    const sources = [...incoming.keys()].filter((t) => incoming.get(t).length >= 2).sort((x, y) => x - y);
    const src = sources[Math.floor(rand() * sources.length)];
    delta.push([...delta[src]]);
    accept.push(accept[src]);
    const dup = delta.length - 1;
    const inc = incoming.get(src);
    const [q, a] = inc[Math.floor(rand() * inc.length)];
    delta[q][a] = dup;
  }
  return { delta, accept };
}

export function mooreRounds(delta, accept) {
  const n = delta.length;
  let cls = accept.map((x) => (x ? 1 : 0));
  const rounds = [cls.slice()];
  let examined = 0;
  for (;;) {
    const sig = new Map();
    const next = new Array(n);
    for (let s = 0; s < n; s++) {
      const key = [cls[s], ...delta[s].map((t) => cls[t])].join(',');
      examined += K;
      if (!sig.has(key)) sig.set(key, sig.size);
      next[s] = sig.get(key);
    }
    rounds.push(next.slice());
    if (sig.size === new Set(cls).size) return { rounds, examined, blocks: sig.size };
    cls = next;
  }
}

export function hopcroftSteps(delta, accept) {
  const n = delta.length;
  const inv = Array.from({ length: n }, () => Array.from({ length: K }, () => []));
  for (let s = 0; s < n; s++) for (let a = 0; a < K; a++) inv[delta[s][a]][a].push(s);
  const acc = new Set();
  const rej = new Set();
  for (let s = 0; s < n; s++) (accept[s] ? acc : rej).add(s);
  const blocks = [acc, rej].filter((b) => b.size);
  const blockOf = new Array(n).fill(0);
  blocks.forEach((b, i) => b.forEach((s) => { blockOf[s] = i; }));
  const work = [];
  const smaller = blocks.reduce((m, b) => (b.size < m.size ? b : m), blocks[0]);
  for (let a = 0; a < K; a++) work.push([smaller, a]);
  const steps = [];
  let examined = 0;
  while (work.length) {
    const [splitter, a] = work.shift();
    const x = new Set();
    for (const t of splitter) for (const s of inv[t][a]) { x.add(s); examined += 1; }
    const touched = new Map();
    for (const s of x) {
      if (!touched.has(blockOf[s])) touched.set(blockOf[s], new Set());
      touched.get(blockOf[s]).add(s);
    }
    const splits = [];
    for (const [bi, inside] of touched) {
      const block = blocks[bi];
      if (inside.size === block.size) continue;
      const outside = new Set([...block].filter((s) => !inside.has(s)));
      blocks[bi] = inside;
      blocks.push(outside);
      const nb = blocks.length - 1;
      outside.forEach((s) => { blockOf[s] = nb; });
      let queued = '';
      for (let letter = 0; letter < K; letter++) {
        let replaced = false;
        for (let idx = 0; idx < work.length; idx++) {
          if (work[idx][1] === letter && work[idx][0] === block) {
            work[idx] = [inside, letter];
            work.push([outside, letter]);
            replaced = true;
            break;
          }
        }
        if (replaced) queued = 'both';
        else {
          work.push([inside.size <= outside.size ? inside : outside, letter]);
          if (!queued) queued = inside.size <= outside.size ? 'inside' : 'outside';
        }
      }
      splits.push({ inside: [...inside], outside: [...outside], queued });
    }
    steps.push({ splitter: [...splitter], letter: a, x: [...x], splits, blockOf: blockOf.slice(), examined, queue: work.length });
  }
  return { steps, examined, blocks: blocks.length };
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const { delta, accept } = randomDfa(rand);
  const moore = mooreRounds(delta, accept);
  const hop = hopcroftSteps(delta, accept);
  return { delta, accept, moore, hop, n: delta.length };
}

const COLS = 6;

function blockColor(b, total) {
  const hue = (b * 137.508) % 360;
  return `hsl(${hue} 55% ${total > 12 ? 62 : 58}%)`;
}

export default function HopcroftViz() {
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
        const len = s.act === 0 ? s.scene.moore.rounds.length * 30 : s.scene.hop.steps.length * 14 + 20;
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
        const n = sc.n;
        const pos = (i) => [40 + (i % COLS) * 44, 52 + Math.floor(i / COLS) * 40];

        let blockOf;
        let title;
        let line;
        let splitterSet = new Set();
        let xSet = new Set();
        let splitFlash = new Set();
        if (act === 0) {
          const round = done ? sc.moore.rounds.length - 1 : Math.min(sc.moore.rounds.length - 1, Math.floor(s.tick / 30));
          blockOf = sc.moore.rounds[round];
          title = `act 1 · Moore: round ${round} of ${sc.moore.rounds.length - 1}, every state re-signed by its own block and its successors' blocks`;
          const blocks = new Set(blockOf).size;
          line = round === sc.moore.rounds.length - 1
            ? `stable: ${blocks} blocks after ${sc.moore.rounds.length - 1} rounds, ${sc.moore.examined} transitions examined (every round rescans all of them)`
            : `round ${round}: ${blocks} blocks so far; ${(round + 1) * n * K} transitions examined`;
        } else {
          const idx = done ? sc.hop.steps.length - 1 : Math.min(sc.hop.steps.length - 1, Math.floor(s.tick / 14));
          const step = sc.hop.steps[idx];
          blockOf = step.blockOf;
          splitterSet = new Set(step.splitter);
          xSet = new Set(step.x);
          for (const sp of step.splits) for (const st of sp.inside.concat(sp.outside)) splitFlash.add(st);
          title = `act 2 · Hopcroft: splitter ${idx + 1} of ${sc.hop.steps.length}: the states leading into the amber block on letter ${step.letter === 0 ? 'a' : 'b'}`;
          const finished = done || idx === sc.hop.steps.length - 1 && s.tick >= sc.hop.steps.length * 14;
          if (finished) {
            line = `same ${sc.hop.blocks} blocks as Moore, ${sc.hop.examined} transitions examined against ${sc.moore.examined}: the smaller half rule pays log n per state, not n`;
          } else if (step.splits.length) {
            const sp = step.splits[0];
            const which = sp.queued === 'both' ? 'both pieces (the block was already queued)' : `only the smaller piece (${Math.min(sp.inside.length, sp.outside.length)} states)`;
            line = `${step.x.length} states lead in; a block splits ${sp.inside.length} | ${sp.outside.length} and ${which} joins the queue (${step.queue} waiting)`;
          } else {
            line = `${step.x.length} states lead into the splitter, and every block they touch is already pure: nothing splits`;
          }
        }
        const total = new Set(blockOf).size;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(title, 14, 18);
        for (let i = 0; i < n; i++) {
          const [x, y] = pos(i);
          ctx.beginPath();
          ctx.arc(x, y, 13, 0, Math.PI * 2);
          ctx.fillStyle = blockColor(blockOf[i], total);
          ctx.fill();
          if (splitterSet.has(i)) {
            ctx.strokeStyle = heur;
            ctx.lineWidth = 3;
            ctx.stroke();
          } else if (xSet.has(i)) {
            ctx.strokeStyle = algo;
            ctx.lineWidth = 2.2;
            ctx.stroke();
          } else if (splitFlash.has(i)) {
            ctx.strokeStyle = ink;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
          ctx.fillStyle = '#0b1020';
          ctx.font = '10px ui-monospace, monospace';
          ctx.fillText(sc.accept[i] ? `${i}*` : `${i}`, x - (i >= 10 ? 8 : 4), y + 4);
        }
        // ledger
        const lx = 330;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = ink;
        ctx.fillText(`${n} states (${BASE} plus ${DUPS} duplicates), ${K} letters, * = accepting`, lx, 52);
        ctx.fillStyle = dim;
        ctx.fillText(`blocks now: ${total}`, lx, 74);
        ctx.fillStyle = algo;
        ctx.fillText(`Moore: ${sc.moore.blocks} blocks, ${sc.moore.rounds.length - 1} rounds, ${sc.moore.examined} transitions`, lx, 104);
        ctx.fillStyle = heur;
        ctx.fillText(`Hopcroft: ${sc.hop.blocks} blocks, ${sc.hop.steps.length} splitters, ${sc.hop.examined} transitions`, lx, 124);
        ctx.fillStyle = dim;
        ctx.font = '10px ui-monospace, monospace';
        ctx.fillText('amber ring: the splitter block · blue ring: states with a transition into it', lx, 150);
        ctx.fillText('a block that straddles the blue set splits; only its smaller piece is queued', lx, 164);
        ctx.fillStyle = good;
        ctx.font = '11px ui-monospace, monospace';
        if (done) ctx.fillText(`both minimizers agree: ${sc.hop.blocks} states in the minimal machine`, lx, 196);
        ctx.fillStyle = act === 0 ? algo : heur;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(line, 14, H - 8);
        statsRef.current = { line: done ? `${n} states become ${sc.hop.blocks}: Moore ${sc.moore.examined} transitions, Hopcroft ${sc.hop.examined}` : line };
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
          new machine
        </button>
        <span className="viz-stat">{snap.line || 'refining…'}</span>
      </div>
    </>
  );
}
