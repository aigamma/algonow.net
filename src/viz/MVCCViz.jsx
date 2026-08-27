import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts of one ledger. Act one: version timelines: every commit
// lands a new amber box on its key's row, and each reader is a
// blue vertical line that resolves to the newest box at or left of
// its snapshot: writers keep landing to the right, readers never
// wait, and every reader's sum balances exactly. Act two: write
// skew theater: two doctors, two transactions that each read both
// flags (a safe world), write disjoint keys, and both commit:
// snapshot isolation's famous hole opens on stage: then the serial
// replay runs the same intentions one at a time, and the second
// doctor, seeing the truth, refuses: the invariant survives.
const W = 640;
const H = 300;
const SEED = 20260827;
const END_HOLD = 70;

// A miniature of the python engine: enough MVCC to be honest.
export function makeEngine() {
  const versions = {};
  let ts = 0;
  const active = {};
  const writes = {};
  let next = 0;
  return {
    versions,
    init(k, v) {
      versions[k] = [[0, v]];
    },
    begin() {
      next += 1;
      active[next] = ts;
      writes[next] = {};
      return next;
    },
    read(tx, k) {
      if (k in writes[tx]) return writes[tx][k];
      const snap = active[tx];
      const vs = versions[k] || [];
      for (let i = vs.length - 1; i >= 0; i--) if (vs[i][0] <= snap) return vs[i][1];
      return null;
    },
    write(tx, k, v) {
      writes[tx][k] = v;
    },
    commit(tx) {
      for (const k in writes[tx]) {
        const vs = versions[k] || [[0, null]];
        if (vs[vs.length - 1][0] > active[tx]) {
          delete active[tx];
          delete writes[tx];
          return false;
        }
      }
      ts += 1;
      for (const k in writes[tx]) {
        (versions[k] = versions[k] || []).push([ts, writes[tx][k]]);
      }
      delete active[tx];
      delete writes[tx];
      return true;
    },
    snapshotOf(tx) {
      return active[tx];
    },
  };
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  // Act 1: three accounts, a stream of transfers, three readers at
  // staggered snapshots. Record commit events and reader audits.
  const eng = makeEngine();
  const KEYS = ['A', 'B', 'C'];
  const START = 100;
  for (const k of KEYS) eng.init(k, START);
  const commits = [];
  const readers = [];
  let commitTs = 0;
  for (let i = 0; i < 9; i++) {
    const t = eng.begin();
    const ki = Math.floor(rand() * 3);
    const kj = (ki + 1 + Math.floor(rand() * 2)) % 3;
    const amt = 5 + Math.floor(rand() * 26);
    eng.write(t, KEYS[ki], eng.read(t, KEYS[ki]) - amt);
    eng.write(t, KEYS[kj], eng.read(t, KEYS[kj]) + amt);
    if ((i + 1) % 3 === 0) {
      const r = eng.begin();
      const vals = KEYS.map((k) => eng.read(r, k));
      readers.push({ snap: eng.snapshotOf(r), vals, sum: vals.reduce((a, b) => a + b, 0) });
    }
    if (eng.commit(t)) {
      commitTs += 1;
      commits.push({ ts: commitTs, keys: [KEYS[ki], KEYS[kj]] });
    }
  }
  const chains = {};
  for (const k of KEYS) chains[k] = eng.versions[k].map(([cts, v]) => ({ cts, v }));

  // Act 2: write skew on a fresh engine, scripted.
  const e2 = makeEngine();
  e2.init('alice', 1);
  e2.init('bob', 1);
  const t1 = e2.begin();
  const t2 = e2.begin();
  const seen1 = e2.read(t1, 'alice') + e2.read(t1, 'bob');
  const seen2 = e2.read(t2, 'alice') + e2.read(t2, 'bob');
  e2.write(t1, 'alice', 0);
  e2.write(t2, 'bob', 0);
  const c1 = e2.commit(t1);
  const c2 = e2.commit(t2);
  const after = e2.versions.alice[e2.versions.alice.length - 1][1] + e2.versions.bob[e2.versions.bob.length - 1][1];
  // Serial replay: second txn re-reads truth and refuses.
  const serial = { alice: 1, bob: 1 };
  serial.alice = 0; // T1 commits first: 1 remains
  const t2WouldSee = serial.alice + serial.bob;
  const t2Refuses = t2WouldSee < 2;
  return { chains, commits, readers, START, skew: { seen1, seen2, c1, c2, after, t2WouldSee, t2Refuses } };
}

