import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Three acts of single-decree Paxos on five acceptors, scripted so the
// reader sees the one thing that matters: any two majorities share an
// acceptor, and that shared acceptor carries the chosen value into
// every later ballot. Act 1: one proposer, two phases, a value chosen.
// Act 2: the duel: a second proposer with a higher ballot preempts the
// first, learns the value already accepted inside its quorum, and is
// forced to carry it forward. Act 3: the ablation: quorums of two out
// of five do not intersect, and two different values get chosen.
const W = 640;
const H = 300;
const SEED = 20260926;
const NA = 5;
const AX = (i) => 80 + i * 120;
const AY = 205;
const P1 = { x: 150, y: 52 };
const P2 = { x: 490, y: 52 };

// An act is a list of message flights and state marks. Every tick is one
// unit; flights move a dot from `from` to `to` over [t0, t1].
function flight(t0, t1, from, to, color, label) {
  return { t0, t1, from, to, color, label };
}

function buildActs(quorumSet1, quorumSet2) {
  const acc = (i) => ({ x: AX(i), y: AY - 22 });
  const acts = [];

  // Act 1: a lone proposer. Prepare to all, promises from the quorum,
  // accept to all, accepted from the quorum: chosen.
  {
    const flights = [];
    const marks = [];
    for (let i = 0; i < NA; i++) flights.push(flight(0, 22, P1, acc(i), 'algo', 'prepare(b1)'));
    for (const i of quorumSet1) {
      flights.push(flight(26, 46, acc(i), P1, 'algo', 'promise'));
      marks.push({ t: 24, i, promised: 1 });
    }
    for (let i = 0; i < NA; i++) if (!quorumSet1.includes(i)) marks.push({ t: 24, i, promised: 1 });
    marks.push({ t: 47, quorum: quorumSet1, who: 1 });
    for (let i = 0; i < NA; i++) flights.push(flight(52, 74, P1, acc(i), 'algo', 'accept(b1, A)'));
    for (const i of quorumSet1) {
      marks.push({ t: 76, i, accepted: [1, 'A'] });
      flights.push(flight(78, 98, acc(i), P1, 'good', 'accepted'));
    }
    marks.push({ t: 99, chosen: 'A', by: quorumSet1 });
    acts.push({ title: 'act 1 · one proposer, two phases: prepare, then accept, each answered by a majority', flights, marks, len: 130 });
  }

  // Act 2: the duel. P1 gets promises from its quorum and lands accepts on
  // only two acceptors before P2's higher ballot arrives everywhere. P2's
  // quorum shares one acceptor with P1's, sees (b1, A), and must carry A.
  {
    const flights = [];
    const marks = [];
    const shared = quorumSet1.find((i) => quorumSet2.includes(i));
    const landed = quorumSet1.filter((i) => i !== shared).slice(0, 1).concat([shared]);
    for (let i = 0; i < NA; i++) flights.push(flight(0, 22, P1, acc(i), 'algo', 'prepare(b1)'));
    for (let i = 0; i < NA; i++) marks.push({ t: 24, i, promised: 1 });
    for (const i of quorumSet1) flights.push(flight(26, 46, acc(i), P1, 'algo', 'promise'));
    marks.push({ t: 47, quorum: quorumSet1, who: 1 });
    for (const i of landed) {
      flights.push(flight(52, 74, P1, acc(i), 'algo', 'accept(b1, A)'));
      marks.push({ t: 76, i, accepted: [1, 'A'] });
      flights.push(flight(78, 98, acc(i), P1, 'good', 'accepted'));
    }
    marks.push({ t: 99, note: `only ${landed.length} of ${NA} accepted b1: not chosen` });
    for (let i = 0; i < NA; i++) flights.push(flight(60, 82, P2, acc(i), 'heur', 'prepare(b2)'));
    for (let i = 0; i < NA; i++) marks.push({ t: 84, i, promised: 2 });
    for (const i of quorumSet2) flights.push(flight(86, 106, acc(i), P2, i === shared ? 'heur' : 'algo', i === shared ? 'promise + (b1, A)' : 'promise'));
    // P1's late accept to a third acceptor arrives after it promised b2.
    const late = quorumSet1.find((i) => !landed.includes(i));
    flights.push(flight(88, 110, P1, acc(late), 'warn', 'accept(b1, A): rejected'));
    marks.push({ t: 107, quorum: quorumSet2, who: 2, shared });
    marks.push({ t: 112, adopt: shared });
    for (let i = 0; i < NA; i++) flights.push(flight(116, 138, P2, acc(i), 'heur', 'accept(b2, A)'));
    for (const i of quorumSet2) {
      marks.push({ t: 140, i, accepted: [2, 'A'] });
      flights.push(flight(142, 162, acc(i), P2, 'good', 'accepted'));
    }
    marks.push({ t: 163, chosen: 'A', by: quorumSet2, carried: true });
    acts.push({ title: 'act 2 · the duel: a higher ballot preempts, but the shared acceptor makes it carry A forward', flights, marks, len: 200 });
  }

  // Act 3: the ablation. Quorum = 2 of 5. Two disjoint pairs, two values.
  {
    const flights = [];
    const marks = [];
    const q1 = quorumSet1.slice(0, 2);
    const q2 = [0, 1, 2, 3, 4].filter((i) => !q1.includes(i)).slice(0, 2);
    for (let i = 0; i < NA; i++) flights.push(flight(0, 22, P1, acc(i), 'algo', 'prepare(b1)'));
    for (let i = 0; i < NA; i++) marks.push({ t: 24, i, promised: 1 });
    for (const i of q1) flights.push(flight(26, 46, acc(i), P1, 'algo', 'promise'));
    marks.push({ t: 47, quorum: q1, who: 1, half: true });
    for (const i of q1) {
      flights.push(flight(52, 74, P1, acc(i), 'algo', 'accept(b1, A)'));
      marks.push({ t: 76, i, accepted: [1, 'A'] });
      flights.push(flight(78, 98, acc(i), P1, 'good', 'accepted'));
    }
    marks.push({ t: 99, chosen: 'A', by: q1, half: true });
    for (let i = 0; i < NA; i++) flights.push(flight(70, 92, P2, acc(i), 'heur', 'prepare(b2)'));
    for (const i of q2) marks.push({ t: 94, i, promised: 2 });
    for (const i of q2) flights.push(flight(96, 116, acc(i), P2, 'algo', 'promise (nothing accepted)'));
    marks.push({ t: 117, quorum: q2, who: 2, half: true });
    for (const i of q2) {
      flights.push(flight(122, 144, P2, acc(i), 'heur', 'accept(b2, B)'));
      marks.push({ t: 146, i, accepted: [2, 'B'] });
      flights.push(flight(148, 168, acc(i), P2, 'warn', 'accepted'));
    }
    marks.push({ t: 169, chosen: 'B', by: q2, half: true, violation: true });
    acts.push({ title: 'act 3 · the ablation: quorums of two out of five never intersect, so nobody remembers A', flights, marks, len: 205 });
  }
  return acts;
}

