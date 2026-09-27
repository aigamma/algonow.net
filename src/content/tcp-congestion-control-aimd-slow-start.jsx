import AimdViz from '../viz/AimdViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/tcp_congestion_control_aimd_slow_start.py?raw';
import { narration } from './tcp-congestion-control-aimd-slow-start.narration.js';

export const content = {
  given:
    'Many senders share a link they cannot see, through a router queue of finite size, and each must choose how many packets to keep in flight. Too few and the link idles; too many and the queue overflows, packets drop, and everyone retransmits. On this page the link carries 100 packets per round trip, the queue holds 50 more, and the senders learn nothing but whether their own packets were lost.',
  task: 'TCP congestion control: a sender infers congestion from loss and adjusts its window, the number of packets in flight. The heuristic is AIMD with slow start: double the window every round trip until the first loss, then add one packet per round trip, and halve on every loss. Additive increase with multiplicative decrease is what makes competing senders converge to equal shares, and slow start is what finds the capacity in a handful of round trips instead of a hundred.',
  constraint:
    'Measured on a fluid model of the bottleneck, one round trip per tick: two AIMD senders starting at windows 1 and 40 reach a Jain fairness index above 0.98 by round trip 5 and hold it; their shares over rounds 100 to 200 are 4,312 and 4,361 window-rounds; on every halving the ratio of the two windows is preserved and on every additive step it moves toward 1, checked on 187 steps. One sender keeps the link 81.0% busy with a sawtooth between 55 and 110 packets and a drop every 56 round trips. Slow start reaches the capacity from a window of 1 in 7 round trips; additive-only start takes 99. Over rounds 150 and beyond, AIMD reaches Jain 1.000, additive increase with additive decrease 0.870, multiplicative increase with multiplicative decrease 0.854. A sender that ignores loss with a fixed window of 200 takes 99.5% of the delivered packets from an AIMD sender; two AIMD senders with round-trip times of 1 and 4 split the link 88.2% to 11.8%.',

  origins: (
    <p>
      The Internet collapsed in October 1986, a link between Berkeley
      and LBL falling from 32 kbit/s to 40 bit/s under retransmission
      storms, and Van Jacobson&apos;s reply (<strong>1988</strong>,
      SIGCOMM, &quot;Congestion avoidance and control&quot;, with Michael
      Karels) put slow start, additive increase, multiplicative decrease,
      and a better round-trip estimator into 4.3BSD TCP, where they
      became TCP Tahoe. Chiu and Jain (1989) gave the proof that of the
      four linear increase-decrease families only AIMD converges to
      fairness and efficiency together, the phase-plane argument
      checked on every step of this page. Reno (1990) added fast
      retransmit and recovery; NewReno, SACK, and the Vegas experiment
      with delay followed; CUBIC (Ha, Rhee, Xu 2008) changed the
      increase curve for long fat pipes and is the Linux default; BBR
      (Cardwell et al. 2016) replaced loss with a bandwidth and
      round-trip model. The sawtooth is still what most of the
      Internet runs on, and RFC 5681 is its standard.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>control loop from a single bit</strong>: the
      sender sees only whether its own packets were lost, and from that
      it must find a rate that keeps the link full without overflowing
      a queue it cannot observe, while other senders do the same with no
      coordination. The referee is the simulated bottleneck itself: the
      link&apos;s utilization, 81.0% for one sender, and Jain&apos;s
      fairness index on the windows of two, which reaches{' '}
      <strong>0.98 by round trip 5</strong> from starting windows of 1
      and 40 and settles at 1.000. The algorithm also owns the reasons
      the loop can fail, measured: a sender that ignores loss takes
      99.5% of the link from one that obeys, and two obedient senders
      with round-trip times of 1 and 4 split the link 88% to 12%,
      because the loop runs once per round trip and the fast sender
      simply runs it more often.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>shape of the increase and the decrease</strong>,
      and the shape is the whole result. Chiu and Jain&apos;s argument
      is a picture: in the plane of two windows, additive increase moves
      the pair parallel to the fairness line, and multiplicative decrease
      moves it toward the origin along a ray through it, so every cycle
      of overload and halving lands closer to equal shares. The page
      checks the two invariants on every step (the ratio preserved on
      halvings, pulled toward 1 on 187 increases) and measures the
      alternatives: additive decrease never converges (<strong>0.870</strong>),
      multiplicative increase never converges (0.854), AIMD reaches
      1.000. Slow start is the other half of the heuristic: doubling
      finds a 100-packet capacity in <strong>7 round trips</strong> where
      adding one takes 99, and the first loss sets the threshold where
      doubling stops and the additive climb begins.
    </p>
  ),

  picture: (
    <p>
      Drivers merging onto a highway they cannot see, each deciding how
      many cars to send per minute from the on-ramp. The only signal
      any driver gets is whether their own cars came back with a dent.
      The rule: if the last minute went cleanly, send one more car than
      last time; if any car was dented, send half as many. Two ramps
      that start wildly unequal, one sending a car and one sending
      forty, find themselves dented together the moment the highway
      overflows, and halving hurts the heavy sender more; then both add
      one, which narrows the gap a little more. A few rounds of that and
      they are sending the same number, without ever speaking, and the
      highway is busy most of the time.
    </p>
  ),

  steps: [
    <>
      <strong>Slow start:</strong> cwnd ← 1; each round trip without
      loss, cwnd ← 2 · cwnd, until cwnd ≥ ssthresh.
    </>,
    <>
      <strong>Congestion avoidance:</strong> each round trip without
      loss, cwnd ← cwnd + 1.
    </>,
    <>
      <strong>Loss:</strong> ssthresh ← cwnd / 2; cwnd ← cwnd / 2.
    </>,
    <>
      <strong>Share:</strong> in the two-sender plane, increases move
      parallel to w₁ = w₂ and halvings move along a ray to the origin;
      the pair converges to the line.
    </>,
    <>
      <strong>Check:</strong> utilization against capacity, Jain&apos;s
      index across senders, and the two invariants on every step.
    </>,
  ],

  signals: [
    <>
      <strong>A shared resource with no central allocator:</strong> a
      link, a database, an API with rate limits; feedback is loss or
      backpressure, nothing more.
    </>,
    <>
      <strong>Many independent clients that must end up fair:</strong>
      the convergence is a property of the rule, not of any negotiation.
    </>,
    <>
      <strong>Capacity unknown and changing:</strong> the sawtooth
      probes it continuously; slow start finds it fast after a restart.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>a fixed window</strong>: choose a
      number and keep it. It is exact if the capacity is known and no
      one else shares the link, and it is the greedy sender here,
      taking 99.5% of a link it drives into permanent overload.
    </>
  ),

  strength: (
    <>
      <strong>Fair and full from one bit of feedback.</strong> Jain 0.98
      by round trip 5 and 1.000 at rest, 81% utilization from one
      sender, the capacity found in 7 round trips, and the convergence
      proved by two invariants that hold on every step.
    </>
  ),
  weakness: (
    <>
      <strong>Loss as the only signal, and a bias toward the near.</strong>{' '}
      The sawtooth needs drops to learn, so a full queue is the
      steady state (81% here, the textbook 75% of the peak); senders
      with short round trips run the loop more often and win, 88% to
      12% at round-trip times 1 and 4; a sender that ignores loss takes
      everything; and on links where loss is noise rather than
      congestion, wireless or very long pipes, halving on every drop
      starves the sender, which is why CUBIC and BBR exist.
    </>
  ),

  problem: 'Congestion avoidance',
  problemSlug: 'congestion-control',
  rivals: [
    {
      name: 'TCP congestion control × AIMD slow start',
      isThisUnit: true,
      algoName: 'TCP congestion control',
      cost: 'one update per round trip',
      wins: (
        <>
          <strong>Fairness 1.000 from windows 1 and 40</strong>; capacity
          found in 7 round trips.
        </>
      ),
      costs: (
        <>
          Needs loss to learn; favors short round trips; helpless
          against a greedy sender.
        </>
      ),
      when: 'Shared links with cooperative senders and loss that means congestion.',
    },
    {
      name: 'TCP CUBIC',
      algoName: 'TCP CUBIC',
      cost: 'a cubic function of time since the last loss',
      wins: (
        <>
          Grows fast far from the last loss point and slowly near it, so
          long fat pipes fill without waiting a thousand round trips;
          growth independent of round-trip time, which softens the 88%
          to 12% bias.
        </>
      ),
      costs: (
        <>
          Still loss-driven and still fills the queue; more aggressive
          against legacy AIMD flows.
        </>
      ),
      when: 'High bandwidth-delay products; the Linux default.',
    },
    {
      name: 'TCP Vegas',
      algoName: 'TCP Vegas',
      cost: 'a round-trip time estimate per window',
      wins: (
        <>
          Uses rising delay as the signal and backs off before the queue
          overflows: no sawtooth, fewer drops.
        </>
      ),
      costs: (
        <>
          Loses to loss-based senders sharing the link, which fill the
          queue it is trying to keep empty.
        </>
      ),
      when: 'Homogeneous deployments where every sender is delay-based.',
    },
    {
      name: 'BBR',
      algoName: 'BBR',
      cost: 'estimates of bottleneck bandwidth and minimum RTT',
      wins: (
        <>
          Paces at the estimated bottleneck rate with a small queue,
          ignoring random loss; high throughput on lossy and long
          paths.
        </>
      ),
      costs: (
        <>
          A model that can be wrong; fairness against AIMD flows has
          needed revisions.
        </>
      ),
      when: 'Long or lossy paths where loss is a poor proxy for congestion.',
    },
  ],
  neverUse: {
    name: 'A sender that ignores loss',
    why: (
      <>
        The rule that wins in the short run is to keep a large fixed
        window and let the network sort it out: measured, a sender
        holding 200 packets in flight against an AIMD sender takes{' '}
        <strong>99.5% of the delivered packets</strong> and keeps the
        queue in permanent overflow. That is the October 1986 collapse
        in one line: every sender that does this makes every other
        sender&apos;s loss worse, retransmissions become most of the
        traffic, and throughput falls for all of them, the greedy one
        included. The control loop only works because everyone runs it,
        which is why it is a standard and not a suggestion, and why the
        network&apos;s own defenses, fair queuing and active queue
        management, exist for the senders who do not.
      </>
    ),
  },

  contest: {
    instance:
      'senders sharing a link of 100 packets per round trip with a 50-packet queue, in a fluid model with one round trip per tick, loss shared in proportion to the offered windows; referees: Jain’s fairness index, link utilization, and the Chiu-Jain invariants on every step',
    columns: ['fairness (Jain)', 'utilization', 'note'],
    rows: [
      {
        method: 'AIMD + slow start, two senders from 1 and 40',
        isThisUnit: true,
        values: ['0.98 by round trip 5; 1.000 at rest', '85.1%', 'ratio preserved on halvings, pulled to 1 on 187 increases'],
        best: 0,
        verdict: 'converges',
      },
      {
        method: 'AIAD (add 1, subtract 5)',
        values: ['0.870', '100%', 'full queue, unequal shares'],
        verdict: 'never converges',
      },
      {
        method: 'MIMD (×1.2, ÷2)',
        values: ['0.854', '99.3%', 'the ratio never moves'],
        verdict: 'never converges',
      },
      {
        method: 'one AIMD sender',
        values: ['·', '81.0%', 'sawtooth 55 to 110, a drop every 56 round trips'],
        verdict: 'the price of loss as the signal',
      },
      {
        method: 'slow start / additive-only start to capacity',
        values: ['·', '·', '7 / 99 round trips'],
        verdict: 'doubling finds the capacity',
      },
      {
        method: 'fixed window 200 vs AIMD',
        values: ['greedy takes 99.5%', 'overloaded', 'permanent overflow'],
        verdict: 'the collapse of 1986',
      },
      {
        method: 'AIMD at round-trip times 1 and 4',
        values: ['88.2% / 11.8%', '·', 'the loop runs per round trip'],
        verdict: 'RTT unfairness',
      },
    ],
    source:
      'python solutions/tcp_congestion_control_aimd_slow_start.py prints this table and asserts: two AIMD senders reach a Jain index above 0.98 within 60 round trips and hold it for 20, with late shares within 10%; the window ratio preserved on every joint halving and non-increasing on every joint additive step; one sender above 75% utilization with the sawtooth between half the capacity and the capacity plus the queue; slow start within 8 round trips and additive-only start at least 95; AIMD above 0.98 while AIAD and MIMD stay below 0.9; the greedy sender above 90% of the packets; and the short-RTT sender above 60% of the link.',
  },

  figure: (
    <Figure
      id="fig-aimd-phase"
      aspect="16 / 7"
      caption="Left: the two windows over time from starts of 1 and 40; slow start doubles both until the first shared loss, then the sawteeth run in step. Right: Chiu and Jain’s phase plane. Additive increase moves the pair diagonally up, parallel to the fairness line; a halving moves it straight toward the origin along its ray; the pair walks onto the line and stays there. Measured on this page: Jain 0.98 by round trip 5, 1.000 at rest; AIAD 0.870 and MIMD 0.854 never arrive."
      cite={{
        text: 'V. Jacobson, M. Karels, "Congestion avoidance and control," SIGCOMM 1988. DOI 10.1145/52324.52356. D.-M. Chiu, R. Jain, "Analysis of the increase and decrease algorithms for congestion avoidance in computer networks," Computer Networks and ISDN Systems 17(1), 1989. M. Allman, V. Paxson, E. Blanton, RFC 5681, 2009.',
        href: 'https://doi.org/10.1145/52324.52356',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Two sawtooth window curves converging on the left, and on the right a phase-plane path of diagonal increases and radial halvings walking onto the fairness line">
        {(() => {
          // simulate the same fluid model inline for the figure
          const cap = 100;
          const queue = 50;
          let w = [1, 40];
          let ss = [Infinity, Infinity];
          let backlog = 0;
          const hist = [[1], [40]];
          const phase = [[1, 40]];
          for (let t = 0; t < 120; t++) {
            const total = w[0] + w[1] + backlog;
            const carried = Math.min(total, cap);
            const leftover = total - carried;
            backlog = Math.min(leftover, queue);
            const dropped = leftover - backlog;
            const sum = w[0] + w[1];
            const nw = [0, 0];
            for (let i = 0; i < 2; i++) {
              const lost = dropped * (w[i] / sum) > 0.5;
              if (lost) {
                ss[i] = Math.max(2, w[i] / 2);
                nw[i] = Math.max(1, w[i] / 2);
              } else if (w[i] < ss[i]) nw[i] = w[i] * 2;
              else nw[i] = w[i] + 1;
            }
            w = nw;
            hist[0].push(w[0]);
            hist[1].push(w[1]);
            phase.push(w.slice());
          }
          const cx = 30;
          const cy = 30;
          const cw = 300;
          const ch = 200;
          const maxW = 160;
          const X = (t) => cx + (t / 120) * cw;
          const Y = (v) => cy + ch - (v / maxW) * ch;
          const px = 380;
          const py = 30;
          const ps = 200;
          const PX = (v) => px + (v / maxW) * ps;
          const PY = (v) => py + ps - (v / maxW) * ps;
          return (
            <g>
              <rect x={cx} y={cy} width={cw} height={ch} fill="none" stroke="#9aa5bd" strokeOpacity="0.4" />
              <line x1={cx} y1={Y(cap)} x2={cx + cw} y2={Y(cap)} stroke="#e2606c" strokeOpacity="0.7" strokeDasharray="4 3" />
              <polyline points={hist[0].map((v, t) => `${X(t)},${Y(v)}`).join(' ')} fill="none" stroke="#5da2ff" strokeWidth="1.5" />
              <polyline points={hist[1].map((v, t) => `${X(t)},${Y(v)}`).join(' ')} fill="none" stroke="#f0b94b" strokeWidth="1.5" />
              <text x={cx + 4} y={Y(cap) - 4} fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="9">capacity 100</text>
              <text x={cx} y={cy + ch + 14} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">round trips 0 to 120: blue from 1, amber from 40</text>
              <rect x={px} y={py} width={ps} height={ps} fill="none" stroke="#9aa5bd" strokeOpacity="0.4" />
              <line x1={PX(0)} y1={PY(0)} x2={PX(maxW)} y2={PY(maxW)} stroke="#62d98a" strokeOpacity="0.8" strokeDasharray="3 3" />
              <line x1={PX(0)} y1={PY(cap + queue)} x2={PX(cap + queue)} y2={PY(0)} stroke="#e2606c" strokeOpacity="0.7" />
              <polyline points={phase.map(([a, b]) => `${PX(a)},${PY(b)}`).join(' ')} fill="none" stroke="#e9edf6" strokeOpacity="0.8" strokeWidth="1.2" />
              <circle cx={PX(phase[phase.length - 1][0])} cy={PY(phase[phase.length - 1][1])} r="4" fill="#62d98a" />
              <text x={px} y={py + ps + 14} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">phase plane: A across, B up</text>
              <text x={px} y={py + ps + 28} fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">green: the fairness line; red: overload</text>
              <text x={cx} y={cy + ch + 28} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">Jain 0.98 by round 5, 1.000 at rest; AIAD 0.870, MIMD 0.854</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'tcp_congestion_control_aimd_slow_start.py',
  Viz: AimdViz,
  narration,
};
