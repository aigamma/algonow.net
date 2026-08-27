import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The debt ledger, watched. Sixteen leaves under a sum tree. A range-add
// walks down to its canonical cover nodes and stamps an amber debt chip
// (+v) instead of visiting the leaves below. A range-sum walks through,
// pushing chips one level down where it must pass, and collects the
// green cover nodes into a running total. Full-range ops touch just the
// root: the whole trick in one frame. At n=16 the ledger is a wash; the
// page's table shows what the same walk costs at n=10,000: 53x.
const W = 640;
const H = 300;
const SEED = 20260827;
const NLEAF = 16;
const TICKS_PER_FRAME = 6;
const OP_HOLD = 24;

function instrumentedTree(vals) {
  const size = NLEAF;
  const s = new Array(2 * size).fill(0);
  const lz = new Array(2 * size).fill(0);
  for (let i = 0; i < size; i++) s[size + i] = vals[i];
  for (let i = size - 1; i >= 1; i--) s[i] = s[2 * i] + s[2 * i + 1];
  const frames = [];
  const snap = (node, action, extra) =>
    frames.push({ s: s.slice(), lz: lz.slice(), node, action, ...extra });
  const apply = (node, v, len) => {
    s[node] += v * len;
    lz[node] += v;
  };
  const push = (node, len) => {
    if (lz[node]) {
      apply(2 * node, lz[node], len >> 1);
      apply(2 * node + 1, lz[node], len >> 1);
      lz[node] = 0;
      snap(node, 'push');
    }
  };
  const add = (node, lo, hi, l, r, v) => {
    if (r < lo || hi < l) return;
    if (l <= lo && hi <= r) {
      apply(node, v, hi - lo + 1);
      snap(node, 'cover', { v });
      return;
    }
    snap(node, 'visit');
    push(node, hi - lo + 1);
    const mid = (lo + hi) >> 1;
    add(2 * node, lo, mid, l, r, v);
    add(2 * node + 1, mid + 1, hi, l, r, v);
    s[node] = s[2 * node] + s[2 * node + 1];
  };
  let acc = 0;
  const query = (node, lo, hi, l, r) => {
    if (r < lo || hi < l) return;
    if (l <= lo && hi <= r) {
      acc += s[node];
      snap(node, 'collect', { acc });
      return;
    }
    snap(node, 'visit');
    push(node, hi - lo + 1);
    const mid = (lo + hi) >> 1;
    query(2 * node, lo, mid, l, r);
    query(2 * node + 1, mid + 1, hi, l, r);
  };
  return {
    doAdd(l, r, v) {
      frames.length = 0;
      add(1, 0, size - 1, l, r, v);
      return frames.slice();
    },
    doQuery(l, r) {
      frames.length = 0;
      acc = 0;
      query(1, 0, size - 1, l, r);
      return { frames: frames.slice(), answer: acc };
    },
  };
}

function makeScene(seed) {
  const rand = mulberry32(seed);
  const vals = Array.from({ length: NLEAF }, () => 1 + Math.floor(rand() * 9));
  const tree = instrumentedTree(vals);
  const span = () => {
    const l = Math.floor(rand() * NLEAF);
    const r = l + Math.floor(rand() * (NLEAF - l));
    return [l, r];
  };
  const ops = [];
  const addOp = (l, r, v) => {
    ops.push({ kind: 'add', l, r, v, frames: tree.doAdd(l, r, v) });
  };
  const sumOp = (l, r) => {
    const { frames, answer } = tree.doQuery(l, r);
    ops.push({ kind: 'sum', l, r, frames, answer });
  };
  const [l1, r1] = [2, 11];
  addOp(l1, r1, 1 + Math.floor(rand() * 5));
  sumOp(...span());
  addOp(0, NLEAF - 1, 2);       // full range: the root alone
  sumOp(...span());
  const [l2] = span();
  addOp(l2, l2, -3);            // a single leaf
  sumOp(0, NLEAF - 1);          // full-range read: one node
  return { vals, ops };
}

