import DiagramViewport from '../components/DiagramViewport.jsx';
import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// A two-word query scored term at a time over a small seeded corpus,
// one posting per tick. Two score columns grow side by side for the same
// documents: raw term frequency on the left, BM25 (k1 = 1.2, b = 0.75) on
// the right. One document in the corpus is stuffed: it repeats the first
// query word many times and never uses the second. Under raw counts it
// climbs to the top; under BM25 the saturation caps what repetition buys
// and a short document that has both words stays ahead. Every posting's
// BM25 contribution is checked against the ceiling (k1 + 1) * idf.
const W = 640;
const H = 300;
const SEED = 20261010;
const K1 = 1.2;
const B = 0.75;
const DOCS = 9;

function makeCorpus(rand) {
  // documents described only by what matters: length and the two counts
  const docs = [];
  for (let i = 0; i < DOCS - 1; i += 1) {
    const length = Math.round(40 + rand() * 360);
    const both = rand() < 0.45;
    const tf1 = rand() < 0.7 ? 1 + Math.floor(rand() * 4) : 0;
    const tf2 = both ? 1 + Math.floor(rand() * 4) : (rand() < 0.3 ? 1 + Math.floor(rand() * 3) : 0);
    docs.push({ name: `doc ${i + 1}`, length, tf: [tf1, tf2], stuffed: false });
  }
  // one short document with both words, so the honest winner exists
  docs[0] = { name: 'doc 1', length: 60, tf: [3, 3], stuffed: false };
  const reps = 40 + Math.floor(rand() * 60);
  docs.push({ name: 'stuffed', length: 120 + reps, tf: [reps, 0], stuffed: true });
  return docs;
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const docs = makeCorpus(rand);
  const n = docs.length;
  const avgdl = docs.reduce((s, d) => s + d.length, 0) / n;
  const df = [0, 1].map((t) => docs.filter((d) => d.tf[t] > 0).length);
  const idf = df.map((f) => Math.log(1 + (n - f + 0.5) / (f + 0.5)));
  // the postings walk: term 0's postings, then term 1's, one per tick
  const postings = [];
  for (let t = 0; t < 2; t += 1) docs.forEach((d, i) => { if (d.tf[t] > 0) postings.push({ t, i }); });
  return {
    docs, n, avgdl, idf, postings, step: 0,
    raw: new Array(n).fill(0), bm: new Array(n).fill(0),
    done: false, ok: true, maxContribution: 0,
    last: `a query of two words over ${n} documents; walking term one's postings first`,
  };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  if (sc.step >= sc.postings.length) {
    sc.done = true;
    const rawTop = sc.raw.indexOf(Math.max(...sc.raw));
    const bmTop = sc.bm.indexOf(Math.max(...sc.bm));
    sc.ok = sc.ok && !sc.docs[bmTop].stuffed;
    sc.last = `done: raw tf puts ${sc.docs[rawTop].name} first${sc.docs[rawTop].stuffed ? ' (one word repeated, the other missing)' : ''}; BM25 puts ${sc.docs[bmTop].name} first (length ${sc.docs[bmTop].length}, counts ${sc.docs[bmTop].tf.join(' and ')})`;
    return true;
  }
  const { t, i } = sc.postings[sc.step];
  const d = sc.docs[i];
  const tf = d.tf[t];
  const w = (tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * d.length) / sc.avgdl));
  const contribution = sc.idf[t] * w;
  sc.raw[i] += tf;
  sc.bm[i] += contribution;
  sc.ok = sc.ok && contribution <= (K1 + 1) * sc.idf[t] + 1e-12 && w >= 0;
  sc.maxContribution = Math.max(sc.maxContribution, contribution);
  sc.step += 1;
  sc.last = `term ${t + 1}, ${d.name}: count ${tf}, length ${d.length}: raw +${tf}; BM25 weight ${w.toFixed(2)} x idf ${sc.idf[t].toFixed(2)} = +${contribution.toFixed(2)} (ceiling ${((K1 + 1) * sc.idf[t]).toFixed(2)})`;
  return false;
}

export default function Bm25Viz() {
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
      stepMs: 650,
      init: () => ({ scene: makeScene(SEED + cycle.current * 7919), done: false, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s) * 2) {
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
        ctx.fillText('same postings; left: raw frequency; right: BM25 saturation and length adjustment', 12, 18);
        const rowH = 24;
        const top = 48;
        const rawMax = Math.max(1, ...sc.raw);
        const bmMax = Math.max(0.5, ...sc.bm);
        const current = sc.step > 0 && sc.step <= sc.postings.length ? sc.postings[sc.step - 1].i : -1;
        sc.docs.forEach((d, i) => {
          const y = top + i * rowH;
          ctx.fillStyle = d.stuffed ? warn : ink;
          ctx.fillText(`${d.name} (${d.length}w, ${d.tf[0]}/${d.tf[1]})`, 12, y + 12);
          // raw bar
          const rw = (sc.raw[i] / rawMax) * 150;
          ctx.fillStyle = d.stuffed ? `${warn}cc` : `${dim}99`;
          ctx.fillRect(170, y + 3, rw, 14);
          ctx.fillStyle = dim;
          ctx.fillText(String(sc.raw[i]), 174 + rw, y + 12);
          // bm25 bar
          const bw = (sc.bm[i] / bmMax) * 180;
          ctx.fillStyle = d.stuffed ? `${warn}cc` : `${algo}cc`;
          ctx.fillRect(400, y + 3, bw, 14);
          ctx.fillStyle = dim;
          ctx.fillText(sc.bm[i].toFixed(2), 404 + bw, y + 12);
          if (i === current) {
            ctx.strokeStyle = heur;
            ctx.strokeRect(8, y, 624, rowH - 4);
          }
        });
        ctx.fillStyle = dim;
        ctx.fillText('raw tf (count summed)', 170, top - 8);
        ctx.fillText(`BM25 (ceiling per term ${(K1 + 1).toFixed(1)} x idf)`, 400, top - 8);
        ctx.fillText(`name (length, count of word one / word two); red: the stuffed document`, 12, H - 22);
        let line;
        if (s.done) {
          line = sc.last;
          ctx.fillStyle = sc.ok ? good : warn;
        } else {
          line = sc.last;
          ctx.fillStyle = ink;
        }
        ctx.fillText(line.length > 96 ? `${line.slice(0, 95)}…` : line, 12, H - 6);
        statsRef.current = { line };
      },
    },
    [restart],
  );

  return (
    <>
      <DiagramViewport width={W}>
        <canvas ref={canvasRef} style={{ aspectRatio: `${W} / ${H}` }} aria-hidden="true" />
      </DiagramViewport>
      <div className="viz-controls">
        <button
          type="button"
          className="btn"
          onClick={() => {
            cycle.current += 1;
            setRestart((t) => t + 1);
          }}
        >
          new corpus
        </button>
        <span className="viz-stat">{snap.line || 'scoring…'}</span>
      </div>
    </>
  );
}
