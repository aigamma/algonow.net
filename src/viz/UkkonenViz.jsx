import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The tree grows as the text streams. One character enters per beat;
// the same builder verified in the Python referee runs here, and the
// layout re-draws the whole tree after every phase: leaves in green
// with their open ends (the free growth), fresh splits flashing
// amber, the processed text dimming below. The hold shows the size
// theorem: every build within 2(n+1) nodes.
const W = 640;
const H = 300;
const SEED = 20260827;
const CHAR_TICKS = 26;
const END_HOLD = 70;

function buildSnapshots(text) {
  // Ukkonen, mirroring the verified Python: snapshot after each char.
  const child = [{}];
  const st = [0];
  const en = [0]; // null = open leaf
  const link = [0];
  const fresh = [0]; // creation phase per node (for flashes)
  let activeNode = 0;
  let activeEdge = 0;
  let activeLen = 0;
  let remainder = 0;
  const snaps = [];

  const newNode = (s0, e0, phase) => {
    child.push({});
    st.push(s0);
    en.push(e0);
    link.push(0);
    fresh.push(phase);
    return child.length - 1;
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    remainder += 1;
    let lastInternal = null;
    for (;;) {
      if (remainder === 0) break;
      if (activeLen === 0) activeEdge = i;
      const ec = text[activeEdge];
      const nxt = child[activeNode][ec];
      if (nxt === undefined) {
        const leaf = newNode(i, null, i);
        child[activeNode][ec] = leaf;
        if (lastInternal !== null) {
          link[lastInternal] = activeNode;
          lastInternal = null;
        }
      } else {
        const edgeEnd = en[nxt] === null ? i + 1 : en[nxt];
        const edgeLen = edgeEnd - st[nxt];
        if (activeLen >= edgeLen) {
          activeNode = nxt;
          activeEdge += edgeLen;
          activeLen -= edgeLen;
          continue;
        }
        if (text[st[nxt] + activeLen] === c) {
          activeLen += 1;
          if (lastInternal !== null) link[lastInternal] = activeNode;
          break;
        }
        const split = newNode(st[nxt], st[nxt] + activeLen, i);
        child[activeNode][ec] = split;
        st[nxt] += activeLen;
        child[split][text[st[nxt]]] = nxt;
        const leaf = newNode(i, null, i);
        child[split][c] = leaf;
        if (lastInternal !== null) link[lastInternal] = split;
        lastInternal = split;
      }
      remainder -= 1;
      if (activeNode === 0 && activeLen > 0) {
        activeLen -= 1;
        activeEdge = i - remainder + 1;
      } else if (activeNode !== 0) {
        activeNode = link[activeNode];
      }
    }
    // Snapshot edges for drawing.
    const edges = [];
    let leafCount = 0;
    const walk = (v, depth) => {
      const kids = Object.keys(child[v]).sort();
      if (kids.length === 0 && v !== 0) leafCount += 1;
      kids.forEach((k) => {
        const u = child[v][k];
        const e1 = en[u] === null ? i + 1 : en[u];
        edges.push({
          from: v,
          to: u,
          label: text.slice(st[u], e1),
          open: en[u] === null,
          depth,
          fresh: fresh[u],
        });
        walk(u, depth + (e1 - st[u]));
      });
    };
    walk(0, 0);
    snaps.push({ edges, nodes: child.length, leaves: leafCount, upTo: i + 1 });
  }
  return snaps;
}

function layout(snap) {
  // Assign each leaf a row via DFS order; internal nodes center over
  // children; x scales with string depth.
  const kids = new Map();
  snap.edges.forEach((e) => {
    if (!kids.has(e.from)) kids.set(e.from, []);
    kids.get(e.from).push(e);
  });
  let row = 0;
  const pos = new Map();
  const place = (v, depth) => {
    const es = kids.get(v);
    if (!es || es.length === 0) {
      pos.set(v, { x: depth, y: row });
      row += 1;
      return pos.get(v).y;
    }
    const ys = es.map((e) => place(e.to, depth + e.label.length));
    const y = (Math.min(...ys) + Math.max(...ys)) / 2;
    pos.set(v, { x: depth, y });
    return y;
  };
  place(0, 0);
  return { pos, rows: row };
}

