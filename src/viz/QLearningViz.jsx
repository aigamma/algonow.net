import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The cliff walk, learned twice at once: Q-learning on the left and
// SARSA on the right, both behaving epsilon-greedily with epsilon 0.1
// and a step size of 0.5. Each tick is one training episode per
// learner. Cells shade by their best learned value, the cliff flashes
// red on a fall, and the greedy route from the start is redrawn after
// every episode: blue while it is still wrong, green once it reaches
// the goal (13 steps along the edge for Q-learning, the safe 17-step
// top route for SARSA). The bars count the falls each learner paid
// while learning.
const W = 640;
const H = 300;
const SEED = 20260926;
const ROWS = 4;
const COLS = 12;
const START = 3 * COLS;
const GOAL = 3 * COLS + 11;
const ACTS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const ALPHA = 0.5;
const EPS = 0.1;
const MAX_EPISODES = 400;

const isCliff = (r, c) => r === 3 && c >= 1 && c <= 10;

export function stepEnv(s, a) {
  const r = Math.floor(s / COLS);
  const c = s % COLS;
  const nr = Math.min(ROWS - 1, Math.max(0, r + ACTS[a][0]));
  const nc = Math.min(COLS - 1, Math.max(0, c + ACTS[a][1]));
  if (isCliff(nr, nc)) return { n: START, r: -100, done: false, fell: true };
  const n = nr * COLS + nc;
  return { n, r: -1, done: n === GOAL, fell: false };
}

function makeLearner(kind, rand) {
  return { kind, Q: new Float64Array(ROWS * COLS * 4), rand, falls: 0, randomMoves: 0, episodes: 0, route: [START], ok: false, fellThisEpisode: false };
}

function choose(L, s) {
  if (L.rand() < EPS) {
    L.randomMoves += 1;
    return Math.floor(L.rand() * 4);
  }
  let best = -Infinity;
  const ties = [];
  for (let a = 0; a < 4; a++) {
    const v = L.Q[s * 4 + a];
    if (v > best) {
      best = v;
      ties.length = 0;
      ties.push(a);
    } else if (v === best) ties.push(a);
  }
  return ties[Math.floor(L.rand() * ties.length)];
}

function bestValue(L, s) {
  let b = -Infinity;
  for (let a = 0; a < 4; a++) b = Math.max(b, L.Q[s * 4 + a]);
  return b;
}

export function runEpisode(L) {
  let s = START;
  let a = choose(L, s);
  L.fellThisEpisode = false;
  for (let t = 0; t < 500; t++) {
    const { n, r, done, fell } = stepEnv(s, a);
    if (fell) {
      L.falls += 1;
      L.fellThisEpisode = true;
    }
    if (L.kind === 'q') {
      const target = r + (done ? 0 : bestValue(L, n));
      L.Q[s * 4 + a] += ALPHA * (target - L.Q[s * 4 + a]);
      s = n;
      a = choose(L, s);
    } else {
      const a2 = choose(L, n);
      const target = r + (done ? 0 : L.Q[n * 4 + a2]);
      L.Q[s * 4 + a] += ALPHA * (target - L.Q[s * 4 + a]);
      s = n;
      a = a2;
    }
    if (done) break;
  }
  L.episodes += 1;
  const route = [START];
  const seen = new Set([START]);
  let cur = START;
  L.ok = false;
  for (let t = 0; t < 60; t++) {
    let bestA = 0;
    for (let x = 1; x < 4; x++) if (L.Q[cur * 4 + x] > L.Q[cur * 4 + bestA]) bestA = x;
    const { n, done, fell } = stepEnv(cur, bestA);
    if (fell || seen.has(n)) break;
    route.push(n);
    seen.add(n);
    cur = n;
    if (done) {
      L.ok = true;
      break;
    }
  }
  L.route = route;
}

export function makeScene(seed) {
  return { q: makeLearner('q', mulberry32(seed)), sarsa: makeLearner('sarsa', mulberry32(seed + 1)), streak: 0 };
}

export function sceneTick(sc) {
  runEpisode(sc.q);
  runEpisode(sc.sarsa);
  sc.streak = sc.q.ok && sc.q.route.length - 1 === 13 ? sc.streak + 1 : 0;
  return (sc.streak >= 40 && sc.sarsa.ok) || sc.q.episodes >= MAX_EPISODES;
}

