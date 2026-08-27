import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The automaton, on duty. The trie holds a small watchlist; the text
// streams through the ticker one letter at a time, driving the blue cursor
// through the tree. A mismatch slides the cursor down a dashed amber
// failure link (never the text backward); reaching a green-ringed node
// fires its matches into the log, nested ones included. Watch "ushers"
// fire she, he, and hers from a single path.
const PATTERNS = ['he', 'she', 'his', 'hers'];
const TEXTS = ['ushers ushers', 'she sells his shells', 'the usher hears hers', 'this hush is hers'];
const W = 640;
const H = 300;
const SEED = 20260827;
const TICKS_PER_CHAR = 14;

function buildAutomaton(patterns) {
  const goto_ = [{}];
  const fail = [0];
  const out = [[]];
  patterns.forEach((p, idx) => {
    let node = 0;
    for (const ch of p) {
      if (!(ch in goto_[node])) {
        goto_.push({});
        fail.push(0);
        out.push([]);
        goto_[node][ch] = goto_.length - 1;
      }
      node = goto_[node][ch];
    }
    out[node].push(idx);
  });
  const queue = [];
  for (const ch in goto_[0]) queue.push(goto_[0][ch]);
  for (let qi = 0; qi < queue.length; qi++) {
    const u = queue[qi];
    for (const ch in goto_[u]) {
      const v = goto_[u][ch];
      queue.push(v);
      let f = fail[u];
      while (f && !(ch in goto_[f])) f = fail[f];
      fail[v] = ch in goto_[f] && goto_[f][ch] !== v ? goto_[f][ch] : 0;
      out[v] = out[v].concat(out[fail[v]]);
    }
  }
  // Node strings for layout/labels.
  const label = { 0: '' };
  const stack = [0];
  while (stack.length) {
    const u = stack.pop();
    for (const ch in goto_[u]) {
      label[goto_[u][ch]] = label[u] + ch;
      stack.push(goto_[u][ch]);
    }
  }
  return { goto_: goto_, fail, out, label };
}

const POS = {
  '': [60, 150], h: [175, 95], he: [290, 62], her: [405, 62], hers: [520, 62],
  hi: [290, 128], his: [405, 128], s: [175, 215], sh: [290, 215], she: [405, 215],
};

