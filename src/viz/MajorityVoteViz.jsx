import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts of the same brawl. Act one: 20 blue among 36 (a true
// majority) shuffled; the pointer scans, every decrement draws a red
// pair: the incoming token and one unpaired candidate copy leave
// together: and the verify sweep confirms the survivor in green. Act
// two: a,b repeated 14 times then 8 c's: the pairs annihilate
// everything, the RAREST faction's survivor holds the counter, and
// the verify sweep unmasks it with a red X: a survivor, not a winner.
const W = 640;
const H = 300;
const SEED = 20260827;
const N = 36;
const COLS = 12;
const SCAN_TICKS = 5;
const PAUSE = 22;
const VERIFY_TICKS = 2;
const VERDICT_HOLD = 56;

function runVote(tokens) {
  // Precompute the whole scan: per-token action plus the pairing
  // partner for each cancellation, so the viz can draw the pairs.
  const steps = [];
  let candidate = null;
  let surplus = []; // indices of unpaired candidate copies
  tokens.forEach((t, i) => {
    if (surplus.length === 0) {
      candidate = t;
      surplus = [i];
      steps.push({ i, action: 'adopt', candidate, count: 1, top: i });
    } else if (t === candidate) {
      surplus.push(i);
      steps.push({ i, action: 'match', candidate, count: surplus.length, top: i });
    } else {
      const partner = surplus.pop();
      steps.push({
        i,
        action: 'cancel',
        partner,
        candidate,
        count: surplus.length,
        top: surplus.length ? surplus[surplus.length - 1] : null,
      });
    }
  });
  return { steps, candidate, count: surplus.length };
}

function makeScene(seed) {
  const rand = mulberry32(seed);
  // Act 1: 20 majority copies among 16 distinct fillers, shuffled.
  const a1 = Array.from({ length: N }, (_, i) => (i < 20 ? 'M' : `f${i}`));
  for (let i = a1.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a1[i], a1[j]] = [a1[j], a1[i]];
  }
  // Act 2: a,b fourteen times, then eight c's: c is the RAREST faction.
  const a2 = [];
  for (let i = 0; i < 14; i++) a2.push('a', 'b');
  for (let i = 0; i < 8; i++) a2.push('c');
  const acts = [
    {
      tokens: a1,
      run: runVote(a1),
      majority: 'M',
      note: 'act 1 · 20 blue of 36: a true majority, shuffled',
    },
    {
      tokens: a2,
      run: runVote(a2),
      majority: null,
      note: 'act 2 · factions 14, 14, 8: nobody has a majority',
    },
  ];
  return { acts };
}

