import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts of one disk. Act one: the two phases: memory-sized
// chunks of an unsorted tape are sorted and laid down as runs;
// then a k-way funnel drinks from all runs at once, page by page,
// and one sorted tape emerges: pass counter and page-I/O counter
// running throughout. Act two: the k dial: the same data merged
// binary (k = 2) versus wide (k = 8): pass bars stack up for the
// narrow merge while the wide one finishes in a single sweep: the
// logarithm's base is the memory, and the I/O bill shows it.
const W = 640;
const H = 300;
const SEED = 20260827;
const N_REC = 96;
const MEM = 12;
const END_HOLD = 70;

export function simulate(records, mem, k) {
  // Run formation.
  const runs = [];
  for (let i = 0; i < records.length; i += mem) {
    runs.push(records.slice(i, i + mem).sort((a, b) => a - b));
  }
  const runs0 = runs.map((r) => r.slice());
  // Merge passes, logging each output element with its source run.
  const passes = [];
  let cur = runs;
  let io = Math.ceil(records.length / 4) * 2; // form: read + write, page=4
  while (cur.length > 1) {
    const next = [];
    const passLog = [];
    for (let g = 0; g < cur.length; g += k) {
      const group = cur.slice(g, g + k).map((r) => r.slice());
      const out = [];
      while (group.some((r) => r.length)) {
        let bi = -1;
        for (let i = 0; i < group.length; i++) {
          if (group[i].length && (bi < 0 || group[i][0] < group[bi][0])) bi = i;
        }
        out.push(group[bi].shift());
        passLog.push({ group: g, from: g + bi, val: out[out.length - 1] });
      }
      next.push(out);
    }
    io += Math.ceil(records.length / 4) * 2;
    passes.push({ log: passLog, count: next.length });
    cur = next;
  }
  return { runs0, passes, sorted: cur[0] || [], io };
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const records = [];
  for (let i = 0; i < N_REC; i++) records.push(1 + Math.floor(rand() * 98));
  const wide = simulate(records, MEM, 8);
  const narrow = simulate(records, MEM, 2);
  return { records, wide, narrow };
}

