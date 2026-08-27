import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts of one determinization. Act one: the frontier gets a
// name: an NFA guessing "is this a, third from the end?" runs a
// random string with its whole frontier lit in blue, while below,
// the DFA built by subset construction walks the same string one
// state at a time: and its state IS the frontier, spelled out.
// Act two: the blowup ladder: the same family for n = 1..8: NFA
// states grow linearly, the (measured, minimal) DFA doubles every
// step: 2^n is not a scare story, it is a count.
const W = 640;
const H = 300;
const SEED = 20260827;
const N_ACT1 = 3;
const STR_LEN = 14;
const CHAR_TICKS = 9;
const BAR_TICKS = 14;
const END_HOLD = 70;

// The blowup family: (a|b)* a (a|b)^(n-1).
function famTrans(n) {
  const t = {};
  t["0a"] = [0, 1];
  t["0b"] = [0];
  for (let i = 1; i < n; i++) {
    t[`${i}a`] = [i + 1];
    t[`${i}b`] = [i + 1];
  }
  return t;
}

function stepFrontier(trans, cur, ch) {
  const nxt = new Set();
  for (const s of cur) for (const q of trans[`${s}${ch}`] || []) nxt.add(q);
  return [...nxt].sort((a, b) => a - b);
}

export function reachableDFA(n) {
  const trans = famTrans(n);
  const key = (arr) => arr.join(',');
  const start = [0];
  const seen = new Set([key(start)]);
  const stack = [start];
  while (stack.length) {
    const cur = stack.pop();
    for (const ch of ['a', 'b']) {
      const nx = stepFrontier(trans, cur, ch);
      if (!seen.has(key(nx))) {
        seen.add(key(nx));
        stack.push(nx);
      }
    }
  }
  return seen.size;
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const trans = famTrans(N_ACT1);
  const str = [];
  for (let i = 0; i < STR_LEN; i++) str.push(rand() < 0.5 ? 'a' : 'b');
  // Frontier trace, one entry per prefix.
  const frontiers = [[0]];
  let cur = [0];
  for (const ch of str) {
    cur = stepFrontier(trans, cur, ch);
    frontiers.push(cur);
  }
  const accepts = frontiers.map((f) => f.includes(N_ACT1));
  const ladder = [];
  for (let n = 1; n <= 8; n++) ladder.push({ n, nfa: n + 1, dfa: reachableDFA(n) });
  return { str, frontiers, accepts, ladder };
}

