import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Eight queens as exact cover, searched two ways at once. Left: Algorithm
// X on dancing links branching on the smallest column (Knuth's S
// heuristic). Right: the same links, the same rows, branching on the
// first live column. Both find all 92 solutions; the trees differ. Each
// tick replays one search node from a precomputed trace, so the boards
// show the partial solution being built and torn down, and the counters
// show the price of the branching rule. Each cycle shuffles the row
// order, which changes the order the tree is walked in (a full search
// visits the same nodes whatever the sibling order) but never the answer.
const W = 640;
const H = 300;
const SEED = 20260926;
const N = 8;

function makeNode() {
  const n = { L: null, R: null, U: null, D: null, C: null, row: -1, size: 0, name: '' };
  n.L = n.R = n.U = n.D = n.C = n;
  return n;
}

export function buildDlx(primary, secondary, rows) {
  const root = makeNode();
  const cols = new Map();
  let prev = root;
  for (const name of primary) {
    const c = makeNode();
    c.name = name;
    c.L = prev;
    c.R = prev.R;
    prev.R.L = c;
    prev.R = c;
    prev = c;
    cols.set(name, c);
  }
  for (const name of secondary) {
    const c = makeNode();
    c.name = name;
    cols.set(name, c);
  }
  rows.forEach((names, rowIndex) => {
    let first = null;
    for (const name of names) {
      const c = cols.get(name);
      const x = makeNode();
      x.C = c;
      x.row = rowIndex;
      x.U = c.U;
      x.D = c;
      c.U.D = x;
      c.U = x;
      c.size += 1;
      if (!first) first = x;
      else {
        x.L = first.L;
        x.R = first;
        first.L.R = x;
        first.L = x;
      }
    }
  });
  return { root, cols };
}

function cover(c) {
  c.R.L = c.L;
  c.L.R = c.R;
  for (let i = c.D; i !== c; i = i.D) {
    for (let j = i.R; j !== i; j = j.R) {
      j.D.U = j.U;
      j.U.D = j.D;
      j.C.size -= 1;
    }
  }
}

function uncover(c) {
  for (let i = c.U; i !== c; i = i.U) {
    for (let j = i.L; j !== i; j = j.L) {
      j.C.size += 1;
      j.D.U = j;
      j.U.D = j;
    }
  }
  c.R.L = c;
  c.L.R = c;
}

// Runs the whole search and records a trace of events:
// {t:'place', row, col, size, min, max}, {t:'remove', row}, {t:'solution'}.
export function traceSearch(dlx, smallest, maxEvents = 12000) {
  const { root } = dlx;
  const events = [];
  const recurse = () => {
    if (events.length >= maxEvents) return;
    if (root.R === root) {
      events.push({ t: 'solution' });
      return;
    }
    let c = root.R;
    let min = Infinity;
    let max = 0;
    for (let x = root.R; x !== root; x = x.R) {
      if (x.size < min) min = x.size;
      if (x.size > max) max = x.size;
      if (smallest && x.size < c.size) c = x;
    }
    if (c.size === 0) return;
    cover(c);
    for (let r = c.D; r !== c; r = r.D) {
      if (events.length >= maxEvents) break;
      events.push({ t: 'place', row: r.row, col: c.name, size: c.size, min, max });
      for (let j = r.R; j !== r; j = j.R) cover(j.C);
      recurse();
      for (let j = r.L; j !== r; j = j.L) uncover(j.C);
      events.push({ t: 'remove', row: r.row });
    }
    uncover(c);
  };
  recurse();
  return events;
}

export function queensRows(n, rand) {
  const primary = [];
  for (let i = 0; i < n; i++) primary.push(`r${i}`);
  for (let i = 0; i < n; i++) primary.push(`f${i}`);
  const secondary = [];
  for (let i = 0; i < 2 * n - 1; i++) secondary.push(`a${i}`, `b${i}`);
  const rows = [];
  for (let r = 0; r < n; r++) {
    for (let f = 0; f < n; f++) rows.push({ names: [`r${r}`, `f${f}`, `a${r + f}`, `b${r - f + n - 1}`], r, f });
  }
  // A seeded shuffle changes the walk order without changing the answer.
  for (let i = rows.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [rows[i], rows[j]] = [rows[j], rows[i]];
  }
  return { primary, secondary, rows };
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const { primary, secondary, rows } = queensRows(N, rand);
  const names = rows.map((x) => x.names);
  const smart = traceSearch(buildDlx(primary, secondary, names), true);
  const naive = traceSearch(buildDlx(primary, secondary, names), false);
  const count = (ev) => ({
    nodes: ev.filter((e) => e.t === 'place').length,
    solutions: ev.filter((e) => e.t === 'solution').length,
  });
  return { rows, smart, naive, smartTotal: count(smart), naiveTotal: count(naive) };
}

