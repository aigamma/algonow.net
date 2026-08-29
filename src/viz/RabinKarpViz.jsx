import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts of one search. Act one: the rolling window slides
// along a text ribbon while its fingerprint updates in O(1):
// subtract the leaving character, multiply, add the enterer.
// Letters light up ONLY when fingerprints agree: a true match
// verifies green, a spurious candidate (visible under the tiny
// modulus lane) rejects red. Touch counters race naive the whole
// way. Act two: the fingerprint dividend: many patterns pooled
// into one set, one pass, against one full scan per pattern.
const W = 640;
const H = 300;
const SEED = 20260829;
const END_HOLD = 70;

const ALPHA = 'abcdefghijklmnopqrstuvwxyz';

export function rollTrace(text, pat, base, mod) {
  // Precomputed per-slide record: window hash, match kind, touch bills.
  const n = text.length;
  const m = pat.length;
  let hp = 0;
  for (const c of pat) hp = (hp * base + c.charCodeAt(0)) % mod;
  let lead2 = 1;
  for (let i = 0; i < m - 1; i++) lead2 = (lead2 * base) % mod;
  let hw = 0;
  for (let j = 0; j < m; j++) hw = (hw * base + text.charCodeAt(j)) % mod;
  const steps = [];
  let rkTouch = 2 * m;
  let naiveTouch = 0;
  let spurious = 0;
  let trueHits = 0;
  for (let i = 0; i + m <= n; i++) {
    // naive bill at this alignment
    let j = 0;
    while (j < m) {
      naiveTouch += 1;
      if (text[i + j] !== pat[j]) break;
      j += 1;
    }
    let kind = 'slide';
    if (hw === hp) {
      let k = 0;
      while (k < m) {
        rkTouch += 1;
        if (text[i + k] !== pat[k]) break;
        k += 1;
      }
      if (k === m) {
        kind = 'match';
        trueHits += 1;
      } else {
        kind = 'spurious';
        spurious += 1;
      }
    }
    steps.push({ i, hw, kind, rkTouch, naiveTouch });
    if (i + m < n) {
      rkTouch += 2;
      hw = ((hw - text.charCodeAt(i) * lead2) % mod + mod) % mod;
      hw = (hw * base + text.charCodeAt(i + m)) % mod;
    }
  }
  return { steps, spurious, trueHits, hp };
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  // Act 1: a 40-char ribbon with the pattern planted twice.
  const m = 5;
  const pat = Array.from({ length: m }, () => ALPHA[Math.floor(rand() * 8)]).join('');
  let text = Array.from({ length: 40 }, () => ALPHA[Math.floor(rand() * 8)]).join('');
  const p1 = 6 + Math.floor(rand() * 8);
  const p2 = 24 + Math.floor(rand() * 8);
  text = text.slice(0, p1) + pat + text.slice(p1 + m);
  text = text.slice(0, p2) + pat + text.slice(p2 + m);
  const wide = rollTrace(text, pat, 31, 100003);
  const tiny = rollTrace(text, pat, 31, 23);
  // Act 2: the pooled-set race, computed exactly on a bigger toy.
  let big = '';
  for (let i = 0; i < 2000; i++) big += ALPHA[Math.floor(rand() * 10)];
  const pats = [];
  const seen = new Set();
  while (pats.length < 20) {
    const at = Math.floor(rand() * (big.length - 8));
    const p = big.slice(at, at + 8);
    if (!seen.has(p)) {
      seen.add(p);
      pats.push(p);
    }
  }
  let naiveAll = 0;
  for (const p of pats) naiveAll += rollTrace(big, p, 31, 100003).steps.at(-1).naiveTouch;
  // one pooled pass: 2 touches per slide + pattern hashing + verifies
  let pooled = 20 * 8 + 8 + 2 * (big.length - 8);
  const hashes = new Set(pats.map((p) => {
    let h = 0;
    for (const c of p) h = (h * 31 + c.charCodeAt(0)) % 100003;
    return h;
  }));
  let hw = 0;
  for (let j = 0; j < 8; j++) hw = (hw * 31 + big.charCodeAt(j)) % 100003;
  let lead = 1;
  for (let i = 0; i < 7; i++) lead = (lead * 31) % 100003;
  let poolHits = 0;
  for (let i = 0; i + 8 <= big.length; i++) {
    if (hashes.has(hw)) {
      for (const p of pats) {
        let k = 0;
        while (k < 8) {
          pooled += 1;
          if (big[i + k] !== p[k]) break;
          k += 1;
        }
        if (k === 8) poolHits += 1;
      }
    }
    if (i + 8 < big.length) {
      hw = ((hw - big.charCodeAt(i) * lead) % 100003 + 100003) % 100003;
      hw = (hw * 31 + big.charCodeAt(i + 8)) % 100003;
    }
  }
  return { text, pat, wide, tiny, naiveAll, pooled, poolHits };
}

