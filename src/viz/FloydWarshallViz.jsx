import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Seven cities, one tariff book. The graph sits left; the distance
// matrix right. Each round admits one hub k: its row and column glow
// amber (the "via k" quotes), and every pair that improves flashes
// green as the book updates in place. After the last hub, the finale
// reconstructs one route from the successor matrix and walks it on the
// graph: the matrix and the map agreeing is the whole point.
const W = 640;
const H = 300;
const SEED = 20260827;
const N = 7;
const K_TICKS = 30;
const PATH_TICKS = 60;

function makeScene(seed) {
  const rand = mulberry32(seed);
  // Random sparse digraph, connected-ish ring + chords, weights 1..9.
  const w = new Map();
  for (let i = 0; i < N; i++) {
    w.set(`${i},${(i + 1) % N}`, 1 + Math.floor(rand() * 9));
  }
  for (let t = 0; t < 6; t++) {
    const u = Math.floor(rand() * N);
    const v = Math.floor(rand() * N);
    if (u !== v && !w.has(`${u},${v}`)) w.set(`${u},${v}`, 1 + Math.floor(rand() * 9));
  }
  const INF = Infinity;
  const dist = Array.from({ length: N }, (_, i) =>
    Array.from({ length: N }, (_, j) => (i === j ? 0 : INF)),
  );
  const nxt = Array.from({ length: N }, () => new Array(N).fill(-1));
  w.forEach((wt, key) => {
    const [u, v] = key.split(',').map(Number);
    dist[u][v] = wt;
    nxt[u][v] = v;
  });
  const rounds = [];
  for (let k = 0; k < N; k++) {
    const imps = [];
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        if (dist[i][k] + dist[k][j] < dist[i][j]) {
          dist[i][j] = dist[i][k] + dist[k][j];
          nxt[i][j] = nxt[i][k];
          imps.push([i, j]);
        }
      }
    }
    rounds.push({ snap: dist.map((r) => r.slice()), imps });
  }
  // A finale pair with a multi-hop path.
  let best = [0, 1];
  let bestLen = 0;
  for (let s = 0; s < N; s++) {
    for (let t = 0; t < N; t++) {
      if (s !== t && dist[s][t] < INF) {
        const path = [s];
        while (path[path.length - 1] !== t && path.length <= N) {
          path.push(nxt[path[path.length - 1]][t]);
        }
        if (path.length > bestLen) {
          bestLen = path.length;
          best = [s, t];
        }
      }
    }
  }
  const [s, t] = best;
  const path = [s];
  while (path[path.length - 1] !== t && path.length <= N) {
    path.push(nxt[path[path.length - 1]][t]);
  }
  return { w, rounds, final: dist, path, s, t };
}

const posOf = (i) => {
  const a = (i / N) * Math.PI * 2 - Math.PI / 2;
  return [160 + 108 * Math.cos(a), 150 + 108 * Math.sin(a)];
};

export default function FloydWarshallViz() {
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
        const total = N * K_TICKS + PATH_TICKS;
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
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';
        const sc = s.scene;

        const inFinale = s.tick >= N * K_TICKS;
        const k = inFinale ? N - 1 : Math.min(Math.floor(s.tick / K_TICKS), N - 1);
        const round = sc.rounds[k];
        const withinK = inFinale ? K_TICKS : s.tick - k * K_TICKS;
        const showImps = withinK > 10;

        // The graph.
        sc.w.forEach((wt, key) => {
          const [u, v] = key.split(',').map(Number);
          const [x1, y1] = posOf(u);
          const [x2, y2] = posOf(v);
          const onPath =
            inFinale &&
            sc.path.some((p, idx) => p === u && sc.path[idx + 1] === v);
          ctx.strokeStyle = onPath ? good : '#2a3450';
          ctx.lineWidth = onPath ? 2.6 : 1.1;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          const mx = x1 + (x2 - x1) * 0.55;
          const my = y1 + (y2 - y1) * 0.55;
          ctx.fillStyle = onPath ? good : '#3a4664';
          ctx.font = '9px ui-monospace, monospace';
          ctx.fillText(String(wt), mx, my);
        });
        for (let i = 0; i < N; i++) {
          const [x, y] = posOf(i);
          const isHub = !inFinale && i === k;
          ctx.fillStyle = isHub ? heur : algo;
          ctx.beginPath();
          ctx.arc(x, y, isHub ? 11 : 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#0b0f1a';
          ctx.font = 'bold 10px ui-monospace, monospace';
          ctx.textAlign = 'center';
          ctx.fillText('ABCDEFG'[i], x, y + 3.5);
          ctx.textAlign = 'start';
        }

        // The matrix.
        const mx0 = 330;
        const my0 = 52;
        const cs = 40;
        const grid = inFinale ? sc.final : round.snap;
        ctx.font = '10px ui-monospace, monospace';
        for (let i = 0; i < N; i++) {
          ctx.fillStyle = dim;
          ctx.fillText('ABCDEFG'[i], mx0 - 14, my0 + i * cs * 0.72 + 16);
          ctx.fillText('ABCDEFG'[i], mx0 + i * cs + 14, my0 - 8);
        }
        for (let i = 0; i < N; i++) {
          for (let j = 0; j < N; j++) {
            const x = mx0 + j * cs;
            const y = my0 + i * cs * 0.72;
            const inK = !inFinale && (i === k || j === k);
            const improved =
              !inFinale && showImps && round.imps.some(([a, b]) => a === i && b === j);
            const onPathCell =
              inFinale && i === sc.s && j === sc.t;
            ctx.fillStyle = improved
              ? `${good}33`
              : onPathCell
                ? `${good}33`
                : inK
                  ? `${heur}18`
                  : 'rgba(255,255,255,0.02)';
            ctx.fillRect(x, y, cs - 2, cs * 0.72 - 2);
            const v = grid[i][j];
            ctx.fillStyle = improved || onPathCell ? good : v === Infinity ? '#3a4664' : ink;
            ctx.textAlign = 'center';
            ctx.fillText(v === Infinity ? '·' : String(v), x + cs / 2 - 1, y + 18);
            ctx.textAlign = 'start';
          }
        }

        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        let line;
        if (inFinale) {
          const names = sc.path.map((p) => 'ABCDEFG'[p]).join(' → ');
          ctx.fillText('finale · one cell, rebuilt on the map from the successor matrix', 14, 20);
          line = `dist[${'ABCDEFG'[sc.s]}][${'ABCDEFG'[sc.t]}] = ${sc.final[sc.s][sc.t]} · path ${names}`;
          ctx.fillStyle = good;
        } else {
          ctx.fillText(`round ${k + 1}/${N} · hub ${'ABCDEFG'[k]} opens: every pair asks "does routing via ${'ABCDEFG'[k]} help?"`, 14, 20);
          line = `${round.imps.length} quote(s) improved this round · k stays OUTERMOST`;
          ctx.fillStyle = ink;
        }
        ctx.font = '12px ui-monospace, monospace';
        ctx.fillText(line, 14, H - 12);

        statsRef.current = {
          line: inFinale ? line : `hub ${'ABCDEFG'[k]} open · ${line}`,
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
          new network
        </button>
        <span className="viz-stat">
          {snap.line || 'printing the first tariff book…'}
        </span>
      </div>
    </>
  );
}
