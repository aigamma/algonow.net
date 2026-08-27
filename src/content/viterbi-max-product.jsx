import ViterbiViz from '../viz/ViterbiViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/viterbi_max_product.py?raw';
import { narration } from './viterbi-max-product.narration.js';

export const content = {
  given:
    'A hidden Markov model (transition and emission probabilities) and a sequence of observations.',
  task: 'Recover the single most probable hidden state path: one coherent story, jointly best, not a chain of local guesses.',
  constraint:
    'Exactly: the answer must beat all Sⁿ paths (verified against complete enumeration at toy size), in n·S² work, in log space, because the linear-space recurrence underflows to exactly 0.0 on this page’s own instance.',

  origins: (
    <p>
      Andrew Viterbi published the algorithm in <strong>1967</strong> for
      decoding convolutional error-correcting codes, and by his own account
      intended it as a <em>proof device</em> for error bounds, not a
      practical method; engineers noticed it was implementable, Forney&apos;s
      1973 exposition drew the trellis and fixed the name, and Viterbi
      co-founded Qualcomm largely on what followed. Rabiner&apos;s 1989
      tutorial carried the same trellis into speech recognition via hidden
      Markov models, biology took it for gene finding (the dishonest-casino
      example below is Durbin&apos;s), and every phone call you have made
      routed its bits through this recurrence.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>trellis</strong>: states as rows, time as columns,
      V[t][s] = the probability of the best path ending in state s at time
      t, each cell answered by its S predecessors. This is the site&apos;s
      DP-state trilogy completing: Kadane&apos;s single number,
      Wagner-Fischer&apos;s prefix lattice, and now the probabilistic
      trellis: n·S² cells, backpointers, and the backtrace is the decoded
      story. Verified against brute-force enumeration of all 2,187 paths at
      toy size, exactly.
    </p>
  ),
  heurRole: (
    <p>
      Chooses the <strong>semiring</strong>: max-product over path
      probabilities (in practice max-sum over logs, and the tests show
      why: linear space hits exactly 0.0 at n = 2,000 while log space
      reads −3,594.4). The profound part is what one symbol swap buys:
      replace max with <strong>sum</strong> and the identical trellis
      computes marginals (the forward algorithm): same lattice, two
      different questions: &quot;the best single story&quot; versus
      &quot;the weight of all stories&quot;. The contest measures the gap
      between those questions on real sequences.
    </p>
  ),

  picture: (
    <p>
      A casino switches secretly between a fair die and a loaded one, and
      you hold only the roll history. Two ways to accuse: ask, for each
      roll separately, &quot;was this one probably loaded?&quot; (the
      marginals), or ask for the single most believable <em>screenplay</em>{' '}
      of the whole night: who held which die, when, with every switch
      paying its price (the path). The screenplay question is
      Viterbi&apos;s, and the difference is not academic: the marginal
      answers, stitched together, can assert a night that could not have
      happened: a switch the house rules forbid: while the screenplay is
      possible by construction.
    </p>
  ),

  steps: [
    <>
      <strong>Seed:</strong> V[0][s] = log π(s) + log B(s, obs₀) for every
      state.
    </>,
    <>
      <strong>Advance:</strong> V[t][s] = max over predecessors p of
      V[t−1][p] + log A(p, s), plus log B(s, obsₜ); record the argmax as a
      backpointer.
    </>,
    <>
      <strong>Finish:</strong> the best final cell is the story&apos;s
      probability; n·S² work total, log-space throughout.
    </>,
    <>
      <strong>Backtrace:</strong> follow the pointers home: the MAP path,
      the one coherent screenplay.
    </>,
    <>
      <strong>Know the sibling:</strong> the same trellis with sum instead
      of max is the forward-backward algorithm: marginals, likelihoods,
      and the training loop (Baum-Welch) all live one semiring away.
    </>,
  ],

  signals: [
    <>
      You need one <strong>coherent path</strong>: segmentations, decodes,
      alignments, tag sequences: outputs consumed as a whole story.
    </>,
    <>
      Transitions carry <strong>hard constraints</strong>: forbidden
      switches, grammars: zeros the decoded path must respect
      structurally.
    </>,
    <>
      S² per step is affordable; when the state space explodes (speech
      lattices), the beam rival buys speed at a measured risk.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is greedy chained argmax: commit to the best
      state now, then the best successor of <em>that</em>, and so on. On
      the casino it scores <strong>58.7%</strong>: worse than ignoring the
      transitions entirely (72.8%), because committing to one early
      mistake propagates it down a sticky chain. Local best, compounded,
      is how you do worse than random guessing among the wrong options.
    </>
  ),

  strength: (
    <>
      <strong>Jointly optimal, structurally legal, numerically sane.</strong>{' '}
      Never beaten by any rival&apos;s path (asserted per sequence),
      incapable of emitting a forbidden transition (the trap below), exact
      against full enumeration, and stable in log space where the naive
      recurrence dies at 0.0.
    </>
  ),
  weakness: (
    <>
      <strong>The best story is not the best per-scene guess.</strong>{' '}
      Posterior decoding wins per-position accuracy on the casino
      (82.5% vs 81.0%) even though every path it produced scored lower{' '}
      <em>as a path</em>, and on the canonical trap it asserts an
      impossible one. And S² per step is real: on 12 states the beam
      rival is 4× cheaper and went 0-for-50 on finding the true optimum:
      the trade in both directions, measured.
    </>
  ),

  problem: 'Hidden Markov model inference',
  problemSlug: 'hmm-inference',
  rivals: [
    {
      name: 'Viterbi × max-product',
      isThisUnit: true,
      algoName: 'Viterbi algorithm',
      cost: 'O(n·S²)',
      wins: (
        <>
          The one decoder whose story is <strong>jointly best and always
          possible</strong>: 50/50 optimal paths, hard zeros respected by
          construction, enumeration-exact.
        </>
      ),
      costs: (
        <>
          Loses the per-position popularity contest to the marginals
          (81.0% vs 82.5%), and S² per step bites at lattice scale.
        </>
      ),
      when: 'Whenever the output is consumed as one story: decoding, tagging, segmentation, alignment.',
    },
    {
      name: 'Posterior decoding',
      algoName: 'Forward-backward algorithm',
      cost: 'O(n·S²), two sweeps',
      wins: (
        <>
          Maximizes exactly per-position accuracy: <strong>82.5%</strong>{' '}
          on the casino, the better answer when each position is scored
          alone, plus honest confidence numbers per state.
        </>
      ),
      costs: (
        <>
          The stitched answer is not a story: on the canonical
          three-stories instance it outputs a path with probability{' '}
          <strong>exactly zero</strong> (pinned).
        </>
      ),
      when: 'Per-position calls with confidences: spotting loaded stretches, flagging sites, soft outputs.',
    },
    {
      name: 'Beam search decoding',
      cost: 'O(n·k·S)',
      wins: (
        <>
          Width 3 on 12 states: <strong>4× cheaper</strong> per sequence,
          the only way lattices with millions of states decode at all.
        </>
      ),
      costs: (
        <>
          The true best path can die young: <strong>0 of 50</strong>{' '}
          sequences decoded optimally here, every miss certified against
          Viterbi&apos;s exact answer.
        </>
      ),
      when: 'State spaces where S² is fiction: speech, translation, any neural decoder’s default.',
    },
  ],
  neverUse: {
    name: 'Greedy chained argmax',
    why: (
      <>
        Commit to the locally best state, then the best successor of that
        commitment, forever: it feels like a lightweight Viterbi and
        measures at <strong>58.7%</strong> on the casino: fourteen points{' '}
        <em>below</em> the decoder that ignores transitions altogether.
        Early mistakes compound down sticky chains, which is the general
        lesson: when the model rewards persistence, a committed error
        persists too. The trellis exists precisely so that no commitment
        happens until every path has been priced.
      </>
    ),
  },

  contest: {
    instance:
      'two arenas: the dishonest casino (2 states, 30 sequences of 300 rolls, per-state accuracy against the true hidden sequence) and a random 12-state model (50 sequences of 80, optimal-path counting against exact Viterbi)',
    columns: ['casino accuracy', 'always possible?', 'optimal paths'],
    rows: [
      {
        method: 'Viterbi × max-product',
        isThisUnit: true,
        values: ['81.0%', 'yes, structurally', '50 / 50'],
        best: 2,
        verdict: 'the jointly best story, every time, and never an illegal one',
      },
      {
        method: 'Posterior (forward-backward)',
        values: ['82.5%', 'NO (trap pinned)', '-'],
        best: 0,
        verdict: 'wins each scene, and can assert a night that never happened',
      },
      {
        method: 'Beam, width 3 (12-state)',
        values: ['-', 'yes', '0 / 50'],
        verdict: '4× cheaper and never once optimal here: the price of pruning',
      },
      {
        method: 'Greedy chained argmax',
        values: ['58.7%', 'yes, but myopic', '-'],
        verdict: 'commitment compounds error: worse than ignoring transitions (72.8%)',
      },
    ],
    source:
      'python solutions/viterbi_max_product.py prints this table and asserts Viterbi and forward-backward exactly match brute-force enumeration of all 2,187 paths on 15 toy instances, no rival’s path ever exceeds Viterbi’s log-probability, the linear-space recurrence underflows to exactly 0.0 at n = 2,000 while log space reads −3,594.4, posterior decoding outputs the impossible [B, A] story on the canonical three-stories instance, and beam-3’s 50 certified losses.',
  },

  figure: (
    <Figure
      id="fig-viterbi-trellis"
      aspect="16 / 7"
      caption="One cell of the trellis, and the semiring that defines the question. The best path into state s at time t is the max over predecessors of their best paths times the transition, times the emission; backpointers remember the argmax and the backtrace reads the story out. Change exactly one operation, max to sum, and the identical lattice answers a different question: the total weight of all stories, which is the forward algorithm, posterior decoding, and the door to training."
      cite={{
        text: 'Viterbi, "Error Bounds for Convolutional Codes and an Asymptotically Optimum Decoding Algorithm", IEEE Transactions on Information Theory 13(2), 1967, intended as a proof device. The trellis exposition is Forney, 1973; the HMM tutorial is Rabiner, 1989; the casino is Durbin et al.',
        href: 'https://doi.org/10.1109/TIT.1967.1054010',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A trellis column: two predecessor states feeding one cell through weighted arrows, the maximum chosen, with the max-versus-sum semiring note">
        {[[110, 80, 'fair, t−1'], [110, 200, 'loaded, t−1']].map(([x, y, l], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={26} fill="rgba(93,162,255,0.1)" stroke="#5da2ff" strokeWidth="1.4" />
            <text x={x} y={y + 4} textAnchor="middle" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="10">{l}</text>
          </g>
        ))}
        <circle cx={380} cy={140} r={30} fill="rgba(98,217,138,0.12)" stroke="#62d98a" strokeWidth="2" />
        <text x={380} y={137} textAnchor="middle" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">fair, t</text>
        <text x={380} y={151} textAnchor="middle" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">V[t][fair]</text>
        <line x1="136" y1="86" x2="350" y2="132" stroke="#62d98a" strokeWidth="2.4" />
        <text x="200" y="92" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">V·A(fair→fair) ← the max</text>
        <line x1="136" y1="192" x2="350" y2="152" stroke="#9aa5bd" strokeWidth="1.3" strokeDasharray="4 4" />
        <text x="188" y="188" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">V·A(loaded→fair)</text>
        <line x1="380" y1="102" x2="380" y2="70" stroke="#f0b94b" strokeWidth="1.8" />
        <text x="392" y="66" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">× B(fair, obsₜ)</text>
        <text x="470" y="130" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">backpointer: who won</text>
        <text x="40" y="258" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12">max ⇒ the best single story (Viterbi) · sum ⇒ the weight of all stories (forward)</text>
        <text x="40" y="278" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">one operation apart · run in logs: the linear version hits exactly 0.0 at n = 2,000</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'viterbi_max_product.py',
  Viz: ViterbiViz,
  narration,
};
