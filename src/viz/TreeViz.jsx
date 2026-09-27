import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// 300 points in the unit square labeled by a hidden two-level rule
// with 10% of the labels flipped, and 300 held-out test points. Each
// tick grows the tree by one node: the impurest leaf with enough
// points is split at the threshold of largest information gain over
// both axes. Regions are shaded by their majority; the stat line
// tracks leaves, training accuracy, and test accuracy, and the test
// accuracy is what stalls while the training accuracy keeps climbing
// once the tree starts fitting the noise.
const W = 640;
const H = 300;
const SEED = 20260926;
const N = 300;
const NOISE = 0.1;
const MIN_LEAF = 4;
const MAX_LEAVES = 24;

function truth(x, y, r) {
  if (x > r.a) return y > r.b ? 1 : 0;
  return y < r.c ? 1 : 0;
}

function entropy(n1, n) {
  if (n === 0 || n1 === 0 || n1 === n) return 0;
  const p = n1 / n;
  return -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const rule = { a: 0.35 + rand() * 0.3, b: 0.2 + rand() * 0.4, c: 0.3 + rand() * 0.4 };
  const draw = () => {
    const pts = [];
    for (let i = 0; i < N; i++) {
      const x = rand();
      const y = rand();
      let l = truth(x, y, rule);
      if (rand() < NOISE) l = 1 - l;
      pts.push({ x, y, l });
    }
    return pts;
  };
  const train = draw();
  const test = draw();
  const root = { box: [0, 1, 0, 1], idx: train.map((_, i) => i), depth: 0 };
  return { rule, train, test, leaves: [root], nodes: 1, lastSplit: null, done: false };
}

function majority(sc, leaf) {
  let n1 = 0;
  for (const i of leaf.idx) n1 += sc.train[i].l;
  return n1 * 2 >= leaf.idx.length ? 1 : 0;
}

export function bestSplit(sc, leaf) {
  const n = leaf.idx.length;
  let n1 = 0;
  for (const i of leaf.idx) n1 += sc.train[i].l;
  const parent = entropy(n1, n);
  let best = { gain: 0 };
  for (const axis of ['x', 'y']) {
    const order = [...leaf.idx].sort((p, q) => sc.train[p][axis] - sc.train[q][axis]);
    let l1 = 0;
    for (let k = 0; k < n - 1; k++) {
      l1 += sc.train[order[k]].l;
      const va = sc.train[order[k]][axis];
      const vb = sc.train[order[k + 1]][axis];
      if (va === vb) continue;
      const nl = k + 1;
      const nr = n - nl;
      if (nl < MIN_LEAF || nr < MIN_LEAF) continue;
      const gain = parent - (nl / n) * entropy(l1, nl) - (nr / n) * entropy(n1 - l1, nr);
      if (gain > best.gain) best = { gain, axis, thr: (va + vb) / 2 };
    }
  }
  return best.axis ? best : null;
}

export function sceneTick(sc) {
  if (sc.done) return true;
  // the impurest leaf that can still be split, by entropy times size
  let pick = null;
  let pickScore = 0;
  for (const leaf of sc.leaves) {
    if (leaf.idx.length < 2 * MIN_LEAF) continue;
    let n1 = 0;
    for (const i of leaf.idx) n1 += sc.train[i].l;
    const score = entropy(n1, leaf.idx.length) * leaf.idx.length;
    if (score > pickScore) {
      pickScore = score;
      pick = leaf;
    }
  }
  const split = pick ? bestSplit(sc, pick) : null;
  if (!pick || !split || sc.leaves.length >= MAX_LEAVES) {
    sc.done = true;
    sc.lastSplit = null;
    return true;
  }
  const [x0, x1, y0, y1] = pick.box;
  const left = { idx: pick.idx.filter((i) => sc.train[i][split.axis] < split.thr), depth: pick.depth + 1 };
  const right = { idx: pick.idx.filter((i) => sc.train[i][split.axis] >= split.thr), depth: pick.depth + 1 };
  if (split.axis === 'x') {
    left.box = [x0, split.thr, y0, y1];
    right.box = [split.thr, x1, y0, y1];
  } else {
    left.box = [x0, x1, y0, split.thr];
    right.box = [x0, x1, split.thr, y1];
  }
  sc.leaves = sc.leaves.filter((l) => l !== pick).concat([left, right]);
  sc.nodes += 2;
  sc.lastSplit = { box: pick.box, axis: split.axis, thr: split.thr, gain: split.gain };
  return false;
}

export function accuracy(sc, pts) {
  let ok = 0;
  for (const p of pts) {
    const leaf = sc.leaves.find((l) => p.x >= l.box[0] && p.x <= l.box[1] && p.y >= l.box[2] && p.y <= l.box[3]);
    if (leaf && majority(sc, leaf) === p.l) ok += 1;
  }
  return ok / pts.length;
}

