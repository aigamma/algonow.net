import ShuntingYardViz from '../viz/ShuntingYardViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/shunting_yard_operator_stack.py?raw';
import { narration } from './shunting-yard-operator-stack.narration.js';

export const content = {
  given:
    'An arithmetic expression as people write it: 2 + 3 * 4 ** 2 / 8, with precedence, left and right associativity, unary minus, parentheses, and function calls. Turn it into an order a stack machine can evaluate with no parentheses and no precedence table at all.',
  task: 'Shunting yard. The algorithm is one left-to-right pass over the tokens with an output queue (Dijkstra 1961, named for the railway yard where cars are shunted onto a siding and back out in a new order). The heuristic is the operator stack: operands go straight to the output; an operator waits on the stack and, before it is pushed, pops to the output every waiting operator that binds at least as tightly (strictly more tightly, for a right-associative one); a left parenthesis is pushed as a wall and a right parenthesis pops down to it. One pass, one stack, no recursion, no grammar: precedence is a number compared at push time, and the output is postfix.',
  constraint:
    'Measured on 5,000 random expressions over +, −, *, /, **, unary minus, parentheses, and max, min, abs (30,566 tokens, 6.1 per expression), evaluated in exact rationals against Python’s own eval of the same text: the shunting yard agrees on 5,000 of 5,000 with 1.86 units of work per token (a token visit or a stack operation; no recursion), recursive descent with one function per precedence level agrees on 5,000 with 3.36 (72,185 recursive calls), precedence climbing with binding powers agrees on 5,000 with 2.16. The operator stack never performs more than 1.50 operations per token on any expression, inside the linear-time bound of 2. Edge cases held: 2 ** 3 ** 2 = 512, −2 ** 2 = −4, 8 / 4 / 2 = 1, 8 − 3 − 2 = 3, nested calls with several arguments, and 5 of 5 malformed inputs rejected with a reason. A precedence-blind left-to-right evaluator gets 4,176 of 5,000 right overall, because most random expressions have one operator, but only 718 of the 1,534 that mix precedence levels (46.8%).',

  origins: (
    <p>
      Edsger Dijkstra described the algorithm in <strong>1961</strong>{' '}
      (Mathematisch Centrum report MR 34/61, &quot;Algol 60 translation&quot;)
      while writing the first ALGOL 60 compiler with Jaap Zonneveld, and
      named it for the switching yards of the railways: cars (operators)
      roll onto a siding (the stack) and back out in the order the
      translation needs. The output is reverse Polish notation, after
      Łukasiewicz&apos;s prefix notation of 1924 reversed; Hamblin (1957)
      proposed postfix for machine evaluation and Burroughs built the
      B5000 around it (1961); Hewlett-Packard&apos;s RPN calculators (1968
      onward) made it a keyboard. The method is the standard way to compile
      infix into a stack machine or an expression tree without a grammar,
      and the ancestor of operator-precedence parsing (Floyd 1963); Pratt
      parsing (1973, puzzle 148 on this site) and precedence climbing
      reach the same result recursively with binding powers.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>pass</strong>: tokens read once, left to right, each
      operand emitted the moment it is seen, so the output is a
      permutation of the operands and operators with the parentheses
      gone. The referee is Python itself: 5,000 expressions generated from
      a grammar, converted, evaluated by a stack machine in exact
      rationals, and compared with eval of the same text,{' '}
      <strong>5,000 of 5,000 equal</strong>; and on every conversion the
      output was checked to be exactly the input multiset minus
      parentheses, evaluable by a stack machine that never underflows and
      ends with one value.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>order</strong>: an operator waits on the stack until
      something of lower precedence arrives (or equal precedence from the
      left-associative side, or the end), which is exactly when every
      operator above it in binding has been emitted. Measured:{' '}
      <strong>1.86 units of work per token</strong> and never more than 1.50
      stack operations per token on any expression, against 3.36 for
      recursive descent and 2.16 for precedence climbing, which get the
      same 5,000 answers with 72,185 and 35,510 recursive calls. The
      stack is the recursion, flattened: 2 + 3 * 4 ** 2 / 8 becomes
      2 3 4 2 ** * 8 / + and evaluates to 8.
    </p>
  ),

  picture: (
    <p>
      A railway yard with one through track to the exit and one siding.
      Freight cars (numbers) roll straight through. Engines (operators)
      are shunted onto the siding, but an engine may not pull onto the
      siding in front of one that outranks it: the heavier engine rolls
      out to the exit first. A left parenthesis is a gate closed across
      the siding; a right parenthesis opens it and lets everything behind
      it roll out. When the last car is through, the siding empties. The
      order on the exit track is the order a machine with one pile can
      compute, and nobody ever looked back.
    </p>
  ),

  steps: [
    <>
      <strong>Operand:</strong> a number goes straight to the output queue;
      a function name is pushed on the stack.
    </>,
    <>
      <strong>Operator o₁:</strong> while the stack top o₂ is an operator
      with higher precedence, or equal precedence and o₁ left-associative,
      pop o₂ to the output; then push o₁. Unary minus is detected by
      position (start, after an operator, after &quot;(&quot; or &quot;,&quot;) and
      given its own precedence.
    </>,
    <>
      <strong>Parentheses:</strong> push &quot;(&quot;; on &quot;)&quot; pop to the
      output until &quot;(&quot;, discard it, and pop a function name if one sits
      beneath; a comma pops to &quot;(&quot; without removing it.
    </>,
    <>
      <strong>End:</strong> pop everything to the output; a &quot;(&quot; still on
      the stack is an unbalanced input, rejected.
    </>,
    <>
      <strong>Evaluate:</strong> read the postfix left to right with one
      value stack: push numbers, apply operators to the top two (or one,
      or n for a function); exactly one value remains.
    </>,
  ],

  signals: [
    <>
      <strong>Infix in, a machine order out:</strong> calculators,
      spreadsheet formulas, query filters, configuration expressions.
    </>,
    <>
      <strong>A precedence table, not a grammar:</strong> operators as data
      (symbol, precedence, associativity), added without touching code.
    </>,
    <>
      <strong>No recursion wanted:</strong> a fixed stack, no call depth,
      a streaming pass over tokens; deep nesting costs stack slots, not
      frames.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>recursive descent</strong>: one
      function per precedence level, calling the next. Exactly the same
      5,000 answers at 3.36 units of work per token and 72,185 calls, and
      a new function every time the table grows.
    </>
  ),

  strength: (
    <>
      <strong>One pass, one stack, operators as data.</strong> 5,000 of
      5,000 against Python at 1.86 work per token and at most 1.50 stack
      operations per token; right associativity, unary minus, and calls
      handled by the same loop; malformed input rejected with a reason.
    </>
  ),
  weakness: (
    <>
      <strong>Expressions only, and the unary problem.</strong> It produces
      postfix or a tree for operator grammars, not statements or
      declarations; unary operators need a positional rule or a separate
      token; error messages name a token, not a grammar rule; and
      precedence climbing reaches the same answers in 2.16 work per token
      with a loop that reads more like the grammar.
    </>
  ),

  problem: 'Lexical analysis',
  problemSlug: 'lexing',
  rivals: [
    {
      name: 'Shunting yard × Operator stack',
      isThisUnit: true,
      algoName: 'Shunting yard',
      cost: 'one pass; one stack',
      wins: (
        <>
          <strong>1.86 work per token, no recursion</strong>; 5,000 of 5,000
          exact; operators as table rows.
        </>
      ),
      costs: (
        <>
          Expressions only; unary operators by position.
        </>
      ),
      when: 'Infix to postfix or to a tree with a precedence table and no recursion budget.',
    },
    {
      name: 'Pratt parsing',
      algoName: 'Pratt parsing',
      cost: 'recursive; binding powers per token',
      wins: (
        <>
          The same table-driven idea, recursive, extended to prefix,
          postfix, mixfix, and statements; the parser behind many
          languages.
        </>
      ),
      costs: (
        <>
          Call depth equals nesting; 2.16 work per token in the
          precedence-climbing form measured here.
        </>
      ),
      when: 'A whole language, not just arithmetic; see puzzle 148.',
    },
    {
      name: 'Recursive descent parsing',
      algoName: 'Recursive descent parsing',
      cost: 'one function per grammar rule',
      wins: (
        <>
          Reads like the grammar; the best error messages; 5,000 of 5,000
          exact.
        </>
      ),
      costs: (
        <>
          3.36 work per token and 72,185 calls on the suite; a function per
          precedence level, rewritten when the table changes.
        </>
      ),
      when: 'Hand-written compilers where clarity and diagnostics matter more than the table.',
    },
    {
      name: 'Operator-precedence parsing',
      algoName: 'Operator-precedence parsing',
      cost: 'a precedence relation table',
      wins: (
        <>
          Floyd&apos;s generalization: any operator grammar, bottom-up,
          with the same stack.
        </>
      ),
      costs: (
        <>
          A relation table to construct; cannot handle every grammar.
        </>
      ),
      when: 'Operator grammars beyond arithmetic that still fit a precedence relation.',
    },
  ],
  neverUse: {
    name: 'Left-to-right evaluation that ignores precedence',
    why: (
      <>
        Treat every operator as equal and left-associative, honoring only
        parentheses. On the 5,000 random expressions it gets{' '}
        <strong>4,176 right</strong>, which looks respectable only because
        3,180 of them have at most one operator; on the 1,534 that mix
        precedence levels it is right on 718, under half, and 2 + 3 * 4
        becomes 20. Every pocket calculator that computed this way taught a
        generation to type parentheses it did not need. The fix costs one
        stack and one integer per operator.
      </>
    ),
  },

  contest: {
    instance:
      '5,000 random infix expressions over +, −, *, /, **, unary minus, parentheses, and max, min, abs, depth 1 to 5 (30,566 tokens), evaluated in exact rationals; referee: Python’s eval of the same text; one currency: token visits plus stack operations plus recursive calls, per token',
    columns: ['agree with Python', 'token visits', 'stack ops', 'recursive calls', 'work per token'],
    rows: [
      {
        method: 'shunting yard (operator stack)',
        isThisUnit: true,
        values: ['5,000 / 5,000', '30,566', '26,436', '0', '1.86'],
        best: 4,
        verdict: 'one pass, no recursion',
      },
      {
        method: 'precedence climbing (binding powers)',
        values: ['5,000 / 5,000', '30,566', '0', '35,510', '2.16'],
        verdict: 'the recursive twin',
      },
      {
        method: 'recursive descent (one function per level)',
        values: ['5,000 / 5,000', '30,566', '0', '72,185', '3.36'],
        verdict: 'the baseline: clearest, costliest',
      },
      {
        method: 'left to right, precedence ignored',
        values: ['4,176 / 5,000 (718 of 1,534 mixed)', '24,831', '0', '0', '0.81'],
        verdict: 'cheap and wrong where it matters',
      },
    ],
    source:
      'python solutions/shunting_yard_operator_stack.py prints this table and asserts: shunting yard, recursive descent, and precedence climbing equal to Python’s exact value on all 5,000 expressions; every postfix output a permutation of the input’s operands and operators with parentheses removed; the stack machine never underflowing and ending with one value; at most 2 stack operations per token on every expression; the edge cases 2 ** 3 ** 2 = 512, −2 ** 2 = −4, (−2) ** 2 = 4, 8 / 4 / 2 = 1, 8 − 3 − 2 = 3, and six more, equal to Python; 5 of 5 malformed inputs rejected; and the precedence-blind evaluator below 5,000 overall and below 60% on the expressions that mix precedence levels.',
  },

  figure: (
    <Figure
      id="fig-shunting-yard"
      aspect="16 / 7"
      caption="The pass over 2 + 3 * 4 ** 2 / 8, one column per token: the output queue grows along the bottom, the operator stack along the top. The + waits while * and ** (which bind tighter) arrive and leave; ** pops before / because / binds less tightly than **; the equal-precedence * pops before / because they are left-associative; at the end the stack drains. Output: 2 3 4 2 ** * 8 / +, which a one-stack machine evaluates to 8."
      cite={{
        text: 'E. W. Dijkstra, "Algol 60 translation: an Algol 60 translator for the X1 and making a translator for Algol 60," Mathematisch Centrum report MR 34/61, 1961. R. W. Floyd, "Syntactic analysis and operator precedence," JACM 10(3), 1963, DOI 10.1145/321172.321179.',
        href: 'https://doi.org/10.1145/321172.321179',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Nine columns showing the operator stack and the output queue after each token of the expression 2 plus 3 times 4 to the power 2 over 8">
        {(() => {
          const steps = [
            ['2', [], ['2']],
            ['+', ['+'], ['2']],
            ['3', ['+'], ['2', '3']],
            ['*', ['+', '*'], ['2', '3']],
            ['4', ['+', '*'], ['2', '3', '4']],
            ['**', ['+', '*', '**'], ['2', '3', '4']],
            ['2', ['+', '*', '**'], ['2', '3', '4', '2']],
            ['/', ['+', '/'], ['2', '3', '4', '2', '**', '*']],
            ['8', ['+', '/'], ['2', '3', '4', '2', '**', '*', '8']],
            ['end', [], ['2', '3', '4', '2', '**', '*', '8', '/', '+']],
          ];
          const colW = 62;
          const x0 = 16;
          return (
            <g>
              <text x={x0} y="20" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">token read, then the operator stack (top at the top) and the output queue so far</text>
              {steps.map(([tok, stack, out], i) => {
                const x = x0 + i * colW;
                return (
                  <g key={i}>
                    <rect x={x} y="30" width={colW - 6} height="22" fill={/^\d/.test(tok) ? '#5da2ff' : tok === 'end' ? '#9aa5bd' : '#f0b94b'} fillOpacity="0.9" />
                    <text x={x + 6} y="46" fill="#0b0d12" fontFamily="ui-monospace, monospace" fontSize="11" fontWeight="700">{tok}</text>
                    {stack.map((s, k) => (
                      <g key={k}>
                        <rect x={x} y={120 - (k + 1) * 20} width={colW - 6} height="18" fill="#f0b94b" fillOpacity="0.35" stroke="#f0b94b" />
                        <text x={x + 6} y={120 - (k + 1) * 20 + 13} fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="10">{s}</text>
                      </g>
                    ))}
                    {out.map((o, k) => (
                      <text key={k} x={x + 4} y={150 + k * 13} fill={/^\d/.test(o) ? '#5da2ff' : '#f0b94b'} fontFamily="ui-monospace, monospace" fontSize="10">{o}</text>
                    ))}
                  </g>
                );
              })}
              <text x={x0} y="134" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">stack above this line, output queue below</text>
              <line x1={x0} y1="138" x2={x0 + 10 * colW} y2="138" stroke="#9aa5bd" strokeOpacity="0.5" />
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'shunting_yard_operator_stack.py',
  Viz: ShuntingYardViz,
  narration,
};