export default function QLearningViz() {
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
      init: () => ({ scene: makeScene(SEED + cycle.current * 7919), done: false, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, { scene: makeScene(SEED + cycle.current * 7919), done: false, rest: 0 });
          }
          return true;
        }
        if (sceneTick(s.scene)) s.done = true;
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
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(`episode ${sc.q.episodes}: both learners behave ε-greedily (ε 0.1, α 0.5); the referee's optimum is the 13-step cliff edge`, 12, 18);
        const cell = 26;
        const panels = [
          { x0: 8, L: sc.q, name: 'Q-learning (off-policy)', tint: '93,162,255', routeColor: sc.q.ok && sc.q.route.length - 1 === 13 ? good : algo },
          { x0: 328, L: sc.sarsa, name: 'SARSA (on-policy rival)', tint: '154,165,189', routeColor: sc.sarsa.ok ? good : dim },
        ];
        const y0 = 34;
        for (const p of panels) {
          for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
              const x = p.x0 + c * cell;
              const y = y0 + r * cell;
              if (isCliff(r, c)) {
                ctx.fillStyle = `rgba(226,96,108,${p.L.fellThisEpisode ? 0.8 : 0.3})`;
              } else {
                const v = bestValue(p.L, r * COLS + c);
                const t = Math.max(0, Math.min(1, (v + 40) / 40));
                ctx.fillStyle = `rgba(${p.tint},${0.06 + 0.5 * t})`;
              }
              ctx.fillRect(x, y, cell - 1, cell - 1);
            }
          }
          ctx.strokeStyle = p.routeColor;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          p.L.route.forEach((idx, i) => {
            const cx = p.x0 + (idx % COLS) * cell + cell / 2;
            const cy = y0 + Math.floor(idx / COLS) * cell + cell / 2;
            if (i === 0) ctx.moveTo(cx, cy);
            else ctx.lineTo(cx, cy);
          });
          ctx.stroke();
          ctx.lineWidth = 1;
          ctx.fillStyle = ink;
          ctx.font = 'bold 11px ui-monospace, monospace';
          ctx.fillText('S', p.x0 + 9, y0 + 3 * cell + 17);
          ctx.fillText('G', p.x0 + 11 * cell + 9, y0 + 3 * cell + 17);
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillStyle = p.routeColor;
          const len = p.L.route.length - 1;
          ctx.fillText(`${p.name}: greedy route ${p.L.ok ? `${len} steps` : 'not yet reaching the goal'}`, p.x0, y0 + 4 * cell + 16);
          ctx.fillStyle = warn;
          ctx.fillText(`falls while learning: ${p.L.falls}`, p.x0, y0 + 4 * cell + 32);
        }
        ctx.fillStyle = heur;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(`ε-greedy random moves so far: ${sc.q.randomMoves} (Q-learning), ${sc.sarsa.randomMoves} (SARSA); an entry nobody visits is a guess forever`, 12, 208);
        const maxFalls = Math.max(1, sc.q.falls, sc.sarsa.falls);
        const bars = [
          { label: 'Q-learning falls', v: sc.q.falls, color: algo },
          { label: 'SARSA falls', v: sc.sarsa.falls, color: dim },
        ];
        bars.forEach((b, i) => {
          const y = 226 + i * 22;
          ctx.fillStyle = dim;
          ctx.fillText(b.label, 12, y + 11);
          ctx.fillStyle = b.color;
          ctx.fillRect(150, y, Math.max(2, (b.v / maxFalls) * 380), 14);
          ctx.fillStyle = ink;
          ctx.fillText(String(b.v), 156 + Math.max(2, (b.v / maxFalls) * 380), y + 11);
        });
        let line;
        if (s.done) {
          const q = sc.q;
          const sa = sc.sarsa;
          line = q.ok && q.route.length - 1 === 13
            ? `Q-learning walks the 13-step edge after ${q.episodes} episodes and ${q.falls} falls; SARSA settled on the ${sa.ok ? `${sa.route.length - 1}-step safe route` : 'high ground'} with ${sa.falls} falls`
            : `${MAX_EPISODES} episodes: Q-learning route ${q.ok ? `${q.route.length - 1} steps` : 'unfinished'} with ${q.falls} falls; SARSA ${sa.ok ? `${sa.route.length - 1} steps` : 'unfinished'} with ${sa.falls} falls`;
          ctx.fillStyle = good;
        } else {
          line = 'the off-policy update learns the edge while the feet lurch; the on-policy rival learns to walk where lurching is safe';
          ctx.fillStyle = ink;
        }
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(line, 12, H - 8);
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
          new seed
        </button>
        <span className="viz-stat">{snap.line || 'learning…'}</span>
      </div>
    </>
  );
}