export default function ExtSortViz() {
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
        const len =
          s.act === 0
            ? 8 * MEM + s.scene.wide.passes[0].log.length + END_HOLD
            : s.scene.narrow.passes.reduce((a, p) => a + Math.ceil(p.log.length / 4), 0) + 40 + END_HOLD;
        if (s.tick >= len) {
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
        const sc = s.scene;

        const done = s.act >= 2;
        const actIdx = done ? 1 : s.act;
        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';

        const bar = (x, y, w, h2, frac, color) => {
          ctx.strokeStyle = 'rgba(154,165,189,0.35)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, w, h2);
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.6;
          ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h2);
          ctx.globalAlpha = 1;
        };

        if (actIdx === 0) {
          const formTicks = 8 * MEM;
          const t = done ? formTicks + sc.wide.passes[0].log.length : s.tick;
          const forming = t < formTicks && !done;
          ctx.fillText('act 1 · phase 1: sort memory-sized chunks into runs · phase 2: one 8-way merge', 14, 20);

          // Input tape.
          ctx.fillText('input tape (96 records, memory holds 12)', 14, 44);
          bar(14, 50, 610, 12, forming ? Math.min(1, t / formTicks) : 1, dim);

          // Runs.
          const nRuns = sc.wide.runs0.length;
          const runsDone = forming ? Math.floor(t / MEM / (formTicks / (MEM * nRuns))) : nRuns;
          for (let r = 0; r < nRuns; r++) {
            const x = 14 + r * 77;
            const frac = forming ? Math.max(0, Math.min(1, (t - r * (formTicks / nRuns)) / (formTicks / nRuns))) : 1;
            bar(x, 92, 70, 12, frac, heur);
            ctx.fillStyle = dim;
            ctx.font = '9px ui-monospace, monospace';
            ctx.fillText(`run ${r + 1}`, x + 18, 116);
          }

          // Merge funnel.
          if (!forming) {
            const mi = Math.min(t - formTicks, sc.wide.passes[0].log.length);
            ctx.strokeStyle = algo;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(60, 130);
            ctx.lineTo(320, 172);
            ctx.lineTo(580, 130);
            ctx.stroke();
            ctx.fillStyle = algo;
            ctx.font = '10px ui-monospace, monospace';
            ctx.fillText('8-way heap: smallest head wins', 250, 150);
            bar(14, 196, 610, 14, mi / sc.wide.passes[0].log.length, good);
            ctx.fillStyle = dim;
            ctx.font = '10px ui-monospace, monospace';
            ctx.fillText('output tape: sorted in ONE merge pass', 14, 228);
            if (mi > 0 && mi <= sc.wide.passes[0].log.length) {
              const ev = sc.wide.passes[0].log[mi - 1];
              ctx.fillStyle = good;
              ctx.font = '11px ui-monospace, monospace';
              ctx.fillText(`← ${ev.val} from run ${ev.from + 1}`, 300, 208);
            }
          }

          let line;
          if (done || t >= formTicks + sc.wide.passes[0].log.length) {
            line = `sorted: 2 passes total (form + one 8-way merge) · every record read twice, written twice`;
            ctx.fillStyle = good;
          } else if (forming) {
            line = `phase 1: chunk ${Math.min(runsDone + 1, nRuns)}/${nRuns} sorts in memory and lands as a run`;
            ctx.fillStyle = heur;
          } else {
            line = `phase 2: merging all ${nRuns} runs at once · ${Math.min(t - formTicks, 96)}/96 records out`;
            ctx.fillStyle = ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = { line };
        } else {
          ctx.fillText('act 2 · the k dial: same data, same memory: k = 2 pays passes, k = 8 pays one', 14, 20);
          const passLens = sc.narrow.passes.map((p) => Math.ceil(p.log.length / 4));
          const total = passLens.reduce((a, b) => a + b, 0);
          const t = done ? total + 40 : Math.min(s.tick, total + 40);

          // k = 2 lane: pass bars appearing one by one.
          ctx.fillStyle = warn;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText(`k = 2: ${sc.narrow.passes.length} merge passes`, 14, 52);
          let acc = 0;
          for (let p = 0; p < sc.narrow.passes.length; p++) {
            const frac = Math.max(0, Math.min(1, (t - acc) / passLens[p]));
            bar(14, 62 + p * 24, 400, 14, frac, warn);
            ctx.fillStyle = dim;
            ctx.font = '9px ui-monospace, monospace';
            ctx.fillText(`pass ${p + 1}: ${sc.narrow.passes[p].count} runs left`, 424, 73 + p * 24);
            acc += passLens[p];
          }
          // k = 8 lane.
          const y8 = 62 + sc.narrow.passes.length * 24 + 16;
          ctx.fillStyle = good;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText('k = 8: one merge pass', 14, y8 - 4);
          const frac8 = Math.max(0, Math.min(1, (t - total) / 40));
          bar(14, y8, 400, 14, done ? 1 : frac8, good);

          let line;
          if (done || t >= total + 40) {
            line = `page I/O: k=2 paid ${sc.narrow.io} · k=8 paid ${sc.wide.io}: the log's base is the memory`;
            ctx.fillStyle = good;
          } else if (t < total) {
            line = 'binary merging grinds: every pass re-reads everything…';
            ctx.fillStyle = warn;
          } else {
            line = 'the wide merge drinks all runs at once';
            ctx.fillStyle = good;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = {
            line: done
              ? 'passes are the currency, and k buys them down: 1 + ceil(log_k(runs))'
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
          new tape
        </button>
        <span className="viz-stat">
          {snap.line || 'spinning the tapes…'}
        </span>
      </div>
    </>
  );
}