export default function AhoCorasickViz() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);
  const statsRef = useRef({ fired: 0, at: 0 });
  const [restart, setRestart] = useState(0);
  const [snap, setSnap] = useState({ fired: 0, at: 0 });

  useEffect(() => {
    const id = setInterval(() => setSnap({ ...statsRef.current }), 400);
    return () => clearInterval(id);
  }, []);

  useCanvasLoop(
    canvasRef,
    {
      width: W,
      height: H,
      stepMs: 40,
      init: () => {
        const auto = buildAutomaton(PATTERNS);
        const text = TEXTS[cycle.current % TEXTS.length];
        // Precompute the walk: per char, the slide chain and landing node.
        let node = 0;
        const walk = [];
        const matches = [];
        for (let i = 0; i < text.length; i++) {
          const ch = text[i];
          const slides = [];
          let n = node;
          while (n && !(ch in auto.goto_[n])) {
            n = auto.fail[n];
            slides.push(n);
          }
          n = ch in auto.goto_[n] ? auto.goto_[n][ch] : 0;
          const fired = auto.out[n].map((idx) => ({ p: PATTERNS[idx], at: i - PATTERNS[idx].length + 1 }));
          for (const f of fired) matches.push(f);
          walk.push({ ch, slides, node: n, fired });
          node = n;
        }
        return { auto, text, walk, tick: 0, rest: 0, stopAtRest: isStill() };
      },
      tick: (s) => {
        if (s.tick >= (s.walk.length + 3) * TICKS_PER_CHAR) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            const auto = buildAutomaton(PATTERNS);
            const text = TEXTS[cycle.current % TEXTS.length];
            let node = 0;
            const walk = [];
            for (let i = 0; i < text.length; i++) {
              const ch = text[i];
              const slides = [];
              let n = node;
              while (n && !(ch in auto.goto_[n])) {
                n = auto.fail[n];
                slides.push(n);
              }
              n = ch in auto.goto_[n] ? auto.goto_[n][ch] : 0;
              walk.push({
                ch,
                slides,
                node: n,
                fired: auto.out[n].map((idx) => ({ p: PATTERNS[idx], at: i - PATTERNS[idx].length + 1 })),
              });
              node = n;
            }
            Object.assign(s, { auto, text, walk, tick: 0, rest: 0 });
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
        const path = css.getPropertyValue('--path').trim() || '#62d98a';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';

        const at = Math.min(Math.floor(s.tick / TICKS_PER_CHAR), s.walk.length);
        const step = at < s.walk.length ? s.walk[at] : null;
        const curNode = at > 0 ? s.walk[at - 1].node : 0;
        const sliding = step && (s.tick % TICKS_PER_CHAR) < 5 && step.slides.length > 0;

        // Edges of the trie.
        for (const [name, [x1, y1]] of Object.entries(POS)) {
          const node = Object.keys(s.auto.label).find((k) => s.auto.label[k] === name);
          if (node === undefined) continue;
          for (const ch in s.auto.goto_[node]) {
            const child = s.auto.label[s.auto.goto_[node][ch]];
            if (!(child in POS)) continue;
            const [x2, y2] = POS[child];
            ctx.strokeStyle = 'rgba(93,162,255,0.5)';
            ctx.lineWidth = 1.3;
            ctx.beginPath();
            ctx.moveTo(x1 + 13, y1);
            ctx.lineTo(x2 - 13, y2);
            ctx.stroke();
          }
        }
        // Failure links (non-root only).
        for (const nodeId in s.auto.label) {
          const name = s.auto.label[nodeId];
          const f = s.auto.fail[nodeId];
          const fname = s.auto.label[f];
          if (!name || !(name in POS) || !(fname in POS) || f === 0) continue;
          const [x1, y1] = POS[name];
          const [x2, y2] = POS[fname];
          ctx.strokeStyle = `${heur}88`;
          ctx.lineWidth = 1.2;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(x1, y1 + 13);
          ctx.bezierCurveTo(x1, y1 + 56, x2, y2 + 56, x2, y2 + 13);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        // Nodes.
        for (const nodeId in s.auto.label) {
          const name = s.auto.label[nodeId];
          if (!(name in POS)) continue;
          const [x, y] = POS[name];
          const isOut = s.auto.out[nodeId].length > 0;
          const isCur = Number(nodeId) === curNode;
          ctx.beginPath();
          ctx.arc(x, y, 13, 0, Math.PI * 2);
          ctx.fillStyle = isCur ? `${algo}44` : 'rgba(20,26,40,0.9)';
          ctx.fill();
          ctx.strokeStyle = isCur ? algo : isOut ? path : 'rgba(93,162,255,0.6)';
          ctx.lineWidth = isCur ? 2.2 : 1.4;
          ctx.stroke();
          ctx.fillStyle = ink;
          ctx.font = '10px ui-monospace, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(name || '·', x, y + 3.5);
          ctx.textAlign = 'start';
        }
        // Ticker + matches.
        ctx.font = '12px ui-monospace, monospace';
        for (let i = 0; i < s.text.length; i++) {
          ctx.fillStyle = i < at ? dim : i === at ? heur : 'rgba(255,255,255,0.3)';
          ctx.fillText(s.text[i] === ' ' ? '␣' : s.text[i], 20 + i * 13, 282);
        }
        const firedAll = s.walk.slice(0, at).flatMap((w) => w.fired);
        statsRef.current = { fired: firedAll.length, at };
        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        const recent = firedAll.slice(-4).map((f) => `${f.p}@${f.at}`).join('  ');
        ctx.fillText(
          sliding ? 'mismatch: sliding a failure link (the text never backs up)' : `matches: ${firedAll.length}${recent ? ' · ' + recent : ''}`,
          20,
          258,
        );
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
          next text
        </button>
        <span className="viz-stat">
          watchlist he · she · his · hers · <strong>{snap.fired}</strong> matches fired, nested ones by output links
        </span>
      </div>
    </>
  );
}
