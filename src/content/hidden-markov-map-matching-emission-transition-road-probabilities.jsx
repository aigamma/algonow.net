import MapMatchingViz from '../viz/MapMatchingViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/hidden_markov_map_matching_emission_transition_road_probabilities.py?raw';
import { narration } from './hidden-markov-map-matching-emission-transition-road-probabilities.narration.js';

export const content = {
  given:
    'A GPS trace: a fix every few seconds along a drive, each off by 4 to 20 m of noise, over a road network of 75 intersections and 132 segments with a frontage road 18 m beside an avenue. Which segments did the car actually drive?',
  task: 'Hidden Markov map matching. The algorithm treats roads as hidden states and fixes as noisy observations and runs Viterbi over the candidate roads near each fix. The heuristic is Newson and Krumm’s (2009) pair of probabilities: emission Gaussian in the perpendicular distance from fix to road; transition exponential in |straight-line distance between fixes − driving distance between their matched points| / β, with β fitted from the median gap on known-truth traces.',
  constraint:
    'Measured against the hidden route and an exhaustive maximum: Viterbi equals the brute-force optimum on 40 short traces (339,964 sequences); at σ = 4 m the matcher puts 95.6% of fixes on the true segment against 90.6% for snapping, route-length error 0.5% against 46.6%; at σ = 20 m, 70.3% against 59.7% and 29% against 120%. β = ∞ reproduces snapping exactly. The frontage road captured 83 of 800 snapped fixes and 1 matched fix. One 39-fix trace: 749 lattice edges against 1.6 × 10²³ sequences. 0.7 s.',

  origins: (
    <p>
      Paul Newson and John Krumm (Microsoft Research) published{' '}
      <strong>&quot;Hidden Markov Map Matching Through Noise and
      Sparseness&quot;</strong> at ACM SIGSPATIAL GIS 2009, with a Seattle
      drive and hand-recorded ground truth. Earlier matchers snapped each fix
      to the nearest road or walked the graph greedily; Quddus, Ochieng, and
      Noland&apos;s 2007 survey sorted them into geometric, topological, and
      probabilistic families. The engine is Viterbi&apos;s 1967 decoder
      (puzzle 29). The two distributions, with β fitted as the median
      |great-circle − route| / ln 2, became the standard that Valhalla&apos;s
      Meili and GraphHopper still follow.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>model and the search</strong>. Candidates per fix are
      the segments within a radius; a route is one candidate per fix; Viterbi
      finds the maximum-probability route in time linear in candidate pairs.
      The referee is exact: on <strong>40 short traces</strong> Viterbi equals
      the maximum over all 339,964 enumerated sequences to 1e-9, and every
      returned score equals its own emission and transition terms re-summed.
      One 39-fix trace scored 749 lattice edges in place of 1.63 × 10²³
      sequences.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>two probabilities</strong>. Emission: −½ (d / σ)² for
      the perpendicular distance d. Transition: −|d_line − d_route| / β, the
      route distance read from a 75 × 75 Dijkstra table plus the partial
      segments, so a hop that implies a detour is penalized. β fitted from
      known-truth traces: <strong>6.0 m at σ 4, 23.2 m at σ 20</strong>. The
      transition term is the whole difference from snapping: with β = ∞ the
      matcher returned the nearest road on every fix, verified.
    </p>
  ),

  picture: (
    <p>
      A detective reconstructs a drive from smudged receipts, each stamped
      with an approximate location. Read alone, each pins to the nearest shop
      and the suspect seems to teleport across the river and back. Read
      together, each pair gets one question: could a car have driven from
      this shop to that one along real streets, covering about the
      straight-line distance? The route that answers yes at every hop while
      staying near every receipt is the one she writes down.
    </p>
  ),

  steps: [
    <>
      <strong>Route table:</strong> one Dijkstra per intersection (75 runs)
      gives every node-to-node driving distance.
    </>,
    <>
      <strong>Candidates:</strong> every segment within the radius of each
      fix, with its perpendicular distance and projected point (3.7 to 8.1
      per fix as σ grows).
    </>,
    <>
      <strong>Score:</strong> emission −½ (d / σ)²; transition −|d_line −
      d_route| / β between consecutive candidates.
    </>,
    <>
      <strong>Viterbi:</strong> best score into each candidate plus a back
      pointer, forward over the fixes; trace back from the best final one.
    </>,
  ],

  signals: [
    <>
      <strong>Noisy snapshots of a hidden path through a known graph:</strong>{' '}
      roads, rail, indoor corridors, protocol states.
    </>,
    <>
      <strong>A consistency rule single observations cannot see:</strong> the
      car cannot teleport; driving distance must roughly match distance
      traveled.
    </>,
    <>
      <strong>A batch you can decode after the fact:</strong> a later fix is
      allowed to overrule an earlier snap.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>nearest-road snapping</strong>, this
      matcher with β = ∞: 90.6% on the true segment at σ 4 against 95.6%,
      and a route-length error of 46.6% against 0.5%, because every flip
      between roads is a detour.
    </>
  ),

  strength: (
    <>
      <strong>Route consistency, verified against an exhaustive optimum and
      the hidden truth.</strong> Route-length error 0.5% / 2.6% / 7.4% / 29%
      at σ 4 / 8 / 12 / 20 against 47% / 81% / 105% / 120% for snapping;
      1 frontage-road flip in 800 fixes against 83.
    </>
  ),
  weakness: (
    <>
      <strong>Batch, noise-limited at corners, and tuned by β.</strong> The
      best road for a fix can change when later fixes arrive. Per-fix
      accuracy falls to 70.3% at σ 20, mostly at intersections where a fix a
      meter from the corner is a coin flip. Per-fix position error is only
      slightly better than snapping (3.3 m against 3.5 m at σ 4); the win is
      the route, not the points.
    </>
  ),

  problem: 'Map matching',
  problemSlug: 'map-matching',
  rivals: [
    {
      name: 'Hidden Markov map matching × Emission-transition road probabilities',
      isThisUnit: true,
      algoName: 'Hidden Markov map matching',
      cost: 'O(T · C²) transitions over a precomputed route table',
      wins: (
        <>
          <strong>95.6% on the true segment at σ 4, route-length error
          0.5%</strong>; equals the exhaustive optimum on 40 traces; 1
          frontage flip in 800 fixes.
        </>
      ),
      costs: (
        <>
          Needs the whole trace (or a lag), a fitted β, and a route table;
          70.3% per fix at σ 20.
        </>
      ),
      when: 'A recorded trace to decode offline, dense enough that straight-line distance says something about the hop.',
    },
    {
      name: 'Viterbi algorithm × Max-product trellis',
      algoName: 'Viterbi algorithm',
      cost: 'O(T · C²) over any given lattice',
      wins: (
        <>
          The engine inside: exact over the candidate lattice, <strong>749
          edges for 1.6 × 10²³ sequences</strong> here (puzzle 29).
        </>
      ),
      costs: (
        <>
          Someone must define the states and the probabilities; the
          matcher&apos;s contribution is exactly that.
        </>
      ),
      when: 'States and transitions are already given; decode directly.',
    },
    {
      name: 'ST-Matching × Spatial-temporal candidate graph',
      algoName: 'ST-Matching',
      cost: 'O(T · C²) plus a speed-limit lookup per road',
      wins: (
        <>
          Adds a temporal term comparing implied speed with each road&apos;s
          limit; <strong>built for sparse traces</strong>, a fix every minute
          or two (Lou et al., SIGSPATIAL 2009).
        </>
      ),
      costs: (
        <>
          Speed limits for every road and a hand-tuned blend of the spatial
          and temporal terms.
        </>
      ),
      when: 'Low sampling rates where straight-line distance alone cannot discriminate the hop.',
    },
    {
      name: 'Particle filter',
      algoName: 'Particle filter',
      cost: 'O(N particles) per fix, online',
      wins: (
        <>
          A position estimate at every second with <strong>no wait for the
          trace to end</strong>; hypotheses travel along the roads (puzzle
          138).
        </>
      ),
      costs: (
        <>
          Many particles to cover a dense network; a cloud can collapse onto
          the wrong road and never recover, where Viterbi keeps every
          candidate alive.
        </>
      ),
      when: 'Live navigation, where latency beats the certainty of a batch decode.',
    },
  ],
  neverUse: {
    name: 'Nearest-road snapping for a route',
    why: (
      <>
        Snap each fix to its nearest segment: this matcher with β = ∞,
        verified fix for fix. Along a 600 m avenue with a frontage road 18 m
        to one side, joined only at its ends, snapping put{' '}
        <strong>83 of 800 fixes (10.4%) on the frontage road</strong> at σ 10,
        each implying a drive to the end of the block and back; the matcher
        put 1. On random routes the snapped route length erred by 47% at σ 4
        and 120% at σ 20, against 0.5% and 29%. Snapping answers where the
        car is, not which way it went.
      </>
    ),
  },

  contest: {
    instance:
      '75 intersections, 132 segments; 20 random 14-segment routes per noise level, a fix every 35 m; β fitted on 10 further traces; snapping is the same lattice with β = ∞',
    columns: ['on true segment', 'position error (m)', 'route-length error', 'candidates per fix'],
    rows: [
      {
        method: 'HMM matcher, σ = 4 m',
        isThisUnit: true,
        values: ['0.956', '3.3', '0.005', '3.74'],
        best: 0,
        verdict: 'equals the exhaustive optimum; half a percent of route error',
      },
      {
        method: 'snapping, σ = 4 m',
        values: ['0.906', '3.5', '0.466', '3.74'],
        verdict: 'every flip is a detour',
      },
      {
        method: 'HMM matcher, σ = 8 m',
        values: ['0.886', '6.6', '0.026', '4.66'],
        verdict: 'β fitted at 10.4 m',
      },
      {
        method: 'snapping, σ = 8 m',
        values: ['0.800', '7.5', '0.807', '4.66'],
        verdict: 'route length nearly doubled',
      },
      {
        method: 'HMM matcher, σ = 20 m',
        values: ['0.703', '18.3', '0.290', '8.12'],
        verdict: 'corner fixes become coin flips',
      },
      {
        method: 'snapping, σ = 20 m',
        values: ['0.597', '21.2', '1.203', '8.12'],
        verdict: 'the route is fiction',
      },
    ],
    source:
      'python solutions/hidden_markov_map_matching_emission_transition_road_probabilities.py prints this table and asserts: Viterbi equals the exhaustive maximum and its recomputed score on 40 short traces; the matcher is at least as good as snapping on all three metrics at every σ, above 0.95 at σ 4; β = ∞ returns the nearest segment on every fix; the frontage road takes 5% to 40% of snapped fixes and at most 1% of matched ones; every fourth fix still beats snapping.',
  },

  figure: (
    <Figure
      id="fig-hmm-map-matching"
      aspect="16 / 7"
      caption="Left: an avenue (blue) with a frontage road 18 m beside it (grey), joined only at its ends; noisy fixes (dots), the ones snapping sends to the frontage road (red), and the matched route (dashed blue) that stays on the avenue because a hop over and back is a detour the transition term will not pay for. Right: route-length error against the hidden route for the matcher (blue) and snapping (amber) at σ = 4, 8, 12, 20 m."
      cite={{
        text: 'P. Newson and J. Krumm, "Hidden Markov Map Matching Through Noise and Sparseness," ACM SIGSPATIAL GIS 2009, DOI 10.1145/1653771.1653818. A. Viterbi, "Error bounds for convolutional codes and an asymptotically optimum decoding algorithm," IEEE Transactions on Information Theory 13(2), 1967. M. A. Quddus, W. Y. Ochieng, R. B. Noland, "Current map-matching algorithms for transport applications," Transportation Research Part C 15(5), 2007.',
        href: 'https://doi.org/10.1145/1653771.1653818',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="An avenue with a frontage road, noisy fixes snapped onto the frontage road against a matched route that stays on the avenue, beside a bar chart of route-length error for the matcher and snapping at four noise levels">
        {(() => {
          const y = 150;
          const yf = 186;
          const fixes = [[40, 143], [75, 162], [110, 158], [145, 141], [180, 171], [215, 156], [250, 139], [285, 169], [320, 153]];
          const bx = 390;
          const by = 230;
          const hmm = [0.005, 0.026, 0.074, 0.29];
          const snap = [0.466, 0.807, 1.052, 1.203];
          const BY = (v) => by - (v / 1.3) * 170;
          return (
            <g fontFamily="ui-monospace, monospace" fontSize="10">
              <text x="30" y="22" fill="#9aa5bd">blue: the avenue; grey: frontage road, 18 m away, joined at its ends</text>
              <path d={`M30 ${y}H330M60 ${y}V${yf}H300V${y}`} fill="none" stroke="#9aa5bd" strokeWidth="2" />
              <line x1="30" y1={y} x2="330" y2={y} stroke="#5da2ff" strokeWidth="3" />
              <polyline points={fixes.map(([x]) => `${x},${y}`).join(' ')} fill="none" stroke="#5da2ff" strokeWidth="1.5" strokeDasharray="5 3" />
              {fixes.map(([x, fy]) => (
                <g key={x}>
                  <line x1={x} y1={fy} x2={x} y2={y} stroke="#5da2ff" strokeOpacity="0.5" />
                  <circle cx={x} cy={fy} r="3.5" fill="#e9edf6" />
                  {fy > y + 18 && <rect x={x - 4} y={yf - 4} width="8" height="8" fill="#e2606c" />}
                </g>
              ))}
              <text x="30" y="262" fill="#e2606c">red: fixes snapping sends to the frontage road (83 of 800 at σ 10)</text>
              <text x="30" y="276" fill="#5da2ff">dashed blue: the matched route, 1 flip in 800</text>
              <text x={bx} y="22" fill="#9aa5bd">route-length error vs the hidden route</text>
              <line x1={bx} y1={by} x2={bx + 230} y2={by} stroke="#9aa5bd" strokeOpacity="0.6" />
              {['4', '8', '12', '20'].map((s, i) => (
                <g key={s} fontSize="8">
                  <rect x={bx + 10 + i * 56} y={BY(hmm[i])} width="20" height={by - BY(hmm[i])} fill="#5da2ff" />
                  <rect x={bx + 32 + i * 56} y={BY(snap[i])} width="20" height={by - BY(snap[i])} fill="#f0b94b" />
                  <text x={bx + 10 + i * 56} y={BY(hmm[i]) - 3} fill="#5da2ff">{hmm[i]}</text>
                  <text x={bx + 32 + i * 56} y={BY(snap[i]) - 3} fill="#f0b94b">{snap[i]}</text>
                  <text x={bx + 14 + i * 56} y={by + 12} fill="#9aa5bd">σ {s}</text>
                </g>
              ))}
              <text x={bx} y="262" fill="#5da2ff">blue: HMM matcher</text>
              <text x={bx + 120} y="262" fill="#f0b94b">amber: snapping</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'hidden_markov_map_matching_emission_transition_road_probabilities.py',
  Viz: MapMatchingViz,
  narration,
};
