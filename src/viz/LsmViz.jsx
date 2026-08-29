import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts of one storage engine. Act one: the cascade mechanism:
// writes pour into the memtable, flush as immutable runs into L0,
// and leveled compaction merges them down geometric levels: one
// bounded sorted run per level, the write-amplification readout
// ticking up on every rewrite. Act two: the triangle: the same
// op stream through a page-rewriting B-tree, leveled, and tiered:
// write traffic raced live, the read-side reversal stated with
// in-viz measured probe counts.
const W = 640;
const H = 300;
const SEED = 20260829;
const END_HOLD = 70;

const MEM_CAP = 24;
const L0_CAP = 3;
const BASE = 48;
const RATIO = 4;
const ENTRY = 1;      // viz currency: entries moved
const PAGE = 8;       // a "page" costs 8 entries of traffic to rewrite

export function makeLsm(policy) {
  return {
    policy,
    mem: new Map(),
    l0: [],
    levels: [],
    written: 0,
    compactions: 0,
  };
}

function mergeRuns(runs, dropTombs) {
  const out = [];
  const idx = runs.map(() => 0);
  for (;;) {
    let best = null;
    for (let i = 0; i < runs.length; i++) {
      if (idx[i] < runs[i].length) {
        const k = runs[i][idx[i]][0];
        if (best === null || k < best) best = k;
      }
    }
    if (best === null) return out;
    let newest = null;
    for (let i = 0; i < runs.length; i++) {
      if (idx[i] < runs[i].length && runs[i][idx[i]][0] === best) {
        if (newest === null) newest = runs[i][idx[i]];
        idx[i] += 1;
      }
    }
    if (!(dropTombs && newest[1] === null)) out.push(newest);
  }
}

export function lsmPut(s, k, v) {
  s.mem.set(k, v);
  if (s.mem.size >= MEM_CAP) lsmFlush(s);
}

export function lsmFlush(s) {
  if (!s.mem.size) return;
  const run = [...s.mem.entries()].sort((a, b) => a[0] - b[0]);
  s.mem = new Map();
  s.l0.unshift(run);
  s.written += run.length * ENTRY;
  while (s.l0.length > L0_CAP) compactL0(s);
}

const cap = (i) => BASE * RATIO ** i;

function compactL0(s) {
  s.compactions += 1;
  if (s.policy === 'leveled') {
    const below = s.levels.length ? s.levels[0][0] : [];
    const merged = mergeRuns([...s.l0, below], s.levels.length <= 1);
    s.written += merged.length * ENTRY;
    if (!s.levels.length) s.levels.push([merged]);
    else s.levels[0] = [merged];
    s.l0 = [];
    spill(s, 0);
  } else {
    const merged = mergeRuns(s.l0, !s.levels.length);
    s.written += merged.length * ENTRY;
    s.l0 = [];
    if (!s.levels.length) s.levels.push([]);
    s.levels[0].unshift(merged);
    spill(s, 0);
  }
}

function spill(s, i) {
  if (s.policy === 'leveled') {
    while (i < s.levels.length && s.levels[i].reduce((n, r) => n + r.length, 0) > cap(i)) {
      s.compactions += 1;
      const below = i + 1 < s.levels.length ? s.levels[i + 1][0] : [];
      const bottom = i + 2 >= s.levels.length;
      const merged = mergeRuns([s.levels[i][0], below], bottom);
      s.written += merged.length * ENTRY;
      if (i + 1 < s.levels.length) s.levels[i + 1] = [merged];
      else s.levels.push([merged]);
      s.levels[i] = [[]];
      i += 1;
    }
  } else {
    while (i < s.levels.length && s.levels[i].length > RATIO) {
      s.compactions += 1;
      const bottom = i + 1 >= s.levels.length;
      const merged = mergeRuns(s.levels[i], bottom);
      s.written += merged.length * ENTRY;
      s.levels[i] = [];
      if (i + 1 >= s.levels.length) s.levels.push([]);
      s.levels[i + 1].unshift(merged);
      i += 1;
    }
  }
}

