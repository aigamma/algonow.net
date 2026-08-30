import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts of one kitchen. Act one: eight workers run a skewed
// fork-join tree live: deque stacks rise and fall, busy workers
// glow blue, idle ones roll the victim die, and every successful
// steal draws a red arc from the victim's top to the thief. Act
// two: the clocks: central lock vs fixed-order convoy vs random
// stealing, with the theory's two-sided squeeze drawn on the bar.
const W = 640;
const H = 300;
const SEED = 20260829;
const END_HOLD = 70;
const NW = 8;

export function buildTree(dl0, dr0, grain, skew) {
  const tasks = [];
  const make = (dl, dr, lvl) => {
    const tid = tasks.length;
    tasks.push({ g: grain, kids: [] });
    if (dl <= 0 && dr <= 0) return { tid, w: grain, d: grain };
    const kids = [];
    if (dl > 0) kids.push(make(dl - 1, dr - 1, lvl + 1));
    if (dr > 0) {
      const nd = lvl < skew ? Math.max(dr - 2, 0) : dr - 1;
      kids.push(make(nd, nd, lvl + 1));
    }
    tasks[tid].kids = kids.map((k) => k.tid);
    return {
      tid,
      w: grain + kids.reduce((a, k) => a + k.w, 0),
      d: grain + Math.max(...kids.map((k) => k.d), 0),
    };
  };
  const root = make(dl0, dr0, 0);
  return { tasks, root: root.tid, W: root.w, Tinf: root.d };
}

export function simulate(tree, policy, rand, snapshots) {
  const { tasks, root } = tree;
  const deq = Array.from({ length: NW }, () => []);
  const central = [];
  if (policy === 'central') central.push(root);
  else deq[0].push(root);
  const cur = new Array(NW).fill(null);
  const executed = [];
  const steals = [];
  let t = 0;
  let remaining = tasks.length;
  while (remaining > 0 && t < 100000) {
    t += 1;
    for (let w = 0; w < NW; w++) {
      if (cur[w]) {
        cur[w].left -= 1;
        if (cur[w].left === 0) {
          executed.push(cur[w].tid);
          remaining -= 1;
          const kids = tasks[cur[w].tid].kids;
          if (policy === 'central') central.push(...kids);
          else deq[w].push(...kids);
          cur[w] = null;
        }
      }
    }
    const idle = [];
    for (let w = 0; w < NW; w++) if (!cur[w]) idle.push(w);
    if (policy === 'central') {
      if (idle.length && central.length) {
        const w = idle[0];
        const tid = central.shift();
        cur[w] = { tid, left: tasks[tid].g };
      }
    } else {
      const claimed = new Set();
      for (const w of idle) {
        if (deq[w].length) {
          const tid = deq[w].pop();
          cur[w] = { tid, left: tasks[tid].g };
        }
      }
      for (const w of idle) {
        if (cur[w]) continue;
        let v;
        if (policy === 'random') v = Math.floor(rand() * NW);
        else {
          v = 0;
          while (v < NW && (!deq[v].length || claimed.has(v))) v += 1;
          if (v === NW) continue;
        }
        if (v === w || !deq[v].length || claimed.has(v)) continue;
        claimed.add(v);
        const tid = deq[v].shift();
        cur[w] = { tid, left: tasks[tid].g };
        if (snapshots) steals.push({ t, from: v, to: w });
      }
    }
    if (snapshots) {
      snapshots.push({
        depths: deq.map((d) => d.length),
        busy: cur.map((c) => (c ? 1 : 0)),
      });
    }
  }
  return { makespan: t, executed, steals };
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  // grain 3: fine enough that the central lock's serialization is
  // visible (at grain 6 the lock is half-forgiven and the gap is
  // only ~1.15x: the honest coarse-grain story the solution tells).
  // The tree varies per cycle; note that at this small P the
  // SCANNING fixed order ties the dice: the lottery's case is
  // contention at scale (the solution's P=16 run) and adversarial
  // safety, and the act-2 label says so rather than strawmanning.
  const tree = buildTree(10 + Math.floor(rand() * 3), 7 + Math.floor(rand() * 2), 3, 4);
  const snaps = [];
  const r1 = mulberry32(seed + 1);
  const runRandom = simulate(tree, 'random', r1, snaps);
  const r2 = mulberry32(seed + 1);
  const runFixed = simulate(tree, 'fixed', r2, null);
  const r3 = mulberry32(seed + 1);
  const runCentral = simulate(tree, 'central', r3, null);
  return {
    tree,
    snaps,
    steals: runRandom.steals,
    ms: { random: runRandom.makespan, fixed: runFixed.makespan, central: runCentral.makespan },
    executed: { random: runRandom.executed, fixed: runFixed.executed, central: runCentral.executed },
    lower: Math.max(tree.W / NW, tree.Tinf),
    upper: tree.W / NW + 3 * tree.Tinf + NW,
  };
}

