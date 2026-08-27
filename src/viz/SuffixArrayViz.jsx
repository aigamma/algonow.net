import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// "abracadabra$" indexed live. Act one: the doubling rounds: each row
// is a suffix with its rank badge; every round the rows glide into the
// order given by (rank, rank-at-2^k) pairs and fresh ranks stamp on:
// four rounds and the ranks are all distinct. Act two: binary search
// for "abra" walks the sorted rows (amber probes) and lands on the
// green occurrence block: the index answering.
const W = 640;
const H = 300;
const SEED = 20260827;
const TEXTS = ['abracadabra$', 'banana bandana$'];
const ROUND_TICKS = 55;
const PROBE_TICKS = 16;
const END_HOLD = 70;

function doublingRounds(s) {
  const n = s.length;
  let order = [...Array(n).keys()].sort((a, b) => (s[a] < s[b] ? -1 : s[a] > s[b] ? 1 : a - b));
  let rank = new Array(n);
  rank[order[0]] = 0;
  for (let i = 1; i < n; i++) {
    rank[order[i]] = rank[order[i - 1]] + (s[order[i]] !== s[order[i - 1]] ? 1 : 0);
  }
  const rounds = [{ order: order.slice(), rank: rank.slice(), k: 1 }];
  let k = 1;
  while (rank[order[n - 1]] !== n - 1 && k < 2 * n) {
    const key = (i) => [rank[i], i + k < n ? rank[i + k] : -1];
    order = order.slice().sort((a, b) => {
      const ka = key(a);
      const kb = key(b);
      return ka[0] - kb[0] || ka[1] - kb[1] || a - b;
    });
    const nr = new Array(n);
    nr[order[0]] = 0;
    for (let i = 1; i < n; i++) {
      const ka = key(order[i]);
      const kb = key(order[i - 1]);
      nr[order[i]] = nr[order[i - 1]] + (ka[0] !== kb[0] || ka[1] !== kb[1] ? 1 : 0);
    }
    rank = nr;
    k *= 2;
    rounds.push({ order: order.slice(), rank: rank.slice(), k });
  }
  return rounds;
}

function makeScene(seed) {
  const rand = mulberry32(seed);
  const text = TEXTS[Math.floor(rand() * TEXTS.length)];
  const rounds = doublingRounds(text);
  const sa = rounds[rounds.length - 1].order;
  const pat = text.includes('abra') ? 'abra' : 'ban';
  // Binary search probes for the lower bound of pat.
  const probes = [];
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const suff = text.slice(sa[mid], sa[mid] + pat.length);
    probes.push({ mid, cmp: suff < pat ? -1 : 1 });
    if (suff < pat) lo = mid + 1;
    else hi = mid;
  }
  const start = lo;
  hi = text.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (text.slice(sa[mid], sa[mid] + pat.length) <= pat) lo = mid + 1;
    else hi = mid;
  }
  return { text, rounds, sa, pat, probes, occLo: start, occHi: lo };
}

export default function SuffixArrayViz() {
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
        const act1 = s.scene.rounds.length * ROUND_TICKS;
        const act2 = s.scene.probes.length * PROBE_TICKS + END_HOLD;
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
        const n = sc.text.length;
        const act1 = sc.rounds.length * ROUND_TICKS;
        const inAct2 = s.tick >= act1;

        const roundIdx = inAct2
          ? sc.rounds.length - 1
          : Math.min(Math.floor(s.tick / ROUND_TICKS), sc.rounds.length - 1);
        const round = sc.rounds[roundIdx];
        const rowH = Math.min(19, 230 / n);

        // Probe state.
        let probeRow = -1;
        let showOcc = false;
        let probesDone = 0;
        if (inAct2) {
          const t = s.tick - act1;
          probesDone = Math.min(Math.floor(t / PROBE_TICKS), sc.probes.length);
          if (probesDone < sc.probes.length) probeRow = sc.probes[probesDone].mid;
          else showOcc = true;
        }

        // Rows: suffixes in the current round's order.
        ctx.font = `${Math.min(13, rowH - 4)}px ui-monospace, monospace`;
        round.order.forEach((suf, row) => {
          const y = 48 + row * rowH;
          const isOcc = showOcc && row >= sc.occLo && row < sc.occHi;
          const isProbe = row === probeRow;
          if (isOcc) {
            ctx.fillStyle = `${good}22`;
            ctx.fillRect(40, y - rowH + 5, 400, rowH - 1);
          }
          if (isProbe) {
            ctx.fillStyle = `${heur}22`;
            ctx.fillRect(40, y - rowH + 5, 400, rowH - 1);
          }
          // Rank badge.
          ctx.fillStyle = heur;
          ctx.fillText(String(round.rank[suf]).padStart(2), 44, y);
          // The suffix, first 2k chars emphasized.
          const emph = Math.min(round.k * 2, n - suf);
          ctx.fillStyle = isOcc ? good : ink;
          ctx.fillText(sc.text.slice(suf, suf + emph), 84, y);
          ctx.fillStyle = '#3a4664';
          ctx.fillText(sc.text.slice(suf + emph, Math.min(suf + 28, n)), 84 + emph * 7.6, y);
        });

        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        let line;
        if (!inAct2) {
          ctx.fillText(
            `act 1 · round ${roundIdx}: sorted by (rank, rank at +${round.k / 2 || 0}) · ranks certify ${Math.min(round.k, n)} chars`,
            14,
            20,
          );
          const distinct = new Set(round.rank).size;
          line = `distinct ranks: ${distinct}/${n}${distinct === n ? ' · sorted: the array is done' : ''}`;
        } else {
          ctx.fillText(`act 2 · binary search for "${sc.pat}" over the sorted suffixes`, 14, 20);
          line = showOcc
            ? `found ${sc.occHi - sc.occLo} occurrence(s) of "${sc.pat}" in ${sc.probes.length} probes`
            : `probe ${probesDone + 1}: row ${probeRow}`;
        }
        ctx.fillStyle = showOcc ? good : ink;
        ctx.font = '12px ui-monospace, monospace';
        ctx.fillText(line, 14, H - 12);
        ctx.fillStyle = dim;
        ctx.font = '10px ui-monospace, monospace';
        ctx.fillText(`text: "${sc.text}" · amber = rank badge · bright = certified prefix`, 330, 20);

        statsRef.current = {
          line: showOcc && s.tick > act1
            ? `the index answers: log-time search over ${n} suffixes`
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
          new text
        </button>
        <span className="viz-stat">
          {snap.line || 'listing the suffixes…'}
        </span>
      </div>
    </>
  );
}