export default function MVCCViz() {
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
        const len = s.act === 0 ? 9 * 26 + END_HOLD : 6 * 40 + END_HOLD;
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
          const maxTs = sc.commits.length;
          const now = done ? maxTs : Math.min(s.tick / 26, maxTs);
          ctx.fillText('act 1 · every commit lands a new version: readers resolve at their snapshot and never wait', 14, 20);

          const X = (t) => 90 + (t / maxTs) * 470;
          const rows = { A: 60, B: 120, C: 180 };
          for (const k of Object.keys(rows)) {
            const y = rows[k];
            ctx.fillStyle = dim;
            ctx.font = '11px ui-monospace, monospace';
            ctx.fillText(`acct ${k}`, 14, y + 14);
            ctx.strokeStyle = 'rgba(154,165,189,0.3)';
            ctx.beginPath();
            ctx.moveTo(80, y + 10);
            ctx.lineTo(600, y + 10);
            ctx.stroke();
            for (const ver of sc.chains[k]) {
              if (ver.cts > now) continue;
              ctx.fillStyle = ver.cts === 0 ? 'rgba(154,165,189,0.3)' : 'rgba(240,185,75,0.55)';
              ctx.fillRect(X(ver.cts) - 14, y, 30, 20);
              ctx.fillStyle = '#10141f';
              ctx.font = '9px ui-monospace, monospace';
              ctx.fillText(String(ver.v), X(ver.cts) - 10, y + 13);
            }
          }
          // Readers as blue snapshot lines with their sums.
          sc.readers.forEach((r, i) => {
            if (r.snap > now) return;
            const x = X(r.snap) + 20;
            ctx.strokeStyle = algo;
            ctx.lineWidth = 1.8;
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.moveTo(x, 46);
            ctx.lineTo(x, 208);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = algo;
            ctx.font = '10px ui-monospace, monospace';
            ctx.fillText(`reader@${r.snap}: sum ${r.sum}`, Math.min(x - 30, 520), 226 + i * 14);
          });

          let line;
          if (done || now >= maxTs) {
            line = `every reader summed exactly ${3 * sc.START}: a frozen instant each, while ${maxTs} commits landed around them`;
            ctx.fillStyle = good;
          } else {
            line = `commit ${Math.ceil(now)} lands a new version: no reader blocked, none will re-read`;
            ctx.fillStyle = ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = { line };
        } else {
          const phase = done ? 5 : Math.min(Math.floor(s.tick / 40), 5);
          ctx.fillText('act 2 · write skew: the hole snapshot isolation cannot see', 14, 20);
          const sk = sc.skew;

          const card = (x, label, on, hot) => {
            ctx.strokeStyle = hot ? heur : on ? good : warn;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, 50, 130, 54);
            ctx.fillStyle = on ? 'rgba(98,217,138,0.15)' : 'rgba(226,96,108,0.2)';
            ctx.fillRect(x, 50, 130, 54);
            ctx.fillStyle = ink;
            ctx.font = '12px ui-monospace, monospace';
            ctx.fillText(label, x + 12, 72);
            ctx.fillStyle = on ? good : warn;
            ctx.fillText(on ? 'ON CALL' : 'OFF', x + 12, 92);
          };
          const aliceOn = phase < 3;
          const bobOn = phase < 3;
          card(120, 'Dr. Alice', aliceOn, phase === 2);
          card(390, 'Dr. Bob', bobOn, phase === 2);

          ctx.font = '11px ui-monospace, monospace';
          if (phase >= 1) {
            ctx.fillStyle = algo;
            ctx.fillText(`T1 reads both: sees ${sk.seen1} on call (safe) · T2 reads both: sees ${sk.seen2} (safe)`, 60, 132);
          }
          if (phase >= 2) {
            ctx.fillStyle = heur;
            ctx.fillText('T1 writes alice=OFF · T2 writes bob=OFF: DISJOINT keys', 60, 154);
          }
          if (phase >= 3) {
            ctx.fillStyle = sk.c1 && sk.c2 ? warn : good;
            ctx.fillText(`no write-write conflict: both COMMIT · on call now: ${sk.after}`, 60, 176);
          }
          if (phase >= 4) {
            ctx.fillStyle = warn;
            ctx.font = '13px ui-monospace, monospace';
            ctx.fillText('THE ANOMALY: nobody is on call: each decision was safe in its own snapshot', 60, 202);
          }
          if (phase >= 5 || done) {
            ctx.fillStyle = good;
            ctx.font = '11px ui-monospace, monospace';
            ctx.fillText(`serial replay: T1 commits first, T2 re-reads and sees ${sk.t2WouldSee} on call: T2 refuses: invariant survives`, 60, 232);
          }

          let line;
          if (done || phase >= 5) {
            line = 'disjoint writes hide the dependency: SSI or explicit locks close the hole: knowing when is the skill';
            ctx.fillStyle = warn;
          } else {
            line = ['two doctors, one rule: someone stays on call', 'both transactions photograph a safe world', 'each steps off: different keys touched', 'first-committer-wins finds nothing to veto', 'the snapshots were each true: together they lied'][phase];
            ctx.fillStyle = phase >= 3 ? warn : ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = {
            line: done
              ? 'readers never wait, writers rarely do, and one anomaly hides in the gap: name it to defuse it'
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
          new ledger
        </button>
        <span className="viz-stat">
          {snap.line || 'stamping the versions…'}
        </span>
      </div>
    </>
  );
}
