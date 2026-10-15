import DistanceVectorViz from '../viz/DistanceVectorViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/distance_vector_routing_bellman_ford_exchange.py?raw';
import { narration } from './distance-vector-routing-bellman-ford-exchange.narration.js';

export const content = {
  given:
    'A network of routers and links. Each router knows only its own links and can talk only to its neighbors. Give every router a next hop toward every destination, with no central map, and keep the tables right when a link dies.',
  task: 'Distance-vector routing. The algorithm (RIP, RFC 1058): every router keeps a vector with its best known distance to each destination and the neighbor that gets it there. The heuristic is the Bellman-Ford exchange: every update interval a router hands its vector to each neighbor and relaxes each entry to the minimum over neighbors of link cost plus advertised distance, so the tables settle in L − 1 intervals, L being the longest hop count among the cheapest paths. The famous failure: when a link dies, routers hand each other a dead route and count it upward one step per interval until a finite “infinity” (16 in RIP) stops them.',
  constraint:
    'Measured: on 200 random connected weighted graphs (18.7 routers, 38.4 links) the quiet tables equal an independent Dijkstra and Floyd-Warshall on every pair, next hops reach every destination at the referee’s cost, and the busy intervals equal L − 1 on 200 of 200 graphs (max L 8): 5.49 intervals including the quiet one, 438 vectors and 9,261 entries per graph, 37 numbers per router; a link-state flood completes in exactly the hop diameter, 4.14 rounds, with 5,794 records and 114 numbers per router. The chain A-B-C after the A-B link fails: the plain exchange counts 3, 4, 5, … 15 and then infinity over 15 intervals (7.5 minutes at RIP’s 30 s interval); split horizon and poison reverse settle in 2; triggered updates make the same 15 changes in one interval; with no cap the dead route reads 1,002 after 1,000 intervals and is still rising. Poison reverse never counts in 500 random asynchronous orders on the chain, but the RFC 1058 triangle counts to 15 in lockstep under all three rules, and 565 of 1,000 random orders fall into three-router deception. On 99 random meshes where a router loses every link, all three variants take 15.0 intervals and reach 15, split horizon saving only entries (8,789 against 10,626). 2.0 s.',

  origins: (
    <p>
      Richard Bellman&apos;s 1958 note &quot;On a Routing Problem&quot;
      (<strong>Quarterly of Applied Mathematics</strong>) and Lester Ford&apos;s
      1956 RAND paper gave the relaxation for one machine holding the whole
      graph. The ARPANET distributed it in 1969, every node exchanging its delay
      table with its neighbors; the loops and slow convergence led McQuillan,
      Richer, and Rosen to replace it with link-state flooding (1980). The
      exchange lived on in Berkeley Unix&apos;s routed (1983) and in RIP, which
      Charles Hedrick wrote down as RFC 1058 (1988) with the infinity of 16,
      split horizon, poison reverse, and triggered updates. BGP (1989) kept the
      vector but attached the whole path to each entry so a router can see
      itself in a loop. The centralized ancestor is puzzle 34; the rival&apos;s
      engine is puzzle 7.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>table and the forwarding</strong>: one entry per
      destination, distance plus next hop, read once per packet, and nothing
      else in memory: <strong>37 numbers per router against 114</strong> for a
      link-state router holding the map. Once quiet, the tables equal Dijkstra
      and Floyd-Warshall on 200 of 200 random graphs, and the next hops compose
      into loop-free paths at the referee&apos;s cost.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>learning</strong>: hand the vector to each neighbor every
      interval, relax to the cheapest offer heard. In lockstep the bound is
      exact: <strong>L − 1 busy intervals on 200 of 200 graphs</strong>, never
      more than 7. It is also where the trouble lives: an offer carries no
      path, so a router cannot tell that the cheap route it hears from a
      neighbor runs back through itself. Fifteen intervals of counting on the
      chain, on the triangle, and on every one of 99 meshes that lost a router.
    </p>
  ),

  picture: (
    <p>
      Picture a town where nobody owns a map. Every shopkeeper keeps a card:
      for each other shop, how far it is and which door to leave by. Each
      morning every shopkeeper shows the card to the neighbors across the
      street, and each copies in any shorter figure plus the one step across.
      In a few mornings every card is right. Then a bridge washes out. The
      neighbor&apos;s card still says the far bank is two away, by way of the
      bridge shop, so the bridge shop writes three; next morning the neighbor
      sees three and writes four. They are describing a road that no longer
      exists, and only a rule that fifteen is as far as anything can be makes
      them stop.
    </p>
  ),

  steps: [
    <>
      <strong>Initialize:</strong> distance 0 to yourself, the link cost to
      each neighbor with that neighbor as next hop, infinity to everyone else.
    </>,
    <>
      <strong>Exchange:</strong> every update interval, hand the vector to each
      neighbor; under split horizon omit the routes through that neighbor, under
      poison reverse send them as infinity.
    </>,
    <>
      <strong>Relax:</strong> for each destination take the minimum over
      neighbors of link cost plus advertised distance; keep the current next
      hop on ties; a result at or above the cap (16) is infinity.
    </>,
    <>
      <strong>Settle:</strong> repeat until an interval changes nothing, next
      hops included: L − 1 busy intervals, then one quiet one.
    </>,
    <>
      <strong>Survive a failure:</strong> drop the direct entry and let the
      exchange re-route; when the destination is gone, expect the count to
      infinity, and verify every quiet table against an independent Dijkstra.
    </>,
  ],

  signals: [
    <>
      <strong>Routers that cannot hold a map:</strong> small memory, few
      links, one vector per neighbor per interval as the whole control
      traffic.
    </>,
    <>
      <strong>A stable network where the bound is the story:</strong> L − 1
      intervals and the tables equal Dijkstra, with nothing flooded.
    </>,
    <>
      <strong>A failure you can afford to wait out:</strong> at 30 s intervals
      the plain count is 7.5 minutes; triggered updates make it seconds; if you
      cannot afford even that, carry the path (BGP) or flood the map (OSPF).
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>link-state routing</strong>: flood every
      router&apos;s link records, then run Dijkstra everywhere. 4.14 flood rounds
      against 5.49 intervals, 5,794 records against 9,261 entries, never an
      inflated distance, at 114 numbers per router against 37.
    </>
  ),

  strength: (
    <>
      <strong>Tiny state, local talk, and exactly the Bellman-Ford bound.</strong>{' '}
      L − 1 intervals on 200 of 200 graphs; tables equal to two independent
      referees; loop-free paths at the referee&apos;s cost; 37 numbers per router.
    </>
  ),
  weakness: (
    <>
      <strong>An offer carries no path, so dead routes circulate.</strong> 15
      intervals on the chain, the triangle, and 99 of 99 meshes that lost a
      router; poison reverse fixes two-router loops only (565 of 1,000
      asynchronous orders still deceived on the triangle); without the cap,
      1,002 and counting.
    </>
  ),

  problem: 'Network routing',
  problemSlug: 'network-routing',
  rivals: [
    {
      name: 'Distance-vector routing × Bellman-Ford exchange',
      isThisUnit: true,
      algoName: 'Distance-vector routing',
      cost: 'O(n) entries per router per interval to each neighbor; L − 1 intervals to settle',
      wins: (
        <>
          <strong>Tables equal Dijkstra on 200 of 200 graphs</strong> in exactly
          L − 1 intervals with 37 numbers per router and nothing flooded.
        </>
      ),
      costs: (
        <>
          A dead destination costs 15 intervals of counting on the chain, the
          triangle, and every mesh measured: 7.5 minutes at RIP&apos;s pace.
        </>
      ),
      when: 'Small routers, few links, failures you can wait out: the default inside a small stable network.',
    },
    {
      name: 'Link-state routing × Dijkstra shortest paths',
      algoName: 'Link-state routing',
      cost: 'flood 2E link records to every router, then one Dijkstra each',
      wins: (
        <>
          The flood completes in <strong>exactly the hop diameter</strong>, 4.14
          rounds against 5.49 intervals, 5,794 records against 9,261 entries; no
          distance is ever inflated and a dead link is one flood.
        </>
      ),
      costs: (
        <>
          Every router holds the map, 114 numbers against 37, and pays 1,635
          Dijkstra relaxations per graph on every change.
        </>
      ),
      when: 'Any network whose convergence time matters and whose routers can afford the map: OSPF and IS-IS.',
    },
    {
      name: 'Path-vector routing × AS-path selection',
      algoName: 'Path-vector routing',
      cost: 'a vector whose entries carry the whole path',
      wins: (
        <>
          A router that sees itself in an advertised path drops it, so the
          three-router deception that counts to 15 here is caught on receipt:
          no count, no cap.
        </>
      ),
      costs: (
        <>
          Paths instead of numbers in every entry, slower propagation, and
          policy on top of distance: BGP&apos;s whole complexity.
        </>
      ),
      when: 'Between networks that do not trust each other and need policy as well as reachability: BGP.',
    },
    {
      name: 'Bellman-Ford × Early-exit relaxation',
      algoName: 'Bellman-Ford',
      cost: 'O(VE) worst case on one machine, exiting when a pass changes nothing',
      wins: (
        <>
          The same relaxation with the whole graph in one place: the same L − 1
          passes, negative edges allowed, no stale vectors and no counting.
        </>
      ),
      costs: (
        <>
          Needs the whole graph on one machine; a router has only its own
          links, which is the entire reason the exchange exists.
        </>
      ),
      when: 'Shortest paths on a machine that holds the graph, with negative edges or cycles to detect: puzzle 34.',
    },
  ],
  neverUse: {
    name: 'The vector exchange with no finite infinity, on links that fail',
    why: (
      <>
        Take the cap off. On the chain A-B-C after the A-B link dies, B and C
        hand the dead route back and forth forever: measured,{' '}
        <strong>after 1,000 intervals they believe A is 1,002 hops away and
        are still counting</strong>. The cap of 16 is the only reason the
        network heals, and even with it the plain count costs 15 intervals on
        the chain, the triangle, and 99 of 99 meshes that lost a router. Never
        run the plain exchange across a network whose minutes of black hole you
        cannot afford: carry the path (BGP) or flood the map (OSPF).
      </>
    ),
  },

  contest: {
    instance:
      'The chain A-B-C after the A-B link fails, destination A, infinity 16, lockstep; referees: Dijkstra and Floyd-Warshall for every quiet table, the exact L − 1 bound on 200 random graphs, BFS for the flood',
    columns: ['intervals to settle', 'worst distance held', 'what happens', 'cost'],
    rows: [
      {
        method: 'plain exchange, infinity 16',
        isThisUnit: true,
        values: ['15', '15', 'B and C hand the dead route back and forth: 3, 4, 5, … 15, then infinity', '7.5 minutes of black hole at a 30 s interval'],
        verdict: 'heals, slowly, because of the cap',
      },
      {
        method: 'split horizon, with or without poison reverse',
        values: ['2', '2 (the stale truth)', 'C never offers B a route through B, so B drops A at once; the triangle still counts to 15', 'fewer entries on the meshes: 8,789 against 10,626'],
        best: 0,
        verdict: 'a two-router fix',
      },
      {
        method: 'plain exchange + triggered updates',
        values: ['1', '15', 'the same 15 changes to the dead route, inside one interval', 'a burst of updates on every change'],
        verdict: 'the same count, in seconds',
      },
      {
        method: 'link state (flood + Dijkstra)',
        values: ['1 flood round', '2 (the stale truth)', 'B floods the dead link once; every router recomputes', '114 numbers per router against 37'],
        verdict: 'no counting at all',
      },
      {
        method: 'plain exchange, no cap',
        values: ['> 1,000', '1,002', 'still counting', 'the network never heals'],
        verdict: 'never this',
      },
    ],
    source:
      'python solutions/distance_vector_routing_bellman_ford_exchange.py prints these numbers and asserts every one: the referee equalities and the exact L − 1 bound on 200 graphs, the flood in the BFS hop diameter, the chain’s 15, 2, and 1 intervals with 15 changes, no count in 500 random orders under poison reverse, the triangle’s 15 under all three rules and in a majority of 1,000 random orders, 15 on every mesh variant, and the uncapped route above 1,000.',
  },

  figure: (
    <Figure
      id="fig-count-to-infinity"
      aspect="16 / 7"
      caption="The chain A-B-C after the A-B link fails: the distance to A held by B (amber) and C (blue) after each update interval. Under the plain exchange they hand each other the dead route and climb 3, 4, 5, … 15 until the cap of 16 (red) turns it to infinity at intervals 14 and 15; under split horizon (green, dashed) C never offers B a route through B, so B drops A at interval 1 and C at interval 2."
      cite={{
        text: 'C. Hedrick, "Routing Information Protocol," RFC 1058, 1988. R. Bellman, "On a Routing Problem," Quarterly of Applied Mathematics 16(1), 1958.',
        href: 'https://doi.org/10.17487/RFC1058',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="The count to infinity on the failed chain under the plain exchange, against the two-interval drop under split horizon">
        {(() => {
          const lx = (i) => 60 + i * 34;
          const ly = (d) => 236 - d * 11;
          const steps = (arr) => arr.map((d, i) => `${lx(i)},${ly(d)} ${lx(i + 1)},${ly(d)}`).join(' ') + ` ${lx(arr.length + 1)},${ly(16)}`;
          const drop = (d, i) => `${lx(0)},${ly(d)} ${lx(i)},${ly(d)} ${lx(i)},${ly(16)}`;
          return (
            <g fontFamily="ui-monospace, monospace" fontSize="9" fill="#9aa5bd">
              <text x="60" y="20" fontSize="10">distance to A held by B and C after each update interval, A-B link dead at interval 0</text>
              <path d="M60 236.5H604M60 52V236" stroke="#9aa5bd" strokeOpacity="0.5" fill="none" />
              <line x1="60" y1={ly(16)} x2="604" y2={ly(16)} stroke="#e2606c" strokeWidth="1.5" strokeDasharray="4 3" />
              <text x="64" y={ly(16) - 4} fill="#e2606c">infinity = 16: the route is dropped</text>
              {[2, 6, 10, 14].map((d) => <text key={d} x="42" y={ly(d) + 3}>{d}</text>)}
              {[0, 3, 6, 9, 12, 15].map((i) => <text key={i} x={lx(i) - 3} y="250">{i}</text>)}
              <text x="560" y="250" textAnchor="end">interval</text>
              <polyline points={steps([1, 3, 3, 5, 5, 7, 7, 9, 9, 11, 11, 13, 13, 15, 15])} fill="none" stroke="#f0b94b" strokeWidth="2.5" />
              <polyline points={steps([2, 2, 4, 4, 6, 6, 8, 8, 10, 10, 12, 12, 14, 14])} fill="none" stroke="#5da2ff" strokeWidth="2" />
              <polyline points={drop(1, 1)} fill="none" stroke="#62d98a" strokeWidth="2" strokeDasharray="3 3" />
              <polyline points={drop(2, 2)} fill="none" stroke="#62d98a" strokeWidth="2" strokeDasharray="3 3" />
              <text x="60" y="272" fill="#f0b94b">plain: 15 intervals to the cap</text>
              <text x="604" y="272" fill="#62d98a" textAnchor="end">split horizon: drops at 1 and 2</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'distance_vector_routing_bellman_ford_exchange.py',
  Viz: DistanceVectorViz,
  narration,
};
