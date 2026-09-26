import HopcroftViz from '../viz/HopcroftViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/hopcrofts_minimization_partition_refinement.py?raw';
import { narration } from './hopcrofts-minimization-partition-refinement.narration.js';

export const content = {
  given:
    'A deterministic finite automaton with more states than it needs: copies, unrolled prefixes, leftovers from a construction. Two states are the same if no string can tell them apart.',
  task: 'Start from the two-block partition {accepting, rejecting} and refine: a block splits when two of its states go to different blocks on the same letter. Hopcroft refines through inverse transitions from a queue of splitters, and after every split queues only the smaller piece.',
  constraint:
    'Moore’s algorithm, written independently, produces the identical partition on every instance (300 to 4,800 states); a product-construction search proves each minimized machine accepts exactly the original language; table filling marks every remaining pair distinguishable and Brzozowski’s double reversal agrees on the count. Transitions examined are counted and held under 2 k n log₂ n on every instance, and the ablation that queues both halves is measured.',

  origins: (
    <p>
      John Hopcroft, <strong>1971</strong>, in a Stanford technical
      report titled An n log n algorithm for minimizing states in a
      finite automaton: the first sub-quadratic minimizer, and one
      whose proof was famously terse. Edward Moore had given the
      round-by-round refinement in 1956 (the Gedanken-experiments
      paper) and Myhill and Nerode had shown in 1957 and 1958 that
      the minimal automaton is unique: states are the classes of an
      equivalence relation, so minimization is a partition problem.
      Hopcroft&apos;s insight was the process-the-smaller-half
      argument from Union-Find and balanced merging: if a split
      state only re-enters the queue as part of the smaller piece,
      it can do so at most log₂ n times. Gries (1973) and Knuutila
      (2001) rewrote the algorithm until it was readable; Valmari
      and Lehtinen (2008) extended it to partial machines. It runs
      inside every regular-expression compiler that builds a
      minimal DFA.
    </p>
  ),

  algoRole: (
    <p>
      Owns <strong>partition refinement through inverse
      transitions</strong>. Keep the states in blocks, starting
      from accepting and rejecting. Take a splitter (a block B and a
      letter a) from the queue, collect X, the states that step
      into B on a, and split every block that X straddles into the
      part inside X and the part outside. Stop when the queue is
      empty: the blocks are the states of the minimal machine. The
      referees agree on every instance: Moore&apos;s independent
      rounds reach the same partition, the quotient is
      language-equivalent to the original by product search, table
      filling finds every remaining pair distinguishable, and
      Brzozowski&apos;s double reversal lands on the same count. A
      bloated 12-state recognizer of binary multiples of three
      collapses to 3.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>smaller half rule</strong>. When a block
      splits, both pieces would be valid splitters, but only the
      smaller one is queued (unless the old block was already
      waiting, in which case both replace it). A state can therefore
      join a queued splitter at most log₂ n times per letter, and
      the total work is O(k n log n) through the inverse
      transitions. Measured: 20,105 transitions examined on 4,800
      states against a bound of 352,190, the ratio to k n log₂ n
      flat between 0.11 and 0.16 across five sizes; queueing both
      halves examined <strong>189,898</strong> on the same machine.
      On the chain machine Moore needs a round per state:
      2,095,104 transitions in 1,023 rounds where Hopcroft
      examines 2,048.
    </p>
  ),

  picture: (
    <p>
      Sorting a hall of people into groups that behave identically
      under questioning. Moore&apos;s method: every round, ask each
      person to report their current group and the group of each
      of their contacts; anyone with a new combination of answers
      gets a new badge; repeat until no badge changes. On a hall
      where the differences propagate down a long chain of
      acquaintances, that is one round per link, and each round
      questions everyone. Hopcroft&apos;s method keeps a queue of
      groups that changed. Take one, find only the people who point
      at it, and split just their groups. Then the rule that pays:
      of the two halves produced by a split, only the smaller half
      goes back into the queue. Anyone who lands in the queue again
      has been halved at least once, so nobody is questioned more
      than log₂ of the hall&apos;s size times per contact. The
      answers are the same badges Moore would issue; the questioning
      is a thousandth of the work on the deep hall.
    </p>
  ),

  steps: [
    <>
      <strong>Start:</strong> blocks {'{accepting, rejecting}'};
      queue the smaller one with every letter.
    </>,
    <>
      <strong>Pop a splitter (B, a):</strong> X = every state whose
      a-transition lands in B, read off the inverse edges.
    </>,
    <>
      <strong>Split:</strong> each block straddling X becomes
      inside and outside; states in X keep the block index, the rest
      get a new one.
    </>,
    <>
      <strong>Queue the smaller half:</strong> for every letter,
      unless the old block was already queued, in which case both
      pieces replace it.
    </>,
    <>
      <strong>Empty queue:</strong> the blocks are the minimal
      states: 4,800 became 3,200 in 20,105 examinations.
    </>,
  ],

  signals: [
    <>
      <strong>Large automata from constructions:</strong> regex
      compilers, lexers, model checkers: determinization leaves
      duplicates by the thousand, and n log n is the price you can
      afford.
    </>,
    <>
      <strong>Deep machines:</strong> long chains of distinguishing
      suffixes are where round-based refinement goes quadratic:
      1,023 rounds on 1,024 states here.
    </>,
    <>
      <strong>Canonical forms:</strong> the minimal DFA is unique,
      so minimizing is also how you test two regular languages for
      equality.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>Moore&apos;s rounds</strong>:
      re-sign every state by its block and its successors&apos;
      blocks until nothing changes. On random machines it converges
      in 4 rounds and costs only about three times Hopcroft (57,600
      vs 20,105 on 4,800 states), and it is ten lines long. Its bill
      is the round count: a chain of 1,024 states takes 1,023
      rounds and 2,095,104 examinations against 2,048.
    </>
  ),

  strength: (
    <>
      <strong>n log n with the referees lined up.</strong> Every
      minimized machine on this page matched Moore&apos;s partition
      exactly, accepted the original language under product search,
      had no mergeable pair left under table filling, and agreed
      with Brzozowski&apos;s count; the examination count stayed
      under 2 k n log₂ n on every size with a flat ratio; and on
      the chain that ruins round-based refinement, it examined 2,048
      transitions where Moore examined 2,095,104.
    </>
  ),
  weakness: (
    <>
      <strong>A subtle queue and no advantage on shallow
      machines.</strong> The smaller-half bookkeeping is the part
      people get wrong: Hopcroft&apos;s own proof was famously hard
      to read, and a queue that replaces a waiting block with both
      halves is easy to mishandle (the ablation that queues both
      halves is 9× the work). On random machines Moore converges in
      four rounds and is within a small factor; the log n only pays
      when the machine is deep. The input must be a complete DFA:
      NFAs need determinization first, and partial machines need
      Valmari-Lehtinen&apos;s variant.
    </>
  ),

  problem: 'Automaton determinization and minimization',
  problemSlug: 'automaton-minimization',
  rivals: [
    {
      name: 'Hopcroft × smaller half',
      isThisUnit: true,
      algoName: "Hopcroft's minimization",
      cost: 'O(k n log n)',
      wins: (
        <>
          <strong>The bound with receipts</strong>: 20,105
          examinations on 4,800 states, ratio to k n log₂ n flat at
          0.11 to 0.16, and 2,048 on the chain where rounds cost
          2,095,104.
        </>
      ),
      costs: (
        <>
          The queue-replacement subtlety, inverse transitions to
          build, and no win over Moore on shallow random machines.
        </>
      ),
      when: 'Any minimizer that must scale: regex engines, lexer generators, model checkers.',
    },
    {
      name: "Moore's minimization",
      cost: 'O(k n · rounds)',
      wins: (
        <>
          Ten lines, no inverse edges, no queue: rescan everything
          each round. On random machines, four rounds and 57,600
          examinations at 4,800 states.
        </>
      ),
      costs: (
        <>
          A round per distinguishing depth: 1,023 rounds and
          2,095,104 examinations on the 1,024-state chain, against
          2,048.
        </>
      ),
      when: 'Small or shallow machines, teaching, or a referee for the fast one (its role on this page).',
    },
    {
      name: 'Brzozowski minimization',
      cost: 'exponential worst case',
      wins: (
        <>
          Reverse, determinize, reverse, determinize: minimal by
          theorem, and it accepts an NFA as input with no separate
          minimization step.
        </>
      ),
      costs: (
        <>
          Two subset constructions that can blow up exponentially;
          this page runs it only on small machines, where it agrees
          on the count 20 times out of 20.
        </>
      ),
      when: 'NFA input, small machines, or when elegance beats a guarantee.',
    },
    {
      name: 'Subset construction',
      cost: 'O(2ⁿ) states possible',
      wins: (
        <>
          The live unit that produces the DFAs this page shrinks:
          determinization first, minimization after.
        </>
      ),
      costs: (
        <>
          It creates the redundancy; on its own it never removes
          any.
        </>
      ),
      when: 'Always before minimizing an NFA-derived machine; never instead of it.',
    },
  ],
  neverUse: {
    name: 'Table filling on a large automaton',
    why: (
      <>
        The textbook method marks distinguishable pairs of states
        until no new pair can be marked, and it is the referee for
        minimality on this page. As a minimizer it needs a table of
        every pair: n(n − 1)/2 entries, <strong>5,118,400 for the
        4,800-state machine</strong> and about five billion for a
        hundred thousand states, each revisited every round until a
        round marks nothing. The cost is not the constant, it is the
        square: the same machine Hopcroft minimizes in 20,105
        examinations needs millions of pair visits before the first
        merge, and a lexer generator faces machines a hundred times
        larger. Reach for the table to check a small result, never
        to compute a large one.
      </>
    ),
  },

  contest: {
    instance:
      'random 3-letter machines with half their states duplicated (every state reachable), 300 to 4,800 states, plus the chain machine that is already minimal; currency: transitions examined; referees: Moore’s partition, product-construction equivalence, table filling, Brzozowski’s count',
    columns: ['4,800 states', '1,024-state chain'],
    rows: [
      {
        method: 'Hopcroft, smaller half queued',
        isThisUnit: true,
        values: ['20,105', '2,048'],
        best: 0,
        verdict: 'under 2 k n log₂ n = 352,190; the ratio to k n log n flat at 0.11 to 0.16 across five sizes',
      },
      {
        method: 'Hopcroft, both halves queued',
        values: ['189,898', '-'],
        verdict: 'the same partition at 9.4x the examinations: the smaller half is the whole heuristic',
      },
      {
        method: 'Moore’s rounds',
        values: ['57,600', '2,095,104'],
        verdict: '4 rounds on the random machine; 1,023 rounds on the chain, one state proven per round',
      },
    ],
    source:
      'python solutions/hopcrofts_minimization_partition_refinement.py prints these tables and asserts: Moore’s partition identical on all five random instances; every quotient language-equivalent by product search; table filling finds every remaining pair distinguishable; Brzozowski’s count agrees on 20 small machines; Hopcroft’s examinations under 2 k n log₂ n with the ratio flat; queueing both halves never cheaper; Moore quadratic on the chain while Hopcroft stays near-linear; and the bloated remainder machine minimized to 3 states.',
  },

  figure: (
    <Figure
      id="fig-hopcroft-splitter"
      aspect="16 / 7"
      caption="A splitter is a block and a letter. The states whose a-transitions land in the splitter (blue ring) are collected through the inverse edges, and every block they straddle splits into the part inside and the part outside. Of the two pieces, only the smaller (amber) is queued, so a state re-enters the queue at most log₂ n times per letter: O(k n log n) total. Measured: 20,105 examinations on 4,800 states under a bound of 352,190; 189,898 when both halves are queued; Moore 57,600 in 4 rounds on the same machine and 2,095,104 in 1,023 rounds on the 1,024-state chain, where Hopcroft examines 2,048."
      cite={{
        text: 'J. Hopcroft, "An n log n algorithm for minimizing states in a finite automaton," in Theory of Machines and Computations, Academic Press, 1971. DOI 10.1016/B978-0-12-417750-5.50022-1. Moore 1956; Knuutila, TCS 250, 2001.',
        href: 'https://doi.org/10.1016/B978-0-12-417750-5.50022-1',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A splitter block, the states that lead into it, a straddling block splitting into a large and a small piece, and the small piece entering the queue">
        <rect x="380" y="60" width="150" height="70" rx="10" fill="rgba(240,185,75,0.18)" stroke="#f0b94b" strokeWidth="1.8" />
        <text x="392" y="82" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">splitter (B, a)</text>
        {[[410, 108], [445, 108], [480, 108], [512, 108]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="8" fill="#f0b94b" opacity="0.8" />
        ))}
        <rect x="60" y="60" width="240" height="70" rx="10" fill="rgba(93,162,255,0.10)" stroke="#5da2ff" strokeWidth="1.6" />
        <text x="72" y="82" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="11">a block straddling X</text>
        {[[90, 108], [120, 108], [150, 108], [180, 108], [210, 108], [240, 108], [270, 108]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="8" fill={i >= 5 ? 'rgba(93,162,255,0.35)' : 'rgba(154,165,189,0.25)'} stroke={i >= 5 ? '#5da2ff' : '#9aa5bd'} strokeWidth="1.6" />
        ))}
        <path d="M 246 100 C 300 60, 360 60, 404 100" fill="none" stroke="#5da2ff" strokeWidth="1.4" markerEnd="url(#a)" />
        <path d="M 276 100 C 320 50, 390 50, 440 100" fill="none" stroke="#5da2ff" strokeWidth="1.4" />
        <text x="300" y="52" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="10">a-transitions into B</text>
        <path d="M 180 140 L 180 168" stroke="#9aa5bd" strokeWidth="1.2" />
        <rect x="60" y="176" width="160" height="44" rx="8" fill="rgba(154,165,189,0.10)" stroke="#9aa5bd" strokeWidth="1.2" />
        <text x="70" y="202" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">outside X: 5 states, stays</text>
        <rect x="236" y="176" width="130" height="44" rx="8" fill="rgba(240,185,75,0.16)" stroke="#f0b94b" strokeWidth="1.6" />
        <text x="246" y="202" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">inside X: 2, QUEUED</text>
        <text x="60" y="250" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">a state re-enters the queue only inside a smaller piece: at most log₂ n times per letter</text>
        <text x="60" y="272" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">measured: 20,105 examinations on 4,800 states (bound 352,190) · both halves 189,898 · Moore 57,600 in 4 rounds; on the 1,024-chain 2,095,104 vs 2,048</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'hopcrofts_minimization_partition_refinement.py',
  Viz: HopcroftViz,
  narration,
};
