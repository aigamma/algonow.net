import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The stencil, watched. A real sentence as the tape; the pattern slides
// beneath it. Comparisons run right-to-left (each inspected character
// turns ink); a mismatch launches the leap: an amber arc with its
// distance, and everything jumped over stays dim forever: the unread
// haystack, visible. A full match glows green. The closing card counts
// what fraction of the tape was ever read.
const W = 640;
const H = 300;
const SEED = 20260827;
const TICKS_PER_CMP = 6;
const LEAP_HOLD = 14;
const END_HOLD = 70;

const SCENES = [
  { text: 'the fastest search reads almost nothing: it leaps across the haystack', pat: 'haystack' },
  { text: 'grep is fast because it does not look at most of the bytes it searches', pat: 'bytes' },
];

function simulate(text, pat) {
  const n = text.length;
  const m = pat.length;
  const last = {};
  for (let j = 0; j < m; j++) last[pat[j]] = j;
  const events = [];
  const inspected = new Set();
  let i = 0;
  while (i <= n - m) {
    let j = m - 1;
    let matched = true;
    while (j >= 0) {
      inspected.add(i + j);
      events.push({ type: 'cmp', ti: i + j, pj: j, align: i, ok: text[i + j] === pat[j] });
      if (text[i + j] !== pat[j]) {
        matched = false;
        break;
      }
      j -= 1;
    }
    if (matched) {
      events.push({ type: 'found', align: i });
      i += m;
    } else {
      const bad = j - (last[text[i + j]] ?? -1);
      const shift = Math.max(bad, 1);
      events.push({ type: 'leap', from: i, shift, align: i });
      i += shift;
    }
  }
  return { events, inspectedCount: inspected.size };
}

function makeScene(seed) {
  const rand = mulberry32(seed);
  const pick = SCENES[Math.floor(rand() * SCENES.length)];
  return { ...pick, ...simulate(pick.text, pick.pat) };
}

export default function BoyerMooreViz() {
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
        const total = s.scene.events.reduce(
          (t, e) => t + (e.type === 'cmp' ? TICKS_PER_CMP : LEAP_HOLD),
          0,
        ) + END_HOLD;
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
        const sc = s.scene;
        const n = sc.text.length;
        const m = sc.pat.length;

        // Replay events up to now.
        let t = s.tick;
        const seen = new Set();
        let align = 0;
        let curCmp = null;
        let lastLeap = null;
        let foundAt = -1;
        let done = true;
        for (const ev of sc.events) {
          const span = ev.type === 'cmp' ? TICKS_PER_CMP : LEAP_HOLD;
          if (t < span) {
            done = false;
            if (ev.type === 'cmp') {
              seen.add(ev.ti);
              curCmp = ev;
              align = ev.align;
            } else if (ev.type === 'leap') {
              lastLeap = ev;
              align = ev.align;
            } else {
              foundAt = ev.align;
              align = ev.align;
            }
            break;
          }
          t -= span;
          if (ev.type === 'cmp') {
            seen.add(ev.ti);
            align = ev.align;
          } else if (ev.type === 'leap') {
            align = ev.from + ev.shift;
            lastLeap = null;
          } else if (ev.type === 'found') {
            foundAt = ev.align;
            align = ev.align + m;
          }
        }
        if (done) {
          sc.events.forEach((ev) => {
            if (ev.type === 'cmp') seen.add(ev.ti);
            if (ev.type === 'found') foundAt = ev.align;
          });
        }

        // The tape.
        const cw = (W - 36) / n;
        const ty = 90;
        ctx.font = `${Math.min(15, cw + 4)}px ui-monospace, monospace`;
        for (let i = 0; i < n; i++) {
          const isFound = foundAt >= 0 && i >= foundAt && i < foundAt + m;
          ctx.fillStyle = isFound ? good : seen.has(i) ? ink : '#3a4664';
          ctx.fillText(sc.text[i], 18 + i * cw, ty);
        }
        // The pattern under its alignment.
        const py = 130;
        if (!done) {
          for (let j = 0; j < m; j++) {
            const active = curCmp && curCmp.pj === j;
            ctx.fillStyle = active ? (curCmp.ok ? good : warn) : heur;
            ctx.fillText(sc.pat[j], 18 + (align + j) * cw, py);
          }
          if (curCmp) {
            ctx.strokeStyle = curCmp.ok ? good : warn;
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(18 + curCmp.ti * cw + cw / 2, ty + 6);
            ctx.lineTo(18 + curCmp.ti * cw + cw / 2, py - 14);
            ctx.stroke();
          }
          if (lastLeap) {
            const x1 = 18 + (lastLeap.from + m - 1) * cw;
            const x2 = 18 + (lastLeap.from + lastLeap.shift + m - 1) * cw;
            ctx.strokeStyle = heur;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x1, py + 16);
            ctx.quadraticCurveTo((x1 + x2) / 2, py + 44, Math.min(x2, W - 20), py + 16);
            ctx.stroke();
            ctx.fillStyle = heur;
            ctx.font = '11px ui-monospace, monospace';
            ctx.fillText(`leap +${lastLeap.shift}`, Math.min((x1 + x2) / 2 - 14, W - 80), py + 58);
          }
        }

        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(`pattern: "${sc.pat}" · compare right-to-left · dim gray = never read`, 14, 20);
        const insp = seen.size;
        let line = `inspected ${insp} of ${n} characters (${Math.round((insp / n) * 100)}%)`;
        if (done) {
          ctx.fillStyle = good;
          line = `found "${sc.pat}" reading ${sc.inspectedCount} of ${n} characters (${Math.round((sc.inspectedCount / n) * 100)}%): the rest was leapt over`;
        } else {
          ctx.fillStyle = ink;
        }
        ctx.font = '12px ui-monospace, monospace';
        ctx.fillText(line, 14, H - 14);

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
          new tape
        </button>
        <span className="viz-stat">
          {snap.line || 'cutting the stencil…'}
        </span>
      </div>
    </>
  );
}