function replay(events, upto) {
  const placed = [];
  let nodes = 0;
  let solutions = 0;
  let last = null;
  for (let i = 0; i < Math.min(upto, events.length); i++) {
    const e = events[i];
    if (e.t === 'place') {
      placed.push(e.row);
      nodes += 1;
      last = e;
    } else if (e.t === 'remove') {
      placed.pop();
    } else solutions += 1;
  }
  return { placed, nodes, solutions, last, finished: upto >= events.length };
}

export default function DlxViz() {
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
      stepMs: 30,
      init: () => ({ scene: makeScene(SEED + cycle.current * 7919), tick: 0, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        const len = Math.max(s.scene.smart.length, s.scene.naive.length);
        if (s.tick >= len) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, { scene: makeScene(SEED + cycle.current * 7919), tick: 0, rest: 0 });
          }
          return true;
        }
        s.tick += 4;
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
        const panels = [
          { x0: 40, events: sc.smart, total: sc.smartTotal, label: 'smallest column first (Knuth’s S heuristic)', color: heur },
          { x0: 360, events: sc.naive, total: sc.naiveTotal, label: 'first live column (the rule removed)', color: dim },
        ];
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText('eight queens as exact cover: one node per step, the links dancing beneath the boards', 14, 18);
        const cell = 22;
        const y0 = 40;
        for (const p of panels) {
          const st = replay(p.events, s.tick);
          for (let r = 0; r < N; r++) {
            for (let f = 0; f < N; f++) {
              ctx.fillStyle = (r + f) % 2 ? 'rgba(154,165,189,0.16)' : 'rgba(154,165,189,0.06)';
              ctx.fillRect(p.x0 + f * cell, y0 + r * cell, cell, cell);
            }
          }
          for (const row of st.placed) {
            const q = sc.rows[row];
            ctx.fillStyle = algo;
            ctx.beginPath();
            ctx.arc(p.x0 + q.f * cell + cell / 2, y0 + q.r * cell + cell / 2, 7, 0, Math.PI * 2);
            ctx.fill();
          }
          if (st.last && !st.finished) {
            const q = sc.rows[st.last.row];
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 2;
            ctx.strokeRect(p.x0 + q.f * cell + 1, y0 + q.r * cell + 1, cell - 2, cell - 2);
          }
          ctx.fillStyle = p.color;
          ctx.font = '10px ui-monospace, monospace';
          ctx.fillText(p.label, p.x0, y0 + N * cell + 14);
          ctx.fillStyle = ink;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText(`${st.nodes.toLocaleString()} nodes · ${st.solutions} of 92 solutions${st.finished ? ' · done' : ''}`, p.x0, y0 + N * cell + 30);
          if (st.last && !st.finished && p.color === heur) {
            ctx.fillStyle = heur;
            ctx.font = '10px ui-monospace, monospace';
            ctx.fillText(`branch on ${st.last.col}: ${st.last.size} candidates (columns range ${st.last.min} to ${st.last.max})`, p.x0, y0 + N * cell + 46);
          }
        }
        // the ledger between the boards
        const mid = 232;
        ctx.fillStyle = dim;
        ctx.font = '10px ui-monospace, monospace';
        ctx.fillText('same 64 rows,', mid, 120);
        ctx.fillText('same 92 answers,', mid, 134);
        ctx.fillText('two branching rules', mid, 148);
        const a = replay(sc.smart, s.tick);
        const b = replay(sc.naive, s.tick);
        let line;
        if (a.finished && b.finished) {
          line = `finished: ${sc.smartTotal.nodes.toLocaleString()} nodes with the smallest column against ${sc.naiveTotal.nodes.toLocaleString()} without: every node undone in two pointer writes per link`;
          ctx.fillStyle = good;
        } else if (a.finished) {
          line = `the smallest-column search is done at ${sc.smartTotal.nodes.toLocaleString()} nodes; the first-column search is still at ${b.nodes.toLocaleString()}`;
          ctx.fillStyle = heur;
        } else {
          line = 'cover a column, try a row, cover its other columns, recurse, uncover in reverse: x.left.right = x, x.right.left = x';
          ctx.fillStyle = ink;
        }
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(line, 14, H - 8);
        statsRef.current = {
          line: a.finished && b.finished
            ? `92 solutions both ways: ${sc.smartTotal.nodes.toLocaleString()} nodes branching on the smallest column, ${sc.naiveTotal.nodes.toLocaleString()} on the first`
            : line,
        };
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
          reorder rows
        </button>
        <span className="viz-stat">{snap.line || 'covering…'}</span>
      </div>
    </>
  );
}