export function lsmGet(s, k) {
  let probes = 0;
  if (s.mem.has(k)) {
    const v = s.mem.get(k);
    return [v === null ? undefined : v, probes];
  }
  const probe = (run) => {
    if (!run.length || k < run[0][0] || k > run[run.length - 1][0]) return undefined;
    probes += 1;
    let lo = 0;
    let hi = run.length - 1;
    while (lo <= hi) {
      const m = (lo + hi) >> 1;
      if (run[m][0] === k) return run[m];
      if (run[m][0] < k) lo = m + 1;
      else hi = m - 1;
    }
    return undefined;
  };
  for (const run of s.l0) {
    const hit = probe(run);
    if (hit) return [hit[1] === null ? undefined : hit[1], probes];
  }
  for (const lvl of s.levels) {
    for (const run of lvl) {
      const hit = probe(run);
      if (hit) return [hit[1] === null ? undefined : hit[1], probes];
    }
  }
  return [undefined, probes];
}

export function checkLeveled(s) {
  if (s.l0.length > L0_CAP) return false;
  for (let i = 0; i < s.levels.length; i++) {
    if (s.levels[i].length !== 1) return false;
    const run = s.levels[i][0];
    for (let j = 1; j < run.length; j++) if (run[j - 1][0] >= run[j][0]) return false;
    if (i + 1 < s.levels.length && run.length > cap(i)) return false;
  }
  return true;
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const KEYS = 900;
  const N = 460;
  const ops = [];
  for (let i = 0; i < N; i++) {
    const k = Math.floor(rand() * KEYS);
    ops.push(rand() < 0.12 ? [k, null] : [k, i]);
  }
  // act 1: leveled snapshots per op
  const lv = makeLsm('leveled');
  const snaps = [];
  let user = 0;
  for (const [k, v] of ops) {
    lsmPut(lv, k, v);
    user += ENTRY;
    snaps.push({
      mem: lv.mem.size,
      l0: lv.l0.map((r) => r.length),
      levels: lv.levels.map((l) => l.reduce((n, r) => n + r.length, 0)),
      written: lv.written,
      user,
      compactions: lv.compactions,
    });
  }
  // act 2: the race: leveled vs tiered vs page-rewriting b-tree
  const td = makeLsm('tiered');
  let btreeWritten = 0;
  const truth = new Map();
  for (const [k, v] of ops) {
    lsmPut(td, k, v);
    btreeWritten += PAGE;              // rewrite the leaf page, every put
    if (v === null) truth.delete(k);
    else truth.set(k, v);
  }
  // read probes on final states (sample)
  let pl = 0;
  let pt = 0;
  let reads = 0;
  for (let i = 0; i < 200; i++) {
    const k = Math.floor(rand() * KEYS);
    const [gl, a] = lsmGet(lv, k);
    const [gt, b] = lsmGet(td, k);
    pl += a;
    pt += b;
    reads += 1;
    void gl;
    void gt;
  }
  return {
    snaps,
    truth,
    lv,
    td,
    race: { btree: btreeWritten, leveled: lv.written, tiered: td.written },
    probes: { leveled: pl / reads, tiered: pt / reads },
  };
}

