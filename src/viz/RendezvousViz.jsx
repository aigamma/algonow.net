import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// One continuous scene. Keys arrive one by one; each key's scoreboard
// rises (one bar per node, identical on every client), the tallest
// bar wins in green, and the key drops into that node's bucket: the
// buckets level out with no knob. Then a node dies in red, and its
// keys: only its keys: are promoted one at a time to their runners-up
// while every other bucket sits perfectly still: the disruption
// theorem, drawn.
const W = 640;
const H = 300;
const SEED = 20260827;
const NODES = 8;
const KEYS = 26;
const PLACE_TICKS = 9;
const MID_HOLD = 26;
const DEATH_REVEAL = 18;
const PROMOTE_TICKS = 15;
const END_HOLD = 60;

function makeScene(seed) {
  const rand = mulberry32(seed);
  const scores = [];
  for (let k = 0; k < KEYS; k++) {
    const row = [];
    for (let n = 0; n < NODES; n++) row.push(0.15 + rand() * 0.85);
    scores.push(row);
  }
  const ownerOf = (k, alive) => {
    let best = -1;
    let arg = -1;
    alive.forEach((n) => {
      if (scores[k][n] > best) {
        best = scores[k][n];
        arg = n;
      }
    });
    return arg;
  };
  const all = Array.from({ length: NODES }, (_, i) => i);
  const owners = scores.map((_, k) => ownerOf(k, all));
  const loads = Array(NODES).fill(0);
  owners.forEach((o) => loads[o]++);
  let dead = 0;
  loads.forEach((c, n) => {
    if (c > loads[dead]) dead = n;
  });
  const orphans = owners
    .map((o, k) => ({ o, k }))
    .filter((x) => x.o === dead)
    .map((x) => x.k);
  const alive = all.filter((n) => n !== dead);
  const promoted = orphans.map((k) => ({ k, to: ownerOf(k, alive) }));
  return { scores, owners, dead, orphans, promoted };
}

