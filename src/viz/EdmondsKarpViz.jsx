import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The gadget, run twice. Two wide pipes s->a->t and s->b->t (capacity
// C), one thin hose a->b (capacity 1). Act one: the pathological
// chooser routes through the hose: one barrel per augmentation, the
// counter spinning toward 2C while the pipes fill at a crawl (shown
// accelerating, honestly labeled). Act two: BFS asks for the shortest
// route: two augmentations, done, hose untouched. The finale dashes
// the min cut in red: capacity equals flow, certificate on canvas.
const W = 640;
const H = 300;
const SEED = 20260827;
const CAP = 100_000;
const ACT1_TICKS = 150;
const ACT2_TICKS = 80;
const END_HOLD = 80;

const POS = { s: [80, 150], a: [320, 60], b: [320, 240], t: [560, 150] };
const PIPES = [
  ['s', 'a'],
  ['s', 'b'],
  ['a', 't'],
  ['b', 't'],
];

function makeScene(seed) {
  mulberry32(seed)();
  return {};
}

export default function EdmondsKarpViz() {
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
        tick: 0,
        rest: 0,
        stopAtRest: isStill(),
      }),
      tick: (s) => {
        const total = ACT1_TICKS + ACT2_TICKS + END_HOLD;
        if (s.tick >= total) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, {
              scene: makeScene(SEED + cycle.current * 7919),
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

        const inAct1 = s.tick < ACT1_TICKS;
        const inAct2 = !inAct1 && s.tick < ACT1_TICKS + ACT2_TICKS;
        const finale = s.tick >= ACT1_TICKS + ACT2_TICKS;

        // Act-1 progress: augmentations accelerate (log-ish ramp so
        // the futility reads without taking 2C real frames).
        let augs1 = 0;
        if (inAct1) {
          const f = s.tick / ACT1_TICKS;
          augs1 = Math.min(2 * CAP, Math.floor(2 * CAP * f * f * f) + Math.min(s.tick, 8));
        }
        const fill1 = inAct1 ? augs1 / (2 * CAP) : 1;
        // Act-2: two big augmentations.
        const augs2 = inAct2 ? (s.tick - ACT1_TICKS < ACT2_TICKS / 2 ? 1 : 2) : finale ? 2 : 0;
        const fill2 = inAct2 || finale ? augs2 / 2 : 0;

        const fill = inAct1 ? fill1 : fill2;

        // Pipes.
        PIPES.forEach(([u, v]) => {
          const [x1, y1] = POS[u];
          const [x2, y2] = POS[v];
          ctx.strokeStyle = '#2a3450';
          ctx.lineWidth = 10;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          ctx.strokeStyle = `${algo}bb`;
          ctx.lineWidth = 10 * Math.max(0.02, fill);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x1 + (x2 - x1) * 1, y1 + (y2 - y1) * 1);
          ctx.stroke();
        });
        // The hose.
        const hoseBusy = inAct1 && augs1 < 2 * CAP;
        ctx.strokeStyle = hoseBusy && Math.floor(s.tick / 3) % 2 ? warn : `${warn}66`;
        ctx.lineWidth = hoseBusy ? 3 : 1.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(POS.a[0], POS.a[1] + 14);
        ctx.lineTo(POS.b[0], POS.b[1] - 14);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = warn;
        ctx.font = '10px ui-monospace, monospace';
        ctx.fillText('cap 1', 328, 152);

        // Min cut in the finale.
        if (finale) {
          ctx.strokeStyle = warn;
          ctx.lineWidth = 2;
          ctx.setLineDash([7, 5]);
          ctx.beginPath();
          ctx.moveTo(180, 30);
          ctx.quadraticCurveTo(150, 150, 180, 270);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = warn;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText('the min cut: 2C = the flow: certified', 190, 34);
        }

        // Nodes.
        Object.entries(POS).forEach(([name, [x, y]]) => {
          ctx.fillStyle = name === 's' ? `${heur}33` : name === 't' ? `${good}33` : `${algo}22`;
          ctx.strokeStyle = name === 's' ? heur : name === 't' ? good : algo;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(x, y, 15, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = ink;
          ctx.font = '12px ui-monospace, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(name, x, y + 4);
          ctx.textAlign = 'start';
        });

        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        let line;
        if (inAct1) {
          ctx.fillText('act 1 · the pathological chooser: every path through the hose, 1 barrel per trip', 14, 20);
          line = `augmentations: ${augs1.toLocaleString()} of 200,000 · flow ${augs1.toLocaleString()}`;
          ctx.fillStyle = warn;
        } else if (inAct2) {
          ctx.fillText('act 2 · BFS: the shortest route has room: the hose is never elected', 14, 20);
          line = `augmentations: ${augs2} · flow ${(augs2 * CAP).toLocaleString()}`;
          ctx.fillStyle = good;
        } else {
          ctx.fillText('same gadget, same flow: 200,000 trips or 2: the chooser is the algorithm', 14, 20);
          line = 'BFS: 2 augmentations · pathological: 200,000 · both measured in the tests';
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
          replay
        </button>
        <span className="viz-stat">
          {snap.line || 'opening the valves…'}
        </span>
      </div>
    </>
  );
}
