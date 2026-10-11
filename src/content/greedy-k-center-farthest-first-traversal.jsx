import KCenterViz from '../viz/KCenterViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/greedy_k_center_farthest_first_traversal.py?raw';
import { narration } from './greedy-k-center-farthest-first-traversal.narration.js';

export const content = {
  given:
    'n points and k facilities to open at k of them: warehouses among the shops, relay towers among the villages, representative images among a million photographs. Every point travels to its nearest facility and the cost is the worst trip, the largest distance anyone covers. Choose the k centers that make that worst trip shortest. The k-center problem is NP-hard, and a factor below 2 is NP-hard too (Hsu and Nemhauser 1979).',
  task: 'Greedy k-center. The algorithm is Gonzalez’s greedy (1985): k centers, one at a time. The heuristic is the rule it follows: start anywhere, then open each new center at the point currently farthest from every center so far. After k picks the farthest remaining point is the witness. It and the k centers are k + 1 points pairwise at least the greedy radius r apart, and any k centers must serve two of them from one place, so OPT ≥ r / 2. One pass per center, a one-sentence proof, and the best factor any polynomial algorithm can promise.',
  constraint:
    'Measured against exact optima by brute force over center subsets (12 points with 3 centers, 14 with 4): on 230 instances, 113,080 subset evaluations, the traversal averaged 1.285 × OPT, never passed 1.922, and was optimal on 20, with r ≤ min pairwise distance of the k + 1 witness points ≤ 2 OPT on every instance. k far-apart copies of {0, 1, 2} give exactly 2.000 for k = 1 to 5. On 1,000 points in ten clusters with 10% noise and k = 10: traversal radius 2.806 in 1.0 ms; k-means++ seeding 4.185 (worst 5.382 over 10 seeds), then Lloyd 3.507; traversal then Lloyd 2.607; the threshold method 2.501; PAM swaps on the sum 4.478; random centers 5.546 (1.98 × the traversal). Sums of squares: Lloyd 600, traversal 2,828. One outlier takes a center and lifts the bulk radius 1.667 to 2.711. Exhaustive search: 560, 1,820, 4,368, 8,008 subsets at n = 16, k = 3 to 6; C(1000, 10) = 2.6 × 10²³. 2.7 s.',

  origins: (
    <p>
      k-center is the bottleneck cousin of facility location. Hsu and
      Nemhauser (1979) showed that any factor below 2 is NP-hard. Teofilo
      Gonzalez (1985) gave the farthest-first traversal and its factor of 2
      in <strong>Clustering to minimize the maximum intercluster distance</strong>;
      Hochbaum and Shmoys (1985) reached the same factor by a different route,
      guessing the radius and taking a maximal independent set in the graph
      of pairs within twice the guess, with a binary search over the pairwise
      distances, in a framework that also covers weighted versions. Dyer and
      Frieze (1985) gave the greedy a weighted variant. Two decades later the
      traversal returned as a seeding rule: Arthur and Vassilvitskii&apos;s
      k-means++ (2007) draws each new center at random in proportion to
      squared distance, trading the worst-case bound for a far better
      average on the sum of squares. The same traversal underlies coresets,
      landmark selection, and the first pass of streaming clusterers.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>centers</strong>: k of them, one per pass, each the
      current farthest point. The referee is the exact optimum, brute force
      over every k-subset, affordable only when the points are few. On 230
      such instances the traversal averaged <strong>1.285 × OPT</strong>,
      never passed 1.922, and was optimal on 20; on 1,000 points it placed
      ten centers in 1.0 ms with a radius of 2.806, the lowest of every
      method tried except the ones it seeded.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>proof</strong>, and the file checks the proof. After
      the k picks it records the witness, the next farthest point, and
      asserts two inequalities on every instance: the greedy radius is at
      most the smallest distance among the k + 1 points, and that distance
      is at most twice the optimum, because an optimal center serves two of
      them. Together: <strong>r ≤ 2 OPT</strong>. The tight family reaches
      exactly 2.000 for every k tried: the ceiling the theorem names.
    </p>
  ),

  picture: (
    <p>
      Picture siting fire stations with k trucks to place. Open the first
      station anywhere. Then ask one question, over and over: which house is
      farthest from every station so far? Build there. After k stations the
      farthest house gives the worst response time, and a guarantee for free:
      that house and the k stations are k + 1 places, each at least that far
      from the others, so even a perfect planner with k trucks leaves two of
      them sharing a station, one of them at least half that distance from
      help. You may be twice as bad as perfect. You cannot be worse.
    </p>
  ),

  steps: [
    <>
      <strong>Pick any point</strong> as the first center and record every
      point&apos;s distance to it.
    </>,
    <>
      <strong>Repeat k − 1 times:</strong> the point with the largest recorded
      distance becomes a center; lower each distance to the new center where
      it is closer.
    </>,
    <>
      <strong>Read the radius and the witness:</strong> the largest recorded
      distance and the point holding it.
    </>,
    <>
      <strong>Certify:</strong> the k centers and the witness are pairwise at
      least r apart, so OPT ≥ r / 2.
    </>,
    <>
      <strong>Want a second opinion?</strong> Sort the pairwise distances and
      binary-search a radius guess with the greedy threshold cover.
    </>,
  ],

  signals: [
    <>
      <strong>The cost is the worst case, not the total:</strong> coverage
      radius, response time, the farthest unserved customer.
    </>,
    <>
      <strong>You need a guarantee and a receipt:</strong> the witness is a
      lower bound anyone can check; 2 is the best polynomial promise.
    </>,
    <>
      <strong>The budget is tiny:</strong> two numbers per point and k passes;
      it runs where one Lloyd iteration is a luxury, and seeds what follows.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>k-means++ seeding</strong>, the same
      traversal made random: 4.185 max radius against 2.806 on the thousand
      points, and a far better sum of squares.
    </>
  ),

  strength: (
    <>
      <strong>A factor-two guarantee with a one-sentence proof and k passes.</strong>{' '}
      1.285 × OPT on average, 1.922 worst over 230 exact instances; the
      witness is a free lower bound; 1.0 ms for a thousand points.
    </>
  ),
  weakness: (
    <>
      <strong>Exactly 2 on the tight family, blind to density.</strong> One
      outlier takes a center (bulk radius 1.667 to 2.711); the sum of squares
      is 2,828 against Lloyd&apos;s 600; 210 single-center swaps found no
      better radius.
    </>
  ),

  problem: 'K-center approximation',
  problemSlug: 'clustering',
  rivals: [
    {
      name: 'Greedy k-center × Farthest-first traversal',
      isThisUnit: true,
      algoName: 'Greedy k-center',
      cost: 'O(nk) distances: k passes over n points',
      wins: (
        <>
          <strong>Never above 2 × OPT</strong>, proven and measured (worst
          1.922, exactly 2.000 on the tight family); the witness is a free
          lower bound; 1.0 ms for a thousand points.
        </>
      ),
      costs: (
        <>
          1.285 × OPT on average; one outlier eats a center; sum of squares
          2,828 against Lloyd&apos;s 600.
        </>
      ),
      when: 'The worst trip is the cost, you want a certificate, or you need seeds for everything else.',
    },
    {
      name: 'K-means × K-means++ seeding',
      algoName: 'K-means',
      cost: 'O(nk) per Lloyd iteration, 12 iterations here',
      wins: (
        <>
          The <strong>sum of squares</strong>: 600 after Lloyd against the
          traversal&apos;s 2,828; centers sit in dense cores, not on
          stragglers.
        </>
      ),
      costs: (
        <>
          Max radius 4.185 at seeding (worst 5.382 over ten seeds), 3.507 after
          Lloyd, against 2.806; random, so no worst-case bound.
        </>
      ),
      when: 'The average trip is the cost and the outliers are noise; seed it with the traversal (2.607, the best radius here) when both matter.',
    },
    {
      name: 'K-medoids × PAM swaps',
      algoName: 'K-medoids',
      cost: 'O(nk) per candidate swap; 210 evaluations here',
      wins: (
        <>
          Real points as centers and the sum of distances minimized: 1,592
          down to 627 from the traversal&apos;s start.
        </>
      ),
      costs: (
        <>
          The max radius rises to 4.478 as centers chase the sum; the same
          swaps aimed at the max found nothing in 210 tries.
        </>
      ),
      when: 'Centers must be actual items (exemplar images, hub cities) and the total distance is the bill.',
    },
    {
      name: 'Greedy set cover × Threshold method (Hochbaum-Shmoys)',
      algoName: 'Greedy set cover',
      cost: 'sort all pairwise distances, then a binary search of greedy covers',
      wins: (
        <>
          The same factor of 2 by a different proof; <strong>1.241 × OPT</strong>{' '}
          mean on the exact instances and 2.501 on the thousand points, both
          better than the traversal.
        </>
      ),
      costs: (
        <>
          O(n²) distances sorted (500,000 here) against the traversal&apos;s
          nk; the greedy cover is arbitrary where the traversal is canonical.
        </>
      ),
      when: 'The distance matrix is already in hand, or the problem is weighted and the bottleneck framework fits.',
    },
  ],
  neverUse: {
    name: 'Arbitrary centers for a worst-case cost',
    why: (
      <>
        Pick k points at random and call them centers. On the exact
        instances that averaged <strong>2.089 × OPT</strong> with a worst
        case of 6.788, where the traversal averaged 1.285 and never passed
        1.922; on the thousand points random centers gave a radius of 5.546,
        1.98 × the traversal&apos;s, with no bound attached. The opposite
        mistake is exhaustive search: 560, 1,820, 4,368, 8,008 subsets for 3
        to 6 centers among 16 points, and C(1000, 10) = 2.6 × 10²³ subsets,
        about 1.4 × 10¹⁰ years at the measured pace. The traversal spends a
        millisecond and hands you a certificate.
      </>
    ),
  },

  contest: {
    instance:
      '230 small instances (12 points with 3 centers, 14 with 4) with the exact optimum by brute force; 1,000 points in ten Gaussian clusters with 10% uniform noise and k = 10; ten clean clusters of 60 for the outlier test; one referee: the max radius, with the sum of squares reported beside it',
    columns: ['exact instances: mean / worst ratio', 'n = 1,000: max radius', 'n = 1,000: sum of squares', 'guarantee'],
    rows: [
      {
        method: 'farthest-first traversal',
        isThisUnit: true,
        values: ['1.285 / 1.922', '2.806 (1.0 ms)', '2,828', '2 × OPT, proven'],
        best: 3,
        verdict: 'the guarantee, k passes',
      },
      {
        method: 'threshold method (Hochbaum-Shmoys)',
        values: ['1.241 / 1.790', '2.501', '1,286', '2 × OPT, proven'],
        verdict: 'a touch better, a sort dearer',
      },
      {
        method: 'k-means++ then Lloyd',
        values: ['not run', '4.185 then 3.507', '1,062 then 600', 'none on the radius'],
        verdict: 'owns the sum of squares',
      },
      {
        method: 'traversal then Lloyd',
        values: ['not run', '2.607', '676', 'none after Lloyd'],
        verdict: 'the best radius here',
      },
      {
        method: 'random centers',
        values: ['2.089 / 6.788', '5.546', 'not run', 'none'],
        verdict: 'the negative example',
      },
    ],
    source:
      'python solutions/greedy_k_center_farthest_first_traversal.py prints these tables and asserts: the traversal is within 2 × OPT on all 230 exact instances; r ≤ min pairwise distance of the k + 1 witness points ≤ 2 OPT on every instance; the tight family returns exactly 2.000 for k = 1 to 5; the threshold method never exceeds 2 × OPT; on the thousand points the traversal’s radius is below every k-means++ seeding and below Lloyd’s mean while Lloyd’s sum of squares is below the traversal’s; PAM swaps lower the sum and raise the radius; the outlier becomes a center and the bulk radius grows by more than half; the exact search evaluates exactly C(16, k) subsets.',
  },

  figure: (
    <Figure
      id="fig-k-center-ratios"
      aspect="16 / 7"
      caption="Left: ratio of radius to the exact optimum over 230 small instances, mean (solid) and worst (outline), for the traversal, the threshold method, and random centers; the two provable methods never reach the dashed line at 2, random centers pass it on average. Right: max radius on 1,000 points with k = 10 for seven placements. The traversal and the threshold method sit lowest; k-means++ and PAM, which optimize sums, sit highest; Lloyd started from the traversal’s centers is the best of all."
      cite={{
        text: 'T. F. Gonzalez, "Clustering to minimize the maximum intercluster distance," Theoretical Computer Science 38, 1985. D. S. Hochbaum and D. B. Shmoys, "A best possible heuristic for the k-center problem," Mathematics of Operations Research 10(2), 1985. W. L. Hsu and G. L. Nemhauser, "Easy and hard bottleneck location problems," Discrete Applied Mathematics 1, 1979.',
        href: 'https://doi.org/10.1016/0304-3975(85)90224-5',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Bar chart of mean and worst approximation ratios for three methods on exact instances, beside a bar chart of max radius for seven center placements on a thousand points">
        {(() => {
          const bars = [['traversal', 1.285, 1.922, '#5da2ff'], ['threshold', 1.241, 1.79, '#f0b94b'], ['random', 2.089, 6.788, '#e2606c']];
          const y = (r) => 230 - Math.min(r - 1, 2.6) * 70;
          const big = [['traversal', 2.806, '#5da2ff'], ['threshold', 2.501, '#f0b94b'], ['FFT+Lloyd', 2.607, '#5da2ff'], ['k-means++', 4.185, '#9aa5bd'], ['Lloyd', 3.507, '#9aa5bd'], ['PAM', 4.478, '#9aa5bd'], ['random', 5.546, '#e2606c']];
          const by = (r) => 230 - r * 32;
          return (
            <g fontFamily="ui-monospace, monospace">
              <text x="20" y="22" fill="#9aa5bd" fontSize="10">radius / OPT on 230 exact instances: mean (solid), worst (outline)</text>
              <line x1="30" y1={y(2)} x2="290" y2={y(2)} stroke="#e2606c" strokeDasharray="4 3" />
              <text x="236" y={y(2) - 4} fill="#e2606c" fontSize="9">2 x OPT</text>
              {bars.map(([name, m, w, c], i) => (
                <g key={name}>
                  <rect x={40 + i * 85} y={y(w)} width="56" height={230 - y(w)} fill="none" stroke={c} strokeOpacity="0.8" />
                  <rect x={46 + i * 85} y={y(m)} width="44" height={230 - y(m)} fill={c} fillOpacity="0.85" />
                  <text x={38 + i * 85} y={y(w) - 5} fill={c} fontSize="9">{m.toFixed(3)} / {w.toFixed(3)}</text>
                  <text x={44 + i * 85} y="246" fill="#9aa5bd" fontSize="9">{name}</text>
                </g>
              ))}
              <text x="20" y="268" fill="#62d98a" fontSize="10">the provable methods stop under 2; random centers pass it on average</text>
              <text x="330" y="22" fill="#9aa5bd" fontSize="10">max radius, 1,000 points, k = 10</text>
              {big.map(([name, r, c], i) => (
                <g key={name}>
                  <rect x={330 + i * 43} y={by(r)} width="34" height={230 - by(r)} fill={c} fillOpacity="0.85" />
                  <text x={328 + i * 43} y={by(r) - 5} fill={c} fontSize="9">{r.toFixed(2)}</text>
                  <text x={326 + i * 43} y="246" fill="#9aa5bd" fontSize="8">{name}</text>
                </g>
              ))}
              <text x="330" y="268" fill="#f0b94b" fontSize="10">sums of squares run the other way: Lloyd 600, traversal 2,828</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'greedy_k_center_farthest_first_traversal.py',
  Viz: KCenterViz,
  narration,
};
