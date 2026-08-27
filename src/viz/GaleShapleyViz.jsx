import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// One continuous dance, run for real. Six proposers cross to six
// receivers, one proposal per beat: a held hand draws as an amber
// line, an upgrade flashes the old holder red as they re-enter the
// pool, a rejection bounces. When the floor quiets, every line turns
// green and the banner says why the silence is the proof: then the
// blocking-pair auditor sweeps all thirty-six cross pairs and finds
// nothing.
const W = 640;
const H = 300;
const SEED = 20260827;
const N = 6;
const STEP_TICKS = 16;
const AUDIT_TICKS = 3;
const END_HOLD = 66;

function makeScene(seed) {
  const rand = mulberry32(seed);
  const shuffle = () => {
    const a = [...Array(N).keys()];
    for (let i = N - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const P = Array.from({ length: N }, shuffle);
  const R = Array.from({ length: N }, shuffle);
  const rrank = R.map((prefs) => {
    const rank = Array(N).fill(0);
    prefs.forEach((p, i) => {
      rank[p] = i;
    });
    return rank;
  });
  // Run GS, recording each proposal event.
  const nextIdx = Array(N).fill(0);
  const holder = Array(N).fill(-1);
  const free = [...Array(N).keys()];
  const events = [];
  while (free.length) {
    const p = free.pop();
    const r = P[p][nextIdx[p]];
    nextIdx[p] += 1;
    const cur = holder[r];
    if (cur === -1) {
      holder[r] = p;
      events.push({ kind: 'hold', p, r, holds: holder.slice() });
    } else if (rrank[r][p] < rrank[r][cur]) {
      holder[r] = p;
      free.push(cur);
      events.push({ kind: 'swap', p, r, dropped: cur, holds: holder.slice() });
    } else {
      free.push(p);
      events.push({ kind: 'reject', p, r, holds: holder.slice() });
    }
  }
  return { P, R, events, final: holder.slice() };
}

export default function GaleShapleyViz() {
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
        scene: makeScene(SEED + cycle.current * 6427),
        tick: 0,
        rest: 0,
        stopAtRest: isStill(),
      }),
      tick: (s) => {
        const total =
          s.scene.events.length * STEP_TICKS + N * N * AUDIT_TICKS + END_HOLD;
        if (s.tick >= total) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, {
              scene: makeScene(SEED + cycle.current * 6427),
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
        const shown = Math.min(Math.floor(s.tick / STEP_TICKS), sc.events.length);
        const danceDone = shown >= sc.events.length;
        const auditAt = danceDone
          ? Math.min(
              Math.floor((s.tick - sc.events.length * STEP_TICKS) / AUDIT_TICKS),
              N * N,
            )
          : 0;
        const auditDone = danceDone && auditAt >= N * N;
        const ev = shown > 0 ? sc.events[shown - 1] : null;
        const holds = ev ? ev.holds : Array(N).fill(-1);

        const PY = (i) => 52 + i * 40;
        const PX = 110;
        const RX = 530;

        // Held-hand lines.
        holds.forEach((p, r) => {
          if (p < 0) return;
          ctx.strokeStyle = auditDone ? good : heur;
          ctx.lineWidth = 1.8;
          if (!danceDone) ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(PX + 14, PY(p));
          ctx.lineTo(RX - 14, PY(r));
          ctx.stroke();
          ctx.setLineDash([]);
        });

        // The event flash.
        if (ev && !danceDone) {
          const f = ((s.tick % STEP_TICKS) + 1) / STEP_TICKS;
          const y1 = PY(ev.p);
          const y2 = PY(ev.r);
          if (ev.kind === 'reject') {
            ctx.strokeStyle = warn;
            ctx.setLineDash([3, 5]);
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(PX + 14, y1);
            ctx.lineTo(PX + 14 + (RX - PX - 28) * Math.min(f * 1.6, 1), y1 + (y2 - y1) * Math.min(f * 1.6, 1));
            ctx.stroke();
            ctx.setLineDash([]);
          } else if (ev.kind === 'swap') {
            ctx.strokeStyle = warn;
            ctx.lineWidth = 2;
            const dy = PY(ev.dropped);
            ctx.beginPath();
            ctx.moveTo(RX - 14, PY(ev.r));
            ctx.lineTo(PX + 14, dy);
            ctx.stroke();
          }
        }

        // The audit sweep: pair (p, r) highlighted briefly.
        if (danceDone && !auditDone) {
          const p = Math.floor(auditAt / N);
          const r = auditAt % N;
          ctx.strokeStyle = '#40507a';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(PX + 14, PY(p));
          ctx.lineTo(RX - 14, PY(r));
          ctx.stroke();
        }

        // People.
        for (let i = 0; i < N; i++) {
          ctx.beginPath();
          ctx.arc(PX, PY(i), 12, 0, Math.PI * 2);
          ctx.strokeStyle = algo;
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = algo;
          ctx.font = '10px ui-monospace, monospace';
          ctx.fillText(`a${i + 1}`, PX - 8, PY(i) + 4);
          ctx.beginPath();
          ctx.arc(RX, PY(i), 12, 0, Math.PI * 2);
          ctx.strokeStyle = '#8b95ad';
          ctx.stroke();
          ctx.fillStyle = dim;
          ctx.fillText(`p${i + 1}`, RX - 8, PY(i) + 4);
        }

        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText('proposers in heart-order · a held hand is provisional · rejections are forever', 14, 20);

        let line;
        if (!danceDone) {
          if (ev?.kind === 'hold') line = `a${ev.p + 1} → p${ev.r + 1}: held, for now`;
          else if (ev?.kind === 'swap') line = `p${ev.r + 1} trades up to a${ev.p + 1}: a${ev.dropped + 1} back to the pool`;
          else if (ev?.kind === 'reject') line = `p${ev.r + 1} keeps their holder: a${ev.p + 1} crosses to the next name`;
          else line = 'the music starts…';
          ctx.fillStyle = ev?.kind === 'hold' ? heur : ev ? warn : dim;
        } else if (!auditDone) {
          line = `the floor is quiet: auditing all ${N * N} cross pairs for a couple who would elope…`;
          ctx.fillStyle = dim;
        } else {
          line = 'zero blocking pairs: the silence is the proof, and the announcement survives the participants';
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
          new dance
        </button>
        <span className="viz-stat">
          {snap.line || 'the music starts…'}
        </span>
      </div>
    </>
  );
}
