import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The drawer, built and then read. Act one: ten of the site's own
// words insert one at a time: each character either rides an existing
// node (amber flash: paid for already) or founds a new one (green
// flash), and the reuse counter tells the sharing story. Act two: an
// autocomplete: the prefix path lights up, the subtree below the
// fingertip glows, and the completions list out: the neighborhood as a
// place. Left-to-right tree, depth = character position.
const W = 640;
const H = 300;
const SEED = 20260827;
const WORD_SETS = [
  ['algo', 'algorithm', 'algonow', 'atlas', 'amber', 'array', 'arc', 'audit', 'auto', 'answer'],
  ['pair', 'page', 'path', 'pathfinder', 'pattern', 'prefix', 'prime', 'probe', 'proof', 'prune'],
];
const CHAR_TICKS = 7;
const WORD_PAUSE = 10;
const ACT2_STEP = 12;
const END_HOLD = 70;

function buildTrie(words) {
  const root = { ch: '', kids: {}, end: false, id: 0 };
  let nid = 1;
  const events = []; // per inserted char: {node, isNew, word, idx}
  words.forEach((w) => {
    let node = root;
    for (const ch of w) {
      let isNew = false;
      if (!node.kids[ch]) {
        node.kids[ch] = { ch, kids: {}, end: false, id: nid++ };
        isNew = true;
      }
      node = node.kids[ch];
      events.push({ node, isNew, word: w });
    }
    node.end = true;
    events.push({ node, isNew: false, word: w, endMark: true });
  });
  // Layout: leaves get y slots in DFS order; internal centered.
  let slot = 0;
  const place = (node, depth) => {
    node.x = 30 + depth * 44;
    const keys = Object.keys(node.kids).sort();
    if (!keys.length) {
      node.y = 46 + slot * 22;
      slot += 1;
    } else {
      keys.forEach((k) => place(node.kids[k], depth + 1));
      const ys = keys.map((k) => node.kids[k].y);
      node.y = (Math.min(...ys) + Math.max(...ys)) / 2;
    }
  };
  place(root, 0);
  const all = [];
  (function collect(n) {
    all.push(n);
    Object.keys(n.kids).forEach((k) => collect(n.kids[k]));
  })(root);
  return { root, events, all, nodeCount: nid };
}

function makeScene(seed) {
  const rand = mulberry32(seed);
  const words = WORD_SETS[Math.floor(rand() * WORD_SETS.length)];
  const trie = buildTrie(words);
  const prefix = words[0].slice(0, 2);
  const completions = words.filter((w) => w.startsWith(prefix)).sort();
  return { words, ...trie, prefix, completions };
}

export default function TrieViz() {
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
        const act1 = s.scene.events.length * CHAR_TICKS + s.scene.words.length * WORD_PAUSE;
        const act2 = (s.scene.prefix.length + s.scene.completions.length) * ACT2_STEP + END_HOLD;
        if (s.tick >= act1 + act2) {
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
        const act1Len = sc.events.length * CHAR_TICKS + sc.words.length * WORD_PAUSE;
        const inAct2 = s.tick >= act1Len;

        // Which events have fired (approximate: uniform pace).
        const evtsDone = inAct2
          ? sc.events.length
          : Math.min(Math.floor(s.tick / CHAR_TICKS), sc.events.length);
        const visible = new Set([sc.root.id]);
        const endMarks = new Set();
        let reused = 0;
        let created = 0;
        let flash = null;
        for (let e = 0; e < evtsDone; e++) {
          const ev = sc.events[e];
          visible.add(ev.node.id);
          if (ev.endMark) endMarks.add(ev.node.id);
          else if (ev.isNew) created += 1;
          else reused += 1;
          if (e === evtsDone - 1 && !inAct2) flash = ev;
        }

        // Act 2 highlighting.
        let pathIds = new Set();
        let subtreeIds = new Set();
        let shownCompletions = 0;
        if (inAct2) {
          const t = s.tick - act1Len;
          const steps = Math.floor(t / ACT2_STEP);
          const pl = Math.min(steps, sc.prefix.length);
          let node = sc.root;
          pathIds.add(node.id);
          for (let i = 0; i < pl; i++) {
            node = node.kids[sc.prefix[i]];
            if (!node) break;
            pathIds.add(node.id);
          }
          if (pl >= sc.prefix.length && node) {
            (function mark(n) {
              subtreeIds.add(n.id);
              Object.keys(n.kids).forEach((k) => mark(n.kids[k]));
            })(node);
            shownCompletions = Math.min(steps - sc.prefix.length, sc.completions.length);
          }
        }

        // Edges + nodes.
        sc.all.forEach((n) => {
          if (!visible.has(n.id)) return;
          Object.keys(n.kids).forEach((k) => {
            const c = n.kids[k];
            if (!visible.has(c.id)) return;
            const inSub = subtreeIds.has(c.id) && subtreeIds.has(n.id);
            ctx.strokeStyle = inSub ? good : pathIds.has(c.id) ? heur : '#2a3450';
            ctx.lineWidth = inSub || pathIds.has(c.id) ? 2 : 1;
            ctx.beginPath();
            ctx.moveTo(n.x + 9, n.y);
            ctx.lineTo(c.x - 9, c.y);
            ctx.stroke();
          });
        });
        sc.all.forEach((n) => {
          if (!visible.has(n.id) || n === sc.root) return;
          const isFlash = flash && flash.node.id === n.id;
          const onPath = pathIds.has(n.id);
          const inSub = subtreeIds.has(n.id);
          ctx.fillStyle = isFlash
            ? flash.isNew
              ? `${good}44`
              : `${heur}44`
            : inSub
              ? `${good}22`
              : onPath
                ? `${heur}33`
                : 'rgba(93,162,255,0.10)';
          ctx.strokeStyle = isFlash ? (flash.isNew ? good : heur) : inSub ? good : onPath ? heur : algo;
          ctx.lineWidth = isFlash ? 2.2 : 1.2;
          ctx.beginPath();
          ctx.arc(n.x, n.y, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = ink;
          ctx.font = '11px ui-monospace, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(n.ch, n.x, n.y + 3.5);
          ctx.textAlign = 'start';
          if (endMarks.has(n.id)) {
            ctx.fillStyle = good;
            ctx.beginPath();
            ctx.arc(n.x + 7, n.y - 7, 2.4, 0, Math.PI * 2);
            ctx.fill();
          }
        });

        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        let line;
        if (!inAct2) {
          const curWord = flash ? flash.word : sc.words[0];
          ctx.fillText(`act 1 · inserting "${curWord}" · amber = riding a paid path, green = novel`, 14, 18);
          line = `${created} nodes for ${created + reused} characters: sharing paid for ${reused}`;
        } else {
          ctx.fillText(`act 2 · autocomplete "${sc.prefix}": walk the prefix, read the subtree`, 14, 18);
          const comps = sc.completions.slice(0, shownCompletions);
          line = comps.length
            ? `→ ${comps.join(', ')}`
            : `walking "${sc.prefix}"…`;
          if (shownCompletions >= sc.completions.length) {
            ctx.fillStyle = good;
            line = `${sc.completions.length} completions from one fingertip: ${sc.completions.join(', ')}`;
          }
        }
        ctx.fillStyle = inAct2 && shownCompletions >= sc.completions.length ? good : ink;
        ctx.font = '12px ui-monospace, monospace';
        ctx.fillText(line.length > 88 ? line.slice(0, 85) + '…' : line, 14, H - 12);

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
          new words
        </button>
        <span className="viz-stat">
          {snap.line || 'labeling the first drawer…'}
        </span>
      </div>
    </>
  );
}
