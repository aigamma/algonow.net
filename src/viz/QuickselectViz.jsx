import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two fates for one skeleton, on 48 bars seeking the median. Act one: a
// random pivot (amber flash) partitions the live range and the losing
// side dims: geometric collapse, done in a handful of rounds. Act two:
// the SAME code under median-of-three, fed the killer permutation the
// gas adversary builds against it right here in this module: the pivot
// is always a nobody, the survivor shrinks by two, and the round counter
// tells the quadratic story. The answer bar turns green when found.
const W = 640;
const H = 300;
const SEED = 20260827;
const N = 48;
const K = N >> 1;
const PHASE = { pivot: 8, part: 10, dim: 6 };
const ROUND_TICKS = PHASE.pivot + PHASE.part + PHASE.dim;
const MAX_SHOWN_ROUNDS = 12;

function med3Index(arr, lo, hi, less) {
  const mid = (lo + hi) >> 1;
  const a = arr[lo];
  const b = arr[mid];
  const c = arr[hi];
  if (less(a, b)) {
    if (less(b, c)) return mid;
    return less(a, c) ? hi : lo;
  }
  if (less(a, c)) return lo;
  return less(b, c) ? hi : mid;
}

function selectRecorded(values, pivotKind, rng) {
  const arr = values.slice();
  let lo = 0;
  let hi = arr.length - 1;
  let k = K;
  let cmps = 0;
  const less = (a, b) => {
    cmps += 1;
    return a < b;
  };
  const rounds = [];
  for (let guard = 0; guard < 500; guard++) {
    if (lo === hi) return { rounds, cmps, answer: arr[lo], answerVal: arr[lo] };
    const p =
      pivotKind === 'random'
        ? lo + Math.floor(rng() * (hi - lo + 1))
        : med3Index(arr, lo, hi, less);
    const before = arr.slice();
    const v = arr[p];
    let i = lo;
    let lt = lo;
    let gt = hi;
    while (i <= gt) {
      if (less(arr[i], v)) {
        [arr[i], arr[lt]] = [arr[lt], arr[i]];
        lt += 1;
        i += 1;
      } else if (less(v, arr[i])) {
        [arr[i], arr[gt]] = [arr[gt], arr[i]];
        gt -= 1;
      } else {
        i += 1;
      }
    }
    let done = false;
    let nLo = lo;
    let nHi = hi;
    if (k < lt) nHi = lt - 1;
    else if (k > gt) nLo = gt + 1;
    else done = true;
    rounds.push({ before, lo, hi, pivotPos: p, after: arr.slice(), nLo, nHi, done, v, cmps });
    if (done) return { rounds, cmps, answer: v, answerVal: v };
    lo = nLo;
    hi = nHi;
  }
  return { rounds, cmps, answer: arr[lo], answerVal: arr[lo] };
}

function buildKiller() {
  // McIlroy's gas adversary, aimed at the med-3 rule above.
  const val = new Array(N).fill(null);
  let nsolid = 0;
  let candidate = -1;
  const freeze = (x) => {
    val[x] = nsolid;
    nsolid += 1;
  };
  const gasLess = (x, y) => {
    if (val[x] === null && val[y] === null) freeze(x === candidate ? x : y);
    if (val[x] === null) {
      candidate = x;
      return false;
    }
    if (val[y] === null) {
      candidate = y;
      return true;
    }
    return val[x] < val[y];
  };
  // Run the same three-way select, on ids, through the gas comparator.
  const arr = Array.from({ length: N }, (_, i) => i);
  let lo = 0;
  let hi = N - 1;
  let k = K;
  for (let guard = 0; guard < 500 && lo !== hi; guard++) {
    const p = med3Index(arr, lo, hi, gasLess);
    const v = arr[p];
    let i = lo;
    let lt = lo;
    let gt = hi;
    while (i <= gt) {
      if (gasLess(arr[i], v)) {
        [arr[i], arr[lt]] = [arr[lt], arr[i]];
        lt += 1;
        i += 1;
      } else if (gasLess(v, arr[i])) {
        [arr[i], arr[gt]] = [arr[gt], arr[i]];
        gt -= 1;
      } else i += 1;
    }
    if (k < lt) hi = lt - 1;
    else if (k > gt) lo = gt + 1;
    else break;
  }
  for (let x = 0; x < N; x++) if (val[x] === null) freeze(x);
  return val.slice();
}