export default function RabinKarpViz() {
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
      stepMs: 60,
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
        const len = s.act === 0 ? s.scene.wide.steps.length * 5 + END_HOLD : 200 + END_HOLD;
        if (s.tick >= len) {
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
          const steps = sc.wide.steps;
          const idx = done ? steps.length - 1 : Math.min(Math.floor(s.tick / 5), steps.length - 1);
          const st = steps[idx];
          const m = sc.pat.length;
          ctx.fillText('act 1 · the window is a number: roll it, and read letters only when fingerprints agree', 14, 20);
          // pattern + its fingerprint
          ctx.fillStyle = heur;
          ctx.font = '13px ui-monospace, monospace';
          ctx.fillText(`pattern ${sc.pat}   fingerprint ${String(sc.wide.hp).padStart(6, ' ')}`, 14, 48);
          // the ribbon
          const x0 = 14;
          const cw = 15.4;
          ctx.font = '13px ui-monospace, monospace';
          for (let i = 0; i < sc.text.length; i++) {
            const inWin = i >= st.i && i < st.i + m;
            ctx.fillStyle = inWin ? ink : dim;
            if (st.kind === 'match' && inWin) ctx.fillStyle = good;
            if (st.kind === 'spurious' && inWin) ctx.fillStyle = warn;
            ctx.fillText(sc.text[i], x0 + i * cw, 90);
          }
          ctx.strokeStyle = st.kind === 'match' ? good : st.kind === 'spurious' ? warn : algo;
          ctx.lineWidth = 1.6;
          ctx.strokeRect(x0 + st.i * cw - 3, 76, m * cw + 4, 20);
          // the roll arithmetic
          ctx.fillStyle = warn;
          ctx.font = '11px ui-monospace, monospace';
          if (st.i > 0) ctx.fillText(`- ${sc.text[st.i - 1]}·lead`, x0 + Math.max(0, st.i - 1) * cw, 114);
          ctx.fillStyle = good;
          if (st.i + m < sc.text.length) ctx.fillText(`+ ${sc.text[st.i + m]}`, x0 + (st.i + m) * cw, 114);
          ctx.fillStyle = algo;
          ctx.fillText(`window hash ${String(st.hw).padStart(6, ' ')}  ${st.kind === 'match' ? '= pattern: verify -> ACCEPT' : st.kind === 'spurious' ? '= pattern: verify -> reject' : '≠ pattern: slide on, letters unread'}`, 14, 140);
          // counters
          ctx.fillStyle = dim;
          ctx.fillText(`touches so far   rabin-karp ${String(st.rkTouch).padStart(4, ' ')}   naive ${String(st.naiveTouch).padStart(4, ' ')}`, 14, 162);
          let line;
          if (done || idx >= steps.length - 1) {
            line = `pass done: ${sc.wide.trueHits} true matches, ${sc.wide.spurious} spurious at the wide modulus; the same text at mod 23: ${sc.tiny.spurious} false candidates, all verified and rejected`;
            ctx.fillStyle = good;
          } else {
            line = 'two touches per slide, whatever the window length: the fingerprint stands in for the letters';
            ctx.fillStyle = ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = { line };
        } else {
          const t = done ? 200 : Math.min(s.tick, 200);
          ctx.fillText('act 2 · the fingerprint dividend: 20 patterns pooled into one set, one pass vs 20 full scans', 14, 20);
          const frac = Math.min(1, t / 200);
          const naiveDone = Math.floor(frac * sc.naiveAll);
          const poolDone = Math.floor(frac * sc.pooled);
          ctx.fillStyle = warn;
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(`20 naive scans: ${naiveDone.toLocaleString()} touches`, 60, 80);
          ctx.strokeStyle = warn;
          ctx.strokeRect(60, 92, 500, 16);
          ctx.fillStyle = 'rgba(226,96,108,0.4)';
          ctx.fillRect(60, 92, 500 * (naiveDone / sc.naiveAll), 16);
          ctx.fillStyle = algo;
          ctx.fillText(`one rolling pass + fingerprint set: ${poolDone.toLocaleString()} touches`, 60, 150);
          ctx.strokeStyle = algo;
          ctx.strokeRect(60, 162, 500 * (sc.pooled / sc.naiveAll), 16);
          ctx.fillStyle = 'rgba(93,162,255,0.4)';
          ctx.fillRect(60, 162, 500 * (poolDone / sc.naiveAll), 16);
          ctx.fillStyle = dim;
          ctx.font = '10px ui-monospace, monospace';
          ctx.fillText(`every pattern hashed once; the text read once; ${sc.poolHits} true hits verified letter by letter`, 60, 200);
          let line;
          if (done || t >= 200) {
            line = `same 20 patterns found: ${sc.naiveAll.toLocaleString()} vs ${sc.pooled.toLocaleString()} touches (${(sc.naiveAll / sc.pooled).toFixed(1)}x): patterns pool, passes do not`;
            ctx.fillStyle = good;
          } else {
            line = 'both sides return the identical occurrence lists: only the bill differs';
            ctx.fillStyle = ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = {
            line: done
              ? 'hash the pattern once, roll the window, verify only on agreement: search by arithmetic'
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
          new text
        </button>
        <span className="viz-stat">
          {snap.line || 'rolling the fingerprint…'}
        </span>
      </div>
    </>
  );
}
