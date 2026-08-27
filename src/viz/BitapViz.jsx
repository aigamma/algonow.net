import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// One continuous scene: two lamp rows (the exact register R0 and the
// one-error register R1) over a streaming text strip. The pattern is
// planted twice: once clean, once with a single substituted letter.
// At the clean plant both rows cascade to the accept lamp. At the
// mutated plant the exact row goes dark on the bad letter while R1
// inherits the hypothesis through the substitution splice and carries
// it to the finish: the match that survives one lie.
const W = 640;
const H = 300;
const SEED = 20260827;
const M = 12;
const TEXT_LEN = 58;
const CHAR_TICKS = 9;
const END_HOLD = 70;
const SIGMA = 'acgt';

function makeScene(seed) {
  const rand = mulberry32(seed);
  const pat = Array.from({ length: M }, () => SIGMA[Math.floor(rand() * 4)]);
  const text = Array.from({ length: TEXT_LEN }, () => SIGMA[Math.floor(rand() * 4)]);
  const p1 = 8;
  const p2 = 34;
  for (let i = 0; i < M; i++) {
    text[p1 + i] = pat[i];
    text[p2 + i] = pat[i];
  }
  const mutAt = 4 + Math.floor(rand() * 5); // inside the second plant
  const old = text[p2 + mutAt];
  text[p2 + mutAt] = SIGMA[(SIGMA.indexOf(old) + 1 + Math.floor(rand() * 3)) % 4];

  // Run the machine, recording both registers after each character.
  const B = {};
  for (const c of SIGMA) B[c] = 0;
  pat.forEach((c, j) => {
    B[c] |= 1 << j;
  });
  const accept = 1 << (M - 1);
  let R0 = 0;
  let R1 = 0;
  const frames = [];
  text.forEach((c, i) => {
    const Bc = B[c];
    const prev0 = R0;
    R0 = ((R0 << 1) | 1) & Bc;
    R1 = ((((R1 << 1) | 1) & Bc) | ((prev0 << 1) | 1) | (R0 << 1) | prev0) & ((1 << M) - 1);
    R0 &= (1 << M) - 1;
    frames.push({
      c,
      R0,
      R1,
      hit0: (R0 & accept) !== 0,
      hit1: (R1 & accept) !== 0,
    });
  });
  return { pat, text, frames, p2, mutAt };
}

export default function BitapViz() {
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
        scene: makeScene(SEED + cycle.current * 1327),
        tick: 0,
        rest: 0,
        stopAtRest: isStill(),
      }),
      tick: (s) => {
        const total = TEXT_LEN * CHAR_TICKS + END_HOLD;
        if (s.tick >= total) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, {
              scene: makeScene(SEED + cycle.current * 1327),
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
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';

        const sc = s.scene;
        const seen = Math.min(Math.floor(s.tick / CHAR_TICKS), TEXT_LEN);
        const frame = seen > 0 ? sc.frames[seen - 1] : { R0: 0, R1: 0, c: '', hit0: false, hit1: false };

        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(`pattern: ${sc.pat.join(' ')} · two plants: one clean, one with a single lie`, 14, 20);

        // Lamp rows.
        const lampX = (j) => 120 + j * 42;
        [
          ['R₀ exact', frame.R0, algo, 62],
          ['R₁ ≤1 edit', frame.R1, heur, 112],
        ].forEach(([label, reg, col, y]) => {
          ctx.fillStyle = col;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText(label, 14, y + 4);
          for (let j = 0; j < M; j++) {
            const lit = (reg >> j) & 1;
            ctx.beginPath();
            ctx.arc(lampX(j), y, 10, 0, Math.PI * 2);
            if (lit) {
              ctx.fillStyle = col;
              ctx.fill();
            }
            ctx.strokeStyle = j === M - 1 ? good : '#33507a';
            ctx.lineWidth = j === M - 1 ? 2.2 : 1.4;
            ctx.stroke();
          }
        });
        ctx.fillStyle = dim;
        ctx.font = '10px ui-monospace, monospace';
        ctx.fillText('accept', lampX(M - 1) - 16, 140);

        // Text strip.
        const cw = 612 / TEXT_LEN;
        ctx.font = '10px ui-monospace, monospace';
        sc.text.forEach((c, i) => {
          const isMut = i === sc.p2 + sc.mutAt;
          if (i < seen) {
            ctx.fillStyle = isMut ? warn : dim;
          } else {
            ctx.fillStyle = i === seen ? ink : '#3a4560';
          }
          ctx.fillText(c, 16 + i * cw, 196);
          if (isMut && i < seen) {
            ctx.strokeStyle = warn;
            ctx.beginPath();
            ctx.moveTo(14 + i * cw, 200);
            ctx.lineTo(14 + i * cw + cw - 2, 200);
            ctx.stroke();
          }
        });
        // Cursor.
        if (seen < TEXT_LEN) {
          ctx.strokeStyle = heur;
          ctx.strokeRect(14 + seen * cw, 184, cw, 16);
        }

        // Match markers under the strip.
        for (let i = 0; i < seen; i++) {
          const f = sc.frames[i];
          if (f.hit1) {
            ctx.fillStyle = f.hit0 ? algo : heur;
            ctx.beginPath();
            ctx.moveTo(16 + i * cw + cw / 2, 206);
            ctx.lineTo(11 + i * cw + cw / 2, 216);
            ctx.lineTo(21 + i * cw + cw / 2, 216);
            ctx.closePath();
            ctx.fill();
          }
        }
        ctx.fillStyle = dim;
        ctx.font = '10px ui-monospace, monospace';
        ctx.fillText('▲ blue: exact match ends here · amber: only the ≤1-edit row fired', 16, 232);

        let line;
        const justHit = seen > 0 && sc.frames[seen - 1].hit1;
        if (seen >= TEXT_LEN) {
          line = 'two sites found: the clean one by both rows, the lying one by R₁ alone';
          ctx.fillStyle = good;
        } else if (justHit && !sc.frames[seen - 1].hit0) {
          line = 'accept in R₁ only: the exact row died at the lie; the splice carried it';
          ctx.fillStyle = heur;
        } else if (justHit) {
          line = 'accept in both rows: a clean match ends here';
          ctx.fillStyle = good;
        } else {
          line = `char ${seen}/${TEXT_LEN} · one lever pull: shift, mask, three splices`;
          ctx.fillStyle = dim;
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
          new text
        </button>
        <span className="viz-stat">
          {snap.line || 'compiling the masks…'}
        </span>
      </div>
    </>
  );
}
