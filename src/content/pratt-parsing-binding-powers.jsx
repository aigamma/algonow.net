import PrattViz from '../viz/PrattViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/pratt_parsing_binding_powers.py?raw';
import { narration } from './pratt-parsing-binding-powers.narration.js';

export const content = {
  given:
    'Expressions to parse: precedence, associativity, prefix minus, postfix factorial, parentheses: and the classic architecture builds a tower of one function per precedence level, which the lone token "1" must descend in full.',
  task: 'One loop and a table. Every token knows what it means at the start of an expression (nud) and what it means after a left operand (led, with a binding power). Parse a prefix; then, while the next operator binds tighter than the caller’s floor, let it take the left side and recurse at its own power.',
  constraint:
    'The referee is Python’s own ast module: 500 fuzzed expressions tree-identical node for node (^ as **, both right-associative) with values agreeing in exact Fractions. The tower toll is measured (3.5× at five levels, 13.5× at the loose end of a C-like fifteen), the flat equal-precedence parser is counted wrong on 219 of 500, and extensibility is demonstrated: one table row seats a new operator between + and *.',

  origins: (
    <p>
      Vaughan Pratt presented &quot;Top Down Operator
      Precedence&quot; at the very first POPL,{' '}
      <strong>1973</strong>: and then, by his own later account,
      watched it be ignored for decades while grammar-centric
      parser generators ruled. The revival came from working
      programmers: Douglas Crockford built JSLint&apos;s
      JavaScript parser on it and wrote the essay that
      reintroduced the technique; Bob Nystrom&apos;s Crafting
      Interpreters made it the standard classroom path; and
      matklad&apos;s &quot;Simple but Powerful Pratt
      Parsing&quot; documented the version inside
      rust-analyzer, which parses the Rust you type, as you type
      it. The pattern in production is nearly universal now:
      recursive descent for statements, Pratt for expressions:
      the hybrid this page&apos;s rivals bench explains.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>loop and the two denotations</strong>: a
      token beginning an expression plays its nud (a number
      names itself; minus parses a prefix operand at its own
      power; an open paren restarts the floor at zero); a token
      after a left operand plays its led (an infix takes the
      left tree and recurses for the right; a postfix like !
      just wraps). Correctness is refereed by CPython itself:
      500 fuzzed expressions parsed to trees{' '}
      <strong>node-identical to the ast module&apos;s</strong>,
      values agreeing in exact rational arithmetic, and the
      canon pinned case by case: 1-2-3 left, 2^3^2 = 512 right,
      -2^2 = -4.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>table</strong>: precedence and
      associativity as data. Each operator carries a binding
      power; the loop&apos;s one comparison: does the next
      operator bind tighter than my floor?: replaces the entire
      function tower, and right-associativity is nothing but
      recursing at power-minus-one (the ^ row). The dividend is
      measured: ~one parser call per token regardless of table
      size, against the tower&apos;s per-level toll (3.5× at
      five levels, 13.5× when operands sit at the loose end of a
      fifteen-level tower: C&apos;s a || b || c position). And
      extension is a row, not a refactor: &apos;@&apos; seated
      between + and * in one line, asserted.
    </p>
  ),

  picture: (
    <p>
      A courtroom for operators. Every operator walks in with a
      number on its badge: its binding power: and the judge (the
      loop) runs one rule: the operand on the table belongs to
      whichever neighbor shows the bigger badge. Parsing
      &quot;1 + 2 * 3&quot;, the 2 looks left at +&apos;s badge
      (10) and right at *&apos;s (20): the star wins custody.
      Associativity is a tiebreak written on the badge itself:
      left-associative operators yield to an equal badge on
      their left; right-associative ^ outranks its own kind by
      one, so 2^3^2 nests rightward. Compare the old
      bureaucracy: a separate courtroom per precedence level,
      and every case: even the trivial &quot;1&quot;: must be
      escorted through all fifteen floors before anyone may rule.
      Pratt&apos;s courthouse is one room, one judge, one badge
      check per token: and hiring a new operator means printing
      one badge, not building a floor.
    </p>
  ),

  steps: [
    <>
      <strong>Nud:</strong> the token starts an expression: a
      number names itself, prefix minus parses at its own
      power, parens reset the floor.
    </>,
    <>
      <strong>Led loop:</strong> while the next operator&apos;s
      badge beats the caller&apos;s floor, it takes the left
      tree and recurses for its right side.
    </>,
    <>
      <strong>Floors carry precedence:</strong> the recursion
      passes the operator&apos;s own power down: tighter
      operators complete before looser ones resume.
    </>,
    <>
      <strong>Associativity is one unit:</strong> ^ recurses at
      31/30 (right); + at 10/11 (left): the whole distinction is
      one subtraction in the table.
    </>,
    <>
      <strong>Extend by row:</strong> a new operator is a table
      entry: &apos;@&apos; seated between + and * in one line,
      asserted parsing correctly.
    </>,
  ],

  signals: [
    <>
      <strong>An expression grammar in a hand-written
      parser:</strong> interpreters, compilers, query languages,
      calculators: the exact spot the descent-for-statements /
      Pratt-for-expressions hybrid was made for.
    </>,
    <>
      <strong>The operator set will grow:</strong> user-defined
      operators, evolving DSLs: a table row per operator beats a
      grammar refactor per operator.
    </>,
    <>
      <strong>Mixed fixity:</strong> prefix, infix, postfix,
      ternary, calls, and indexing all ride the same two
      denotations: the machinery does not multiply with the
      syntax.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>layered recursive
      descent</strong>: one function per precedence level:
      transparent, teachable, and everywhere. Its bill is
      structural: every operand descends from its
      operator&apos;s level to primary, so the tower is walked
      constantly: 14,011 calls against Pratt&apos;s 4,000 on the
      same 4,000-operand chain, and 54,011 when the operands sit
      at the loose end of a fifteen-level tower.
    </>
  ),

  strength: (
    <>
      <strong>One loop, any grammar of operators, refereed by
      CPython.</strong> 500 fuzzed expressions tree-identical
      to the ast module with exact-Fraction value agreement;
      the canon (left, right, precedence, unary) pinned case by
      case; ~one call per token measured against tower tolls of
      3.5× and 13.5×; postfix riding the same loop; and a new
      operator seated with one table row. This is why
      rust-analyzer and JSLint parse expressions this way: the
      technique scales with the operator table, not against it.
    </>
  ),
  weakness: (
    <>
      <strong>An expression specialist with invisible
      structure.</strong> Pratt&apos;s loop owns operators;
      statements, declarations, and block structure still want
      plain recursive descent (every production system is the
      hybrid). The grammar now lives implicitly in a number
      table: two operators one unit apart encode a fact no BNF
      states, which reviewers must learn to read (matklad&apos;s
      essay exists precisely because the technique reads as
      magic first). And table-driven power says nothing about
      error recovery or ambiguity diagnosis: LALR generators
      verify a grammar has no conflicts; a binding-power table
      verifies nothing about itself.
    </>
  ),

  problem: 'Context-free parsing',
  problemSlug: 'context-free-parsing',
  rivals: [
    {
      name: 'Pratt × binding powers',
      isThisUnit: true,
      algoName: 'Pratt parsing',
      cost: '~1 call per token',
      wins: (
        <>
          <strong>Operators as data</strong>: any fixity in one
          loop, extension by table row, refereed here against
          CPython&apos;s own parser 500/500.
        </>
      ),
      costs: (
        <>
          Expressions only; the grammar hides in numbers; no
          self-verification of the table.
        </>
      ),
      when: 'Hand-written parsers with real expression grammars: the production idiom.',
    },
    {
      name: 'Recursive descent parsing',
      cost: 'a call per level per operand',
      wins: (
        <>
          The transparent classic: the code IS the grammar, and
          for statements and structure it remains the right
          tool: every production parser is descent outside
          expressions.
        </>
      ),
      costs: (
        <>
          The tower toll, measured: 3.5× at five levels, 13.5×
          at the loose end of fifteen: and an operator added
          means a function inserted.
        </>
      ),
      when: 'Statements, declarations, blocks: and expressions too, until the operator table grows.',
    },
    {
      name: 'Shunting yard',
      cost: 'O(n), two stacks',
      wins: (
        <>
          Dijkstra&apos;s classic: precedence via an operator
          stack, streaming infix to postfix with no recursion at
          all: the calculator&apos;s and bytecode
          emitter&apos;s friend.
        </>
      ),
      costs: (
        <>
          Emits postfix, not a tree; prefix/postfix mixes and
          ternaries contort it: the stack knows less than the
          recursion does.
        </>
      ),
      when: 'Straight-line evaluation or RPN output where no AST is wanted.',
    },
    {
      name: 'LALR parsing',
      cost: 'generated tables',
      wins: (
        <>
          The generator country (yacc, bison): whole-language
          grammars checked for conflicts mechanically: the
          grammar is verified before it ever parses.
        </>
      ),
      costs: (
        <>
          Tooling, table opacity, and famously baroque error
          recovery: many teams fled generators for hand-written
          hybrids for exactly this.
        </>
      ),
      when: 'Full language grammars where mechanical conflict-checking earns its tooling.',
    },
  ],
  neverUse: {
    name: 'The flat equal-precedence parser',
    why: (
      <>
        The parser people write before learning any of this:
        scan left to right, apply each operator as it arrives,
        all operators equal. It is short, it is fast, and this
        page counted what it is: <strong>wrong on 219 of 500
        fuzzed expressions</strong>: every input where
        multiplication should have bound tighter than addition,
        or a right-associative power should have nested
        rightward, silently mis-grouped: 1 + 2 * 3 computed as 9.
        Not slower: wrong, with no error message, on the most
        ordinary arithmetic in the world. It survives in real
        code wherever expressions &quot;seemed simple&quot;:
        config mini-languages, spreadsheet-formula knockoffs,
        homegrown query filters: and it is exactly one
        binding-power table away from being correct. The whole
        unit is that table.
      </>
    ),
  },

  contest: {
    instance:
      'parsing a 4,000-operand expression chain; one currency: parser function calls; referee: identical trees from all parsers, and Python’s own ast module on 500 fuzzed expressions',
    columns: ['calls'],
    rows: [
      {
        method: 'Layered descent, 5 levels',
        values: ['14,011'],
        verdict: 'one call per level per operand: the tower toll (3.5×)',
      },
      {
        method: 'Descent, loose end of 15 levels',
        values: ['54,011'],
        verdict: 'the C a || b || c position: every operand descends the whole tower (13.5×)',
      },
      {
        method: 'Pratt, any table size',
        isThisUnit: true,
        values: ['4,000'],
        best: 0,
        verdict: '~one call per token: the table is data, not depth',
      },
    ],
    source:
      'python solutions/pratt_parsing_binding_powers.py prints this table and asserts: trees node-identical to Python’s ast on 500 fuzzed expressions (^ as **, both right-associative) with values agreeing in exact Fractions (a size-guarded evaluator: the first draft hung on nested ^ over /); the canon pinned case by case (1-2-3 left, 2^3^2 = 512, 1+2*3 = 7, -2^2 = -4); all three parsers producing identical trees on the chain with the tower tolls 3.5× and 13.5× (the 15-level model corrected to place operands at the loose end after a first draft measured the appended-above version at an honest 3.5×); the flat parser wrong on 219/500; and the one-row ‘@’ extension parsing as specified.',
  },

  figure: (
    <Figure
      id="fig-pratt-badges"
      aspect="16 / 7"
      caption="One loop, and badges instead of floors. Each operator carries a binding power; parsing is: play the token's nud, then, while the next operator's badge beats the caller's floor, let it take the left tree and recurse at its own power. Right-associativity is one unit on the badge (^ recurses at 30 against its own 31). Measured against the function-per-level tower: ~one call per token vs 3.5× (five levels) and 13.5× (operands at the loose end of fifteen): and refereed by CPython's own ast on 500 fuzzed expressions, node for node. The flat equal-precedence shortcut: wrong on 219 of 500."
      cite={{
        text: 'V. R. Pratt, "Top down operator precedence," POPL 1973. DOI 10.1145/512927.512931. Revival: Crockford (JSLint); Nystrom, Crafting Interpreters; matklad (rust-analyzer).',
        href: 'https://doi.org/10.1145/512927.512931',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Tokens with binding-power badges being grouped by a single loop, versus a tower of precedence functions">
        {[['1', null], ['+', 10], ['2', null], ['*', 20], ['3', null], ['^', 31], ['2', null]].map(([tk, bp], i) => (
          <g key={i}>
            <rect x={40 + i * 62} y={44} width={48} height={34} fill={bp ? 'rgba(240,185,75,0.15)' : 'rgba(93,162,255,0.12)'} stroke={bp ? '#f0b94b' : '#5da2ff'} strokeWidth="1.4" rx="6" />
            <text x={64 + i * 62} y={65} fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="14" textAnchor="middle">{tk}</text>
            {bp && <text x={64 + i * 62} y={94} fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10" textAnchor="middle">bp {bp}</text>}
          </g>
        ))}
        <text x="40" y="124" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">the judge’s one rule: the operand goes to the bigger badge · ^ is right-assoc: recurses at 30 vs its own 31</text>
        <text x="40" y="152" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">result: 1 + (2 * (3 ^ 2)) : node-identical to Python’s ast, 500/500 fuzzed</text>
        <text x="40" y="186" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">the tower toll, measured: descent walks a function per level per operand:</text>
        <text x="40" y="204" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">5 levels: 14,011 calls (3.5×) · loose end of 15: 54,011 (13.5×) · pratt: 4,000 (~1/token)</text>
        <text x="40" y="232" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">extension = one row: '@': (15, 16) seats a new operator between + and *: asserted</text>
        <text x="40" y="258" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">the flat equal-precedence shortcut: 219 of 500 expressions silently mis-grouped: 1+2*3 = 9</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'pratt_parsing_binding_powers.py',
  Viz: PrattViz,
  narration,
};
