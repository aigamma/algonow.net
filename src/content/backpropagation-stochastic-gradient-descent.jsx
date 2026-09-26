import BackpropViz from '../viz/BackpropViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/backpropagation_stochastic_gradient_descent.py?raw';
import { narration } from './backpropagation-stochastic-gradient-descent.narration.js';

export const content = {
  given:
    'Two rings of labeled points, an inner disk and an outer ring, that no straight line can separate, and a small network of 337 weights that must learn to tell them apart.',
  task: 'One forward pass computes every activation; one backward pass applies the chain rule layer by layer and yields the gradient of the loss with respect to every weight. Then spend that gradient a minibatch at a time: update after 16 random points rather than after all 300.',
  constraint:
    'Every backpropagated partial derivative is checked against a central finite difference of the loss on six random networks: worst relative error 2.7 × 10⁻⁶ over 59 parameters each. The trained network reaches 100% held-out accuracy where a linear model with the same trainer stalls at 59%. On the same gradient code, minibatch SGD reaches training loss 0.08 in 6,000 gradient evaluations where full-batch descent needs 112,200. The cost law is counted: a backward pass is 2.9× a forward pass; finite differences would cost 233× the backward pass.',

  origins: (
    <p>
      The chain rule applied backwards through a computation has
      been rediscovered many times: Seppo Linnainmaa&apos;s 1970
      master&apos;s thesis gave reverse-mode differentiation, Paul
      Werbos applied it to neural networks in 1974, and Rumelhart,
      Hinton, and Williams made it famous in <strong>1986</strong>{' '}
      (Learning representations by back-propagating errors, Nature),
      showing that hidden layers could learn internal features. The
      stochastic half is older still: Robbins and Monro&apos;s 1951
      stochastic approximation, and Rosenblatt&apos;s perceptron
      updating one example at a time. Bottou&apos;s work in the 1990s
      and 2000s argued that for large data the noisy minibatch
      gradient is not a compromise but the better algorithm, and
      LeCun&apos;s Efficient BackProp (1998) codified the practice.
      Every network trained since, from LeNet to the largest language
      models, is this pair with more layers and a momentum term.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>gradient, exactly</strong>. Forward: each
      layer computes z = Wa + b and an activation (tanh in the hidden
      layers, a sigmoid at the output). Backward: the output error
      p − y is the last layer&apos;s delta; each earlier delta is the
      next layer&apos;s deltas pulled back through its weights and
      scaled by the activation&apos;s derivative; every weight&apos;s
      partial is its delta times its input. The referee is the
      definition of a derivative: central finite differences on every
      one of 59 parameters of six random networks agree to a{' '}
      <strong>worst relative error of 2.7 × 10⁻⁶</strong>, the floor
      of double precision at step 10⁻⁵. Counted: the backward pass
      is 2.9× the forward pass; finite differences for the same
      gradient are 233× the backward pass, two forward passes per
      parameter.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>schedule of spending</strong>. Full-batch
      descent computes the exact gradient over all 300 points and
      takes one step; minibatch SGD averages 16 random points and
      steps, nineteen times per pass. The noisy gradient is a worse
      estimate and a far better use of the budget: to reach training
      loss 0.08 from the same initial weights, full batch needed{' '}
      <strong>112,200 gradient evaluations</strong> over 374 passes;
      minibatches of 16 needed 6,000 over 20 passes; minibatches of 4
      needed 1,800 over 6, all reaching 100% held-out accuracy. The
      hidden layer is what learns the rings: a linear model under the
      same trainer stalls at 59%. And the dial has an edge: a learning
      rate of 8.0 diverges in two passes, reported, not hidden.
    </p>
  ),

  picture: (
    <p>
      A blindfolded hiker descending a valley in fog, with a guide who
      can measure the slope. Backpropagation is how the guide measures
      it: not by stepping in each of 337 directions and feeling which
      is downhill (that is finite differences, and it takes two probes
      per direction), but by reading the terrain once forwards and
      once backwards through the chain of causes, so every
      direction&apos;s slope comes out of one round trip. The
      stochastic part is how often to step. Surveying the whole
      valley before each step gives a perfect slope and one step an
      hour. Glancing at a patch of sixteen rocks gives a rough slope
      and a step every three minutes, and the rough steps average out
      while the hiker is already far down the valley. The fog also
      hides ledges: step too far at once and you fall off, which the
      loss reports by climbing instead of falling.
    </p>
  ),

  steps: [
    <>
      <strong>Forward:</strong> z = Wa + b per layer, tanh inside,
      sigmoid out; loss = cross-entropy.
    </>,
    <>
      <strong>Output delta:</strong> p − y, the sigmoid and
      cross-entropy derivatives cancelling to that one line.
    </>,
    <>
      <strong>Backward:</strong> delta_prev = (Wᵀ delta) ⊙ tanh′;
      ∂L/∂W = delta aᵀ, ∂L/∂b = delta.
    </>,
    <>
      <strong>Minibatch step:</strong> average 16 gradients,
      W ← W − η g; nineteen steps per pass over the data.
    </>,
    <>
      <strong>Check:</strong> finite differences agree to 2.7 ×
      10⁻⁶; held-out accuracy 100%; the linear model 59%.
    </>,
  ],

  signals: [
    <>
      <strong>A differentiable model with many parameters:</strong>{' '}
      337 here, billions in production: one backward pass prices
      every one of them at once.
    </>,
    <>
      <strong>More data than fits in a step:</strong> the minibatch
      is the only way to train on data you cannot hold, and it wins
      even when you can (6,000 vs 112,200).
    </>,
    <>
      <strong>Nonlinear structure:</strong> rings, spirals, images:
      when the linear model stalls at 59%, the hidden layer is the
      point.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>full-batch gradient
      descent</strong>: the exact gradient over every point, one step
      per pass. It converges (374 passes to loss 0.08, 100% held-out
      accuracy) and it is the reference for what the minibatch is
      approximating. Its bill is the pass: 112,200 backward passes
      against 6,000, because one perfect step per 300 points loses
      to nineteen rough ones.
    </>
  ),

  strength: (
    <>
      <strong>Exact gradients at three forward passes each, spent
      where they count.</strong> Every partial verified to 2.7 ×
      10⁻⁶ against finite differences; the backward pass at 2.9×
      a forward pass where finite differences cost 233× that; and
      the minibatch schedule reaching the target loss in 5% of the
      gradient evaluations full batch needed, with the rings
      separated at 100% held out.
    </>
  ),
  weakness: (
    <>
      <strong>A dial with a cliff, and no guarantee of the
      minimum.</strong> The learning rate that converges at 0.1
      diverges at 8.0 in two passes; the loss is non-convex and SGD
      finds a good basin, not provably the best. The gradient check is
      the only thing standing between a working trainer and a subtly
      wrong one, which is why it runs first. Batches of 4 were even
      cheaper here but the noise grows as batches shrink, and real
      trainers add momentum and adaptive rates (the Adam and momentum
      entries next to this one) to tame it.
    </>
  ),

  problem: 'Neural network training',
  problemSlug: 'neural-network-training',
  rivals: [
    {
      name: 'Backpropagation × SGD',
      isThisUnit: true,
      algoName: 'Backpropagation',
      cost: '~3 forward passes per gradient',
      wins: (
        <>
          <strong>Every partial verified</strong> (2.7 × 10⁻⁶),
          6,000 gradient evaluations to the target where full batch
          needs 112,200, 100% held out.
        </>
      ),
      costs: (
        <>
          A learning rate with a cliff (8.0 diverges), gradient noise,
          and no guarantee beyond a good basin.
        </>
      ),
      when: 'Training any differentiable model on more data than a single step should see.',
    },
    {
      name: 'Gradient descent',
      cost: 'exact full-batch steps',
      wins: (
        <>
          The live unit here with Polyak momentum: the exact gradient,
          clean convergence theory, and the reference the minibatch
          is approximating.
        </>
      ),
      costs: (
        <>
          One step per pass: 374 passes and 112,200 gradient
          evaluations to the loss SGD reached in 20 passes.
        </>
      ),
      when: 'Small data, convex losses, or when the theory must be exact.',
    },
    {
      name: 'Automatic differentiation',
      cost: 'a tape, any program',
      wins: (
        <>
          Backpropagation for arbitrary code: record the operations,
          replay the chain rule in reverse; the engine inside every
          deep learning framework.
        </>
      ),
      costs: (
        <>
          The tape costs memory proportional to the computation, and
          it is the same gradient this page derives by hand.
        </>
      ),
      when: 'Anything beyond a fixed layer stack: custom losses, physics simulators, models that change shape.',
    },
    {
      name: 'Perceptron',
      cost: 'one line per update',
      wins: (
        <>
          Rosenblatt&apos;s 1958 rule, the ancestor of the minibatch
          step: mistake-driven, provably convergent when a
          separating line exists.
        </>
      ),
      costs: (
        <>
          No hidden layer, so no rings: the linear model on this page
          stalled at 59%.
        </>
      ),
      when: 'Linearly separable data, or the ten-line baseline before anything deeper.',
    },
  ],
  neverUse: {
    name: 'Finite differences as the gradient of a network',
    why: (
      <>
        It is the referee on this page and the first thing a careful
        engineer writes, and it is the last thing that should train
        anything. The gradient of 337 parameters by central
        differences costs two forward passes per parameter:{' '}
        <strong>204,896 multiply-adds against 880</strong> for one
        backward pass, 233× the price, for a gradient that is also
        slightly wrong (the 2.7 × 10⁻⁶ the check tolerates). At a
        billion parameters the ratio is two billion forward passes
        per step. Backpropagation exists because the chain rule can
        be run once, backwards, for all parameters at once; the
        difference quotient exists to prove that it was run
        correctly.
      </>
    ),
  },

  contest: {
    instance:
      'two rings (300 training points, 100 held out), a 2-16-16-1 tanh network with 337 parameters, cross-entropy loss, learning rate 0.1, target training loss 0.08; currency: gradient evaluations (backward passes) to reach the target',
    columns: ['gradient evals', 'passes', 'held-out accuracy'],
    rows: [
      {
        method: 'Full-batch gradient descent',
        values: ['112,200', '374', '1.000'],
        verdict: 'one exact step per pass: many passes',
      },
      {
        method: 'Minibatch SGD, 16',
        isThisUnit: true,
        values: ['6,000', '20', '1.000'],
        best: 0,
        verdict: 'noisy gradients, nineteen updates per pass: 5% of the budget',
      },
      {
        method: 'Minibatch SGD, 4',
        values: ['1,800', '6', '1.000'],
        verdict: 'cheaper still here; the noise grows as the batch shrinks',
      },
      {
        method: 'Linear model, same trainer',
        values: ['-', '200', '0.590'],
        verdict: 'no hidden layer, no rings: the layer is the model',
      },
      {
        method: 'Learning rate 8.0',
        values: ['-', '2', 'diverged'],
        verdict: 'the dial has a cliff, reported not hidden',
      },
    ],
    source:
      'python solutions/backpropagation_stochastic_gradient_descent.py prints this table and asserts: every backpropagated partial within 10⁻⁵ (measured 2.7 × 10⁻⁶) of central finite differences on six random networks; the backward pass between 1.5× and 3.5× the forward pass and finite differences over 100× the backward pass; minibatch 16 reaching the target in under a third of full batch’s gradient evaluations with held-out accuracy at least 0.98; the linear model below 0.7; and learning rate 8.0 diverging.',
  },

  figure: (
    <Figure
      id="fig-backprop-chain"
      aspect="16 / 7"
      caption="One round trip prices every weight. Forward: each layer computes z = Wa + b and an activation. Backward: the output error p − y is the last delta; each earlier delta is the next layer’s deltas pulled back through Wᵀ and scaled by the activation’s derivative; every weight’s partial is delta times input. Verified against central finite differences to 2.7 × 10⁻⁶ on every parameter. Counted: forward 304 multiply-adds, backward 880 (2.9×), finite differences 204,896 (233×). Spent by minibatch: 6,000 evaluations to loss 0.08 against 112,200 for full batch, both at 100% held out."
      cite={{
        text: 'D. E. Rumelhart, G. E. Hinton, R. J. Williams, "Learning representations by back-propagating errors," Nature 323, 1986. DOI 10.1038/323533a0. Robbins-Monro 1951; LeCun et al., Efficient BackProp, 1998.',
        href: 'https://doi.org/10.1038/323533a0',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A three-layer network with forward arrows in blue and backward delta arrows in amber, and a loss curve comparing minibatch and full-batch descent">
        {[[70, [110, 150]], [180, [80, 115, 150, 185]], [290, [80, 115, 150, 185]], [400, [130]]].map(([x, ys], li) => (
          <g key={li}>
            {ys.map((y, i) => <circle key={i} cx={x} cy={y} r="9" fill="rgba(93,162,255,0.15)" stroke="#5da2ff" strokeWidth="1.4" />)}
          </g>
        ))}
        {[[70, 110], [70, 150]].map(([x, y], i) => [80, 115, 150, 185].map((y2, j) => <line key={`${i}-${j}`} x1={x + 9} y1={y} x2={171} y2={y2} stroke="rgba(93,162,255,0.35)" strokeWidth="1" />))}
        {[80, 115, 150, 185].map((y, i) => [80, 115, 150, 185].map((y2, j) => <line key={`${i}-${j}`} x1={189} y1={y} x2={281} y2={y2} stroke="rgba(93,162,255,0.35)" strokeWidth="1" />))}
        {[80, 115, 150, 185].map((y, i) => <line key={i} x1={299} y1={y} x2={391} y2={130} stroke="rgba(93,162,255,0.35)" strokeWidth="1" />)}
        <path d="M 60 40 L 400 40" stroke="#5da2ff" strokeWidth="2" markerEnd="url(#f)" />
        <text x="60" y="30" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="11">forward: z = Wa + b, a = tanh(z), p = σ(z) · 304 multiply-adds</text>
        <path d="M 400 230 L 60 230" stroke="#f0b94b" strokeWidth="2" />
        <text x="60" y="250" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">backward: δ = p − y, then δ ← (Wᵀδ) ⊙ tanh′ · ∂L/∂W = δ aᵀ · 880 multiply-adds</text>
        <text x="430" y="80" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">gradient check: 2.7 × 10⁻⁶</text>
        <text x="430" y="100" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">finite differences: 204,896 (233×)</text>
        <text x="430" y="136" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">minibatch 16: 6,000 evals</text>
        <text x="430" y="154" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">full batch: 112,200 evals</text>
        <text x="430" y="172" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">same start, same target loss 0.08</text>
        <text x="430" y="200" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">linear model: 59% · lr 8.0: diverged</text>
        <text x="60" y="276" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">two rings, 2-16-16-1, 337 parameters, cross-entropy; held-out accuracy 100% for every converged trainer</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'backpropagation_stochastic_gradient_descent.py',
  Viz: BackpropViz,
  narration,
};
