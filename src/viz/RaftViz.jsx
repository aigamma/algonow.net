import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts of one cluster. Act one: five nodes, a leader pulsing
// keepalives, each follower's election timer refilling on every
// pulse: then the leader dies, the randomized timers drain at
// different rates, the first to expire runs for office, votes
// stream back, and a majority crowns a successor: one leader per
// term, always. Act two: the ablation: identical timers drain in
// lockstep, all five run at once, the vote splits five ways, and
// the cluster loops term after term: the measured 0-of-60
// livelock, animated. The randomness was never a detail.
const W = 640;
const H = 300;
const SEED = 20260827;
const MS_PER_TICK = 9;
const END_HOLD = 70;

// A compact deterministic port of the election protocol: same
// semantics as the python sim (terms, one vote per term, majority,
// keepalives resetting alarms), driven by a sorted event list.
export function runCluster(seed, { spread, jitterLo, jitterHi, killAt, horizon }) {
  const rand = mulberry32(seed);
  const N = 5;
  const BASE = 150;
  const KA = 55;
  const role = Array(N).fill('F');
  const term = Array(N).fill(0);
  const voted = Array(N).fill(null);
  const votes = Array(N).fill(0);
  const gen = Array(N).fill(0);
  const alive = Array(N).fill(true);
  const q = [];
  let seq = 0;
  const log = [];
  const leadersByTerm = new Map();
  const push = (t, kind, p) => q.push({ t, s: ++seq, kind, p });
  const delay = () => jitterLo + rand() * (jitterHi - jitterLo);
  const alarm = (i, now) => {
    gen[i] += 1;
    push(now + BASE + rand() * spread, 'alarm', { i, g: gen[i] });
  };
  for (let i = 0; i < N; i++) alarm(i, 0);
  if (killAt != null) push(killAt, 'kill', {});
  let now = 0;
  while (q.length) {
    q.sort((a, b) => a.t - b.t || a.s - b.s);
    const ev = q.shift();
    if (ev.t > horizon) break;
    now = ev.t;
    const { kind, p } = ev;
    if (kind === 'alarm') {
      if (!alive[p.i] || p.g !== gen[p.i] || role[p.i] === 'L') continue;
      role[p.i] = 'C';
      term[p.i] += 1;
      voted[p.i] = p.i;
      votes[p.i] = 1;
      log.push({ t: now, kind: 'candidate', node: p.i, term: term[p.i] });
      for (let j = 0; j < N; j++)
        if (j !== p.i) {
          const d = delay();
          log.push({ t: now, kind: 'msg', from: p.i, to: j, arrive: now + d, msg: 'req' });
          push(now + d, 'req', { j, cand: p.i, t: term[p.i] });
        }
      alarm(p.i, now);
    } else if (kind === 'req') {
      const { j, cand, t } = p;
      if (!alive[j]) continue;
      if (t > term[j]) {
        term[j] = t;
        voted[j] = null;
        role[j] = 'F';
      }
      if (t === term[j] && (voted[j] === null || voted[j] === cand)) {
        voted[j] = cand;
        alarm(j, now);
        const d = delay();
        log.push({ t: now, kind: 'msg', from: j, to: cand, arrive: now + d, msg: 'vote' });
        push(now + d, 'grant', { i: cand, t });
      }
    } else if (kind === 'grant') {
      const { i, t } = p;
      if (!alive[i] || role[i] !== 'C' || term[i] !== t) continue;
      votes[i] += 1;
      if (votes[i] > N / 2) {
        role[i] = 'L';
        if (!leadersByTerm.has(t)) leadersByTerm.set(t, new Set());
        leadersByTerm.get(t).add(i);
        log.push({ t: now, kind: 'crown', node: i, term: t });
        push(now, 'pulse', { i, t });
      }
    } else if (kind === 'pulse') {
      const { i, t } = p;
      if (!alive[i] || role[i] !== 'L' || term[i] !== t) continue;
      for (let j = 0; j < N; j++)
        if (j !== i) {
          const d = delay();
          log.push({ t: now, kind: 'msg', from: i, to: j, arrive: now + d, msg: 'ka' });
          push(now + d, 'ka', { j, t });
        }
      push(now + KA, 'pulse', { i, t });
    } else if (kind === 'ka') {
      const { j, t } = p;
      if (!alive[j]) continue;
      if (t >= term[j]) {
        if (t > term[j]) {
          term[j] = t;
          voted[j] = null;
        }
        role[j] = 'F';
        alarm(j, now);
      }
    } else if (kind === 'kill') {
      for (let i = 0; i < N; i++)
        if (role[i] === 'L' && alive[i]) {
          alive[i] = false;
          log.push({ t: now, kind: 'die', node: i });
        }
    }
  }
  let safety = true;
  for (const [, ls] of leadersByTerm) if (ls.size > 1) safety = false;
  return { log, leadersByTerm, safety, horizon };
}

export function makeScene(seed) {
  const act1 = runCluster(seed, { spread: 140, jitterLo: 3, jitterHi: 16, killAt: 900, horizon: 2100 });
  const act2 = runCluster(seed + 7, { spread: 0, jitterLo: 4, jitterHi: 4, killAt: null, horizon: 700 });
  return { act1, act2 };
}

const POS = [
  [320, 52],
  [478, 132],
  [420, 236],
  [220, 236],
  [162, 132],
];

