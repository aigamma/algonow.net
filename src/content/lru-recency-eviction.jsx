import LruViz from '../viz/LruViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/lru_recency_eviction.py?raw';
import { narration } from './lru-recency-eviction.narration.js';

export const content = {
  given:
    'A cache holding k items, and a stream of requests arriving one at a time.',
  task: 'Serve hits from the cache; on each miss with a full cache, choose which resident to evict, maximizing hits over the whole stream.',
  constraint:
    'Decisions are online: you see the past, never the future, and every eviction is final. The adversary writing the stream has read your policy.',

  origins: (
    <p>
      IBM Research, 1966. László Bélády, studying paging for virtual memory,
      cataloged the replacement policies and described the unbeatable one:
      evict whatever is needed <strong>farthest in the future</strong>, which
      no real machine can run because it requires the future. Three years
      later he found his own anomaly: FIFO taking <strong>more</strong> page
      faults with <strong>more</strong> memory. The field&apos;s second
      founding moment came in 1985, when Sleator and Tarjan invented
      competitive analysis on exactly this problem and proved LRU is
      k-competitive, and that <strong>no deterministic online policy does
      better</strong>. Caching is where the theory of online algorithms was
      born, and this page runs its founding experiments.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>online discipline</strong>: serve a hit, fetch a
      miss, evict only when full, never revisit a decision. With a hash map
      over a doubly linked list, every operation is O(1), which is why the
      same structure sits in CPUs (approximated in hardware), databases,
      kernels, and every interview loop. The framework is policy-agnostic:
      it holds a socket open for one question, <strong>who dies?</strong>
    </p>
  ),
  heurRole: (
    <p>
      Answers with <strong>recency</strong>: evict the least recently used.
      That is a bet about the world, temporal locality: what was touched
      recently will be touched again soon, so the resident coldest by
      recency is the one whose future is least promising. The bet carries a
      guarantee (k-competitive, and the <strong>stack property</strong>:
      more memory can never hurt, verified at every step in the tested
      solution) and one famous blind spot the contest measures: a
      sequential scan a hair larger than the cache, where recency predicts
      exactly backwards.
    </p>
  ),

  picture: (
    <p>
      A coat-check room with 64 hooks at a party of a thousand coats. Each
      time a coat is requested that is not on a hook, one hanging coat must
      go to deep storage. The recency clerk&apos;s rule: the coat untouched
      longest goes. Most nights this is brilliant, because the same dozen
      regulars keep stepping out and back in. Then comes the conga line:
      eighty guests file past in strict rotation, and the clerk ships each
      coat to storage <strong>moments before its owner returns</strong>,
      every single time, all night. The clerk is not stupid; the pattern is
      simply the exact inverse of the bet.
    </p>
  ),

  steps: [
    <>
      <strong>Hit:</strong> serve it, and move the item to the
      most-recent end of the list. This touch is the whole bookkeeping.
    </>,
    <>
      <strong>Miss, cache not full:</strong> fetch and insert at the
      most-recent end.
    </>,
    <>
      <strong>Miss, cache full:</strong> evict the item at the
      least-recent end, then insert. O(1) with a hash map into a doubly
      linked list.
    </>,
    <>
      <strong>Never look ahead:</strong> the policy reads nothing but the
      order of past touches. That is what online means.
    </>,
    <>
      <strong>Trust the structure:</strong> the recency list makes LRU a
      stack algorithm: the k-cache&apos;s contents are always a subset of
      the (k+1)-cache&apos;s, so growing memory monotonically helps.
    </>,
  ],

  signals: [
    <>
      Reuse is driven by <strong>temporal locality</strong>: working sets,
      sessions, hot keys. This is most real workloads, most of the time.
    </>,
    <>
      The workload <strong>drifts</strong>: today&apos;s hot set is not
      last week&apos;s. Recency forgets instantly; frequency does not
      (measured below: LFU 49.3% falling to 17.0%).
    </>,
    <>
      You need <strong>O(1)</strong> per request and an eviction rule you
      can reason about under adversarial load.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>FIFO</strong>: evict by arrival,
      ignore use. On the web-shaped trace it manages 34.7% against
      LRU&apos;s 39.6%, and the five-point gap is precisely the value of
      re-timestamping on every touch. FIFO also carries a genuine defect
      LRU provably cannot have: <strong>Bélády&apos;s anomaly</strong>,
      pinned in the figure below, where giving FIFO a bigger cache takes
      more faults, not fewer.
    </>
  ),

  strength: (
    <>
      <strong>A guarantee, a monotonicity, and O(1).</strong> No
      deterministic online policy beats LRU&apos;s k-competitiveness
      (Sleator-Tarjan); the stack property means more memory never hurts
      (asserted at every step of a 30,000-request trace); and it adapts to
      drift instantly: 39.6% on the stationary trace, 39.6% on the
      drifting one.
    </>
  ),
  weakness: (
    <>
      <strong>Two famous blind spots.</strong> The scan: a cyclic sweep of
      80 items through 64 slots scores <strong>exactly 0.0%</strong>,
      evicting every item moments before reuse, while blind random
      eviction scores 62.5%. And one-hit wonders: a stream of cold items
      flushes the hot set, which is what admission policies (2Q, TinyLFU)
      and scan-resistant hybrids (ARC, LIRS) exist to fix.
    </>
  ),

  problem: 'Page replacement and caching policy',
  problemSlug: 'page-replacement',
  rivals: [
    {
      name: 'LRU × recency',
      isThisUnit: true,
      algoName: 'LRU caching',
      cost: 'O(1) per request',
      wins: (
        <>
          <strong>39.6%</strong> on both zipf traces, stationary and
          drifting alike: recency forgets at exactly the speed the world
          changes. Plus the only per-policy guarantee on the bench.
        </>
      ),
      costs: (
        <>
          The scan zeroes it (<strong>0.0%</strong> measured), and every
          hit pays a list-touch (Clock approximates that away with one
          reference bit per page).
        </>
      ),
      when: 'The default eviction policy wherever temporal locality is plausible, which is nearly everywhere.',
    },
    {
      name: 'FIFO paging',
      cost: 'O(1) per request',
      wins: (
        <>
          No bookkeeping on hits at all: arrival order is fixed at
          admission. Simplest possible state.
        </>
      ),
      costs: (
        <>
          Ignoring use costs five points here (34.7%), and it suffers
          Bélády&apos;s anomaly: on his 1969 string it takes{' '}
          <strong>9 faults with 3 frames and 10 with 4</strong>, pinned in
          the tested solution.
        </>
      ),
      when: 'Hardware and firmware corners where even a reference bit is too expensive.',
    },
    {
      name: 'LFU caching',
      cost: 'O(log k) or O(k) per miss',
      wins: (
        <>
          On stationary popularity it is the best online policy here:{' '}
          <strong>49.3%</strong>, ten points over LRU, because stable fame
          is frequency&apos;s home turf.
        </>
      ),
      costs: (
        <>
          It cannot forget: after one popularity shuffle its stale counts
          pin yesterday&apos;s celebrities and it collapses to{' '}
          <strong>17.0%</strong>, worst on the bench. Real LFU deployments
          need aging or windowing (TinyLFU) for exactly this reason.
        </>
      ),
      when: 'Genuinely stationary popularity: CDN long-tails, embedding caches, static corpora.',
    },
    {
      name: "Belady's algorithm",
      cost: 'needs the future',
      wins: (
        <>
          The ceiling itself: <strong>62.3% / 62.2% / 79.7%</strong> across
          the three traces, verified optimal against an exhaustive DP on
          small instances. Every gap below these numbers is the price of
          not knowing the future.
        </>
      ),
      costs: (
        <>
          It evicts the item needed <strong>farthest in the future</strong>,
          so it cannot run online, ever. Its role is the measuring stick,
          and lately the teacher: modern learned policies train to imitate
          its offline decisions.
        </>
      ),
      when: 'Offline analysis only: sizing caches, grading policies, generating labels.',
    },
  ],
  neverUse: {
    name: "Belady's OPT as a production policy",
    why: (
      <>
        It is the strongest row in the table and it is{' '}
        <strong>not a policy</strong>: the rule &quot;evict what is needed
        farthest in the future&quot; consumes information no online system
        possesses. Reaching for it in production is a category error about
        time itself. Its real jobs are offline: the upper bound that tells
        you whether a better policy is even possible (here: 22 points of
        headroom above LRU), the cache-sizing oracle, and the label source
        that learned evictors imitate. The moment someone claims a
        deployed cache &quot;implements OPT&quot;, they are describing a
        predictor, and it should be graded as one.
      </>
    ),
  },

  contest: {
    instance:
      'a 64-slot cache, 100,000 requests per trace, hit rate: a stationary Zipf web trace over 1,000 objects, the same trace with the popularity ranking reshuffled every 20,000 requests, and a cyclic scan of 80 items',
    columns: ['stationary zipf', 'drifting zipf', 'looping scan'],
    rows: [
      {
        method: 'LRU × recency',
        isThisUnit: true,
        values: ['39.6%', '39.6%', '0.0%'],
        best: 1,
        verdict: 'identical under drift: recency forgets at the speed of change',
      },
      {
        method: 'FIFO',
        values: ['34.7%', '34.8%', '0.0%'],
        verdict: 'use-blind: five points cheaper, plus the anomaly',
      },
      {
        method: 'Random eviction',
        values: ['34.8%', '34.7%', '62.5%'],
        verdict: 'unprincipled and scan-proof: no pattern can invert luck',
      },
      {
        method: 'LFU',
        values: ['49.3%', '17.0%', '0.0%'],
        best: 0,
        verdict: 'owns stationary fame, then its memory becomes the disease',
      },
      {
        method: 'Belady OPT (offline)',
        values: ['62.3%', '62.2%', '79.7%'],
        best: 2,
        verdict: 'the clairvoyant ceiling: every gap below is the price of no future',
      },
    ],
    source:
      'python solutions/lru_recency_eviction.py prints this table and asserts Belady optimal against an exhaustive DP over cache states on 50 small instances, the LRU stack property (32-slot cache ⊆ 33-slot cache) at every step of 30,000 requests, Bélády’s anomaly pinned exactly (FIFO: 9 faults at 3 frames, 10 at 4), residency and hit-truth invariants for every policy, and all the column orderings.',
  },

  figure: (
    <Figure
      id="fig-belady-anomaly"
      aspect="16 / 7"
      caption="Bélády's anomaly, on Bélády's own request string. FIFO with three frames takes nine faults; give it a fourth frame and it takes ten. Eviction by arrival order lacks the stack property: the bigger cache does not contain the smaller one's residents, so extra memory can actively hurt. LRU is immune by construction, and the tested solution asserts the inclusion at every step: recency makes the k-cache a prefix of the (k+1)-cache, always."
      cite={{
        text: 'Bélády, "A Study of Replacement Algorithms for a Virtual-Storage Computer", IBM Systems Journal 5(2), 1966; the anomaly is Bélády, Nelson, and Shedler, CACM 12(6), 1969. The competitive guarantee is Sleator and Tarjan, CACM 28(2), 1985.',
        href: 'https://doi.org/10.1147/sj.52.0078',
      }}
    >
      <svg viewBox="0 0 640 300" role="img" aria-label="The same 12-request string run through FIFO with three frames (nine faults) and four frames (ten faults)">
        <text x="20" y="24" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12">requests: 1 2 3 4 1 2 5 1 2 3 4 5</text>
        <text x="20" y="60" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="12">FIFO · 3 frames</text>
        {[1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5].map((r, i) => {
          const miss3 = [1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0][i];
          return (
            <g key={`a${i}`}>
              <rect x={150 + i * 39} y={44} width={33} height={26} rx={4} fill={miss3 ? 'rgba(224,103,103,0.25)' : 'rgba(98,217,138,0.2)'} stroke={miss3 ? '#e06767' : '#62d98a'} strokeWidth="1.2" />
              <text x={166 + i * 39} y={62} textAnchor="middle" fill={miss3 ? '#e06767' : '#62d98a'} fontFamily="ui-monospace, monospace" fontSize="13">{r}</text>
            </g>
          );
        })}
        <text x="20" y="118" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="12">FIFO · 4 frames</text>
        {[1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5].map((r, i) => {
          const miss4 = [1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1][i];
          return (
            <g key={`b${i}`}>
              <rect x={150 + i * 39} y={102} width={33} height={26} rx={4} fill={miss4 ? 'rgba(224,103,103,0.25)' : 'rgba(98,217,138,0.2)'} stroke={miss4 ? '#e06767' : '#62d98a'} strokeWidth="1.2" />
              <text x={166 + i * 39} y={120} textAnchor="middle" fill={miss4 ? '#e06767' : '#62d98a'} fontFamily="ui-monospace, monospace" fontSize="13">{r}</text>
            </g>
          );
        })}
        <text x="20" y="176" fill="#e06767" fontFamily="ui-monospace, monospace" fontSize="13">3 frames: 9 faults · 4 frames: 10 faults · more memory, more misses</text>
        <line x1="20" y1="196" x2="620" y2="196" stroke="#232c40" strokeWidth="1" />
        <text x="20" y="226" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">LRU cannot do this: at every instant, the k-slot cache is a subset of the</text>
        <text x="20" y="244" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">(k+1)-slot cache (the stack property), so hits only rise with memory.</text>
        <text x="20" y="276" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12">asserted step-by-step across 30,000 requests in the tested solution</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'lru_recency_eviction.py',
  Viz: LruViz,
  narration,
};
