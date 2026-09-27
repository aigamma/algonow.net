import GcViz from '../viz/GcViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/garbage_collection_mark_and_sweep.py?raw';
import { narration } from './garbage-collection-mark-and-sweep.narration.js';

export const content = {
  given:
    'A program allocates objects that point at each other, drops references as it goes, and never frees anything itself. Something must find the objects no longer reachable from the program’s roots and give their memory back, without ever freeing one still in use. On this page the heap is 20,000 slots and the program runs 60,000 allocation steps of small linked objects with a rolling root set and, every few steps, a two-object cycle.',
  task: 'Garbage collection: when the heap fills, stop the program, find the live objects, reclaim the rest. Mark and sweep is the heuristic for finding them: mark every object reachable from the roots by following pointers, then sweep the whole heap and free whatever is unmarked. Reachability is the definition of live, so the collector cannot be wrong about a cycle, a shared object, or a chain of any depth.',
  constraint:
    'Measured against an independent breadth-first traversal from the roots: 14 collections, each keeping exactly the reachable set and leaving no dangling pointer, and after a final collection 0 unreachable objects remain. Reference counting on the same 60,000-step program runs out of heap at step 7,839 holding 4,912 unreachable objects it can never free (4,980 allocated, 68 reachable); an arena that never frees fails at allocation 4,385. Cost per collection with 6 / 28 / 50% of the heap live: mark 295 / 1,292 / 2,294 objects, sweep 4,268 / 4,272 / 4,390; a copying collector copies 290 / 1,291 per collection and fails at 50% live because it can use only half the heap. Fragmentation after 60,000 steps with a long-lived object pinned every 25 (2,400 objects, 5,986 slots): 13,640 free slots in 1,294 holes, the largest 55, so a 512-slot request fails; the copying collector has 3,640 free slots in one block and the request succeeds.',

  origins: (
    <p>
      John McCarthy described mark and sweep in <strong>1960</strong> in
      the paper that introduced LISP (&quot;Recursive functions of
      symbolic expressions and their computation by machine, Part
      I&quot;, Communications of the ACM), as the way the machine would
      &quot;reclaim&quot; list cells no longer in use: mark from the
      registers, then sweep the free-storage list back together. Collins
      (1960) proposed reference counting the same year, and the two
      have been rivals since. Cheney (1970) gave the copying collector
      that compacts as it goes; Dijkstra, Lamport, Martin, Scholten, and
      Steffens (1978) the tri-color abstraction that lets marking run
      concurrently with the program; Lieberman and Hewitt (1983) and
      Ungar (1984) the generational idea that most objects die young;
      Boehm and Weiser (1988) a conservative collector for C. Jones and
      Lins&apos; book (1996) is the standard reference. Go&apos;s
      collector is a concurrent tri-color mark-sweep, Java&apos;s are
      generational and compacting, and Python runs reference counting
      with a cycle collector behind it, which is exactly the leak on
      this page.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>definition of garbage</strong>: an object is live
      if and only if the program can reach it from its roots, and the
      collector&apos;s job is to compute that set exactly, then reclaim
      the complement. The referee is an independent breadth-first
      traversal of the object graph, run after every one of the 14
      collections the workload triggers: the collector keeps{' '}
      <strong>exactly the reachable set</strong> every time, no live
      object freed, no dead one kept, and every pointer in a surviving
      object still points at a surviving object. The algorithm also owns
      the proof that the program is finite: 60,000 allocation steps
      complete on a 20,000-slot heap that would be exhausted at step
      4,385 without any collection, and after a final collection the
      heap holds 0 unreachable objects.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>two passes and their prices</strong>. Mark
      follows pointers from the roots and costs the live objects: 295,
      1,292, and 2,294 per collection as the live fraction rises from
      6% to 50%. Sweep walks the whole heap and costs its size: 4,268 to
      4,390 per collection regardless, which at 6% live is{' '}
      <strong>fourteen times the mark</strong>. Because marking traces
      reachability, cycles are garbage like anything else, and the rival
      that counts references instead exhausts the same heap at step
      7,839 with 4,912 cyclic objects it can never free. Because sweeping
      frees in place, the free space becomes holes: with 2,400 long-lived
      objects scattered through the heap, 13,640 free slots sit in 1,294
      holes whose largest is 55, and a 512-slot request fails while the
      copying collector, which moves the survivors together, serves it
      from a single block of 3,640.
    </p>
  ),

  picture: (
    <p>
      A warehouse where every parcel may carry the addresses of other
      parcels, and the office keeps a short list of parcels it is
      currently working on. When the floor is full, close the doors.
      Start from the office list and put a sticker on every parcel it
      names, then on every parcel those name, and so on until no
      unstickered parcel is reachable; a ring of parcels that only name
      each other gets no sticker, however tightly they point. Then walk
      every aisle and throw out whatever has no sticker. The stickers
      cost as many steps as there are parcels in use; the walk costs as
      many as the warehouse holds, empty shelves included. And the
      thrown-out parcels leave gaps of their own sizes, so a large
      delivery may find no gap that fits while the total empty space
      would hold it many times.
    </p>
  ),

  steps: [
    <>
      <strong>Trigger:</strong> an allocation finds no hole that fits;
      stop the program.
    </>,
    <>
      <strong>Mark:</strong> push the roots; pop an object, mark it,
      push its unmarked pointers; until the stack is empty.
    </>,
    <>
      <strong>Sweep:</strong> for every object in the heap, if unmarked,
      free it and coalesce the hole with its neighbors.
    </>,
    <>
      <strong>Retry</strong> the allocation; if it still fails, the live
      data does not fit and the heap is exhausted.
    </>,
    <>
      <strong>Check:</strong> the surviving set equals reachability from
      the roots; no surviving pointer targets a freed object.
    </>,
  ],

  signals: [
    <>
      <strong>Cyclic or shared structure:</strong> graphs, doubly linked
      lists, caches that point back; reference counts cannot see a ring
      die.
    </>,
    <>
      <strong>Objects that must not move:</strong> pointers handed to
      foreign code or hardware; mark and sweep frees in place where a
      copying collector would relocate.
    </>,
    <>
      <strong>A heap mostly dead at collection time:</strong> the mark is
      cheap when little is live; the sweep is the fixed price.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>reference counting</strong>: free an
      object the instant its count reaches zero, no pauses, no tracing.
      It is exact on trees and fails on cycles, which is measured here
      as running out of a 20,000-slot heap at step 7,839 with 4,912
      objects it will never free.
    </>
  ),

  strength: (
    <>
      <strong>Exact by definition, cycles included, nothing moves.</strong>{' '}
      14 of 14 collections equal to the reachable set, 0 objects leaked
      after 60,000 steps where counting leaks 4,912, and every surviving
      object stays at its address.
    </>
  ),
  weakness: (
    <>
      <strong>The sweep, the pause, and the holes.</strong> Sweep cost is
      the heap size whatever is live, 4,268 per collection at 6% live
      against a mark of 295; the program stops while both run, which is
      the pause that concurrent and incremental collectors exist to
      hide; and freeing in place fragments the heap, 1,294 holes with a
      largest of 55 while 13,640 slots are free, so a 512-slot request
      fails where a compacting collector serves it.
    </>
  ),

  problem: 'Automatic memory management',
  problemSlug: 'garbage-collection',
  rivals: [
    {
      name: 'Garbage collection × Mark and sweep',
      isThisUnit: true,
      algoName: 'Garbage collection',
      cost: 'mark: live objects; sweep: the heap',
      wins: (
        <>
          <strong>Exact on cycles, in place</strong>; 14 of 14
          collections equal to the referee.
        </>
      ),
      costs: (
        <>
          Sweeps the whole heap; pauses; fragments.
        </>
      ),
      when: 'Cyclic data, objects that cannot move, or a heap mostly dead when the collector runs.',
    },
    {
      name: 'Reference counting',
      algoName: 'Reference counting',
      cost: 'a count update per pointer write',
      wins: (
        <>
          No pauses and immediate reclamation; memory is returned the
          moment the last reference goes.
        </>
      ),
      costs: (
        <>
          Blind to cycles: 4,912 objects leaked and the heap exhausted at
          step 7,839 here; a cost on every pointer write.
        </>
      ),
      when: 'Acyclic ownership (trees, resources) or a language that adds a cycle collector behind it.',
    },
    {
      name: "Cheney's algorithm",
      algoName: "Cheney's algorithm",
      cost: 'copy the live objects; no sweep',
      wins: (
        <>
          Cost proportional to the live data only (290 per collection at
          6% live), and the free space is always one block: the 512-slot
          request succeeds.
        </>
      ),
      costs: (
        <>
          Half the heap is reserved: failed outright at 50% live here;
          every survivor moves, so every pointer to it must be updated.
        </>
      ),
      when: 'Young or mostly-dead heaps with movable objects, as the nursery of a generational collector.',
    },
    {
      name: 'Generational garbage collection',
      algoName: 'Generational garbage collection',
      cost: 'frequent small collections of the young space',
      wins: (
        <>
          Most objects die young, so collecting the nursery often and the
          old space rarely cuts the average pause to a fraction.
        </>
      ),
      costs: (
        <>
          Write barriers to track old-to-young pointers; a full
          collection still happens, and it is mark and sweep or copying
          underneath.
        </>
      ),
      when: 'Allocation-heavy programs where pause time matters; the default in managed runtimes.',
    },
  ],
  neverUse: {
    name: 'An arena that never frees',
    why: (
      <>
        The simplest memory manager is a pointer that only moves
        forward: allocation is one addition, nothing is ever freed, and
        it is the right design for a request handler that discards
        everything at the end. For a program that runs on, it is a
        countdown. Measured: the same allocation stream that mark and
        sweep carries through all 60,000 steps on a 20,000-slot heap{' '}
        <strong>exhausts the arena at allocation 4,385</strong>, with a
        live set of a few hundred slots at the time. Reference counting
        is the subtler version of the same mistake on cyclic data: it
        frees what it can see and reaches the same wall at step 7,839.
        Reclamation has to be decided by reachability, which only a
        trace can compute.
      </>
    ),
  },

  contest: {
    instance:
      'a 20,000-slot heap under 60,000 allocation steps of small linked objects (1 to 8 slots, 0 to 2 pointers to recent objects), a rolling root set, and a two-object cycle every few steps; referee: reachability from the roots by an independent breadth-first traversal',
    columns: ['outcome', 'work per collection', 'free space'],
    rows: [
      {
        method: 'mark and sweep',
        isThisUnit: true,
        values: ['60,000 steps, 14 collections exact, 0 leaked', 'mark 295 / sweep 4,268 at 6% live', 'holes, coalesced in place'],
        best: 0,
        verdict: 'exact on cycles',
      },
      {
        method: 'mark and sweep at 28% / 50% live',
        values: ['13 / 18 collections', 'mark 1,292 / 2,294; sweep 4,272 / 4,390', '·'],
        verdict: 'mark follows the live data, sweep the heap',
      },
      {
        method: "Cheney's copying collector at 6% / 28% / 50% live",
        values: ['20 / 41 collections; fails at 50%', 'copy 290 / 1,291 / 2,234', 'one block, half the heap'],
        verdict: 'live-proportional, half the room',
      },
      {
        method: 'reference counting',
        values: ['out of heap at step 7,839', 'a count update per pointer write', '4,912 cyclic objects never freed'],
        verdict: 'blind to cycles',
      },
      {
        method: 'arena, never frees',
        values: ['out of heap at allocation 4,385', 'one addition', 'none returned'],
        verdict: 'a countdown',
      },
      {
        method: 'fragmentation: 2,400 pinned objects, then one 512-slot request',
        values: ['mark and sweep: fails; copying: succeeds', '·', '13,640 free in 1,294 holes (largest 55) vs 3,640 in one block'],
        verdict: 'free is not the same as available',
      },
    ],
    source:
      'python solutions/garbage_collection_mark_and_sweep.py prints this table and asserts: on every collection the surviving set equals the referee’s reachable set with no dangling pointer; mark and sweep completes the workload with 0 unreachable objects after a final collection while reference counting fails with more than 1,000 leaked; the arena fails before allocation 10,000; sweep exceeds five times the mark at low liveness, copying cost rises with the live data and fails above half the heap; and the 512-slot request fails under mark and sweep with more than 512 slots free in holes all smaller than 512, and succeeds under copying.',
  },

  figure: (
    <Figure
      id="fig-gc-mark-sweep"
      aspect="16 / 7"
      caption="A small heap as a strip of cells before and after one collection. Roots point into the heap; the mark phase follows every pointer and colors the reachable objects blue, including a two-object cycle that is reachable and a two-object cycle that is not. The sweep frees the unmarked objects (amber), leaving holes of their sizes between the survivors. Below: the measured costs, mark following the live data and sweep the whole heap, and the counting collector’s leak."
      cite={{
        text: 'J. McCarthy, "Recursive functions of symbolic expressions and their computation by machine, Part I," Communications of the ACM 3(4), 1960. DOI 10.1145/367177.367199. C. J. Cheney, "A nonrecursive list compacting algorithm," CACM 13(11), 1970. R. Jones, R. Lins, Garbage Collection: Algorithms for Automatic Dynamic Memory Management, Wiley, 1996.',
        href: 'https://doi.org/10.1145/367177.367199',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Two strips of heap cells, before and after a mark and sweep collection, with roots and pointers drawn, and a table of measured costs">
        {(() => {
          // objects: id, start, size, live
          const objs = [
            [1, 0, 3, true], [2, 4, 2, false], [3, 7, 4, true], [4, 12, 1, true], [5, 14, 3, false],
            [6, 18, 2, false], [7, 21, 3, true], [8, 25, 2, false], [9, 28, 4, true], [10, 33, 2, false], [11, 36, 3, true],
          ];
          const cells = 40;
          const cw = 560 / cells;
          const strip = (y, afterSweep, key) => (
            <g key={key}>
              {Array.from({ length: cells }, (_, i) => <rect key={i} x={40 + i * cw} y={y} width={cw - 1} height="22" fill="#9aa5bd" fillOpacity="0.12" />)}
              {objs.map(([id, start, size, live]) => {
                if (afterSweep && !live) return null;
                return (
                  <g key={id}>
                    <rect x={40 + start * cw} y={y} width={size * cw - 1} height="22" fill={live ? '#5da2ff' : '#f0b94b'} fillOpacity="0.7" />
                    <text x={40 + start * cw + 3} y={y + 15} fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="10">{id}</text>
                  </g>
                );
              })}
            </g>
          );
          const arrow = (fromId, toId, y, key, color = '#e9edf6') => {
            const a = objs.find((o) => o[0] === fromId);
            const b = objs.find((o) => o[0] === toId);
            const x1 = 40 + (a[1] + a[2] / 2) * cw;
            const x2 = 40 + (b[1] + b[2] / 2) * cw;
            return <path key={key} d={`M ${x1} ${y} Q ${(x1 + x2) / 2} ${y - 22} ${x2} ${y}`} fill="none" stroke={color} strokeOpacity="0.8" />;
          };
          return (
            <g>
              <text x="40" y="24" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">roots → 1, 9        before: mark from the roots (blue reachable, amber not)</text>
              {strip(56, false, 'before')}
              {arrow(1, 3, 56, 'a1')}
              {arrow(3, 4, 56, 'a2')}
              {arrow(9, 7, 56, 'a3')}
              {arrow(7, 11, 56, 'a4')}
              {arrow(11, 7, 56, 'a5', '#62d98a')}
              {arrow(5, 6, 56, 'a6', '#f0b94b')}
              {arrow(6, 5, 56, 'a7', '#f0b94b')}
              <text x="40" y="104" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">green loop: a reachable cycle (kept); amber loop: an unreachable cycle (freed, which counting could not do)</text>
              <text x="40" y="132" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">after: sweep frees every unmarked object; the holes are where they were</text>
              {strip(142, true, 'after')}
              <text x="40" y="196" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="10">mark per collection: 295 / 1,292 / 2,294 objects at 6 / 28 / 50% live</text>
              <text x="40" y="212" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">sweep per collection: 4,268 / 4,272 / 4,390, the whole heap every time</text>
              <text x="40" y="228" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">reference counting: out of heap at step 7,839 with 4,912 cyclic objects leaked</text>
              <text x="40" y="244" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">mark and sweep: 14 collections exact against the referee, 0 leaked after 60,000 steps</text>
              <text x="40" y="264" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">fragmentation: 13,640 free slots in 1,294 holes, largest 55; a 512-slot request fails (copying: one block of 3,640)</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'garbage_collection_mark_and_sweep.py',
  Viz: GcViz,
  narration,
};