export default function MajorityVoteViz() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);
  const statsRef = useRef({ line: '' });
  const [restart, setRestart] = useState(0);
  const [snap, setSnap] = useState({ line: '' });

  useEffect(() => {
    const id = setInterval(() => setSnap({ ...statsRef.current }), 400);
    return () => clearInterval(id);
  }, []);

  const SCAN_TOTAL = N * SCAN_TICKS;
  const VERIFY_TOTAL = N * VERIFY_TICKS;
  const ACT_TOTAL = SCAN_TOTAL + PAUSE + VERIFY_TOTAL + VERDICT_HOLD;

  useCanvasLoop(
    canvasRef,
    {
      width: W,
      height: H,
      stepMs: 45,
      init: () => ({
        scene: makeScene(SEED + cycle.current * 104729),
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
              scene: makeScene(SEED + cycle.current * 104729),
              act: 0,
              tick: 0,
              rest: 0,
            });
          }
          return true;
        }
        s.tick += 1;
        if (s.tick >= ACT_TOTAL) {
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

        const done = s.act >= 2;
        const actIdx = done ? 1 : s.act;
        const act = s.scene.acts[actIdx];
        const tick = done ? ACT_TOTAL - 1 : s.tick;
        const scanned = Math.min(Math.floor(tick / SCAN_TICKS), N);
        const inVerify = tick >= SCAN_TOTAL + PAUSE;
        const verified = Math.min(
          inVerify ? Math.floor((tick - SCAN_TOTAL - PAUSE) / VERIFY_TICKS) : 0,
          N,
        );
        const verdictTime = tick >= SCAN_TOTAL + PAUSE + VERIFY_TOTAL;

        const pos = (i) => ({
          x: 48 + (i % COLS) * 46,
          y: 64 + Math.floor(i / COLS) * 54,
        });

        // Token fill: act 1 majority blue, fillers neutral rings;
        // act 2 factions in three neutral tones.
        const tokenStyle = (t) => {
          if (act.majority) {
            return t === act.majority
              ? { fill: algo, stroke: algo }
              : { fill: 'none', stroke: dim };
          }
          if (t === 'a') return { fill: '#5a647d', stroke: '#5a647d' };
          if (t === 'b') return { fill: 'none', stroke: '#8b95ad' };
          return { fill: '#3e6f8e', stroke: '#3e6f8e' }; // the rare c
        };

        // Which tokens are cancelled so far, and current candidate set.
        const cancelled = new Set();
        for (let k = 0; k < scanned; k++) {
          const st = act.run.steps[k];
          if (st.action === 'cancel') {
            cancelled.add(st.i);
            cancelled.add(st.partner);
          }
        }
        const cur = scanned > 0 ? act.run.steps[Math.min(scanned, N) - 1] : null;

        act.tokens.forEach((t, i) => {
          const { x, y } = pos(i);
          const sty = tokenStyle(t);
          const seen = i < scanned;
          ctx.globalAlpha = cancelled.has(i) ? 0.22 : seen ? 1 : 0.45;
          ctx.beginPath();
          ctx.arc(x, y, 14, 0, Math.PI * 2);
          if (sty.fill !== 'none') {
            ctx.fillStyle = sty.fill;
            ctx.fill();
          }
          ctx.strokeStyle = sty.stroke;
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.globalAlpha = 1;
          if (cancelled.has(i)) {
            ctx.strokeStyle = warn;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(x - 8, y - 8);
            ctx.lineTo(x + 8, y + 8);
            ctx.moveTo(x + 8, y - 8);
            ctx.lineTo(x - 8, y + 8);
            ctx.stroke();
          }
        });

        // The freshest cancellation: draw the pair's red arc.
        if (cur && cur.action === 'cancel' && !inVerify) {
          const p1 = pos(cur.i);
          const p2 = pos(cur.partner);
          ctx.strokeStyle = warn;
          ctx.lineWidth = 1.8;
          ctx.setLineDash([5, 4]);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Candidate marker: amber ring on the latest unpaired copy.
        if (cur && cur.top !== null && !verdictTime) {
          const holder = pos(cur.top);
          ctx.strokeStyle = heur;
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.arc(holder.x, holder.y, 19, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Verify sweep line.
        if (inVerify && !verdictTime && verified < N) {
          const sw = pos(verified);
          ctx.strokeStyle = good;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(sw.x, 40);
          ctx.lineTo(sw.x, 236);
          ctx.stroke();
        }

        // Counter bar.
        const count = cur ? cur.count : 0;
        ctx.fillStyle = '#2a3450';
        ctx.fillRect(48, 246, 506, 8);
        ctx.fillStyle = heur;
        ctx.fillRect(48, 246, Math.min(506, (count / 20) * 506), 8);

        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(act.note, 14, 20);

        let line;
        if (!inVerify) {
          const label = cur ? `candidate ${cur.candidate === 'M' ? 'blue' : cur.candidate} · counter ${count}` : 'scanning';
          line = `pass 1 · ${label} · each decrement is a pair walking out`;
          ctx.fillStyle = dim;
        } else if (!verdictTime) {
          line = 'pass 2 · the recount: a survivor is not yet a winner';
          ctx.fillStyle = good;
        } else {
          const c = act.run.candidate;
          const tally = act.tokens.filter((t) => t === c).length;
          if (tally * 2 > N) {
            line = `verified: ${tally} of ${N} clears half: the majority could not be paired away`;
            ctx.fillStyle = good;
          } else {
            line = `unmasked: candidate '${c}' holds ${tally} of ${N}: the RAREST faction: a survivor, not a winner`;
            ctx.fillStyle = warn;
          }
        }
        ctx.font = '12px ui-monospace, monospace';
        ctx.fillText(line, 14, H - 12);

        // Verdict flourish on the candidate's surviving copies.
        if (verdictTime) {
          const c = act.run.candidate;
          const tally = act.tokens.filter((t) => t === c).length;
          const okv = tally * 2 > N;
          act.tokens.forEach((t, i) => {
            if (t !== c || cancelled.has(i)) return;
            const { x, y } = pos(i);
            ctx.strokeStyle = okv ? good : warn;
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.arc(x, y, 19, 0, Math.PI * 2);
            ctx.stroke();
          });
        }

        statsRef.current = {
          line: done
            ? 'two words, two passes: the verify pass is the method'
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
          new stream
        </button>
        <span className="viz-stat">
          {snap.line || 'the hall fills…'}
        </span>
      </div>
    </>
  );
}
