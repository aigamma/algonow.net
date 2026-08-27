import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts of one greedy rule. Act one: a random universe of dots
// and a shelf of candidate sets: each round the set covering the
// most still-uncovered dots flashes amber and its dots turn green:
// the marginal-gain argmax, watched converging. Act two: the trap:
// the classic two-row family where the two blue rows would cover
// everything, but doubling-width column blocks out-bid them round
// after round: greedy pays five picks where the optimum pays two:
// the log(n) bound, animated as the swindle it is.
const W = 640;
const H = 300;
const SEED = 20260827;
const N_EL = 24;
const N_SETS = 8;
const ROUND_TICKS = 34;
const END_HOLD = 70;

function popcount(x) {
  let c = 0;
  while (x) {
    x &= x - 1;
    c += 1;
  }
  return c;
}

export function greedyPicks(universe, sets) {
  let covered = 0;
  const rounds = [];
  while ((covered & universe) !== universe) {
    let best = -1;
    let gain = 0;
    for (let i = 0; i < sets.length; i++) {
      const g = popcount(sets[i] & ~covered & universe);
      if (g > gain) {
        gain = g;
        best = i;
      }
    }
    if (best < 0) return null;
    covered |= sets[best];
    rounds.push({ pick: best, gain, covered });
  }
  return rounds;
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const universe = (1 << N_EL) - 1;
  let sets;
  // Deterministic reroll until coverable with visible variety.
  for (let tries = 0; tries < 40; tries++) {
    sets = [];
    for (let i = 0; i < N_SETS; i++) {
      let s = 0;
      const p = 0.15 + rand() * 0.3;
      for (let e = 0; e < N_EL; e++) if (rand() < p) s |= 1 << e;
      sets.push(s);
    }
    let all = 0;
    for (const s of sets) all |= s;
    if ((all & universe) === universe) {
      const r = greedyPicks(universe, sets);
      if (r && r.length >= 3 && r.length <= 6) break;
    }
    sets = null;
  }
  if (!sets) {
    sets = [];
    for (let i = 0; i < N_SETS; i++) {
      let s = 0;
      for (let e = i; e < N_EL; e += N_SETS) s |= 1 << e;
      sets.push(s);
    }
  }
  const rounds = greedyPicks(universe, sets);

  // Act 2: tight family, k = 5: a 2 x 31 grid.
  const K = 5;
  const width = 2 ** K - 1;
  const blocks = [];
  let c0 = 0;
  for (let j = K - 1; j >= 0; j--) {
    const w = 2 ** j;
    blocks.push({ from: c0, to: c0 + w - 1, w });
    c0 += w;
  }
  return { universe, sets, rounds, K, width, blocks };
}

