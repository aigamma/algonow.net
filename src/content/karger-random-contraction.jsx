import KargerViz from '../viz/KargerViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/karger_random_contraction.py?raw';
import { narration } from './karger-random-contraction.narration.js';

export const content = {
  given:
    'A connected graph, and the question reliability engineering keeps asking: what is the smallest set of edges whose loss splits it?',
  task: 'The global minimum cut: found by destroying the graph at random, repeatedly, and trusting a theorem about what survives.',
  constraint:
    'Bipartitions number 2ⁿ⁻¹: the referee enumerates them all (n ≤ 12) and the amplified contraction must match every one, partitions revalidated: while the theorem itself is treated as a measurable claim: single-run success frequency over 20,000 runs, required to clear its 2/(n(n−1)) bound.',

  origins: (
    <p>
      David Karger, 1993, as a Stanford graduate student: an
      algorithm so simple it reads like a joke: contract random
      edges until two blobs remain: whose analysis founded a
      subfield. With Clifford Stein (JACM <strong>1996</strong>) the
      recursive schedule brought the cost to O(n² log³ n), and
      Karger&apos;s later tree-packing work reached near-linear:
      randomized graph algorithms grew up around this one idea. The
      page&apos;s build carried its own lesson: the brute-force
      referee shipped with a bug, and <em>Karger found a smaller cut
      than the &quot;exact&quot; answer</em>: the defendant
      correcting the judge.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>contraction process</strong>: pick an edge
      uniformly at random, merge its endpoints into a supernode
      (parallel edges kept: they are real evidence: self-loops
      dropped), and repeat exactly <strong>n−2 times</strong>
      (audited: 500 runs, 500·(n−2) merges to the unit). Whatever
      edges still cross between the two survivors form a cut of the
      original graph: every run ends holding <em>some</em> cut: the
      only question is whether it is the smallest one.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the reason randomness works: <strong>the min cut is
      small by definition</strong>, so a uniformly random edge
      rarely belongs to it: survive all n−2 contractions and the min
      cut is exactly what remains. The theorem prices one run&apos;s
      success at ≥ 2/(n(n−1)): measured here at <strong>31.3%</strong>{' '}
      over 20,000 runs on the dumbbell against the bound&apos;s
      1.5%: and independent repetition amplifies at will: failure
      70% → 22% → 0.8% → 0.1% at R = 1, 4, 16, 64, measured.
    </p>
  ),

  picture: (
    <p>
      A rumor merges a company. Each round, one random working
      relationship fuses two people into a faction; factions fuse
      onward until two remain: and the org chart&apos;s surviving
      cross-faction links are, by construction, a way to split the
      company. The two divisions truly joined by only two cables
      almost never fuse <em>across</em> the cables: random gossip
      overwhelmingly flows inside the dense halves: so the fragile
      seam survives the merger frenzy and stands revealed at the
      end. One merger spree is a lottery ticket on the seam
      surviving: the theorem prices the ticket, and buying n² of
      them makes the lottery a certainty.
    </p>
  ),

  steps: [
    <>
      <strong>Contract:</strong> a uniformly random edge fuses its
      endpoints: parallel edges kept, self-loops dropped.
    </>,
    <>
      <strong>Repeat exactly n−2 times:</strong> two supernodes
      remain: their crossing edges are a cut (audited to the unit).
    </>,
    <>
      <strong>Trust the census:</strong> the min cut&apos;s few
      edges are rarely drawn: survival probability ≥ 2/(n(n−1)):
      measured 31.3% vs the 1.5% bound.
    </>,
    <>
      <strong>Amplify:</strong> R independent runs fail with
      probability ≤ (1 − 2/n²)^R: the measured curve: 70% → 0.1%.
    </>,
    <>
      <strong>Keep the best,</strong> and revalidate: the reported
      partition is re-cut-counted before anything is believed.
    </>,
  ],

  signals: [
    <>
      <strong>Global, not s-t:</strong> no distinguished pair: the
      weakest seam anywhere: reliability audits, cluster splits,
      community seams.
    </>,
    <>
      <strong>Simplicity is worth variance:</strong> twenty lines
      and a loop counter: no flows, no priority queues: the
      teaching algorithm for randomized graph methods.
    </>,
    <>
      <strong>Repetition is affordable:</strong> runs are
      independent: embarrassingly parallel, and the failure bound
      is a dial you set with R.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>brute force over
      bipartitions</strong>: 2,047 cuts at n = 12, exact, and 2ⁿ⁻¹
      forever: this page&apos;s referee, once its own bug was fixed.
      The deterministic rivals: <strong>Stoer-Wagner</strong> and
      n−1 <strong>max-flow</strong> runs: get certainty without
      lotteries, at the price of machinery the contraction loop
      never needs.
    </>
  ),

  strength: (
    <>
      <strong>A theorem you can watch come true.</strong> All 100
      graphs matched against full bipartition enumeration with
      partitions revalidated; the success bound cleared with room
      (31.3% vs 1.5%) over 20,000 measured runs; the amplification
      curve monotone to 0.1%; contractions exactly n−2 per run,
      counted; and the client&apos;s two bridge cables named by the
      surviving partition: (0-6) and (1-7), asserted.
    </>
  ),
  weakness: (
    <>
      <strong>A lottery, honestly priced: and the bound is the
      contract.</strong> One run fails most of the time (70%
      measured at R = 1): the guarantee lives entirely in
      repetition, and budgeting by the average is the same sin the
      Pollard unit prices: the tail is the spec. Plain Karger&apos;s
      O(n²) runs × O(n²)-ish work lose asymptotically to
      Karger-Stein&apos;s recursive schedule and to deterministic
      Stoer-Wagner: this unit is the idea in its purest, priciest
      form: and weighted graphs need weighted edge sampling, one
      subtlety past the uniform draw.
    </>
  ),

  problem: 'Minimum cut',
  problemSlug: 'minimum-cut',
  rivals: [
    {
      name: 'Karger × contraction',
      isThisUnit: true,
      algoName: "Karger's algorithm",
      cost: 'O(n² log n) runs',
      wins: (
        <>
          <strong>Twenty transparent lines</strong>, the bound
          measured (31.3% vs 1.5%), amplification to any target: the
          randomized-algorithms teaching instance.
        </>
      ),
      costs: (
        <>
          A lottery per run: certainty only in repetition: and
          asymptotically beaten by its own descendant.
        </>
      ),
      when: 'Global min cut with simple code, and as the doorway to randomized graph algorithms.',
    },
    {
      name: 'Karger-Stein × recursion',
      algoName: 'Karger-Stein',
      cost: 'O(n² log³ n)',
      wins: (
        <>
          The descendant: contract only down to n/√2, then branch
          twice: early contractions are safe, late ones risky: the
          schedule spends repetition where danger lives.
        </>
      ),
      costs: (
        <>
          The recursion bookkeeping: the idea is this page&apos;s,
          scheduled cleverly.
        </>
      ),
      when: 'When min cut is the actual workload, not the lesson.',
    },
    {
      name: 'Stoer-Wagner',
      algoName: 'Stoer-Wagner',
      cost: 'O(nm + n² log n)',
      wins: (
        <>
          Deterministic global min cut: maximum-adjacency sweeps,
          no randomness, no failure probability: certainty as a
          feature.
        </>
      ),
      costs: (
        <>
          The sweep machinery is real, and it parallelizes poorly
          where independent runs are trivial.
        </>
      ),
      when: 'When a failure probability, however tiny, is contractually unacceptable.',
    },
    {
      name: 'Edmonds-Karp × BFS flows',
      algoName: 'Edmonds-Karp',
      cost: 'n−1 flow runs',
      wins: (
        <>
          The live unit: fix s, try every t: max-flow duality makes
          each answer a <em>certified</em> s-t cut: the classical
          road.
        </>
      ),
      costs: (
        <>
          n−1 full flow computations for one global answer: the
          machinery this unit&apos;s twenty lines sidestep.
        </>
      ),
      when: 'When flows already run in the system: the global cut rides the existing engine.',
    },
  ],
  neverUse: {
    name: 'One run, read as the answer',
    why: (
      <>
        A single contraction run always ends holding a cut:
        connected-looking, plausible, and 70% of the time on this
        page&apos;s dumbbell, <em>not the minimum</em>. The failure
        mode is the same shape as Space-Saving&apos;s placeholder
        counters and rho&apos;s clock: randomized machinery returns
        a confident artifact whose quality lives in a distribution,
        and reading one sample as the answer discards the entire
        guarantee: which was never about a run: it was about R of
        them. The repetition count is not overhead to trim: it{' '}
        <em>is</em> the algorithm: the measured curve (70% → 0.1%
        across R = 1..64) is the price list, and shipping R = 1 is
        buying zero tickets and announcing the jackpot.
      </>
    ),
  },

  contest: {
    instance:
      'the global min cut of 100 graphs; referee: brute force over all 2ⁿ⁻¹ bipartitions (bug-fixed), the amplified Karger matching every one with partitions revalidated',
    columns: ['work at n = 12', 'nature'],
    rows: [
      {
        method: 'Brute bipartitions',
        values: ['2,047 cuts', 'exact'],
        verdict: 'the referee: and 2ⁿ⁻¹ forever',
      },
      {
        method: 'Karger, one run',
        values: ['n−2 merges', 'p ≥ 2/(n(n−1))'],
        verdict: 'a lottery ticket: measured cashing 31.3% on the dumbbell',
      },
      {
        method: 'Karger, amplified',
        isThisUnit: true,
        values: ['10n² runs', 'failure e⁻²⁰'],
        best: 0,
        verdict: 'the lottery, industrialized: matched the referee on all 100 graphs',
      },
    ],
    source:
      "python solutions/karger_random_contraction.py prints this table and asserts: 100 graphs equal to full bipartition enumeration with each reported partition re-cut-counted; the single-run success frequency ≥ the 2/(n(n−1)) bound over 20,000 runs (31.3% vs 1.5%); exactly n−2 contractions per run across 500 counted runs; the amplification curve monotone (70% → 22% → 0.8% → 0.1% at R = 1, 4, 16, 64) with the geometric-decay pattern; and the dumbbell client's two bridges named exactly. Build note: the first brute-force referee excluded the isolate-vertex-0 cut, and Karger beat it: the defendant corrected the judge.",
  },

  figure: (
    <Figure
      id="fig-karger-contraction"
      aspect="16 / 7"
      caption="The seam survives the merger frenzy. Random contractions fuse the dense halves internally: the two bridge edges are rarely drawn, because there are only two of them: and when two supernodes remain, the surviving crossing edges are a cut. One run is a lottery ticket priced at ≥ 2/(n(n−1)): measured cashing 31.3% here: and R independent tickets fail together with probability (1−p)^R: the measured curve runs 70% → 0.1% by R = 64. The repetition is not overhead: it is the algorithm."
      cite={{
        text: 'Karger 1993; Karger & Stein, "A New Approach to the Minimum Cut Problem", JACM 43(4), 1996: the recursive schedule that spends repetition where the danger lives. This page teaches the pure form.',
        href: 'https://doi.org/10.1145/234533.234534',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Two dense clusters joined by two bridge edges, contractions fusing within clusters, the bridges surviving">
        {[[110, 90], [170, 60], [200, 130], [120, 160], [70, 120]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={13} fill="rgba(93,162,255,0.25)" stroke="#5da2ff" strokeWidth="1.6" />
        ))}
        {[[470, 90], [530, 60], [560, 130], [480, 160], [430, 120]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={13} fill="rgba(93,162,255,0.25)" stroke="#5da2ff" strokeWidth="1.6" />
        ))}
        <line x1="200" y1="130" x2="430" y2="120" stroke="#e2606c" strokeWidth="2.2" />
        <line x1="170" y1="60" x2="470" y2="90" stroke="#e2606c" strokeWidth="2.2" />
        <text x="270" y="80" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">the two bridges: rarely drawn</text>
        {[[110, 90, 170, 60], [110, 90, 200, 130], [120, 160, 70, 120], [170, 60, 200, 130], [70, 120, 110, 90]].map(([a, b, c2, d2], i) => (
          <line key={i} x1={a} y1={b} x2={c2} y2={d2} stroke="#f0b94b" strokeWidth="1.4" strokeDasharray="4 3" />
        ))}
        {[[470, 90, 530, 60], [470, 90, 560, 130], [480, 160, 430, 120], [530, 60, 560, 130], [430, 120, 470, 90]].map(([a, b, c2, d2], i) => (
          <line key={i} x1={a} y1={b} x2={c2} y2={d2} stroke="#f0b94b" strokeWidth="1.4" strokeDasharray="4 3" />
        ))}
        <text x="90" y="210" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">amber: dense internal edges, where random draws land</text>
        <text x="40" y="246" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">measured: single-run success 31.3% (bound: 1.5%) · failure 70% → 0.1% by R = 64 · n−2 merges per run, exact</text>
        <text x="40" y="270" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">the build lesson: the brute referee shipped buggy, and Karger found the smaller cut: the defendant corrected the judge</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'karger_random_contraction.py',
  Viz: KargerViz,
  narration,
};