function makeScene(seed) {
  const rand = mulberry32(seed);
  const shuffled = Array.from({ length: N }, (_, i) => i);
  for (let i = N - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const killer = buildKiller();
  return [
    {
      note: 'act 1 · random pivot, shuffled input: geometric collapse',
      run: selectRecorded(shuffled, 'random', rand),
      kind: 'lottery',
    },
    {
      note: 'act 2 · median-of-three vs the killer the gas adversary built for it',
      run: selectRecorded(killer, 'med3', rand),
      kind: 'killer',
    },
  ];
}

export default function QuickselectViz() {
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
        acts: makeScene(SEED + cycle.current * 7919),
        act: 0,
        tick: 0,
        rest: 0,
        stopAtRest: isStill(),
      }),
      tick: (s) => {
        if (s.act >= s.acts.length) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, {
              acts: makeScene(SEED + cycle.current * 7919),
              act: 0,
              tick: 0,
              rest: 0,
            });
          }
          return true;
        }
        s.tick += 1;
        const act = s.acts[s.act];
        const shown = Math.min(act.run.rounds.length, MAX_SHOWN_ROUNDS);
        const total = shown * ROUND_TICKS + 40;
        if (s.tick >= total) {
          s.tick = 0;
          s.act += 1;
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

        const done = s.act >= s.acts.length;
        const actIdx = done ? s.acts.length - 1 : s.act;
        const act = s.acts[actIdx];
        const rounds = act.run.rounds;
        const shownMax = Math.min(rounds.length, MAX_SHOWN_ROUNDS);
        const rIdx = done ? shownMax - 1 : Math.min(Math.floor(s.tick / ROUND_TICKS), shownMax - 1);
        const phaseT = done ? ROUND_TICKS : s.tick - rIdx * ROUND_TICKS;
        const round = rounds[rIdx];
        const finalPhase = done || (rIdx === shownMax - 1 && phaseT >= ROUND_TICKS);

        const useAfter = phaseT >= PHASE.pivot;
        const bars = useAfter ? round.after : round.before;
        const dimmed = phaseT >= PHASE.pivot + PHASE.part || done;
        const bw = Math.floor((W - 32) / N);
        const y0 = 220;
        for (let i = 0; i < N; i++) {
          const h = 24 + (bars[i] / N) * 150;
          const inRange = i >= round.lo && i <= round.hi;
          const inNext = i >= round.nLo && i <= round.nHi;
          let color = `${algo}`;
          let alpha = 0.85;
          if (!inRange) alpha = 0.14;
          else if (dimmed && !inNext && !round.done) alpha = 0.25;
          const isPivotBar = !useAfter && i === round.pivotPos && phaseT >= 2;
          const isAnswer = (round.done && dimmed && bars[i] === round.v) || (done && bars[i] === act.run.answerVal);
          if (isPivotBar) color = heur;
          if (isAnswer) {
            color = good;
            alpha = 1;
          }
          ctx.globalAlpha = alpha;
          ctx.fillStyle = color;
          ctx.fillRect(16 + i * bw, y0 - h, bw - 2, h);
          ctx.globalAlpha = 1;
        }

        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(act.note, 14, 22);
        ctx.fillStyle = ink;
        ctx.font = '12px ui-monospace, monospace';
        const survivors = round.hi - round.lo + 1;
        const cutRounds = rounds.length - shownMax;
        const tail =
          act.kind === 'killer' && finalPhase && cutRounds > 0
            ? ` · …and ${cutRounds} more rounds like this`
            : '';
        ctx.fillText(
          `round ${Math.min(rIdx + 1, rounds.length)}/${rounds.length} · survivors ${survivors} · comparisons ${round.cmps}${tail}`,
          14,
          46,
        );
        ctx.fillStyle = act.kind === 'killer' ? warn : good;
        ctx.font = '11px ui-monospace, monospace';
        const verdict =
          act.kind === 'killer'
            ? `the pivot is always a nobody: ${rounds.length} rounds, ${act.run.cmps} comparisons (n²/4 scale)`
            : `geometric collapse: ${rounds.length} rounds, ${act.run.cmps} comparisons (~5n)`;
        if (finalPhase || done) ctx.fillText(verdict, 14, 66);
        ctx.fillStyle = dim;
        ctx.fillText(`seeking rank ${K} (the median) of ${N} · found value turns green`, 14, H - 30);
        ctx.fillText('blue live · amber pivot · dim discarded · the same code in both acts', 14, H - 12);

        statsRef.current = {
          line: done
            ? `both acts done: lottery ${s.acts[0].run.cmps} cmps in ${s.acts[0].run.rounds.length} rounds · killer ${s.acts[1].run.cmps} cmps in ${s.acts[1].run.rounds.length}`
            : verdict && (finalPhase ? verdict : `${act.kind === 'killer' ? 'starving' : 'collapsing'}: round ${rIdx + 1}, ${survivors} survivors`),
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
          new shuffle
        </button>
        <span className="viz-stat">
          {snap.line || 'building the killer…'}
        </span>
      </div>
    </>
  );
}