export default function SetCoverViz() {
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
            ? (s.scene.rounds.length + 1) * ROUND_TICKS + END_HOLD
            : (s.scene.K + 2) * ROUND_TICKS + END_HOLD;
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

        if (actIdx === 0) {
          const round = Math.min(Math.floor(s.tick / ROUND_TICKS), sc.rounds.length);
          const finished = done || round >= sc.rounds.length;
          const covered = round === 0 ? 0 : sc.rounds[Math.min(round, sc.rounds.length) - 1].covered;
          ctx.fillText('act 1 · each round: take the set covering the most still-uncovered dots', 14, 20);

          // Universe dots: 8 x 3.
          for (let e = 0; e < N_EL; e++) {
            const x = 60 + (e % 8) * 40;
            const y = 52 + Math.floor(e / 8) * 34;
            const isCov = (covered >> e) & 1;
            ctx.fillStyle = isCov ? good : 'rgba(154,165,189,0.25)';
            ctx.beginPath();
            ctx.arc(x, y, isCov ? 7 : 5, 0, Math.PI * 2);
            ctx.fill();
          }

          // The shelf of sets: mini-strips.
          for (let i = 0; i < sc.sets.length; i++) {
            const y = 170 + Math.floor(i / 4) * 44;
            const x0 = 40 + (i % 4) * 150;
            const isPicked = sc.rounds.slice(0, round).some((r) => r.pick === i);
            const isCurrent = !finished && round < sc.rounds.length && sc.rounds[round].pick === i && s.tick % ROUND_TICKS > 10;
            ctx.strokeStyle = isCurrent ? heur : isPicked ? good : 'rgba(154,165,189,0.4)';
            ctx.lineWidth = isCurrent ? 2.4 : 1.2;
            ctx.strokeRect(x0, y, 130, 26);
            for (let e = 0; e < N_EL; e++) {
              if ((sc.sets[i] >> e) & 1) {
                ctx.fillStyle = isPicked || isCurrent ? (isCurrent ? heur : good) : dim;
                ctx.fillRect(x0 + 5 + e * 5.1, y + 8, 3.6, 10);
              }
            }
          }

          let line;
          if (finished) {
            line = `covered in ${sc.rounds.length} picks · gains ${sc.rounds.map((r) => r.gain).join(' → ')}: each pick buys less: submodularity in motion`;
            ctx.fillStyle = good;
          } else if (round < sc.rounds.length) {
            const r = sc.rounds[round];
            line = `round ${round + 1}: set ${r.pick + 1} wins with ${r.gain} new dots · ${N_EL - popcount(covered)} uncovered`;
            ctx.fillStyle = ink;
          } else {
            line = '';
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = { line };
        } else {
          const phase = done ? sc.K + 2 : Math.min(Math.floor(s.tick / ROUND_TICKS), sc.K + 2);
          ctx.fillText('act 2 · the trap: two rows WOULD cover everything: the doubling blocks out-bid them anyway', 14, 20);

          const cw = 17;
          const x0 = 40;
          // The 2 x 31 universe.
          for (let r = 0; r < 2; r++) {
            for (let c = 0; c < sc.width; c++) {
              // which block is c in, and has that block been picked?
              let bi = -1;
              for (let b = 0; b < sc.blocks.length; b++) {
                if (c >= sc.blocks[b].from && c <= sc.blocks[b].to) bi = b;
              }
              const pickedAt = bi + 1; // block b picked at phase b+1
              const covered2 = phase >= pickedAt && phase >= 1;
              ctx.fillStyle = covered2 ? 'rgba(240,185,75,0.7)' : 'rgba(154,165,189,0.2)';
              ctx.fillRect(x0 + c * cw, 60 + r * 30, cw - 3, 24);
            }
          }
          // OPT rows outline (phase 0 flash).
          if (phase === 0 || done) {
            ctx.strokeStyle = algo;
            ctx.lineWidth = 2;
            ctx.strokeRect(x0 - 3, 57, sc.width * cw + 3, 30);
            ctx.strokeRect(x0 - 3, 87, sc.width * cw + 3, 30);
            ctx.fillStyle = algo;
            ctx.font = '11px ui-monospace, monospace';
            ctx.fillText('the two rows: OPT = 2', x0, 140);
          }
          // Block labels as they are picked.
          for (let b = 0; b < Math.min(phase, sc.K); b++) {
            const blk = sc.blocks[b];
            ctx.fillStyle = heur;
            ctx.font = '10px ui-monospace, monospace';
            ctx.fillText(`pick ${b + 1}: ${blk.w * 2}`, x0 + blk.from * cw, 168 + b * 16);
          }

          let line;
          if (done || phase >= sc.K + 1) {
            line = `greedy: ${sc.K} picks · optimum: 2 · the widest block always out-bids a half-covered row: log(n) is a real place`;
            ctx.fillStyle = warn;
          } else if (phase === 0) {
            line = 'the two blue rows would finish it in two picks…';
            ctx.fillStyle = algo;
          } else {
            const blk = sc.blocks[phase - 1];
            line = `round ${phase}: the ${blk.w * 2}-dot block out-bids each row's remainder: greedy takes the bait`;
            ctx.fillStyle = heur;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = {
            line: done
              ? 'greedy is H(d)-good and log(n)-fallible: both are theorems, both just ran'
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
          new universe
        </button>
        <span className="viz-stat">
          {snap.line || 'scattering the dots…'}
        </span>
      </div>
    </>
  );
}