export default function SubsetViz() {
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
              scene: makeScene(SEED + cycle.current * 7919),
              act: 0,
              tick: 0,
              rest: 0,
            });
          }
          return true;
        }
        s.tick += 1;
        const len =
          s.act === 0
            ? (STR_LEN + 1) * CHAR_TICKS + END_HOLD
            : s.scene.ladder.length * BAR_TICKS + END_HOLD;
        if (s.tick >= len) {
          // Hold the finished act for the full rest before the next
          // act begins: every burst of motion earns its two minutes.
          s.tick = len;
          s.actRest = (s.actRest || 0) + 1;
          if (s.actRest > holdTicks(s)) {
            s.tick = 0;
            s.act += 1;
            s.actRest = 0;
          }
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
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';
        const sc = s.scene;

        const done = s.act >= 2;
        const actIdx = done ? 1 : s.act;
        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';

        if (actIdx === 0) {
          const pos = Math.min(Math.floor(s.tick / CHAR_TICKS), STR_LEN);
          const frontier = sc.frontiers[pos];
          const acc = sc.accepts[pos];
          ctx.fillText('act 1 · "third symbol from the end is a": the NFA guesses, the frontier tracks every guess', 14, 20);

          // The string, consumed prefix dimmed.
          for (let i = 0; i < STR_LEN; i++) {
            ctx.fillStyle = i < pos ? dim : ink;
            ctx.font = i === pos - 1 ? 'bold 15px ui-monospace, monospace' : '13px ui-monospace, monospace';
            ctx.fillText(sc.str[i], 60 + i * 24, 52);
          }

          // NFA lane: 4 state circles, frontier lit.
          for (let q = 0; q <= N_ACT1; q++) {
            const x = 110 + q * 120;
            const lit = frontier.includes(q);
            ctx.strokeStyle = lit ? algo : 'rgba(154,165,189,0.4)';
            ctx.lineWidth = lit ? 3 : 1.4;
            ctx.beginPath();
            ctx.arc(x, 110, 20, 0, Math.PI * 2);
            ctx.stroke();
            if (q === N_ACT1) {
              ctx.beginPath();
              ctx.arc(x, 110, 15, 0, Math.PI * 2);
              ctx.stroke();
            }
            if (lit) {
              ctx.fillStyle = 'rgba(93,162,255,0.25)';
              ctx.beginPath();
              ctx.arc(x, 110, 20, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.fillStyle = lit ? algo : dim;
            ctx.font = '12px ui-monospace, monospace';
            ctx.fillText(String(q), x - 4, 114);
            if (q < N_ACT1) {
              ctx.strokeStyle = 'rgba(154,165,189,0.4)';
              ctx.lineWidth = 1.2;
              ctx.beginPath();
              ctx.moveTo(x + 22, 110);
              ctx.lineTo(x + 96, 110);
              ctx.stroke();
            }
          }
          ctx.fillStyle = dim;
          ctx.font = '10px ui-monospace, monospace';
          ctx.fillText('state 0 loops forever and guesses each a; 3 means the guess was 3 from the end', 110, 148);

          // DFA lane: one box naming the frontier.
          ctx.strokeStyle = heur;
          ctx.lineWidth = 2;
          ctx.strokeRect(110, 176, 240, 40);
          ctx.fillStyle = heur;
          ctx.font = '14px ui-monospace, monospace';
          ctx.fillText(`{ ${frontier.join(', ')} }`, 126, 201);
          ctx.fillStyle = dim;
          ctx.font = '10px ui-monospace, monospace';
          ctx.fillText('the DFA state: the frontier, given a name: one table lookup per character', 110, 236);

          let line;
          if (done || pos >= STR_LEN) {
            line = sc.accepts[STR_LEN]
              ? `end of string: frontier holds state 3: ACCEPT: the third-from-last was a`
              : `end of string: state 3 not in the frontier: reject`;
            ctx.fillStyle = sc.accepts[STR_LEN] ? good : warn;
          } else {
            line = `read ${pos}/${STR_LEN} · frontier {${frontier.join(',')}} · ${acc ? 'accepting' : 'not accepting'} here`;
            ctx.fillStyle = ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = { line };
        } else {
          const bi = done
            ? sc.ladder.length
            : Math.min(Math.floor(s.tick / BAR_TICKS) + 1, sc.ladder.length);
          ctx.fillText('act 2 · the same family, growing n: NFA states linear, minimal DFA states 2^n: measured', 14, 20);

          const maxD = 256;
          for (let k = 0; k < bi; k++) {
            const { n, nfa, dfa } = sc.ladder[k];
            const x = 60 + k * 70;
            const hN = (nfa / maxD) * 190 + 4;
            const hD = (dfa / maxD) * 190;
            ctx.fillStyle = 'rgba(240,185,75,0.5)';
            ctx.fillRect(x, 240 - hN, 22, hN);
            ctx.strokeStyle = heur;
            ctx.strokeRect(x, 240 - hN, 22, hN);
            ctx.fillStyle = 'rgba(226,96,108,0.45)';
            ctx.fillRect(x + 26, 240 - hD, 22, hD);
            ctx.strokeStyle = warn;
            ctx.strokeRect(x + 26, 240 - hD, 22, hD);
            ctx.fillStyle = warn;
            ctx.font = '10px ui-monospace, monospace';
            ctx.fillText(String(dfa), x + 22, 232 - hD);
            ctx.fillStyle = dim;
            ctx.fillText(`n=${n}`, x + 10, 256);
          }
          ctx.fillStyle = heur;
          ctx.font = '10px ui-monospace, monospace';
          ctx.fillText('amber: NFA states (n+1)', 470, 60);
          ctx.fillStyle = warn;
          ctx.fillText('red: DFA states (2^n)', 470, 76);

          let line;
          if (done || bi >= sc.ladder.length) {
            line = 'n = 8: nine NFA states become 256 DFA states, every one necessary: determinism has a price list';
            ctx.fillStyle = warn;
          } else {
            const { n, nfa, dfa } = sc.ladder[bi - 1];
            line = `n = ${n}: ${nfa} NFA states -> ${dfa} reachable DFA states (= 2^${n})`;
            ctx.fillStyle = ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = {
            line: done
              ? 'the frontier got a name, and sometimes the naming costs 2^n: know the family before you determinize'
              : line,
          };
        }
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
          new string
        </button>
        <span className="viz-stat">
          {snap.line || 'lighting the frontier…'}
        </span>
      </div>
    </>
  );
}