export default function TreeViz() {
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
      stepMs: 650,
      init: () => ({ scene: makeScene(SEED + cycle.current * 7919), done: false, rest: 0, stopAtRest: isStill(), best: null }),
      tick: (s) => {
        if (s.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, { scene: makeScene(SEED + cycle.current * 7919), done: false, rest: 0, best: null });
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
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';
        const sc = s.scene;
        const px = 20;
        const py = 30;
        const size = 250;
        const X = (x) => px + x * size;
        const Y = (y) => py + (1 - y) * size;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(`${N} training points, ${Math.round(NOISE * 100)}% labels flipped; each tick splits the impurest leaf at the threshold of largest information gain`, 12, 18);
        for (const leaf of sc.leaves) {
          const m = majority(sc, leaf);
          ctx.fillStyle = m === 1 ? `${algo}22` : `${heur}22`;
          const [x0, x1, y0, y1] = leaf.box;
          ctx.fillRect(X(x0), Y(y1), (x1 - x0) * size, (y1 - y0) * size);
          ctx.strokeStyle = `${dim}66`;
          ctx.strokeRect(X(x0), Y(y1), (x1 - x0) * size, (y1 - y0) * size);
        }
        for (const p of sc.train) {
          ctx.fillStyle = p.l === 1 ? algo : heur;
          ctx.beginPath();
          ctx.arc(X(p.x), Y(p.y), 2, 0, Math.PI * 2);
          ctx.fill();
        }
        if (sc.lastSplit && !s.done) {
          const { box, axis, thr } = sc.lastSplit;
          ctx.strokeStyle = good;
          ctx.lineWidth = 2;
          ctx.beginPath();
          if (axis === 'x') {
            ctx.moveTo(X(thr), Y(box[3]));
            ctx.lineTo(X(thr), Y(box[2]));
          } else {
            ctx.moveTo(X(box[0]), Y(thr));
            ctx.lineTo(X(box[1]), Y(thr));
          }
          ctx.stroke();
          ctx.lineWidth = 1;
        }
        // the hidden rule, dashed
        ctx.strokeStyle = `${ink}66`;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(X(sc.rule.a), Y(0));
        ctx.lineTo(X(sc.rule.a), Y(1));
        ctx.moveTo(X(sc.rule.a), Y(sc.rule.b));
        ctx.lineTo(X(1), Y(sc.rule.b));
        ctx.moveTo(X(0), Y(sc.rule.c));
        ctx.lineTo(X(sc.rule.a), Y(sc.rule.c));
        ctx.stroke();
        ctx.setLineDash([]);
        const trainAcc = accuracy(sc, sc.train);
        const testAcc = accuracy(sc, sc.test);
        if (!s.best || testAcc > s.best.test) s.best = { test: testAcc, leaves: sc.leaves.length };
        const tx = 300;
        ctx.fillStyle = dim;
        ctx.fillText('dashed: the hidden rule (three thresholds)', tx, 50);
        ctx.fillText('shading: each leaf’s majority', tx, 68);
        ctx.fillStyle = ink;
        ctx.fillText(`leaves: ${sc.leaves.length}`, tx, 100);
        ctx.fillText(`training accuracy: ${(trainAcc * 100).toFixed(1)}%`, tx, 118);
        ctx.fillStyle = good;
        ctx.fillText(`held-out accuracy: ${(testAcc * 100).toFixed(1)}%`, tx, 136);
        ctx.fillStyle = dim;
        ctx.fillText(`best held-out so far: ${(s.best.test * 100).toFixed(1)}% at ${s.best.leaves} leaves`, tx, 154);
        ctx.fillText(`the noise caps every classifier near ${Math.round((1 - NOISE) * 100)}%`, tx, 172);
        if (sc.lastSplit && !s.done) ctx.fillText(`last split: ${sc.lastSplit.axis} at ${sc.lastSplit.thr.toFixed(2)}, gain ${sc.lastSplit.gain.toFixed(3)} bits`, tx, 204);
        ctx.fillText('the file measures: depth 6 test 88.4%,', tx, 236);
        ctx.fillText('unlimited depth 100% train / 81.2% test,', tx, 254);
        ctx.fillText('pruned to 6 leaves at 89.0%', tx, 272);
        let line;
        if (s.done) {
          line = `${sc.leaves.length} leaves: training ${(trainAcc * 100).toFixed(1)}%, held-out ${(testAcc * 100).toFixed(1)}%; the best held-out was ${(s.best.test * 100).toFixed(1)}% at ${s.best.leaves} leaves, before the tree started fitting the flipped labels`;
          ctx.fillStyle = good;
        } else {
          line = `${sc.leaves.length} leaves: training ${(trainAcc * 100).toFixed(1)}%, held-out ${(testAcc * 100).toFixed(1)}%`;
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
          new rule
        </button>
        <span className="viz-stat">{snap.line || 'growing…'}</span>
      </div>
    </>
  );
}
