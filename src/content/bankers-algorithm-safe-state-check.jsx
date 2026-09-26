import BankersViz from '../viz/BankersViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/bankers_algorithm_safe_state_check.py?raw';
import { narration } from './bankers-algorithm-safe-state-check.narration.js';

export const content = {
  given:
    'Several processes share a few kinds of resource, each process having declared in advance the most of each it will ever hold. They request units one at a time and release everything when they finish. A request must be granted or made to wait; a circular wait, where every process holds what another needs, is a deadlock nobody recovers from.',
  task: 'Banker’s rule: grant a request only if the state after the grant is safe, meaning some order exists in which every process could be given its full remaining declared need out of what is free plus what earlier finishers release. The safe-state check decides that greedily: finish any process whose remaining need fits the free pool, add what it held to the pool, repeat; if everyone finishes, the state is safe.',
  constraint:
    'The greedy verdict agrees with an exhaustive search over every completion order on 400 of 400 random states, at 0.53% of the work (2,429 need checks against 458,880). The textbook state is decided exactly: safe with order P1 P3 P4 P0 P2; P1’s request (1, 0, 2) granted, P4’s (3, 3, 0) told to wait, P0’s (0, 2, 0) refused as unsafe. Over 200 simulated workloads whose actual demands fall below their declarations, the banker finished every process in 200 of 200 at a price of 14.1 refusals per workload; granting whatever is free deadlocked in 101. And 128 of the 286 unsafe states sampled still finished under a naive granter: unsafe means no guarantee, not doom.',

  origins: (
    <p>
      Edsger Dijkstra designed the banker&apos;s algorithm for the THE
      multiprogramming system at Eindhoven and described it in{' '}
      <strong>1965</strong> (Cooperating Sequential Processes): a banker
      with limited cash who never lends to a customer unless, after
      the loan, every customer could still be paid their full credit
      line in some order. Habermann (1969) generalized it to several
      resource types and gave the matrix form taught since; Holt
      (1972) framed deadlock through resource-allocation graphs and
      separated prevention, avoidance, and detection. The safe-state
      check in its O(n²m) greedy form is the one in Silberschatz,
      Galvin, and Gagne&apos;s <em>Operating System Concepts</em>, whose
      five-process example this page reproduces verdict for verdict.
      Real kernels mostly chose detection or ordering instead, because
      the banker needs every maximum declared up front; the algorithm
      survives in schedulers, admission control, and any allocator
      that can ask for a reservation.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>rule</strong>: a request is granted only if the
      resulting state is safe. Tentatively apply the grant (free pool
      minus the request, allocation plus, need minus), run the check,
      and undo the grant if it fails. The guarantee is exact: from a
      safe state, whatever the processes do within their declarations,
      a completion order always exists, so deadlock cannot occur.
      Measured: <strong>200 of 200</strong> simulated workloads finished
      every process; the textbook requests decided exactly (granted,
      wait, unsafe); and the greedy check&apos;s verdict equal to
      exhaustion&apos;s on 400 of 400 random states, its own finishing
      order replayed and verified each time.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>check that makes the rule affordable</strong>.
      Safety asks whether any of n! completion orders works; the
      greedy scan finishes any process whose remaining need fits the
      pool, adds its holdings back, and repeats, because finishing a
      process can only enlarge the pool, so a process that fits now
      fits later and no order need be retried. O(n²m): 2,429 need
      checks against exhaustion&apos;s 458,880 on the same 400 states,{' '}
      <strong>0.53%</strong>, with identical verdicts. The check&apos;s
      caution is also its bill: it plans for declared maxima that
      processes rarely use, so it refused 14.1 requests per workload
      that the process would in fact have survived receiving, and 128
      of the 286 unsafe states it would forbid still finished under a
      naive granter.
    </p>
  ),

  picture: (
    <p>
      A small-town banker with a fixed vault. Each customer has an
      approved credit line, draws on it in pieces, and repays
      everything at the end of the season. Before handing over a
      draw, the banker asks one question: if I make this loan, is
      there still some order in which every customer could be lent
      the rest of their line and pay it back, each repayment funding
      the next? If yes, the loan is safe. The banker answers it the
      easy way: pay off whoever can be fully funded from the vault
      now, count their repayment into the vault, and look again;
      never guess an order, because a customer who can be funded now
      can be funded later too. The bank cannot fail. It can, however,
      refuse loans that would have been fine, because a customer who
      draws only half their line still had the whole line reserved.
    </p>
  ),

  steps: [
    <>
      <strong>Request:</strong> process i asks for req ≤ need[i]; if
      req exceeds the free pool, wait.
    </>,
    <>
      <strong>Pretend:</strong> free −= req, alloc[i] += req,
      need[i] −= req.
    </>,
    <>
      <strong>Check:</strong> work = free; repeatedly finish any
      unfinished process with need ≤ work, adding its allocation to
      work.
    </>,
    <>
      <strong>Decide:</strong> everyone finished, grant; otherwise undo
      the pretend and make the process wait.
    </>,
    <>
      <strong>Verify:</strong> the greedy verdict vs every order
      (400 / 400); the textbook verdicts; 200 / 200 workloads finish.
    </>,
  ],

  signals: [
    <>
      <strong>Maxima are declared up front:</strong> reservations,
      admission control, a job that states its peak; without them the
      check has nothing to plan for.
    </>,
    <>
      <strong>Deadlock is unrecoverable:</strong> when killing a
      process or rolling back is worse than making it wait.
    </>,
    <>
      <strong>Few processes, few resource types:</strong> the check is
      O(n²m) per request, cheap at 5 × 3 and a burden at 5,000 × 300.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>grant whatever is free</strong>:
      no declarations, no check, and deadlock in 101 of 200 workloads
      on the same request streams the banker finished 200 of 200. It
      is what every allocator does until the first circular wait.
    </>
  ),

  strength: (
    <>
      <strong>Deadlock cannot happen, and the proof is cheap.</strong>{' '}
      200 of 200 workloads finished; the greedy check equal to
      exhaustion on 400 of 400 states at 0.53% of its work; and the
      textbook decisions reproduced exactly, including the refusal
      that looked affordable and was not.
    </>
  ),
  weakness: (
    <>
      <strong>It reserves what is declared, not what is used.</strong>{' '}
      14.1 refusals per workload for requests that would have been
      fine, and 128 of 286 unsafe states that a naive granter escaped:
      the guarantee is bought with waiting. It needs maxima declared in
      advance, a fixed set of processes, and resources that come back
      when a process finishes, which is why kernels chose detection
      and lock ordering; and the check runs on every request.
    </>
  ),

  problem: 'Deadlock avoidance',
  problemSlug: 'deadlock-detection',
  rivals: [
    {
      name: 'Banker’s algorithm × safe-state check',
      isThisUnit: true,
      algoName: "Banker's algorithm",
      cost: 'O(n²m) per request',
      wins: (
        <>
          <strong>No deadlock, ever</strong>: 200 of 200 workloads
          finished, the check equal to exhaustion on 400 of 400.
        </>
      ),
      costs: (
        <>
          Declared maxima, a fixed process set, and 14.1 refusals per
          workload for requests that would have been fine.
        </>
      ),
      when: 'Reservations are known up front and a deadlock would be unrecoverable.',
    },
    {
      name: 'Wait-die deadlock prevention',
      cost: 'a timestamp compare per conflict',
      wins: (
        <>
          No declarations needed: an older transaction waits, a
          younger one is rolled back, so no cycle can form.
        </>
      ),
      costs: (
        <>
          Rollbacks and restarts of the young, some of them needless.
        </>
      ),
      when: 'Databases where a transaction can be restarted cheaply.',
    },
    {
      name: 'Distributed deadlock detection',
      cost: 'a probe per wait edge',
      wins: (
        <>
          Let deadlocks happen and find them: edge-chasing probes
          around the wait-for graph, then kill a victim.
        </>
      ),
      costs: (
        <>
          The deadlock has already happened; recovery aborts work.
        </>
      ),
      when: 'Deadlocks are rare and a victim can be aborted and retried.',
    },
    {
      name: 'Ostrich algorithm',
      cost: 'nothing',
      wins: (
        <>
          Ignore the problem: no checks, no declarations, no
          refusals; the choice of most desktop kernels.
        </>
      ),
      costs: (
        <>
          The deadlock, when it comes, is the user&apos;s reboot.
        </>
      ),
      when: 'Deadlocks are rarer than the cost of preventing them, and a restart is acceptable.',
    },
  ],
  neverUse: {
    name: 'Granting whatever is free',
    why: (
      <>
        The default allocator, measured: on 200 request streams with
        five processes and three resource types, it deadlocked in{' '}
        <strong>101 of 200</strong>, a state with pending requests and
        no process able to move, while the banker finished all 200
        from the same streams. Half the time it is fine, and the half
        is the trap: a system that deadlocks on every second workload
        looks healthy in any single test. Where the declarations exist,
        the check costs 0.53% of exhaustion and the only price is a
        wait.
      </>
    ),
  },

  contest: {
    instance:
      '200 simulated workloads of 5 processes and 3 resource types (6 to 12 units each), declared maxima with actual demands drawn below them, one-unit requests in random order; referee for the check: exhaustive search over every completion order on 400 random states',
    columns: ['workloads finished', 'deadlocks', 'refusals per workload'],
    rows: [
      {
        method: 'Banker’s algorithm, greedy safe-state check',
        isThisUnit: true,
        values: ['200 / 200', '0', '14.1'],
        best: 0,
        verdict: 'the guarantee, bought with waits',
      },
      {
        method: 'Grant whatever is free',
        values: ['99 / 200', '101', '0'],
        verdict: 'no declarations, no check, a coin-flip of circular waits',
      },
      {
        method: 'Greedy check vs exhaustive (400 states)',
        values: ['verdicts 400 / 400', '2,429 vs 458,880 checks', '0.53%'],
        verdict: 'finish any process that fits, repeat: the pool only grows',
      },
      {
        method: 'Unsafe states under a naive granter',
        values: ['128 / 286 finished', '158', '-'],
        verdict: 'unsafe means no guarantee, not doom',
      },
    ],
    source:
      'python solutions/bankers_algorithm_safe_state_check.py prints this table and asserts: the greedy verdict equals exhaustion’s on all 400 states with the greedy order replayed valid, at under a twentieth of the work; the textbook state is safe with order P1 P3 P4 P0 P2 and its three requests decide granted, wait, unsafe; the banker finishes all 200 workloads while the naive granter finishes some but not all; and some but not all unsafe states finish under the naive granter with demands below declarations.',
  },

  figure: (
    <Figure
      id="fig-bankers-textbook"
      aspect="16 / 7"
      caption="The textbook state: five processes, three resource types (10, 5, 7 units), free pool (3, 3, 2). Each row shows allocation (filled) inside the declared maximum (outline); need is the gap. The greedy check finishes P1 first (need 1 2 2 fits 3 3 2), adds its 2 0 0 back, then P3, P4, P0, P2: safe. P1’s request (1, 0, 2) leaves a safe state and is granted; P4’s (3, 3, 0) exceeds the free pool and waits; P0’s (0, 2, 0) fits the pool but leaves no finishing order and is refused."
      cite={{
        text: 'E. W. Dijkstra, "Cooperating sequential processes," EWD 123, 1965. A. N. Habermann, "Prevention of system deadlocks," CACM 12(7), 1969. DOI 10.1145/363156.363162. Silberschatz, Galvin, Gagne, Operating System Concepts, ch. 8.',
        href: 'https://doi.org/10.1145/363156.363162',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Five process rows with allocation bars inside declared maximum outlines for three resource types, the finishing order the check found, and the three request verdicts">
        {[
          ['P0', [0, 1, 0], [7, 5, 3], 4],
          ['P1', [2, 0, 0], [3, 2, 2], 1],
          ['P2', [3, 0, 2], [9, 0, 2], 5],
          ['P3', [2, 1, 1], [2, 2, 2], 2],
          ['P4', [0, 0, 2], [4, 3, 3], 3],
        ].map(([name, alloc, mx, ord], r) => (
          <g key={name}>
            <text x="30" y={62 + r * 36} fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12">{name}</text>
            {mx.map((m, j) => (
              <g key={j}>
                <rect x={70 + j * 130} y={48 + r * 36} width={m * 11} height="18" fill="none" stroke="rgba(154,165,189,0.5)" />
                <rect x={70 + j * 130} y={48 + r * 36} width={alloc[j] * 11} height="18" fill="#5da2ff" opacity="0.85" />
              </g>
            ))}
            <text x="470" y={62 + r * 36} fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="12">finishes {ord}{ord === 1 ? 'st' : ord === 2 ? 'nd' : ord === 3 ? 'rd' : 'th'}</text>
          </g>
        ))}
        <text x="70" y="40" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">A: 10 units</text>
        <text x="200" y="40" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">B: 5 units</text>
        <text x="330" y="40" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">C: 7 units</text>
        <text x="30" y="242" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">free (3, 3, 2): safe, order P1 P3 P4 P0 P2</text>
        <text x="30" y="262" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">P1 asks (1,0,2): granted</text>
        <text x="230" y="262" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">P4 asks (3,3,0): wait</text>
        <text x="420" y="262" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">P0 asks (0,2,0): unsafe, refused</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'bankers_algorithm_safe_state_check.py',
  Viz: BankersViz,
  narration,
};