export default function RendezvousViz() {
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
        scene: makeScene(SEED + cycle.current * 6151),
        tick: 0,
        rest: 0,
        stopAtRest: isStill(),
      }),
      tick: (s) => {
        const nOrphans = s.scene.orphans.length;
        const total =
          KEYS * PLACE_TICKS + MID_HOLD + DEATH_REVEAL + nOrphans * PROMOTE_TICKS + END_HOLD;
        if (s.tick >= total) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, {
              scene: makeScene(SEED + cycle.current * 6151),
              tick: 0,
              rest: 0,
            });
          }
          return true;
        }
        s.tick += 1;
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

        const sc = s.scene;
        const nOrphans = sc.orphans.length;
        const placeEnd = KEYS * PLACE_TICKS;
        const deathAt = placeEnd + MID_HOLD;
        const promoteAt = deathAt + DEATH_REVEAL;
        const tick = s.tick;

        const placing = Math.min(Math.floor(tick / PLACE_TICKS), KEYS);
        const curKey = placing < KEYS && tick < placeEnd ? placing : null;
        const deadShown = tick >= deathAt;
        const promotedCount = tick >= promoteAt
          ? Math.min(Math.floor((tick - promoteAt) / PROMOTE_TICKS), nOrphans)
          : 0;
        const finale = promotedCount >= nOrphans && tick >= promoteAt;

        const colX = (n) => 52 + n * 72;

        // Current effective owner per key (promotions applied in order).
        const effOwner = sc.owners.slice();
        for (let i = 0; i < promotedCount; i++) {
          effOwner[sc.promoted[i].k] = sc.promoted[i].to;
        }

        // The scoreboard for the key in flight (placement or promotion).
        let boardKey = null;
        let boardDead = false;
        let promoTarget = -1;
        if (curKey !== null) {
          boardKey = curKey;
        } else if (tick >= promoteAt && promotedCount < nOrphans) {
          boardKey = sc.orphans[promotedCount];
          boardDead = true;
          promoTarget = sc.promoted[promotedCount].to;
        }
        if (boardKey !== null) {
          const frac = curKey !== null
            ? Math.min(1, ((tick % PLACE_TICKS) + 1) / (PLACE_TICKS - 2))
            : Math.min(1, ((tick - promoteAt) % PROMOTE_TICKS + 1) / (PROMOTE_TICKS - 4));
          const winner = boardDead ? promoTarget : sc.owners[boardKey];
          for (let n = 0; n < NODES; n++) {
            const h = sc.scores[boardKey][n] * 88 * frac;
            const isDeadBar = boardDead && n === sc.dead;
            ctx.fillStyle = isDeadBar ? '#3a2a35' : n === winner ? good : '#33507a';
            ctx.fillRect(colX(n), 128 - h, 34, h);
            if (isDeadBar) {
              ctx.strokeStyle = warn;
              ctx.lineWidth = 1.4;
              ctx.beginPath();
              ctx.moveTo(colX(n), 128 - h);
              ctx.lineTo(colX(n) + 34, 128);
              ctx.moveTo(colX(n) + 34, 128 - h);
              ctx.lineTo(colX(n), 128);
              ctx.stroke();
            }
          }
          ctx.fillStyle = heur;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText(
            boardDead
              ? `key ${boardKey}: its winner is dead: the runner-up was always there`
              : `key ${boardKey}: every client computes these same bars`,
            52,
            30,
          );
        } else if (!deadShown) {
          ctx.fillStyle = dim;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText('placed: the buckets levelled out with no knob', 52, 30);
        }

        // The buckets.
        const counts = Array(NODES).fill(0);
        for (let n = 0; n < NODES; n++) {
          const x = colX(n);
          const isDead = deadShown && n === sc.dead;
          ctx.strokeStyle = isDead ? warn : '#2a3450';
          ctx.lineWidth = 1.6;
          ctx.strokeRect(x - 4, 148, 42, 108);
          ctx.fillStyle = isDead ? warn : dim;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText(`n${n}`, x + 8, 272);
          if (isDead) {
            ctx.beginPath();
            ctx.moveTo(x - 4, 148);
            ctx.lineTo(x + 38, 256);
            ctx.moveTo(x + 38, 148);
            ctx.lineTo(x - 4, 256);
            ctx.stroke();
          }
        }
        for (let k = 0; k < KEYS; k++) {
          const placedYet = k < placing || tick >= placeEnd;
          if (!placedYet) continue;
          const o = effOwner[k];
          const idx = counts[o]++;
          const x = colX(o) + (idx % 3) * 13;
          const y = 244 - Math.floor(idx / 3) * 13;
          const isOrphan = sc.orphans.includes(k);
          const justMoved = deadShown && isOrphan && effOwner[k] !== sc.owners[k];
          ctx.fillStyle = justMoved ? heur : k === curKey ? heur : algo;
          if (deadShown && o === sc.dead) ctx.fillStyle = warn;
          ctx.fillRect(x, y, 10, 10);
        }

        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText('rendezvous: keys pick the tallest bar · then one node dies', 14, H - 34);

        let line;
        if (tick < placeEnd) {
          line = `placing key ${Math.min(placing + 1, KEYS)} of ${KEYS} · agreement with no messages`;
          ctx.fillStyle = dim;
        } else if (!deadShown) {
          line = 'balanced with no knob: now watch a node die';
          ctx.fillStyle = dim;
        } else if (!finale) {
          line = `n${sc.dead} died: promoting its ${nOrphans} keys (${promotedCount} done) · nobody else moves`;
          ctx.fillStyle = heur;
        } else {
          line = `moved exactly ${nOrphans} of ${KEYS} keys: the orphans, nothing else: the theorem, drawn`;
          ctx.fillStyle = good;
        }
        ctx.font = '12px ui-monospace, monospace';
        ctx.fillText(line, 14, H - 12);

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
          new cluster
        </button>
        <span className="viz-stat">
          {snap.line || 'the scoreboard warms up…'}
        </span>
      </div>
    </>
  );
}
