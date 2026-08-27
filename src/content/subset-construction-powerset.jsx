import SubsetViz from '../viz/SubsetViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/subset_construction_powerset.py?raw';
import { narration } from './subset-construction-powerset.narration.js';

export const content = {
  given:
    'A nondeterministic automaton: a machine allowed to guess: and input that must be scanned with no guessing at all.',
  task: 'Build the equivalent deterministic machine: each SET of NFA states becomes one DFA state, so the frontier of live guesses gets a name and one table lookup per character.',
  constraint:
    'Language equality is exhausted: on 250 random epsilon-heavy NFAs, the DFA must agree with direct frontier simulation on every one of the 2,047 strings of length ≤ 10 (511,750 checks) plus 20,000 longer strings. The 2ⁿ lower bound is measured, then Moore-verified minimal: not one of the 1,024 states at n = 10 is redundant.',

  origins: (
    <p>
      Michael Rabin and Dana Scott, <strong>1959</strong>: the paper
      that invented nondeterminism as a proof device and, in the
      same stroke, tamed it: any machine that guesses can be
      simulated by one that tracks <em>every guess at once</em>,
      because the set of live states is itself a state. The IBM
      Journal paper earned them the <strong>1976 Turing Award</strong>.
      The construction became the engine room of lexing and regex:
      Thompson&apos;s 1968 compiler feeds it, grep descends from it,
      and RE2 and Rust&apos;s regex crate stake their no-pathology
      guarantee on exactly the machinery this page measures:
      determinize (lazily), and matching is one lookup per
      character, forever.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>construction</strong>: the DFA&apos;s start
      state is the ε-closure of the NFA&apos;s start; the transition
      from subset S on symbol c applies the NFA step to every member
      of S, unions the results, and closes under ε again; S accepts
      iff any member does. Each claim is refereed by exhaustion:
      511,750 short-string checks, verdicts identical to frontier
      simulation. The subset IS the induction: the DFA state after
      reading w is <em>exactly</em> the set of NFA states reachable
      on w: nothing forgotten, nothing invented.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>laziness</strong>: of the 2ⁿ subsets that
      could exist, materialize only those the start state actually
      reaches. Measured on sparse 16-state NFAs: a mean of{' '}
      <strong>12 subsets built of 65,536 possible</strong>: 5,592×
      never constructed. That thrift is why real engines determinize
      on the fly, caching DFA states as input arrives. The honest
      other edge is measured too: the family &quot;n-th symbol from
      the end is a&quot; reaches <em>all</em> 2ⁿ subsets, and Moore
      refinement proves every one necessary: laziness helps when
      reachability is kind, and the lower bound stands when it is
      not.
    </p>
  ),

  picture: (
    <p>
      A detective follows a suspect who might have taken any of
      several routes. The amateur runs one route, backtracks at
      each dead end, runs the next: on a bad map, that revisits the
      same corners exponentially often. The professional stands at
      a whiteboard and tracks <em>the set of everywhere the suspect
      could be right now</em>. Each new clue updates the whole set
      at once: some possibilities die, new ones open: and the
      board&apos;s state after each clue is a single, definite
      thing. The set of maybes is itself a certainty. That is the
      whole construction: nondeterminism outside, one deterministic
      board state inside: and the price, sometimes, is that the
      board must be able to show 2ⁿ different sets.
    </p>
  ),

  steps: [
    <>
      <strong>Close:</strong> the DFA start is the ε-closure of the
      NFA start: everything reachable for free.
    </>,
    <>
      <strong>Step a subset:</strong> apply the NFA transition to
      every member, union, ε-close: that union is the next DFA
      state.
    </>,
    <>
      <strong>Accept by membership:</strong> a subset accepts iff it
      contains an NFA accept state.
    </>,
    <>
      <strong>Build lazily:</strong> BFS from the start subset:
      only reachable subsets exist (12 of 65,536 on the sparse
      client: 5,592× never built).
    </>,
    <>
      <strong>Respect the bound:</strong> some languages need all
      2ⁿ: measured here and Moore-verified minimal: determinism has
      a price list.
    </>,
  ],

  signals: [
    <>
      <strong>Scan-heavy, guess-shaped problems:</strong> lexers,
      regex engines, protocol matchers: build once, then one lookup
      per character forever after.
    </>,
    <>
      <strong>Predictable latency is a requirement:</strong> the
      DFA&apos;s per-character cost is constant by construction:
      the property RE2 sells as immunity to pathological patterns.
    </>,
    <>
      <strong>The frontier is the state:</strong> tracking a set of
      possibilities as one value: the same move as belief states in
      planning and the Viterbi trellis: name the uncertainty and it
      becomes data.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>NFA simulation</strong>: carry
      the frontier set through the input directly: this page&apos;s
      referee. It is excellent (linear time, no blowup ever): but
      pays set-union work per character (1.39 states touched per
      character on the scanner client vs the DFA&apos;s exactly
      1.0) and re-pays it on every run: determinization is the
      decision to pay once.
    </>
  ),

  strength: (
    <>
      <strong>Exhaustively refereed, with both edges of the theorem
      measured.</strong> 511,750 short-string checks plus 20,000
      long across 250 ε-heavy NFAs, all identical to frontier
      simulation; the 2ⁿ blowup family hitting exactly 2ⁿ reachable
      states for n = 3..14 with Moore refinement proving minimality
      to n = 10; the laziness dividend counted (12 of 65,536); and
      a 4-keyword scanner matching Python&apos;s substring search
      on all 5,000 strings at exactly one transition per character.
    </>
  ),
  weakness: (
    <>
      <strong>The blowup is real, and tables have mass.</strong>{' '}
      When the language genuinely needs history (this page&apos;s
      n-from-the-end family), 2ⁿ states are not pessimism: they
      are the measured, minimal answer, and eager determinization
      of such patterns is memory suicide: engines cap the DFA cache
      and fall back to simulation. Alphabet size multiplies every
      state&apos;s row. ε-closure bugs are the classic
      implementation trap (the referee here exercises ε chains
      hard). And determinization buys speed, not expressiveness:
      anything beyond regular (nesting, counting) needs a stack,
      not a bigger subset.
    </>
  ),

  problem: 'Regex construction',
  problemSlug: 'regex-construction',
  rivals: [
    {
      name: 'Subset × powerset',
      isThisUnit: true,
      algoName: 'Subset construction',
      cost: 'O(2ⁿ) worst, lazy',
      wins: (
        <>
          <strong>One lookup per character, forever</strong>: the
          frontier named, the guessing gone: and lazily built, only
          reachable subsets exist.
        </>
      ),
      costs: (
        <>
          2ⁿ when the language demands it (measured, minimal), and
          real table memory when alphabets widen.
        </>
      ),
      when: 'The standard bridge from any NFA to production scanning speed.',
    },
    {
      name: "Thompson's construction",
      algoName: "Thompson's construction",
      cost: 'O(r) states',
      wins: (
        <>
          The upstream stage: regex to NFA in linear size, purely
          syntax-directed: one box per operator: the 1968 pipeline
          this page&apos;s stage completes.
        </>
      ),
      costs: (
        <>
          Its output still guesses: ε-rich and frontier-heavy:
          useless for scanning until simulated or determinized.
        </>
      ),
      when: 'Always, as the front half: regex → Thompson → subset construction → (Hopcroft) → table.',
    },
    {
      name: "Hopcroft's minimization",
      algoName: "Hopcroft's minimization",
      cost: 'O(n log n)',
      wins: (
        <>
          The downstream pass: partition refinement collapses
          equivalent DFA states: this page&apos;s Moore check is
          its slower sibling: shrinks real lexer tables hard.
        </>
      ),
      costs: (
        <>
          Cannot beat the lower bound: on the blowup family it
          returns exactly 2ⁿ back: minimization is not magic.
        </>
      ),
      when: 'After determinizing anything you will ship: pay n log n once, scan smaller forever.',
    },
    {
      name: 'Brzozowski derivatives',
      algoName: 'Brzozowski derivatives',
      cost: 'O(r) per character',
      wins: (
        <>
          Skip automata entirely: differentiate the regex itself by
          each input character: elegant, allocation-light, and the
          derivative states memoize into the same minimal DFA.
        </>
      ),
      costs: (
        <>
          Per-character rewriting cost without memoization, and the
          same 2ⁿ wall with it: the theorem does not care about the
          spelling.
        </>
      ),
      when: 'Functional settings and extended operators (complement, intersection) that NFAs handle awkwardly.',
    },
  ],
  neverUse: {
    name: 'Backtracking regex on untrusted input',
    why: (
      <>
        The amateur detective, shipped to production. Backtracking
        engines (classic PCRE, Java&apos;s, Python&apos;s) explore
        one guess at a time and revisit exponentially many paths on
        pathological patterns: (a|a)*b against a run of a&apos;s
        re-treads 2ⁿ routes the frontier would have merged into
        one subset. This is not theoretical: catastrophic
        backtracking took Cloudflare down globally in 2019 and has
        a name, ReDoS, in every vulnerability taxonomy. The subset
        idea is the immunity: RE2 and Rust&apos;s regex exist
        precisely to guarantee linear scanning by construction.
        Feeding attacker-controlled strings to a backtracking
        matcher is handing strangers the exponent: the frontier
        merges guesses, the backtracker relives them.
      </>
    ),
  },

  contest: {
    instance:
      'NFA to DFA; referee: direct frontier simulation, matched on every one of 2,047 short strings × 250 ε-heavy NFAs (511,750 checks) plus 20,000 long strings',
    columns: ['states', 'work/char'],
    rows: [
      {
        method: 'NFA, simulated',
        values: ['n', '1.39'],
        verdict: 'the referee: the whole frontier advances every character, every run',
      },
      {
        method: 'Backtracking search',
        values: ['n', '2ⁿ worst'],
        verdict: 'one guess at a time: ReDoS territory on adversarial input',
      },
      {
        method: 'DFA, subset-built',
        isThisUnit: true,
        values: ['≤ 2ⁿ', '1.00'],
        best: 1,
        verdict: 'the frontier got a name: one lookup per character, forever',
      },
    ],
    source:
      "python solutions/subset_construction_powerset.py prints this table and asserts: DFA verdicts equal to frontier simulation on all 2,047 strings of length ≤ 10 for each of 250 random ε-heavy NFAs (511,750 checks) and on 20,000 strings of length ≤ 40; the blowup family reaching exactly 2ⁿ subsets for n = 3..14 with Moore partition refinement confirming all 2ⁿ necessary through n = 10; the laziness dividend on sparse 16-state NFAs (mean 12 subsets of 65,536 possible, above 100× asserted, 5,592× measured); and the 4-keyword scanner agreeing with Python substring search on all 5,000 strings at exactly 1.0 transitions per character against the frontier's 1.39.",
  },

  figure: (
    <Figure
      id="fig-subset-blowup"
      aspect="16 / 7"
      caption="Both edges of the theorem, measured. Left: the lazy dividend: sparse 16-state NFAs could have 65,536 subsets; construction from the start state touches a mean of 12: determinize what is reachable, not what is imaginable. Right: the lower bound: for 'the n-th symbol from the end is a', every one of the 2ⁿ subsets is reachable AND necessary: Moore refinement collapses nothing. The same construction, two fates: which one you get is a property of the language, not the code: knowing the family before determinizing is the strategic skill."
      cite={{
        text: 'Rabin & Scott, "Finite Automata and Their Decision Problems", IBM Journal of Research and Development 3(2), 1959: nondeterminism invented and tamed in one paper: the 1976 Turing Award.',
        href: 'https://doi.org/10.1147/rd.32.0114',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Two panels: sparse NFAs reach 12 of 65,536 subsets; the blowup family needs all 2 to the n">
        <text x="40" y="34" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">the kind case: sparse 16-state NFAs</text>
        <rect x="40" y="50" width="240" height="130" fill="rgba(154,165,189,0.08)" stroke="#9aa5bd" strokeWidth="1" />
        {[...Array(24)].map((_, i) => (
          <circle key={i} cx={58 + (i % 8) * 29} cy={70 + Math.floor(i / 8) * 26} r={5} fill="rgba(154,165,189,0.2)" />
        ))}
        {[0, 1, 9, 10, 11, 19].map((i, k) => (
          <circle key={k} cx={58 + (i % 8) * 29} cy={70 + Math.floor(i / 8) * 26} r={6.5} fill="rgba(98,217,138,0.6)" stroke="#62d98a" strokeWidth="1.5" />
        ))}
        <text x="40" y="200" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">mean 12 subsets built of 65,536 possible</text>
        <text x="40" y="218" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">5,592× never constructed: laziness pays</text>
        <text x="360" y="34" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">the hard case: n-th from the end is a</text>
        {[3, 4, 5, 6, 7, 8].map((n, i) => {
          const h = (2 ** n / 256) * 150;
          return (
            <g key={i}>
              <rect x={360 + i * 42} y={180 - h} width={26} height={h} fill="rgba(226,96,108,0.45)" stroke="#e2606c" strokeWidth="1.4" />
              <text x={362 + i * 42} y={172 - h} fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="9">{2 ** n}</text>
              <text x={364 + i * 42} y={196} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">n={n}</text>
            </g>
          );
        })}
        <text x="360" y="218" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">exactly 2ⁿ reachable, Moore-verified minimal</text>
        <text x="40" y="258" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">referee: 511,750 exhaustive short-string checks + 20,000 long: DFA == frontier simulation, no exceptions</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'subset_construction_powerset.py',
  Viz: SubsetViz,
  narration,
};
