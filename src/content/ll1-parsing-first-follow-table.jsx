import Ll1ParsingViz from '../viz/Ll1ParsingViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/ll1_parsing_first_follow_table.py?raw';
import { narration } from './ll1-parsing-first-follow-table.narration.js';

export const content = {
  given:
    'A context-free grammar and a stream of tokens. Decide whether the stream is a sentence of the grammar and build its parse tree, reading each token once, with no backtracking and no guessing.',
  task: 'LL(1) parsing. The algorithm is the predictive parser: a stack holding the symbols still to be matched, a one-token lookahead, and a rule that says, for every nonterminal on top of the stack and every lookahead token, which production to expand. The heuristic is the first-follow table that supplies that rule: compute, as least fixpoints, which nonterminals can vanish (nullable), which tokens can begin each nonterminal (FIRST), and which tokens can follow it (FOLLOW); then enter production A → α under every token in FIRST(α), and, when α can vanish, under every token in FOLLOW(A). A cell with two entries is a conflict and the grammar is not LL(1); a table with none drives the parse in one table lookup per expansion.',
  constraint:
    'On the textbook expression grammar (E → T E′, E′ → + T E′ | ε, T → F T′, T′ → * F T′ | ε, F → ( E ) | id) the computed sets equal the book’s: nullable {E′, T′}, FIRST and FOLLOW cell for cell, 13 table cells, 0 conflicts, reached in 2, 4, and 3 fixpoint passes. 1,500 generated sentences (17,800 tokens, longest 41) all parse and every tree re-yields its string; a hand-written recursive descent parser agrees with 37,184 procedure calls, exactly the 37,184 table lookups, and a Pratt parser builds the same operator tree for every one. Of 1,500 corruptions (a token deleted, inserted, or swapped) 1,248 are rejected, an Earley recognizer agrees on all 1,500, and every error position equals the length of the longest viable prefix. Work: 5.58 stack operations per token plus 9, every parse within 16 of that line. The left-recursive grammar E → E + T | T has 4 FIRST/FIRST conflicts; fed to the parser anyway it loops on 300 of 300 inputs or rejects 252. 0.2 s.',

  origins: (
    <p>
      Philip Lewis and Richard Stearns introduced LL(k) grammars in{' '}
      <strong>1968</strong> (&quot;Syntax-Directed Transduction,&quot; JACM
      15), and with Daniel Rosenkrantz proved in 1970 that the deterministic
      top-down languages are exactly the LL(k) ones. Donald Knuth&apos;s
      &quot;Top-down syntax analysis&quot; (Acta Informatica 1, 1971) gave
      the theory its standard form, and the FIRST/FOLLOW construction of the
      parse table became the opening chapter of every compiler course
      through Aho and Ullman&apos;s books (1972, 1977) and the Dragon Book
      (section 4.4). Niklaus Wirth&apos;s Pascal compilers (1970) showed the
      same sets guiding a hand-written recursive descent parser, one
      procedure per nonterminal; Terence Parr&apos;s ANTLR (LL(*), 2011)
      extended the lookahead to make the method practical for real
      languages; and Stephen Johnson&apos;s yacc (1975) planted the rival
      LALR camp, which accepts left recursion the LL(1) table cannot. The
      dangling else, a FIRST/FOLLOW conflict, is the one conflict every
      language designer meets by name.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>stack discipline and the guarantee</strong>. Pop a
      terminal and it must match the lookahead; pop a nonterminal and
      expand it by the table, pushing the production right to left; pop the
      end marker on an exhausted input and accept. Each step consumes a
      token or performs one expansion, so the work is linear: measured{' '}
      <strong>5.58 stack operations per token plus 9</strong> across 1,500
      sentences, every parse within 16 operations of that line, and the
      37,184 expansions equal the 37,184 procedure calls of recursive
      descent one for one. An LL(1) parser also has the correct-prefix
      property: on all 1,248 rejected corruptions the error position equals
      the longest viable prefix that an Earley chart can extend.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>table</strong>. Three least fixpoints, nullable,
      FIRST, and FOLLOW (2, 4, and 3 passes here), fill 13 cells for five
      nonterminals and six lookaheads with no conflicts, matching the
      textbook sets exactly. The same construction is the grammar&apos;s
      diagnosis: the left-recursive expression grammar gets{' '}
      <strong>4 FIRST/FIRST conflicts</strong> (E and T on id and on the
      open parenthesis), S → a b | a c gets 1, the dangling else gets 1
      FIRST/FOLLOW conflict on (S′, else). The fix is a grammar transformation,
      left-recursion elimination and left factoring, after which the
      transformed grammar agrees with Earley on the original on 1,200
      strings both ways.
    </p>
  ),

  picture: (
    <p>
      A clerk at a counter with a stack of forms to fill and a window
      showing only the next word of the customer&apos;s request. The clerk
      never asks the customer to repeat anything and never puts a form back:
      a lookup card says, for the form on top and the word in the window,
      which smaller forms replace it. If the card has one answer for every
      pair, the clerk is never wrong and never slow. If some pair has two
      answers, the card is useless at that moment, and no cleverness at the
      counter fixes it; the forms have to be redesigned so the next word
      always decides.
    </p>
  ),

  steps: [
    <>
      <strong>Nullable:</strong> iterate until stable: A is nullable if some
      production A → α has every symbol of α nullable (ε counts).
    </>,
    <>
      <strong>FIRST:</strong> for each production, add the FIRST of the
      right side: terminals as met, nonterminals&apos; FIRST sets, stopping
      at the first symbol that is not nullable. Iterate to a fixpoint.
    </>,
    <>
      <strong>FOLLOW:</strong> $ follows the start symbol; for A → α B β add
      FIRST(β) to FOLLOW(B), and FOLLOW(A) too when β is nullable. Iterate.
    </>,
    <>
      <strong>Table:</strong> enter A → α under each token of FIRST(α), and
      under each token of FOLLOW(A) when α is nullable; any cell with two
      entries is a conflict.
    </>,
    <>
      <strong>Parse:</strong> stack [$, S]; pop; a terminal must match the
      lookahead; a nonterminal is replaced by its table entry, pushed right
      to left; a missing entry is a syntax error at this token.
    </>,
  ],

  signals: [
    <>
      <strong>A grammar you control:</strong> you can left-factor and
      remove left recursion, and the table will tell you when you are done.
    </>,
    <>
      <strong>One token decides:</strong> after each prefix the next token
      determines the production; the conflict count is zero.
    </>,
    <>
      <strong>Errors matter early:</strong> the parser stops at the first
      token that no sentence could continue, with the stack as the
      explanation.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>hand-written recursive descent</strong>{' '}
      for the same grammar: one procedure per nonterminal, the same FIRST
      sets as if statements. It agreed on all 3,000 strings with 2.09 calls
      per token, which is the table parser with the table compiled into code.
    </>
  ),

  strength: (
    <>
      <strong>Linear, predictive, and self-checking.</strong> 5.58 stack
      operations per token, one lookup per expansion, acceptance equal to
      Earley on 3,000 strings, errors at the exact viable-prefix boundary,
      and a table whose conflict count certifies the grammar before a single
      token is parsed.
    </>
  ),
  weakness: (
    <>
      <strong>The grammar must be made LL(1) first.</strong> Left recursion
      is fatal (4 conflicts, then a loop on 300 of 300 inputs or 252
      rejections), common prefixes must be factored, and the transformed
      grammar&apos;s trees lean the wrong way: E → T E′ hands back a
      right-leaning chain that has to be folded to recover left-associative
      operators, which the Pratt comparison on this page does explicitly.
    </>
  ),

  problem: 'Context-free parsing',
  problemSlug: 'context-free-parsing',
  rivals: [
    {
      name: 'LL(1) parsing × First-follow table',
      isThisUnit: true,
      algoName: 'LL(1) parsing',
      cost: 'O(n) stack operations, one table lookup per expansion',
      wins: (
        <>
          <strong>0 conflicts, 1,500 of 1,500 sentences</strong>, 5.58 ops
          per token, error position equal to the viable prefix on all 1,248
          rejections; the table is a proof the grammar is predictive.
        </>
      ),
      costs: (
        <>
          No left recursion, no common prefixes: 4 conflicts on E → E + T,
          1 on the dangling else; trees need folding for associativity.
        </>
      ),
      when: 'A grammar you can shape, a linear-time parser you want to understand line by line, and errors that must land on the first bad token.',
    },
    {
      name: 'Recursive descent parsing',
      algoName: 'Recursive descent parsing',
      cost: 'O(n), one procedure call per expansion',
      wins: (
        <>
          Agreed on all 3,000 strings; 37,184 calls equal the table&apos;s
          37,184 expansions; semantic actions sit in plain code next to the
          grammar.
        </>
      ),
      costs: (
        <>
          The FIRST sets live in the programmer&apos;s head: a wrong if
          condition is a silent conflict, and left recursion is a stack
          overflow.
        </>
      ),
      when: 'Hand-written compilers and language servers where readable code beats a generated table.',
    },
    {
      name: 'LALR parsing × Merged lookahead states',
      algoName: 'LALR parsing',
      cost: 'O(n) shift-reduce steps over a generated automaton',
      wins: (
        <>
          Accepts the left-recursive E → E + T as written, so operator
          grammars need no transformation and trees come out
          left-associative.
        </>
      ),
      costs: (
        <>
          Shift-reduce and reduce-reduce conflicts are harder to read than a
          table cell; the automaton is opaque; errors surface at a reduce,
          sometimes past the first bad token.
        </>
      ),
      when: 'Grammar-driven generators (yacc, bison) for languages whose natural grammar is left-recursive.',
    },
    {
      name: 'Pratt parsing × Binding-power dispatch',
      algoName: 'Pratt parsing',
      cost: 'O(n), one loop per operator',
      wins: (
        <>
          Built the same operator tree as the folded LL(1) tree on all 1,500
          expressions, with precedence and associativity as two numbers per
          operator instead of a grammar level per precedence.
        </>
      ),
      costs: (
        <>
          Only for operator expressions; statements, declarations, and the
          dangling else still need a grammar.
        </>
      ),
      when: 'The expression sublanguage of a hand-written parser.',
    },
  ],
  neverUse: {
    name: 'The left-recursive grammar fed straight to the LL(1) parser',
    why: (
      <>
        E → E + T | T looks like the natural grammar, and its table has{' '}
        <strong>4 FIRST/FIRST conflicts</strong>: E and T each have two
        productions that begin with id and with the open parenthesis. Pick
        the recursive production in each conflicted cell and the parser
        expands E to E + T to E + T + T without consuming a token: a loop
        on <strong>300 of 300</strong> valid inputs (stopped by a step cap).
        Pick the other production and it never sees an operator:{' '}
        <strong>252 of 300</strong> valid inputs rejected, every one that
        contains + or *. The conflict count said so before any input was
        read. Eliminate the left recursion and left-factor, or use an LR
        parser.
      </>
    ),
  },

  contest: {
    instance:
      'the textbook expression grammar over {id, +, *, (, )}; 1,500 generated sentences (17,800 tokens) and 1,500 one-token corruptions; Earley as the referee for acceptance and for the longest viable prefix; counts from one seeded run',
    columns: ['conflicts', 'valid accepted', 'corruptions rejected', 'work per token'],
    rows: [
      {
        method: 'LL(1) table, transformed grammar',
        isThisUnit: true,
        values: ['0 in 13 cells', '1,500 of 1,500', '1,248 (= Earley)', '5.58 stack ops'],
        verdict: 'linear, predictive, errors at the viable prefix',
      },
      {
        method: 'recursive descent, hand-written',
        values: ['0 (in the programmer’s head)', '1,500 of 1,500', '1,248', '2.09 procedure calls'],
        verdict: 'the same parser compiled into code',
      },
      {
        method: 'Earley (any grammar, the referee)',
        values: ['none possible', '1,500 of 1,500', '1,248', '4.4 chart items, 3× the time'],
        verdict: 'general, slower, no table to read',
      },
      {
        method: 'LL(1) table on E → E + T | T',
        values: ['4 FIRST/FIRST', 'loops on 300 of 300, or 48 of 300', '·', 'unbounded'],
        verdict: 'the conflicts were the warning',
      },
    ],
    source:
      'python solutions/ll1_parsing_first_follow_table.py prints these counts and asserts: nullable, FIRST, and FOLLOW equal the textbook sets and the table has 0 conflicts; every generated sentence parses and its tree re-yields the string; recursive descent accepts every valid string and agrees on every corruption; the folded LL(1) tree equals the Pratt tree on every sentence; Earley agrees on every corruption and every LL(1) error position equals the longest viable prefix; stack operations stay within 20 of the linear fit and under 15 per token; the left-recursive grammar has exactly 4 FIRST/FIRST conflicts, agrees with the transformed grammar on 1,200 strings, loops on every input under one resolution and rejects every operator input under the other; the dangling else has exactly 1 FIRST/FOLLOW conflict and the else binds to the innermost if at depths 1 through 6; S → a b | a c has 1 conflict and its left-factored form 0.',
  },

  figure: (
    <Figure
      id="fig-ll1-table"
      aspect="16 / 7"
      caption="Left: nullable, FIRST, and FOLLOW for the textbook expression grammar, computed as fixpoints in 2, 4, and 3 passes and equal to the book's sets. Right: the LL(1) parse table they induce: 13 filled cells (blue, labeled by production) out of 30, no cell holding two entries; the ε rows (E′ and T′) are filled under their FOLLOW tokens. A second entry anywhere is a conflict, and the grammar is not LL(1)."
      cite={{
        text: 'P. M. Lewis II and R. E. Stearns, "Syntax-Directed Transduction," Journal of the ACM 15(3), 1968, DOI 10.1145/321466.321477. D. E. Knuth, "Top-down syntax analysis," Acta Informatica 1, 1971, DOI 10.1007/BF00289517. A. V. Aho, M. S. Lam, R. Sethi, J. D. Ullman, Compilers: Principles, Techniques, and Tools, 2nd ed., section 4.4.',
        href: 'https://doi.org/10.1145/321466.321477',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="FIRST and FOLLOW sets of the expression grammar beside the LL(1) parse table they induce, thirteen filled cells and no conflicts">
        {(() => {
          const nts = ['E', "E'", 'T', "T'", 'F'];
          const sets = [
            ['no', '( id', ') $'],
            ['yes', '+', ') $'],
            ['no', '( id', '+ ) $'],
            ['yes', '*', '+ ) $'],
            ['no', '( id', '+ * ) $'],
          ];
          const toks = ['id', '+', '*', '(', ')', '$'];
          const cells = {
            E: { id: 'T E′', '(': 'T E′' },
            "E'": { '+': '+ T E′', ')': 'ε', $: 'ε' },
            T: { id: 'F T′', '(': 'F T′' },
            "T'": { '*': '* F T′', '+': 'ε', ')': 'ε', $: 'ε' },
            F: { '(': '( E )', id: 'id' },
          };
          const mono = 'ui-monospace, monospace';
          const gx = 330;
          const gy = 60;
          const cw = 50;
          const ch = 36;
          return (
            <g fontFamily={mono}>
              <text x="20" y="24" fill="#9aa5bd" fontSize="10">nullable · FIRST · FOLLOW (fixpoints: 2, 4, 3 passes)</text>
              {['', 'nullable', 'FIRST', 'FOLLOW'].map((h, i) => (
                <text key={h || 'blank'} x={20 + i * 70} y="48" fill="#9aa5bd" fontSize="9">{h}</text>
              ))}
              {nts.map((A, r) => (
                <g key={A}>
                  <text x="20" y={70 + r * 26} fill="#5da2ff" fontSize="12">{A.replace("'", '′')}</text>
                  {sets[r].map((v, i) => (
                    <text key={i} x={90 + i * 70} y={70 + r * 26} fill={i === 0 ? '#f0b94b' : '#e9edf6'} fontSize="11">{v}</text>
                  ))}
                </g>
              ))}
              <text x="20" y="226" fill="#9aa5bd" fontSize="10">E → T E′ · E′ → + T E′ | ε · T → F T′</text>
              <text x="20" y="242" fill="#9aa5bd" fontSize="10">T′ → * F T′ | ε · F → ( E ) | id</text>
              <text x="20" y="266" fill="#62d98a" fontSize="10">0 conflicts: every cell has at most one production</text>
              <text x={gx} y="24" fill="#9aa5bd" fontSize="10">LL(1) table M[A, a]: 13 of 30 cells filled</text>
              {toks.map((t, c) => (
                <text key={t} x={gx + 40 + c * cw + 18} y={gy - 8} fill="#f0b94b" fontSize="11">{t}</text>
              ))}
              {nts.map((A, r) => (
                <g key={A}>
                  <text x={gx} y={gy + r * ch + 22} fill="#5da2ff" fontSize="12">{A.replace("'", '′')}</text>
                  {toks.map((t, c) => {
                    const v = cells[A][t];
                    return (
                      <g key={t}>
                        <rect x={gx + 40 + c * cw} y={gy + r * ch} width={cw - 2} height={ch - 2} fill={v ? '#5da2ff' : '#9aa5bd'} fillOpacity={v ? 0.28 : 0.08} stroke="#9aa5bd" strokeOpacity="0.4" />
                        {v && <text x={gx + 40 + c * cw + 4} y={gy + r * ch + 22} fill="#e9edf6" fontSize="9">{v}</text>}
                      </g>
                    );
                  })}
                </g>
              ))}
              <text x={gx} y="262" fill="#9aa5bd" fontSize="10">ε rows filled under FOLLOW; two entries in one cell</text>
              <text x={gx} y="276" fill="#e2606c" fontSize="10">would mean the grammar is not LL(1)</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'll1_parsing_first_follow_table.py',
  Viz: Ll1ParsingViz,
  narration,
};