export default function RaftViz() {
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
        const run = s.act === 0 ? s.scene.act1 : s.scene.act2;
        if (s.tick >= run.horizon / MS_PER_TICK + END_HOLD) {
          // Hold the finished act for the full rest before the next
          // act begins: every burst of motion earns its two minutes.
          s.tick = run.horizon / MS_PER_TICK + END_HOLD;
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
        const run = actIdx === 0 ? sc.act1 : sc.act2;
        const simNow = done ? run.horizon : Math.min(s.tick * MS_PER_TICK, run.horizon);

        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(
          actIdx === 0
            ? 'act 1 · randomized timeouts: the leader dies, someone runs first, one term, one crown'
            : 'act 2 · identical timeouts: all five run at once, the vote splits, forever (0/60 measured)',
          14,
          20,
        );

        // Replay state at simNow.
        const role = Array(5).fill('F');
        const termArr = Array(5).fill(0);
        const alive = Array(5).fill(true);
        let maxTerm = 0;
        let splits = 0;
        let lastCrown = null;
        for (const ev of run.log) {
          if (ev.t > simNow) break;
          if (ev.kind === 'candidate') {
            role[ev.node] = 'C';
            termArr[ev.node] = ev.term;
            maxTerm = Math.max(maxTerm, ev.term);
            if (actIdx === 1 && ev.node === 4) splits += 1;
          } else if (ev.kind === 'crown') {
            for (let i = 0; i < 5; i++) if (role[i] === 'L') role[i] = 'F';
            role[ev.node] = 'L';
            lastCrown = ev;
          } else if (ev.kind === 'die') {
            alive[ev.node] = false;
            role[ev.node] = 'F';
          }
        }

        // Edges (faint).
        ctx.strokeStyle = 'rgba(154,165,189,0.12)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++)
          for (let j = i + 1; j < 5; j++) {
            ctx.beginPath();
            ctx.moveTo(POS[i][0], POS[i][1]);
            ctx.lineTo(POS[j][0], POS[j][1]);
            ctx.stroke();
          }

        // In-flight messages.
        for (const ev of run.log) {
          if (ev.kind !== 'msg') continue;
          if (ev.t <= simNow && simNow <= ev.arrive) {
            const f = POS[ev.from];
            const to = POS[ev.to];
            const u = (simNow - ev.t) / Math.max(1, ev.arrive - ev.t);
            const x = f[0] + (to[0] - f[0]) * u;
            const y = f[1] + (to[1] - f[1]) * u;
            ctx.fillStyle = ev.msg === 'ka' ? algo : ev.msg === 'req' ? heur : good;
            ctx.beginPath();
            ctx.arc(x, y, 3.6, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Nodes.
        for (let i = 0; i < 5; i++) {
          const [x, y] = POS[i];
          const r = role[i];
          ctx.beginPath();
          ctx.arc(x, y, 19, 0, Math.PI * 2);
          if (!alive[i]) {
            ctx.strokeStyle = warn;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.strokeStyle = warn;
            ctx.beginPath();
            ctx.moveTo(x - 10, y - 10);
            ctx.lineTo(x + 10, y + 10);
            ctx.moveTo(x + 10, y - 10);
            ctx.lineTo(x - 10, y + 10);
            ctx.stroke();
            continue;
          }
          ctx.fillStyle =
            r === 'L' ? 'rgba(98,217,138,0.3)' : r === 'C' ? 'rgba(240,185,75,0.3)' : 'rgba(154,165,189,0.12)';
          ctx.fill();
          ctx.strokeStyle = r === 'L' ? good : r === 'C' ? heur : dim;
          ctx.lineWidth = r === 'F' ? 1.2 : 2.4;
          ctx.stroke();
          ctx.fillStyle = r === 'L' ? good : r === 'C' ? heur : dim;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText(String(i + 1), x - 3, y + 4);
          if (r === 'L') ctx.fillText('♛', x - 5, y - 24);
        }

        ctx.fillStyle = ink;
        ctx.font = '12px ui-monospace, monospace';
        ctx.fillText(`term ${maxTerm}`, 560, 40);

        let line;
        if (done || simNow >= run.horizon) {
          if (actIdx === 0) {
            line = lastCrown
              ? `leader ${lastCrown.node + 1} crowned in term ${lastCrown.term}: one leader per term, audited`
              : 'electing…';
            ctx.fillStyle = good;
          } else {
            line = `${maxTerm} terms, ${maxTerm} five-way splits, zero leaders: the spread IS the liveness`;
            ctx.fillStyle = warn;
          }
        } else if (actIdx === 1) {
          line = `term ${maxTerm}: all five time out together, vote for themselves, and split`;
          ctx.fillStyle = maxTerm > 0 ? warn : ink;
        } else {
          const dead = alive.some((a) => !a);
          line = dead
            ? lastCrown && lastCrown.t > 900
              ? `successor crowned: term ${lastCrown.term}`
              : 'the leader is dead: randomized timers drain…'
            : lastCrown
              ? `leader ${lastCrown.node + 1} pulses keepalives: timers refill`
              : 'first timeout wins the right to run…';
          ctx.fillStyle = dead && !(lastCrown && lastCrown.t > 900) ? warn : ink;
        }
        ctx.fillText(line, 14, H - 12);
        statsRef.current = {
          line: done
            ? 'safety from the quorum, liveness from the dice: both halves measured'
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
          new cluster
        </button>
        <span className="viz-stat">
          {snap.line || 'starting the timers…'}
        </span>
      </div>
    </>
  );
}
