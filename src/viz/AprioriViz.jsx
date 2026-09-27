import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Ten items, forty baskets with three planted itemsets, minimum
// support six baskets. The lattice is mined one level per two ticks:
// first the join step proposes candidates from the previous level's
// frequent sets and the subset prune strikes out (red) every candidate
// with an infrequent subset; then the survivors are counted against
// the baskets and the frequent ones turn green. The counters compare
// the containment tests actually made with the tests the unpruned
// join would have made.
const W = 640;
const H = 300;
const SEED = 20260926;
const ITEMS = 'ABCDEFGHIJ'.split('');
const N_BASKETS = 40;
const MIN_COUNT = 6;
const MAX_LEVEL = 4;

function combos(arr, k) {
  const out = [];
  const rec = (start, cur) => {
    if (cur.length === k) {
      out.push(cur.slice());
      return;
    }
    for (let i = start; i < arr.length; i++) {
      cur.push(arr[i]);
      rec(i + 1, cur);
      cur.pop();
    }
  };
  rec(0, []);
  return out;
}

const key = (set) => set.slice().sort().join('');

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const planted = [];
  while (planted.length < 3) {
    const size = 2 + Math.floor(rand() * 3);
    const pick = ITEMS.slice().sort(() => rand() - 0.5).slice(0, size);
    planted.push({ items: pick, p: 0.25 + rand() * 0.3 });
  }
  const baskets = [];
  for (let b = 0; b < N_BASKETS; b++) {
    const s = new Set();
    for (const pl of planted) if (rand() < pl.p) pl.items.forEach((i) => s.add(i));
    for (let k = 0; k < 2; k++) s.add(ITEMS[Math.floor(rand() * ITEMS.length)]);
    baskets.push(s);
  }
  return { baskets, planted, level: 1, phase: 'count', rows: [], frequentPrev: null, tests: 0, testsUnpruned: 0, done: false };
}

function support(sc, items) {
  let n = 0;
  for (const b of sc.baskets) if (items.every((i) => b.has(i))) n += 1;
  return n;
}

export function sceneTick(sc) {
  if (sc.done) return true;
  if (sc.level === 1 && sc.phase === 'count') {
    const row = ITEMS.map((i) => ({ items: [i], pruned: false, count: support(sc, [i]) }));
    sc.tests += ITEMS.length * N_BASKETS;
    sc.testsUnpruned += ITEMS.length * N_BASKETS;
    row.forEach((c) => (c.frequent = c.count >= MIN_COUNT));
    sc.rows.push({ level: 1, cands: row, counted: true });
    sc.frequentPrev = row.filter((c) => c.frequent).map((c) => c.items);
    sc.level = 2;
    sc.phase = 'join';
    return false;
  }
  if (sc.phase === 'join') {
    const prevKeys = new Set(sc.frequentPrev.map(key));
    const joined = new Map();
    for (let a = 0; a < sc.frequentPrev.length; a++) {
      for (let b = a + 1; b < sc.frequentPrev.length; b++) {
        const A = sc.frequentPrev[a].slice().sort();
        const B = sc.frequentPrev[b].slice().sort();
        if (A.slice(0, -1).join('') !== B.slice(0, -1).join('')) continue;
        const u = Array.from(new Set([...A, ...B])).sort();
        joined.set(key(u), u);
      }
    }
    const cands = Array.from(joined.values()).map((items) => ({
      items,
      pruned: !combos(items, items.length - 1).every((sub) => prevKeys.has(key(sub))),
      count: null,
      frequent: false,
    }));
    sc.testsUnpruned += cands.length * N_BASKETS;
    sc.rows.push({ level: sc.level, cands, counted: false });
    if (cands.length === 0) {
      sc.done = true;
      return true;
    }
    sc.phase = 'count';
    return false;
  }
  const row = sc.rows[sc.rows.length - 1];
  for (const c of row.cands) {
    if (c.pruned) continue;
    c.count = support(sc, c.items);
    c.frequent = c.count >= MIN_COUNT;
    sc.tests += N_BASKETS;
  }
  row.counted = true;
  sc.frequentPrev = row.cands.filter((c) => c.frequent).map((c) => c.items);
  if (sc.frequentPrev.length < 2 || sc.level >= MAX_LEVEL) {
    sc.done = true;
    return true;
  }
  sc.level += 1;
  sc.phase = 'join';
  return false;
}

