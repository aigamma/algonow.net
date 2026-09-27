import AutodiffViz from '../viz/AutodiffViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/automatic_differentiation_reverse_mode.py?raw';
import { narration } from './automatic-differentiation-reverse-mode.narration.js';

export const content = {
  given:
    'A program computes one number, a loss, from n parameters through thousands of elementary operations: a tanh network with 17, 501, or 5,401 weights on this page. Every partial derivative of the loss is needed, exactly, and often.',
  task: 'Automatic differentiation: every elementary operation knows its own derivative, so the chain rule is applied to the program itself. Reverse mode: run the program once forward, recording each operation and its local derivatives on a tape; then sweep the tape backwards, accumulating the adjoint (∂loss/∂node) of every node from the adjoints of the nodes that used it. One forward pass and one sweep give all n partials.',
  constraint:
    'Both modes match hand-derived gradients to 9 × 10⁻¹⁶ and each other to 3 × 10⁻¹⁶; central finite differences agree only to 7 × 10⁻¹¹, their own floor. Counted in elementary operations, the reverse sweep costs 2.87×, 2.96×, and 2.99× one evaluation of the loss at n = 17, 501, and 5,401: a constant, whatever n. Forward mode costs n evaluations (4,199 and 3,859,203 operations at n = 17 and 501; 460 million at 5,401, not run), finite differences 2n. The tape is the price: 288, 8,228, and 90,648 recorded nodes. And the direction can be wrong: for one input and 500 outputs, forward mode needs one pass of 1,500 operations where reverse mode needs 500 sweeps, 627,750.',

  origins: (
    <p>
      Wengert (1964) gave forward mode: carry a derivative alongside
      every value through the program, one input direction per pass.
      Seppo Linnainmaa&apos;s 1970 thesis (published 1976) contains the
      reverse accumulation, the adjoint sweep, as a way of analyzing
      rounding errors; Bert Speelpenning&apos;s 1980 thesis made it the
      way to get a gradient, and Baur and Strassen (1983) proved the
      cheap gradient principle: all partials of a function cost at most
      a small constant times the function, the <strong>2.9×</strong>{' '}
      measured on this page. Rumelhart, Hinton, and Williams (1986)
      rediscovered it as backpropagation. Andreas Griewank named the
      field in 1989 and wrote its book; ADIFOR, ADOL-C, and Tapenade
      differentiated Fortran and C; and the tape became the engine of
      Theano (2007), autograd (2015), PyTorch (2016), and JAX (2018),
      which is why every gradient in modern machine learning is a
      reverse sweep over a Wengert list.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>exact chain rule</strong>: each operation
      records its local derivatives (for c = a·b, ∂c/∂a = b and
      ∂c/∂b = a) as it computes its value; the derivative of the
      whole program is the sum over paths of products of local
      derivatives, which either sweep evaluates without ever writing
      it down. Measured: both modes match closed-form gradients to{' '}
      <strong>9 × 10⁻¹⁶</strong> and each other to 3 × 10⁻¹⁶ on
      a 501-parameter network, where central finite differences agree
      to 7 × 10⁻¹¹ and cannot do better, because their error is
      truncation plus cancellation, not rounding.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>direction of the sweep</strong>. Reverse
      mode seeds the output&apos;s adjoint with 1 and sweeps the tape
      backwards, so every node receives ∂loss/∂node from the nodes
      that used it: one sweep for all n inputs. Counted: <strong>2.87×,
      2.96×, 2.99×</strong> one loss evaluation at n = 17, 501, and
      5,401, where forward mode costs n evaluations (3,859,203
      operations at n = 501) and finite differences 2n. The price is
      the tape: 288, 8,228, 90,648 nodes kept until the sweep. And the
      rule flips with the shape of the problem: for one input and 500
      outputs, forward mode carries the derivative in one pass of 1,500
      operations, while reverse mode sweeps once per output, 627,750.
      Few outputs, many inputs: sweep backward. Many outputs, few
      inputs: sweep forward.
    </p>
  ),

  picture: (
    <p>
      A supply chain audited two ways. Every factory in the chain
      knows exactly how much a one-percent rise in each of its inputs
      moves its output: those are the local derivatives, and they are
      known the moment the factory runs. Forward mode asks: if ore
      costs one percent more, how does the price of the car change?
      Push that one perturbation forward through every factory to the
      end; then ask again about rubber, then about glass, one pass per
      input. Reverse mode asks the question from the other end: if the
      car sells for one percent more, how much is each part worth? Walk
      the chain backwards once, and every input gets its answer in the
      same walk. Same factories, same local numbers; the only choice is
      which end you start from, and that choice is the difference
      between n passes and one.
    </p>
  ),

  steps: [
    <>
      <strong>Forward:</strong> evaluate the program; each operation
      pushes (parents, local derivatives) onto the tape.
    </>,
    <>
      <strong>Seed:</strong> adjoint of the output = 1; all others 0.
    </>,
    <>
      <strong>Sweep:</strong> for each tape entry, newest first, add
      adjoint × local derivative into each parent&apos;s adjoint.
    </>,
    <>
      <strong>Read:</strong> the adjoints of the inputs are the
      gradient: all n from one sweep, 2.9× the evaluation.
    </>,
    <>
      <strong>Check:</strong> against closed forms (9 × 10⁻¹⁶),
      forward mode (3 × 10⁻¹⁶), finite differences (7 × 10⁻¹¹).
    </>,
  ],

  signals: [
    <>
      <strong>Many inputs, one output:</strong> a loss over thousands
      or billions of parameters; the gradient at a constant multiple
      of the loss.
    </>,
    <>
      <strong>The program is the model:</strong> loops, branches,
      simulators; anything the tape can record, the sweep can
      differentiate.
    </>,
    <>
      <strong>Exact derivatives required:</strong> finite differences
      stop at 10⁻¹¹ and cost 2n; the sweep gives 10⁻¹⁶ for 3.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>forward mode</strong>: the same
      exact chain rule, one input direction per pass. It matches
      reverse mode to 3 × 10⁻¹⁶ and costs n evaluations: 3,859,203
      operations against 22,789 at n = 501. Same answer, n times the
      work, no tape.
    </>
  ),

  strength: (
    <>
      <strong>The cheap gradient, measured.</strong> All n partials for
      2.87 to 2.99 times one evaluation at every n tried, exact to
      rounding (9 × 10⁻¹⁶), from a program rather than a formula:
      the reason a network with a billion parameters can be trained at
      all.
    </>
  ),
  weakness: (
    <>
      <strong>The tape, and the direction.</strong> Reverse mode keeps
      every intermediate until the sweep: 90,648 nodes for one loss on
      5,401 parameters, and gigabytes for a deep network, which
      checkpointing trades back for recomputation. It is the wrong
      mode for many outputs: 627,750 operations for a 500-output
      Jacobian column that forward mode gets in 1,500. And it needs
      differentiable operations: a sort or a lookup breaks the tape.
    </>
  ),

  problem: 'Gradient computation',
  problemSlug: 'automatic-differentiation',
  rivals: [
    {
      name: 'Automatic differentiation × reverse mode',
      isThisUnit: true,
      algoName: 'Automatic differentiation',
      cost: '~3 evaluations for all n partials',
      wins: (
        <>
          <strong>2.9× one evaluation for every n</strong>, exact to
          9 × 10⁻¹⁶, from arbitrary code.
        </>
      ),
      costs: (
        <>
          A tape of every intermediate (90,648 nodes at n = 5,401);
          wrong for many outputs.
        </>
      ),
      when: 'Gradients of a scalar loss over many parameters: training anything.',
    },
    {
      name: 'Forward-mode AD',
      algoName: 'Automatic differentiation',
      cost: 'n evaluations, no tape',
      wins: (
        <>
          The same exactness (3 × 10⁻¹⁶ against reverse) with
          constant memory, and one pass for a whole Jacobian column:
          1,500 operations for 500 outputs.
        </>
      ),
      costs: (
        <>
          n passes for n inputs: 3,859,203 operations at n = 501
          against 22,789.
        </>
      ),
      when: 'Few inputs and many outputs, Jacobian-vector products, or when memory is the constraint.',
    },
    {
      name: 'Numerical differentiation',
      cost: '2n evaluations',
      wins: (
        <>
          Nothing to instrument: any black box, any language, in five
          lines.
        </>
      ),
      costs: (
        <>
          7 × 10⁻¹¹ at best (truncation against cancellation), and
          7,718,406 operations at n = 501.
        </>
      ),
      when: 'Checking an implementation, or a black box you cannot open.',
    },
    {
      name: 'Backpropagation',
      cost: 'reverse mode on a layer stack',
      wins: (
        <>
          The live unit here: reverse mode specialized to a fixed
          stack of layers, with the tape implicit in the activations.
        </>
      ),
      costs: (
        <>
          Only the layer stack: a custom loss or a simulator needs the
          general tape.
        </>
      ),
      when: 'A fixed feed-forward architecture where the layers are the tape.',
    },
  ],
  neverUse: {
    name: 'Reverse mode for a tall Jacobian',
    why: (
      <>
        Reverse mode is a habit, and the habit fails when the shape
        flips. For a function with one input and 500 outputs, a
        Jacobian column, forward mode carries the derivative along in
        one pass: <strong>1,500 operations</strong>. Reverse mode
        sweeps the tape once per output: 500 sweeps,{' '}
        <strong>627,750 operations</strong>, four hundred times the
        work for the identical numbers (agreement 10⁻¹²). The rule
        is the ratio of outputs to inputs: sweep from the smaller side.
        Sensitivities of a whole simulation trajectory to one parameter
        are forward-mode work, however reflexively the framework
        offers you a backward pass.
      </>
    ),
  },

  contest: {
    instance:
      'the gradient of a tanh-network loss with n parameters, counted in elementary operations; referees: closed-form derivatives, central finite differences, and the two modes against each other',
    columns: ['forward eval', 'reverse mode (ratio)', 'forward mode / finite diff'],
    rows: [
      {
        method: 'n = 17',
        values: ['247', '709 (2.87×)', '4,199 / 8,398'],
        verdict: 'tape 288 nodes',
      },
      {
        method: 'n = 501',
        isThisUnit: true,
        values: ['7,703', '22,789 (2.96×)', '3,859,203 / 7,718,406'],
        best: 1,
        verdict: 'tape 8,228 nodes; agreement 3 × 10⁻¹⁶ and 7 × 10⁻¹¹',
      },
      {
        method: 'n = 5,401',
        values: ['85,223', '254,469 (2.99×)', 'not run (460 million)'],
        verdict: 'tape 90,648 nodes; the constant holds',
      },
      {
        method: 'one input, 500 outputs',
        values: ['1,500', '627,750 (500 sweeps)', '1,500 (one pass)'],
        verdict: 'the direction flips: forward mode wins 418×',
      },
    ],
    source:
      'python solutions/automatic_differentiation_reverse_mode.py prints these counts and asserts: both modes within 10⁻¹² of closed-form gradients; reverse within 10⁻⁶ of central differences and within 10⁻¹² of forward mode; reverse under 4× the evaluation at every n with the ratios within 1.0 of each other; forward mode above 0.8 n evaluations and finite differences at 2n; and the 500-output column under 3 evaluations in forward mode and over 50× that in reverse.',
  },

  figure: (
    <Figure
      id="fig-autodiff-tape"
      aspect="16 / 7"
      caption="One program, two sweeps. The tape records each operation with its local derivatives during the forward pass (values in blue). Reverse mode seeds the output with adjoint 1 and walks the tape backwards, each node handing adjoint × local derivative to its parents (amber), so both inputs receive their partials in one walk. Forward mode would instead push a unit perturbation of one input through the same graph, once per input. Counted on a 501-parameter network: reverse 22,789 operations (2.96× the evaluation), forward mode 3,859,203, finite differences 7,718,406."
      cite={{
        text: 'S. Linnainmaa, "Taylor expansion of the accumulated rounding error," BIT 16, 1976. DOI 10.1007/BF01931367. W. Baur, V. Strassen, "The complexity of partial derivatives," Theoretical Computer Science 22, 1983. A. Griewank, A. Walther, Evaluating Derivatives, 2nd ed., SIAM 2008.',
        href: 'https://doi.org/10.1007/BF01931367',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="A small computation graph with forward values in blue and reverse adjoints in amber, beside a bar chart of operation counts for reverse mode, forward mode, and finite differences">
        {[[40, 90, 'x'], [40, 190, 'y'], [150, 60, 'sin x'], [150, 130, 'exp y'], [150, 200, 'x·x'], [260, 95, 'a·b'], [260, 200, 'd / y'], [370, 148, 'c + e']].map(([x, y, label], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="11" fill={i >= 7 ? '#f0b94b' : '#5da2ff'} opacity="0.85" />
            <text x={x - 20} y={y - 16} fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="10">{label}</text>
          </g>
        ))}
        {[[40, 90, 150, 60], [40, 190, 150, 130], [40, 90, 150, 200], [150, 60, 260, 95], [150, 130, 260, 95], [150, 200, 260, 200], [40, 190, 260, 200], [260, 95, 370, 148], [260, 200, 370, 148]].map(([a, b, c, d], i) => (
          <line key={i} x1={a + 11} y1={b} x2={c - 11} y2={d} stroke="#f0b94b" strokeWidth="1.5" opacity="0.7" />
        ))}
        <text x="40" y="250" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="10">forward: values and local derivatives onto the tape</text>
        <text x="40" y="266" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">reverse: adjoints flow back along every edge, once</text>
        <text x="430" y="50" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="11">n = 501, operations</text>
        <rect x="430" y="66" width="8" height="14" fill="#9aa5bd" />
        <text x="446" y="78" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">evaluation 7,703</text>
        <rect x="430" y="90" width="24" height="14" fill="#5da2ff" />
        <text x="462" y="102" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="10">reverse 22,789 (2.96×)</text>
        <rect x="430" y="114" width="180" height="14" fill="#f0b94b" opacity="0.8" />
        <text x="430" y="142" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">forward mode 3,859,203 (n passes)</text>
        <rect x="430" y="152" width="200" height="14" fill="#e2606c" opacity="0.7" />
        <text x="430" y="180" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">finite differences 7,718,406 (2n)</text>
        <text x="430" y="212" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">agreement: modes 3e-16, differences 7e-11</text>
        <text x="430" y="240" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">one input, 500 outputs: forward 1,500,</text>
        <text x="430" y="256" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">reverse 627,750: sweep from the small side</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'automatic_differentiation_reverse_mode.py',
  Viz: AutodiffViz,
  narration,
};