function makeScene(seed) {
  const rand = mulberry32(seed);
  // The classic teaching shape: a repeated motif plus a divergence.
  const motifs = ['abcab', 'xabxa', 'abab', 'bananx'];
  const m = motifs[Math.floor(rand() * motifs.length)];
  const text = (m + m[0] + 'x' + m.slice(0, 3)).slice(0, 10) + '$';
  return { text, snaps: buildSnapshots(text) };
}

export default function UkkonenViz() {
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
        scene: makeScene(SEED + cycle.current * 5779),
        tick: 0,
        rest: 0,
        stopAtRest: isStill(),
      }),
      tick: (s) => {
        const total = s.scene.text.length * CHAR_TICKS + END_HOLD;
        if (s.tick >= total) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, {
              scene: makeScene(SEED + cycle.current * 5779),
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
        const n = sc.text.length;
        const phase = Math.min(Math.floor(s.tick / CHAR_TICKS), n - 1);
        const finished = s.tick >= n * CHAR_TICKS;
        const cur = sc.snaps[phase];
        const { pos, rows } = layout(cur);

        const maxDepth = Math.max(3, ...cur.edges.map((e) => e.depth + e.label.length));
        const X = (d) => 40 + (d / maxDepth) * 520;
        const Y = (r) => 44 + (rows <= 1 ? 80 : (r / (rows - 1)) * 168);

        // Edges then nodes.
        cur.edges.forEach((e) => {
          const a = pos.get(e.from);
          const b = pos.get(e.to);
          const isFresh = e.fresh === phase && !finished;
          ctx.strokeStyle = isFresh ? heur : e.open ? good : algo;
          ctx.lineWidth = isFresh ? 2.4 : 1.7;
          ctx.beginPath();
          ctx.moveTo(X(a.x), Y(a.y));
          ctx.lineTo(X(b.x), Y(b.y));
          ctx.stroke();
          const mx = (X(a.x) + X(b.x)) / 2;
          const my = (Y(a.y) + Y(b.y)) / 2 - 5;
          ctx.fillStyle = isFresh ? heur : e.open ? good : dim;
          ctx.font = '10px ui-monospace, monospace';
          const label = e.open ? e.label + '→E' : e.label;
          ctx.fillText(label, mx - label.length * 3, my);
        });
        pos.forEach(({ x, y }, v) => {
          ctx.beginPath();
          ctx.arc(X(x), Y(y), v === 0 ? 5.5 : 3.5, 0, Math.PI * 2);
          ctx.fillStyle = v === 0 ? ink : '#33507a';
          ctx.fill();
        });

        // The text strip.
        ctx.font = '13px ui-monospace, monospace';
        sc.text.split('').forEach((c, i) => {
          const shown = c === '$' ? '$' : c;
          ctx.fillStyle = i <= phase ? (i === phase && !finished ? heur : dim) : '#3a4560';
          ctx.fillText(shown, 40 + i * 18, 252);
        });
        ctx.fillStyle = dim;
        ctx.font = '10px ui-monospace, monospace';
        ctx.fillText('green →E: open leaves, all grown by one global pointer · amber: born this phase', 40, 272);

        let line;
        if (!finished) {
          line = `phase ${phase + 1}/${n} · '${sc.text[phase]}' enters · ${cur.nodes} nodes, ${cur.leaves} leaves open`;
          ctx.fillStyle = dim;
        } else {
          const last = sc.snaps[n - 1];
          line = `complete: ${last.nodes} nodes ≤ 2(n+1) = ${2 * (n + 1)} · every substring is now a walk from the root`;
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
          new text
        </button>
        <span className="viz-stat">
          {snap.line || 'the first character arrives…'}
        </span>
      </div>
    </>
  );
}