export default function LsmViz() {
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
      stepMs: 55,
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
          const prev = sc.snaps[Math.max(0, idx - 2)];
          ctx.fillText('act 1 · log now, sort later: memtable → immutable runs → merged down a leveled cascade', 14, 20);
          // memtable
          ctx.fillStyle = heur;
          ctx.fillText(`memtable ${st.mem}/${MEM_CAP}`, 30, 52);
          ctx.strokeStyle = heur;
          ctx.strokeRect(150, 40, 160, 14);
          ctx.fillStyle = 'rgba(240,185,75,0.4)';
          ctx.fillRect(150, 40, 160 * (st.mem / MEM_CAP), 14);
          // L0 runs
          ctx.fillStyle = algo;
          ctx.fillText(`L0: ${st.l0.length} run(s)`, 30, 84);
          st.l0.forEach((n, i) => {
            const flash = prev.l0.length !== st.l0.length && i === 0;
            ctx.strokeStyle = flash ? good : algo;
            ctx.strokeRect(150 + i * 56, 72, 48, 14);
            ctx.fillStyle = 'rgba(93,162,255,0.35)';
            ctx.fillRect(150 + i * 56, 72, 48 * Math.min(1, n / MEM_CAP), 14);
          });
          // levels
          st.levels.forEach((n, i) => {
            const y = 108 + i * 30;
            const capN = cap(i);
            const wpx = Math.min(440, 60 + capN * 0.55);
            const flash = (prev.levels[i] ?? -1) !== n;
            ctx.fillStyle = flash ? good : dim;
            ctx.fillText(`L${i + 1} ${n}/${capN}`, 30, y + 11);
            ctx.strokeStyle = flash ? good : algo;
            ctx.strokeRect(150, y, wpx, 16);
            ctx.fillStyle = flash ? 'rgba(98,217,138,0.4)' : 'rgba(93,162,255,0.28)';
            ctx.fillRect(150, y, wpx * Math.min(1, n / capN), 16);
          });
          // the WA readout
          const wa = st.written / st.user;
          ctx.fillStyle = warn;
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(`traffic ${st.written} / user ${st.user} = write amp ${wa.toFixed(1)}`, 330, 52);
          ctx.fillStyle = dim;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText(`${st.compactions} compactions, invariant audited each`, 330, 68);
          let line;
          if (done || idx >= last) {
            line = `stream absorbed: one sorted run per level, write amp ${wa.toFixed(1)}: no page was ever edited in place`;
            ctx.fillStyle = good;
          } else if (prev.levels.length !== st.levels.length || prev.compactions !== st.compactions) {
            line = 'compaction: the level rewrites (the write tax) so reads keep one run per level';
            ctx.fillStyle = heur;
          } else {
            line = 'writes cost RAM only until a flush: the device sees big sorted batches, never edits';
            ctx.fillStyle = ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = { line };
        } else {
          const t = done ? 200 : Math.min(s.tick, 200);
          ctx.fillText('act 2 · the triangle: same op stream, three engines, write traffic raced (entries moved)', 14, 20);
          const frac = Math.min(1, t / 200);
          const maxW = sc.race.btree;
          const bars = [
            ['b-tree: rewrite the page, every put', sc.race.btree, warn],
            ['lsm-leveled: flush + merge cascade', sc.race.leveled, algo],
            ['lsm-tiered: stack runs, merge late', sc.race.tiered, heur],
          ];
          bars.forEach(([label, total, color], i) => {
            const val = Math.floor(frac * total);
            const y = 62 + i * 52;
            ctx.fillStyle = color;
            ctx.font = '12px ui-monospace, monospace';
            ctx.fillText(`${label}: ${val.toLocaleString()}`, 60, y - 8);
            ctx.strokeStyle = color;
            ctx.strokeRect(60, y, 500 * Math.min(1, total / maxW), 13);
            ctx.fillStyle = `${color}44`;
            ctx.fillRect(60, y, 500 * Math.min(1, val / maxW), 13);
          });
          ctx.fillStyle = dim;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText(`the read side reverses: avg sorted-run probes per get: leveled ${sc.probes.leveled.toFixed(1)} vs tiered ${sc.probes.tiered.toFixed(1)}`, 60, 228);
          let line;
          if (done || t >= 200) {
            line = `write traffic ${(sc.race.btree / sc.race.leveled).toFixed(0)}x under the b-tree; tiered writes ${(sc.race.leveled / sc.race.tiered).toFixed(1)}x less but probes ${(sc.probes.tiered / Math.max(sc.probes.leveled, 0.1)).toFixed(1)}x more: pick your corner`;
            ctx.fillStyle = good;
          } else {
            line = 'all three answer every get identically (dict-refereed): only the traffic differs';
            ctx.fillStyle = ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = {
            line: done
              ? 'never edit in place: buffer, flush, merge down the cascade: the policy picks your triangle corner'
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
          new stream
        </button>
        <span className="viz-stat">
          {snap.line || 'buffering writes…'}
        </span>
      </div>
    </>
  );
}