export default function SegmentTreeViz() {
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
        op: 0,
        tick: 0,
        rest: 0,
        stopAtRest: isStill(),
      }),
      tick: (s) => {
        if (s.op >= s.scene.ops.length) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, {
              scene: makeScene(SEED + cycle.current * 7919),
              op: 0,
              tick: 0,
              rest: 0,
            });
          }
          return true;
        }
        s.tick += 1;
        const op = s.scene.ops[s.op];
        if (s.tick >= op.frames.length * TICKS_PER_FRAME + OP_HOLD) {
          s.tick = 0;
          s.op += 1;
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

        const done = s.op >= s.scene.ops.length;
        const opIdx = done ? s.scene.ops.length - 1 : s.op;
        const op = s.scene.ops[opIdx];
        const fIdx = done
          ? op.frames.length - 1
          : Math.min(Math.floor(s.tick / TICKS_PER_FRAME), op.frames.length - 1);
        const frame = op.frames[fIdx];
        const opDone = done || s.tick >= op.frames.length * TICKS_PER_FRAME;

        // Node geometry: node i at depth d covers size/2^d leaves.
        const leafW = (W - 40) / NLEAF;
        const boxFor = (node) => {
          const depth = Math.floor(Math.log2(node));
          const idx = node - (1 << depth);
          const spanLeaves = NLEAF >> depth;
          const x = 20 + idx * spanLeaves * leafW;
          return { x: x + 2, y: 26 + depth * 46, w: spanLeaves * leafW - 4, h: 30 };
        };

        for (let node = 1; node < 2 * NLEAF; node++) {
          const { x, y, w, h } = boxFor(node);
          const isLeaf = node >= NLEAF;
          const active = frame && frame.node === node && !opDone;
          let border = `${algo}66`;
          let fill = 'rgba(93,162,255,0.05)';
          if (active && frame.action === 'cover') {
            border = heur;
            fill = `${heur}22`;
          } else if (active && frame.action === 'collect') {
            border = good;
            fill = `${good}22`;
          } else if (active) {
            border = ink;
            fill = 'rgba(255,255,255,0.06)';
          }
          ctx.fillStyle = fill;
          ctx.fillRect(x, y, w, isLeaf ? 24 : h);
          ctx.strokeStyle = border;
          ctx.lineWidth = active ? 2 : 1;
          ctx.strokeRect(x + 0.5, y + 0.5, w - 1, (isLeaf ? 24 : h) - 1);
          ctx.fillStyle = ink;
          ctx.font = `${isLeaf ? 10 : 11}px ui-monospace, monospace`;
          ctx.textAlign = 'center';
          ctx.fillText(String(frame ? frame.s[node] : 0), x + w / 2, y + (isLeaf ? 16 : 19));
          ctx.textAlign = 'start';
          const debt = frame ? frame.lz[node] : 0;
          if (debt) {
            ctx.fillStyle = heur;
            ctx.font = '9px ui-monospace, monospace';
            ctx.fillText(`${debt > 0 ? '+' : ''}${debt}`, x + 3, y + 9);
          }
        }

        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        const label =
          op.kind === 'add'
            ? `op ${opIdx + 1}: add ${op.v > 0 ? '+' : ''}${op.v} to [${op.l}, ${op.r}]`
            : `op ${opIdx + 1}: sum [${op.l}, ${op.r}]`;
        ctx.fillText(label, 14, 16);
        let line = `${label} · nodes touched ${fIdx + 1}`;
        if (opDone) {
          ctx.fillStyle = op.kind === 'add' ? heur : good;
          line =
            op.kind === 'add'
              ? `debt stamped on ${op.frames.filter((f) => f.action === 'cover').length} cover node(s) · leaves untouched`
              : `answer ${op.answer} from ${op.frames.filter((f) => f.action === 'collect').length} cover node(s)`;
          ctx.fillText(line, 300, 16);
        }
        ctx.fillStyle = dim;
        ctx.font = '10px ui-monospace, monospace';
        ctx.fillText('amber chip = unpaid debt (lazy tag) · green = collected cover · full-range ops touch one node', 14, H - 8);

        statsRef.current = {
          line: done ? 'the ledger rests: every sum honest, every debt parked where it fell' : line,
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
          new array
        </button>
        <span className="viz-stat">
          {snap.line || 'building the tree…'}
        </span>
      </div>
    </>
  );
}