function pickQuorums(rand) {
  const order = [0, 1, 2, 3, 4].sort(() => rand() - 0.5);
  const q1 = order.slice(0, 3).sort((a, b) => a - b);
  // q2 shares exactly one acceptor with q1 (the minimum any two
  // majorities of five can share).
  const rest = [0, 1, 2, 3, 4].filter((i) => !q1.includes(i));
  const shared = q1[Math.floor(rand() * 3)];
  const q2 = [...rest, shared].sort((a, b) => a - b);
  return { q1, q2 };
}

export default function PaxosViz() {
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
      init: () => {
        const rand = mulberry32(SEED + cycle.current * 7919);
        const { q1, q2 } = pickQuorums(rand);
        return { acts: buildActs(q1, q2), act: 0, tick: 0, actRest: 0, rest: 0, stopAtRest: isStill() };
      },
      tick: (s) => {
        if (s.act >= s.acts.length) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            const rand = mulberry32(SEED + cycle.current * 7919);
            const { q1, q2 } = pickQuorums(rand);
            Object.assign(s, { acts: buildActs(q1, q2), act: 0, tick: 0, actRest: 0, rest: 0 });
          }
          return true;
        }
        s.tick += 1;
        const len = s.acts[s.act].len;
        if (s.tick >= len) {
          s.tick = len;
          s.actRest += 1;
          if (s.actRest > holdTicks(s)) {
            s.act += 1;
            s.tick = 0;
            s.actRest = 0;
          }
        }
        return true;
      },
      draw: (ctx, s) => {
        ctx.clearRect(0, 0, W, H);
        const css = getComputedStyle(document.documentElement);
        const colors = {
          algo: css.getPropertyValue('--algo').trim() || '#5da2ff',
          heur: css.getPropertyValue('--heur').trim() || '#f0b94b',
          good: css.getPropertyValue('--path').trim() || '#62d98a',
          warn: css.getPropertyValue('--warn').trim() || '#e2606c',
        };
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';
        const done = s.act >= s.acts.length;
        const act = s.acts[Math.min(s.act, s.acts.length - 1)];
        const t = done ? act.len : s.tick;

        // Replay marks up to t to get acceptor state and annotations.
        const promised = new Array(NA).fill(0);
        const accepted = new Array(NA).fill(null);
        let quorum = null;
        let chosen = null;
        let note = '';
        let adopt = null;
        for (const m of act.marks) {
          if (m.t > t) continue;
          if (m.i !== undefined && m.promised) promised[m.i] = Math.max(promised[m.i], m.promised);
          if (m.i !== undefined && m.accepted) accepted[m.i] = m.accepted;
          if (m.quorum) quorum = m;
          if (m.chosen) chosen = m;
          if (m.note) note = m.note;
          if (m.adopt !== undefined) adopt = m.adopt;
        }

        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(act.title, 14, 18);

        // proposers
        const drawProposer = (p, label, color) => {
          ctx.fillStyle = `${color}33`;
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.roundRect(p.x - 46, p.y - 14, 92, 28, 6);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = ink;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText(label, p.x - 40, p.y + 4);
        };
        drawProposer(P1, 'P1: ballot 1, A', colors.algo);
        const p2Label = adopt !== null ? 'P2: ballot 2, must say A' : `P2: ballot 2, ${s.act === 2 ? 'B' : 'B?'}`;
        drawProposer(P2, p2Label, colors.heur);

        // acceptors
        for (let i = 0; i < NA; i++) {
          const inQ = quorum && quorum.quorum.includes(i);
          const isShared = quorum && quorum.shared === i;
          ctx.beginPath();
          ctx.arc(AX(i), AY, 16, 0, Math.PI * 2);
          ctx.fillStyle = accepted[i] ? `${accepted[i][1] === 'A' ? colors.good : colors.warn}44` : 'rgba(154,165,189,0.12)';
          ctx.fill();
          ctx.lineWidth = inQ ? 2.4 : 1.2;
          ctx.strokeStyle = isShared ? colors.heur : inQ ? (quorum.half ? colors.warn : colors.heur) : dim;
          ctx.stroke();
          ctx.fillStyle = ink;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText(`a${i}`, AX(i) - 7, AY + 4);
          ctx.fillStyle = dim;
          ctx.font = '10px ui-monospace, monospace';
          ctx.fillText(`promised ${promised[i] || '-'}`, AX(i) - 32, AY + 34);
          ctx.fillStyle = accepted[i] ? (accepted[i][1] === 'A' ? colors.good : colors.warn) : dim;
          ctx.fillText(accepted[i] ? `accepted (${accepted[i][0]}, ${accepted[i][1]})` : 'accepted none', AX(i) - 44, AY + 48);
        }

        // flights in progress
        for (const f of act.flights) {
          if (t < f.t0 || t > f.t1 + 4) continue;
          const u = Math.min(1, (t - f.t0) / (f.t1 - f.t0));
          const x = f.from.x + (f.to.x - f.from.x) * u;
          const y = f.from.y + (f.to.y - f.from.y) * u;
          const c = colors[f.color];
          ctx.strokeStyle = `${c}44`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(f.from.x, f.from.y);
          ctx.lineTo(x, y);
          ctx.stroke();
          ctx.fillStyle = c;
          ctx.beginPath();
          ctx.arc(x, y, 3.5, 0, Math.PI * 2);
          ctx.fill();
          if (u > 0.35 && u < 0.75) {
            ctx.font = '9px ui-monospace, monospace';
            ctx.fillText(f.label, x + 6, y - 4);
          }
        }

        // status
        let line;
        if (chosen) {
          if (chosen.violation) {
            line = `TWO values chosen: A by {${act.marks.find((m) => m.chosen === 'A').by.join(',')}} and B by {${chosen.by.join(',')}}: disjoint quorums, no shared memory: agreement is dead`;
            ctx.fillStyle = colors.warn;
          } else if (chosen.carried) {
            line = `A chosen again by {${chosen.by.join(',')}} under ballot 2: acceptor a${quorum.shared} sat in both majorities and carried A forward`;
            ctx.fillStyle = colors.good;
          } else {
            line = `${chosen.chosen} chosen: ballot 1 accepted by a majority {${chosen.by.join(',')}}${chosen.half ? ' of two: half is not a majority' : ''}`;
            ctx.fillStyle = chosen.half ? colors.warn : colors.good;
          }
        } else if (adopt !== null) {
          line = `P2's quorum includes a${adopt}, which already accepted (1, A): P2 must propose A, not B`;
          ctx.fillStyle = colors.heur;
        } else if (note) {
          line = note;
          ctx.fillStyle = ink;
        } else if (quorum) {
          line = `promises from {${quorum.quorum.join(',')}}: ${quorum.half ? 'two of five is not a majority' : 'a majority, and any two majorities of five share at least one acceptor'}`;
          ctx.fillStyle = quorum.half ? colors.warn : colors.heur;
        } else {
          line = 'prepare(b): each acceptor promises to ignore anything below b and reports what it already accepted';
          ctx.fillStyle = ink;
        }
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(line, 14, H - 8);
        statsRef.current = {
          line: done ? 'majorities intersect; the intersection remembers; that memory is the whole safety proof' : line,
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
          new quorums
        </button>
        <span className="viz-stat">{snap.line || 'preparing…'}</span>
      </div>
    </>
  );
}
