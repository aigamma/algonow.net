import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The scribe, watched. The sample sentence is processed token by token
// by an in-module LZ77 (min-match 3, LZSS flag framing): literals fade
// in as ink; a match draws an amber arc back to its source, underlines
// it, and copies the span in green, character by character. By the end,
// everything green was never stored: only pointed at. The ledger tracks
// bytes emitted against raw, live.
const W = 640;
const H = 300;
const SEED = 20260827;
const COLS = 40;
const CELL_W = 15;
const CELL_H = 30;
const TEXT_X = 22;
const TEXT_Y = 64;
const TICKS_PER_EVENT = 3;
const MIN_MATCH = 3;

const SAMPLES = [
  'a pair a day. the algorithm carries the guarantee. the heuristic carries the speed. a pair a day builds the instinct.',
  'never the fastest tool. always the fitting tool. the fastest tool for the wrong job is the slowest tool of all.',
];

function lz77(text) {
  const tokens = [];
  let i = 0;
  while (i < text.length) {
    let bestLen = 0;
    let bestStart = 0;
    for (let j = 0; j < i; j++) {
      let len = 0;
      while (
        i + len < text.length &&
        text[j + len] === text[i + len] &&
        len < 60
      ) {
        len += 1;
      }
      if (len > bestLen) {
        bestLen = len;
        bestStart = j;
      }
    }
    if (bestLen >= MIN_MATCH) {
      tokens.push({ start: bestStart, len: bestLen, at: i });
      i += bestLen;
    } else {
      tokens.push({ lit: text[i], at: i });
      i += 1;
    }
  }
  return tokens;
}

function makeScene(seed) {
  const rand = mulberry32(seed);
  const text = SAMPLES[Math.floor(rand() * SAMPLES.length)];
  const tokens = lz77(text);
  const events = [];
  let bytes = 0;
  let flags = 0;
  tokens.forEach((tok) => {
    flags += 1;
    const flagBytes = Math.ceil(flags / 8);
    if (tok.lit !== undefined) {
      bytes += 1;
      events.push({ type: 'lit', idx: tok.at, bytes: bytes + flagBytes });
    } else {
      bytes += 3;
      events.push({
        type: 'arc',
        from: tok.at,
        srcStart: tok.start,
        len: tok.len,
        bytes: bytes + flagBytes,
      });
      for (let k = 0; k < tok.len; k++) {
        events.push({
          type: 'copy',
          idx: tok.at + k,
          src: tok.start + k,
          bytes: bytes + flagBytes,
        });
      }
    }
  });
  const lits = tokens.filter((t) => t.lit !== undefined).length;
  const finalBytes = bytes + Math.ceil(tokens.length / 8);
  return { text, tokens, events, lits, copies: tokens.length - lits, finalBytes };
}

export default function LZ77Viz() {
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
        const total = s.scene.events.length * TICKS_PER_EVENT + 40;
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
        const heur = css.getPropertyValue('--heur').trim() || '#f0b94b';
        const good = css.getPropertyValue('--path').trim() || '#62d98a';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';

        const { text, events } = s.scene;
        const upTo = Math.min(Math.floor(s.tick / TICKS_PER_EVENT), events.length);
        const doneAll = upTo >= events.length;

        const posOf = (idx) => [
          TEXT_X + (idx % COLS) * CELL_W,
          TEXT_Y + Math.floor(idx / COLS) * CELL_H,
        ];

        // Replay events to build the revealed state.
        const shown = new Array(text.length).fill(null); // 'lit' | 'copy'
        let activeArc = null;
        let bytesNow = 0;
        for (let e = 0; e < upTo; e++) {
          const ev = events[e];
          bytesNow = ev.bytes;
          if (ev.type === 'lit') shown[ev.idx] = 'lit';
          else if (ev.type === 'copy') shown[ev.idx] = 'copy';
          if (ev.type === 'arc') activeArc = ev;
          else if (ev.type === 'lit') activeArc = null;
        }
        const lastEv = upTo > 0 ? events[upTo - 1] : null;
        if (lastEv && lastEv.type === 'lit') activeArc = null;

        // Characters.
        ctx.font = '15px ui-monospace, monospace';
        for (let i = 0; i < text.length; i++) {
          if (shown[i] === null) continue;
          const [x, y] = posOf(i);
          ctx.fillStyle = shown[i] === 'copy' ? good : ink;
          ctx.fillText(text[i], x, y);
        }
        // Cursor.
        const cursorIdx = lastEv
          ? lastEv.type === 'lit'
            ? lastEv.idx + 1
            : lastEv.type === 'copy'
              ? lastEv.idx + 1
              : lastEv.from
          : 0;
        if (!doneAll && cursorIdx <= text.length) {
          const [cx, cy] = posOf(Math.min(cursorIdx, text.length - 1));
          ctx.fillStyle = heur;
          ctx.fillRect(cx - 2, cy - 14, 2.5, 18);
        }

        // Active arc: from the copy head back to its source.
        if (activeArc && !doneAll) {
          const [x1, y1] = posOf(activeArc.from);
          const [x2, y2] = posOf(activeArc.srcStart);
          ctx.strokeStyle = heur;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(x1 + 4, y1 - 16);
          ctx.quadraticCurveTo((x1 + x2) / 2, Math.min(y1, y2) - 36, x2 + 4, y2 - 16);
          ctx.stroke();
          // Underline the source span.
          const [sx, sy] = posOf(activeArc.srcStart);
          for (let k = 0; k < activeArc.len; k++) {
            const [ux, uy] = posOf(activeArc.srcStart + k);
            ctx.strokeStyle = `${heur}aa`;
            ctx.beginPath();
            ctx.moveTo(ux, uy + 4);
            ctx.lineTo(ux + CELL_W - 4, uy + 4);
            ctx.stroke();
          }
          ctx.fillStyle = heur;
          ctx.font = '10px ui-monospace, monospace';
          ctx.fillText(
            `(back ${activeArc.from - activeArc.srcStart}, copy ${activeArc.len})`,
            Math.min(x1, W - 150),
            y1 - 38 < 20 ? y1 + 22 : y1 - 38,
          );
          ctx.font = '15px ui-monospace, monospace';
        }

        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText('the scribe: ink = written out · green = pointed at, never stored', 14, 20);
        const raw = text.length;
        let line = `bytes ${bytesNow || 0} of raw ${raw} · position ${Math.min(cursorIdx, raw)}/${raw}`;
        if (doneAll) {
          ctx.fillStyle = good;
          line = `${raw} chars → ${s.scene.finalBytes} bytes (${(raw / s.scene.finalBytes).toFixed(2)}×) · ${s.scene.lits} literals + ${s.scene.copies} copies`;
        } else {
          ctx.fillStyle = ink;
        }
        ctx.font = '12px ui-monospace, monospace';
        ctx.fillText(line, 14, H - 30);
        ctx.fillStyle = dim;
        ctx.font = '10px ui-monospace, monospace';
        ctx.fillText('amber arc = the margin note: same as N back, for L characters', 14, H - 12);

        statsRef.current = {
          line: doneAll
            ? `everything green was free: ${s.scene.copies} back-references replaced ${text.length - s.scene.lits} characters`
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
          new manuscript
        </button>
        <span className="viz-stat">
          {snap.line || 'sharpening the quill…'}
        </span>
      </div>
    </>
  );
}