export function exhaustiveFrequent(sc) {
  const counts = new Map();
  for (const b of sc.baskets) {
    const items = Array.from(b).sort();
    for (let k = 1; k <= Math.min(MAX_LEVEL, items.length); k++) {
      for (const c of combos(items, k)) {
        const kk = c.join('');
        counts.set(kk, (counts.get(kk) || 0) + 1);
      }
    }
  }
  return new Set(Array.from(counts.entries()).filter(([, n]) => n >= MIN_COUNT).map(([kk]) => kk));
}

export function minedFrequent(sc) {
  const out = new Set();
  for (const row of sc.rows) for (const c of row.cands) if (c.frequent) out.add(key(c.items));
  return out;
}

export default function AprioriViz() {
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
      stepMs: 1000,
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
        ctx.fillText(`${ITEMS.length} items, ${N_BASKETS} baskets, minimum support ${MIN_COUNT}; one level per two ticks: join and prune, then count`, 12, 18);
        let y = 44;
        let pruned = 0;
        let counted = 0;
        let frequent = 0;
        for (const row of sc.rows) {
          ctx.fillStyle = dim;
          ctx.fillText(`size ${row.level}`, 12, y + 12);
          let x = 60;
          const cellW = row.level === 1 ? 26 : row.level === 2 ? 34 : row.level === 3 ? 42 : 50;
          for (const c of row.cands) {
            if (x + cellW > W - 12) break;
            let stroke = dim;
            let fill = 'transparent';
            if (c.pruned) {
              stroke = warn;
              pruned += 1;
            } else if (row.counted) {
              counted += 1;
              if (c.frequent) {
                stroke = good;
                fill = `${good}33`;
                frequent += 1;
              } else stroke = `${dim}88`;
            } else stroke = algo;
            ctx.fillStyle = fill;
            ctx.fillRect(x, y, cellW - 3, 18);
            ctx.strokeStyle = stroke;
            ctx.strokeRect(x, y, cellW - 3, 18);
            ctx.fillStyle = c.pruned ? warn : ink;
            ctx.fillText(c.items.join(''), x + 3, y + 13);
            if (c.pruned) {
              ctx.strokeStyle = warn;
              ctx.beginPath();
              ctx.moveTo(x, y + 9);
              ctx.lineTo(x + cellW - 3, y + 9);
              ctx.stroke();
            }
            x += cellW;
          }
          if (row.cands.length > Math.floor((W - 72) / cellW)) {
            ctx.fillStyle = dim;
            ctx.fillText(`+${row.cands.length - Math.floor((W - 72) / cellW)}`, W - 30, y + 13);
          }
          y += 30;
        }
        ctx.fillStyle = dim;
        ctx.fillText(`blue: to be counted; red, struck: pruned because a subset is infrequent; green: frequent`, 12, 214);
        ctx.fillStyle = heur;
        ctx.fillText(`containment tests: ${sc.tests.toLocaleString()} made, ${sc.testsUnpruned.toLocaleString()} without the prune; ${pruned} candidates never counted`, 12, 234);
        ctx.fillStyle = dim;
        ctx.fillText('the file measures: 5,000 baskets, 200 items, levels 3 and up 945,000 tests vs 10,040,000 unpruned', 12, 254);
        let line;
        if (s.done) {
          const mined = minedFrequent(sc);
          const truth = exhaustiveFrequent(sc);
          const ok = mined.size === truth.size && Array.from(mined).every((k) => truth.has(k));
          line = `${frequent} frequent itemsets, ${ok ? 'identical to exhaustive counting' : 'MISMATCH with exhaustive counting'}; ${sc.tests.toLocaleString()} tests against ${sc.testsUnpruned.toLocaleString()} unpruned`;
          ctx.fillStyle = ok ? good : warn;
        } else {
          const row = sc.rows[sc.rows.length - 1];
          line = row && !row.counted ? `size ${row.level}: ${row.cands.length} candidates joined, ${row.cands.filter((c) => c.pruned).length} pruned before any counting` : `size ${row ? row.level : 1} counted: ${row ? row.cands.filter((c) => c.frequent).length : 0} frequent`;
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
          new baskets
        </button>
        <span className="viz-stat">{snap.line || 'mining…'}</span>
      </div>
    </>
  );
}