export default function WorkStealViz() {
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
      stepMs: 50,
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
        const len = s.act === 0 ? Math.ceil(s.scene.snaps.length / 2) + END_HOLD : 200 + END_HOLD;
        if (s.tick >= len) {
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
          const last = sc.snaps.length - 1;
          const idx = done ? last : Math.min(s.tick * 2, last);
          const st = sc.snaps[idx];
          ctx.fillText(`act 1 · 8 workers, one skewed fork-join tree: owners pop their bottoms, thieves rob random tops (step ${idx + 1}/${sc.snaps.length})`, 14, 20);
          for (let wI = 0; wI < NW; wI++) {
            const x = 46 + wI * 72;
            // deque stack
            const d = st.depths[wI];
            for (let j = 0; j < Math.min(d, 12); j++) {
              ctx.fillStyle = 'rgba(93,162,255,0.35)';
              ctx.fillRect(x, 200 - j * 11, 40, 9);
            }
            if (d > 12) {
              ctx.fillStyle = dim;
              ctx.fillText(`+${d - 12}`, x + 10, 200 - 12 * 11);
            }
            // worker dot
            ctx.fillStyle = st.busy[wI] ? algo : warn;
            ctx.beginPath();
            ctx.arc(x + 20, 222, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = dim;
            ctx.fillText(`w${wI}`, x + 12, 244);
          }
          // recent steal arcs
          const stepNow = idx + 1;
          for (const ev of sc.steals) {
            if (ev.t <= stepNow && ev.t > stepNow - 14) {
              const x1 = 66 + ev.from * 72;
              const x2 = 66 + ev.to * 72;
              ctx.strokeStyle = `${warn}CC`;
              ctx.lineWidth = 1.6;
              ctx.beginPath();
              ctx.moveTo(x1, 92);
              ctx.quadraticCurveTo((x1 + x2) / 2, 46, x2, 92);
              ctx.stroke();
            }
          }
          const stolen = sc.steals.filter((e) => e.t <= stepNow).length;
          ctx.fillStyle = ink;
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(`steals so far: ${stolen} / ${sc.tree.tasks.length} tasks`, 470, 44);
          let line;
          if (done || idx >= last) {
            line = `finished in ${sc.ms.random} steps with ${sc.steals.length} steals (${Math.round((100 * sc.steals.length) / sc.tree.tasks.length)}% of tasks): migration priced by the critical path`;
            ctx.fillStyle = good;
          } else if (sc.steals.some((e) => e.t === stepNow)) {
            line = 'a theft: the oldest fork on a random victim: the biggest unstarted subtree changes hands';
            ctx.fillStyle = warn;
          } else {
            line = 'busy workers pop their own bottoms: depth-first, cache-hot, and nobody contends';
            ctx.fillStyle = ink;
          }
          ctx.fillText(line, 14, H - 12);
          statsRef.current = { line };
        } else {
          const t = done ? 200 : Math.min(s.tick, 200);
          ctx.fillText(`act 2 · the clocks (W = ${sc.tree.W.toLocaleString()}, T∞ = ${sc.tree.Tinf}): with the theory's squeeze drawn on`, 14, 20);
          const frac = Math.min(1, t / 200);
          const maxV = sc.ms.central;
          const bars = [
            ['central shared queue', sc.ms.central, warn],
            ['stealing, fixed scan order (ties the dice at P=8)', sc.ms.fixed, heur],
            ['stealing, random victims', sc.ms.random, algo],
          ];
          bars.forEach(([label, total, color], i) => {
            const val = Math.floor(frac * total);
            const y = 62 + i * 52;
            ctx.fillStyle = color;
            ctx.font = '12px ui-monospace, monospace';
            ctx.fillText(`${label}: ${val.toLocaleString()}`, 60, y - 8);
            ctx.strokeStyle = color;
            ctx.strokeRect(60, y, 500 * (total / maxV), 13);
            ctx.fillStyle = `${color}44`;
            ctx.fillRect(60, y, 500 * (val / maxV), 13);
          });
          // the squeeze on the random bar
          const y3 = 62 + 2 * 52;
          const xLow = 60 + 500 * (sc.lower / maxV);
          const xUp = 60 + 500 * (Math.min(sc.upper, maxV) / maxV);
          ctx.strokeStyle = good;
          ctx.setLineDash([4, 3]);
          [xLow, xUp].forEach((x) => {
            ctx.beginPath();
            ctx.moveTo(x, y3 - 4);
            ctx.lineTo(x, y3 + 17);
            ctx.stroke();
          });
          ctx.setLineDash([]);
          ctx.fillStyle = good;
          ctx.font = '10px ui-monospace, monospace';
          ctx.fillText(`floor max(W/P, T∞) = ${Math.round(sc.lower)}`, xLow - 30, y3 + 32);
          ctx.fillText(`W/P + 3T∞ = ${Math.round(sc.upper)}`, Math.min(xUp - 30, 520), y3 + 44);
          let line;
          if (done || t >= 200) {
            line = `the lottery lands inside the squeeze: ${Math.round(sc.lower)} ≤ ${sc.ms.random} ≤ ${Math.round(sc.upper)}: forty years of theory, one green interval`;
            ctx.fillStyle = good;
          } else {
            line = 'same tasks, same work, three ways to hand it out: only the waiting differs';
            ctx.fillStyle = ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = {
            line: done
              ? 'own your bottom, rob a random top: the discipline inside every fork-join runtime'
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
          new banquet
        </button>
        <span className="viz-stat">
          {snap.line || 'forking…'}
        </span>
      </div>
    </>
  );
}
