// The spoken lesson for puzzle one hundred thirty seven, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle one hundred thirty seven: automatic differentiation, paired with reverse mode, for gradient computation. Here is the puzzle. A program computes one number, a loss, from n parameters through thousands of elementary operations: a hyperbolic tangent network with seventeen, five hundred one, or five thousand four hundred one weights on this page. Every partial derivative of the loss is needed, exactly, and often. The method: every elementary operation knows its own derivative, so the chain rule can be applied to the program itself, mechanically. The heuristic is the direction of the sweep. Reverse mode runs the program once forward, recording each operation and its local derivatives on a tape, then sweeps the tape backwards, accumulating for every node the derivative of the loss with respect to that node from the nodes that used it. One forward pass and one sweep give all n partials. On this page both directions are held against hand derived gradients and against each other, the cost of each is counted in elementary operations at three sizes, and the problem is turned around to show when the direction is wrong.',
  },
  {
    section: 'origins',
    text:
      'Wengert gave forward mode in nineteen sixty four: carry a derivative alongside every value through the program, one input direction per pass. Seppo Linnainmaa’s thesis of nineteen seventy, published in nineteen seventy six, contains the reverse accumulation, the adjoint sweep, as a way of analyzing rounding errors. Bert Speelpenning’s thesis of nineteen eighty made it the way to get a gradient, and Baur and Strassen proved the cheap gradient principle in nineteen eighty three: all the partials of a function cost at most a small constant times the function itself, the factor of about three measured on this page. Rumelhart, Hinton, and Williams rediscovered it in nineteen eighty six as backpropagation. Andreas Griewank named the field in nineteen eighty nine and wrote its book. Tools called ADIFOR, ADOL-C, and Tapenade differentiated Fortran and C, and the tape became the engine of Theano, autograd, PyTorch, and JAX, which is why every gradient in modern machine learning is a reverse sweep over what is still called a Wengert list.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the exact chain rule. Each operation records its local derivatives as it computes its value: for a product, the derivative with respect to each factor is the other factor. The derivative of the whole program is a sum over paths of products of local derivatives, which either sweep evaluates without ever writing it down. Measured: both modes match closed form gradients to about one part in ten to the fifteenth, and match each other to three parts in ten to the sixteenth on a five hundred one parameter network, where central finite differences agree only to seven parts in ten to the eleventh and cannot do better, because their error is truncation plus cancellation, not rounding. The heuristic supplies the direction of the sweep. Reverse mode seeds the output’s adjoint with one and sweeps the tape backwards, so every node receives the derivative of the loss with respect to itself from the nodes that used it: one sweep for all n inputs. Counted: two point eight seven, two point nine six, and two point nine nine times one evaluation of the loss at seventeen, five hundred one, and five thousand four hundred one parameters, a constant whatever n is. Forward mode costs n evaluations: three million eight hundred fifty nine thousand operations at five hundred one parameters against twenty two thousand seven hundred eighty nine. Finite differences cost two n. The price of reverse mode is the tape: two hundred eighty eight, eight thousand two hundred twenty eight, and ninety thousand six hundred forty eight recorded nodes, kept until the sweep. And the rule flips with the shape of the problem. For one input and five hundred outputs, forward mode carries the derivative in one pass of fifteen hundred operations, while reverse mode sweeps once per output: six hundred twenty seven thousand seven hundred fifty. Few outputs and many inputs: sweep backward. Many outputs and few inputs: sweep forward.',
  },
  {
    section: 'picture',
    text:
      'A supply chain audited two ways. Every factory in the chain knows exactly how much a one percent rise in each of its inputs moves its output. Those are the local derivatives, and they are known the moment the factory runs. Forward mode asks: if ore costs one percent more, how does the price of the car change? Push that one perturbation forward through every factory to the end. Then ask again about rubber, then about glass, one pass per input. Reverse mode asks the question from the other end: if the car sells for one percent more, how much is each part worth? Walk the chain backwards once, and every input gets its answer in the same walk. Same factories, same local numbers. The only choice is which end you start from, and that choice is the difference between n passes and one.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Forward: evaluate the program, and let each operation push its parents and its local derivatives onto the tape. Seed: the adjoint of the output is one, and every other adjoint is zero. Sweep: for each tape entry, newest first, add its adjoint times each local derivative into the corresponding parent’s adjoint. Read: the adjoints of the inputs are the gradient, all n of them from one sweep, at about three times the cost of the evaluation. On this page: at seventeen parameters, two hundred forty seven operations to evaluate, seven hundred nine for the gradient by reverse mode, four thousand one hundred ninety nine by forward mode, eight thousand three hundred ninety eight by finite differences. At five hundred one: seven thousand seven hundred three to evaluate, twenty two thousand seven hundred eighty nine reverse, three point nine million forward mode, seven point seven million finite differences. At five thousand four hundred one: eighty five thousand to evaluate, two hundred fifty four thousand reverse, and forward mode not run, because it would be four hundred sixty million. Then the turnaround: one input, five hundred outputs; forward mode fifteen hundred operations, reverse mode six hundred twenty seven thousand.',
  },
  {
    section: 'signals',
    text:
      'The signals that this pair fits. First: many inputs and one output. A loss over thousands or billions of parameters, with the gradient at a constant multiple of the loss. Second: the program is the model. Loops, branches, simulators; anything the tape can record, the sweep can differentiate, which is what separates automatic differentiation from a formula. Third: exact derivatives required. Finite differences stop at ten to the minus eleven and cost two n evaluations; the sweep gives ten to the minus sixteen for three.',
  },
  {
    section: 'tradeoffs',
    text:
      'Now the rivals. Forward mode: the same exact chain rule, one input direction per pass, with constant memory and no tape. It matches reverse mode to three parts in ten to the sixteenth and costs n evaluations, three point nine million operations at five hundred one parameters against twenty two thousand. Reach for it with few inputs and many outputs, for Jacobian vector products, or when memory is the constraint. Numerical differentiation: nothing to instrument, any black box in any language in five lines. Seven parts in ten to the eleventh at best, and two n evaluations; reach for it to check an implementation, or for a box you cannot open. And backpropagation, this site’s live unit: reverse mode specialized to a fixed stack of layers, with the tape implicit in the stored activations. It covers only the layer stack; a custom loss or a simulator needs the general tape.',
  },
  {
    section: 'tradeoffs',
    text:
      'The honest weaknesses of the hero. The tape, and the direction. Reverse mode keeps every intermediate until the sweep: ninety thousand nodes for one loss on five thousand parameters, and gigabytes for a deep network, which checkpointing trades back for recomputation. It is the wrong mode for many outputs: six hundred twenty seven thousand operations for a five hundred output Jacobian column that forward mode gets in fifteen hundred. And it needs differentiable operations; a sort or a lookup breaks the tape, and a branch is differentiated only along the path that was taken.',
  },
  {
    section: 'tradeoffs',
    text:
      'And the negative example: reverse mode for a tall Jacobian. Reverse mode is a habit, and the habit fails when the shape flips. For a function with one input and five hundred outputs, a Jacobian column, forward mode carries the derivative along in one pass: fifteen hundred operations. Reverse mode sweeps the tape once per output: five hundred sweeps, six hundred twenty seven thousand operations, four hundred times the work for the identical numbers. The rule is the ratio of outputs to inputs: sweep from the smaller side. The sensitivity of a whole simulation trajectory to one parameter is forward mode work, however reflexively the framework offers you a backward pass.',
  },
  {
    section: 'code',
    text:
      'The code on this page is a complete automatic differentiation system in miniature. A tape and a reverse mode variable whose every operation records its parents and local derivatives, with a backward sweep. A forward mode dual number. A plain number through the same code, so that an evaluation can be counted. A closed form function with its hand derived gradient, and a hyperbolic tangent network loss that accepts any of the three kinds of number. The self test asserts: both modes within one part in a trillion of the closed form gradients; reverse mode within one part in a million of central differences and within one part in a trillion of forward mode; reverse mode under four times the evaluation at every size, with the ratios within one of each other; forward mode above eight tenths of n evaluations and finite differences at two n; and for the five hundred output column, forward mode under three evaluations and reverse mode over fifty times that. When it prints O K, the machinery under every trained network has been counted, checked, and pointed in both directions. The file would fail before it would lie to you.',
  },
];
