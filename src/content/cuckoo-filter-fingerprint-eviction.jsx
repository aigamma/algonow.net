import CuckooViz from '../viz/CuckooViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/cuckoo_filter_fingerprint_eviction.py?raw';
import { narration } from './cuckoo-filter-fingerprint-eviction.narration.js';

export const content = {
  given:
    'A set too large to store, membership queries that tolerate rare false positives: and items that LEAVE: flows expiring, entries evicted, users departing.',
  task: 'Approximate membership in a few bits per item, with honest deletion: no false negatives, ever.',
  constraint:
    'The live Bloom unit cannot delete: clearing bits shreds other items (measured here: 96% of survivors lost). Store fingerprints in two-home buckets instead, and the referee asserts zero false negatives on every member after every operation, thirty churn rounds included.',

  origins: (
    <p>
      Fan, Andersen, Kaminsky, and Mitzenmacher published this at
      CoNEXT <strong>2014</strong> under a title that is a thesis:
      &quot;Cuckoo Filter: <em>Practically Better Than Bloom</em>&quot;.
      The lineage runs through Pagh and Rodler&apos;s cuckoo hashing
      (2001): named for the chick that shoves other eggs from the
      nest: and the partial-key trick that makes filters possible:
      an evicted fingerprint can compute its other home <em>without
      the original item</em>, because XOR is an involution. The
      networking world took it for flow tables and cache admission:
      exactly the workloads where members leave.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>two-home discipline</strong>: every item may
      live in exactly one of two buckets of four slots. Insert into
      either home with space; if both are full, evict a resident to
      the resident&apos;s other home, chain-style, up to a kick
      budget. That discipline is what fills tables: measured{' '}
      <strong>97.1%</strong> of 4,096 slots with four-slot buckets,
      against <strong>52.1%</strong> when buckets hold one: the
      choose-and-kick machinery is worth 45 points of load.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>fingerprint</strong>: store not the item
      but a 12-bit hash of it, with the partial-key rule i₂ = i₁ ⊕
      hash(fp). An evicted fingerprint knows its alternate home
      without ever knowing its item: the XOR points both ways.
      Membership is fingerprint-in-either-home: false-positive rate
      measured <strong>0.1535%</strong> against the 2b·load/2^f law&apos;s
      0.1490%. And deletion becomes trivial and safe: remove one
      matching fingerprint: 25,000 leavers removed with{' '}
      <em>zero</em> collateral damage to 25,000 survivors, asserted.
    </p>
  ),

  picture: (
    <p>
      A pair of apartment buildings where every tenant is assigned
      exactly two possible flats: one by their name, one reachable
      from the first by a rule anyone can apply to the{' '}
      <em>name tag on the door</em>. When a newcomer finds both flats
      full, a resident is shoved out cuckoo-style: and the shoved
      tenant does not need to remember who they are to know where to
      go: the rule works from the name tag alone. Checking residency
      means reading two doors. Eviction means removing one tag: and
      because each tenant holds one tag in one flat, removal never
      harms the neighbors. The Bloom alternative is a shared wall of
      light switches: deletion means flipping switches other tenants
      also depend on: measured here, 96% of them left in the dark.
    </p>
  ),

  steps: [
    <>
      <strong>Fingerprint:</strong> fp = 12 bits of hash(x); homes
      i₁ = hash(x), i₂ = i₁ ⊕ hash(fp).
    </>,
    <>
      <strong>Insert:</strong> either home with a free slot takes fp;
      else evict a resident to <em>its</em> other home (the XOR works
      from the fingerprint alone) and chain.
    </>,
    <>
      <strong>Lookup:</strong> fp present in either home: two bucket
      reads, cache-friendly.
    </>,
    <>
      <strong>Delete:</strong> remove one matching fp: one slot, one
      item, zero shared state to corrupt.
    </>,
    <>
      <strong>Run it hot:</strong> space is f/load bits per item:
      12.4 at the 97% frontier, 15.7 at this page&apos;s 76% fill:
      the space win exists only in a full table.
    </>,
  ],

  signals: [
    <>
      <strong>Members leave:</strong> flow tables, cache admission,
      session sets: churn is the workload, and the churn client here
      stayed exact through 30 rounds.
    </>,
    <>
      <strong>Moderately low FPR targets:</strong> below ~3%, the
      fingerprint&apos;s f/load bits undercut Bloom&apos;s 1.44
      log₂(1/ε): the paper&apos;s title claim, priced honestly below.
    </>,
    <>
      <strong>Two cache lines beat nine probes:</strong> lookups
      touch two buckets, not k scattered bits: the systems reason the
      networking world adopted it.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the live <strong>Bloom filter</strong>:
      13 bits per item, FPR 0.150% measured, unbeatable simplicity:
      and no deletion. The classic patch is the{' '}
      <strong>counting Bloom filter</strong>: quadruple every cell to
      4-bit counters so deletes decrement instead of clear: 52 bits
      per item for the same error. The cuckoo filter&apos;s claim is
      that deletion should cost a fingerprint, not a 4× tax.
    </>
  ),

  strength: (
    <>
      <strong>Deletion with a zero-collateral guarantee, at Bloom-class
      error.</strong> Every member found after every operation
      (asserted, 30 churn rounds included); 25,000 deletions with
      zero survivor damage; FPR matching its 2b·load/2^f law
      (0.1535% vs 0.1490%); the 97% load frontier measured with its
      longest kick chain (500); and the naive-Bloom alternative&apos;s
      96% corruption measured, not narrated.
    </>
  ),
  weakness: (
    <>
      <strong>The space win exists only in a hot table, and full
      tables fight back.</strong> At this page&apos;s 76% fill the
      cuckoo filter pays 15.7 bits/item against Bloom&apos;s 13.0 for
      the same error: f/load only beats 1.44 log₂(1/ε) when load is
      pushed past ~90%. And near the frontier, insertions run long
      kick chains (500 measured) and can fail outright: a production
      filter needs a resize story. Delete also requires the item to
      have been inserted: deleting a never-inserted key can evict a
      stranger&apos;s matching fingerprint.
    </>
  ),

  problem: 'Frequency estimation sketches',
  problemSlug: 'frequency-estimation',
  rivals: [
    {
      name: 'Cuckoo × fingerprint eviction',
      isThisUnit: true,
      algoName: 'Cuckoo filter',
      cost: '2 buckets/op',
      wins: (
        <>
          <strong>Honest deletion</strong>: one fingerprint out, zero
          collateral (asserted on 25,000): plus 97% fill and
          two-cache-line lookups.
        </>
      ),
      costs: (
        <>
          Space beats Bloom only when run hot; inserts near the
          frontier chain and can fail; never delete the uninserted.
        </>
      ),
      when: 'Membership with churn: flow tables, admission filters, session sets.',
    },
    {
      name: 'Bloom × k hashes',
      algoName: 'Bloom filter',
      cost: 'k bit-probes/op',
      wins: (
        <>
          The live unit: simplest possible machinery, 13.0 bits/item
          at 0.150% here, insert never fails, no load frontier to
          manage.
        </>
      ),
      costs: (
        <>
          No deletion, full stop: the naive attempt false-negatived
          96% of survivors on this page.
        </>
      ),
      when: 'Append-only sets: the default until the first delete request arrives.',
    },
    {
      name: 'Counting Bloom filter',
      algoName: 'Counting Bloom filter',
      cost: 'k counter-probes/op',
      wins: (
        <>
          Bloom&apos;s exact semantics plus deletes: decrement instead
          of clear: the pre-2014 standard answer.
        </>
      ),
      costs: (
        <>
          4-bit counters quadruple every cell: 52 bits/item for this
          page&apos;s error: the tax the cuckoo filter exists to
          delete.
        </>
      ),
      when: 'Legacy systems already built on Bloom indices, where a drop-in delete matters most.',
    },
    {
      name: 'XOR filter',
      algoName: 'XOR filter',
      cost: '3 probes, static',
      wins: (
        <>
          For frozen sets: ~1.23·f bits/item and three memory probes:
          smaller than both Bloom and cuckoo at the same error.
        </>
      ),
      costs: (
        <>
          Build-once: no inserts, no deletes: the peeling construction
          must see the whole set up front.
        </>
      ),
      when: 'Static dictionaries shipped to readers: spell sets, malware lists, CDN manifests.',
    },
  ],
  neverUse: {
    name: 'Deleting from a plain Bloom filter',
    why: (
      <>
        It looks like it works. Clear the k bits of the departing
        item: lookups for it start failing, the dashboard shows
        deletions succeeding: and every cleared bit was load-bearing
        for <em>other</em> items. Measured here: after naively
        deleting 25,000 leavers from a well-provisioned filter,{' '}
        <strong>96% of the 25,000 survivors came back
        &quot;not present&quot;</strong>: false <em>negatives</em>,
        the one error class a filter must never emit: silently
        poisoning every cache, router, and dedup pass downstream. A
        filter that must forget needs per-item state: a counter cell
        (52 bits/item) or a fingerprint in its own slot (this unit).
        Shared bits are a one-way door.
      </>
    ),
  },

  contest: {
    instance:
      '50,000-item deletable membership; referee: zero false negatives asserted on every member after every operation, 30 churn rounds included',
    columns: ['bits/item', 'FPR'],
    rows: [
      {
        method: 'Bloom (13b, k=9)',
        values: ['13.0', '0.150%'],
        verdict: 'no deletion: the naive attempt false-negatived 96% of survivors',
      },
      {
        method: 'Counting Bloom',
        values: ['52.0', '~same'],
        verdict: 'deletes by quadrupling every cell: the 4× tax',
      },
      {
        method: 'Cuckoo, this fill (76%)',
        isThisUnit: true,
        values: ['15.7', '0.153%'],
        verdict: 'honest deletion, zero collateral: space still above Bloom here',
      },
      {
        method: 'Cuckoo run hot (97%)',
        values: ['12.4', '~0.19%'],
        best: 0,
        verdict: 'the frontier measured: the space win exists only in a full table',
      },
    ],
    source:
      "python solutions/cuckoo_filter_fingerprint_eviction.py prints this table and asserts: every member found after every operation; FPR 0.1535% within its 2b·load/2^f law (0.1490%); the load frontier 97.1% (b=4, longest kick chain 500) vs 52.1% (b=1); 25,000 deletions with zero collateral and leaver ghost rate 0.09%; Bloom's naive delete false-negativing 96% of survivors (the 16-byte-digest entropy bug found and fixed along the way made it a fake 100%); and the 30-round churn client exact throughout.",
  },

  figure: (
    <Figure
      id="fig-cuckoo-homes"
      aspect="16 / 7"
      caption="The partial-key trick. An item stores only a 12-bit fingerprint, in one of two homes: i₁ = hash(x), i₂ = i₁ ⊕ hash(fp). Because XOR is an involution, the rule works from either side using only the fingerprint: an evicted resident computes its other home without ever knowing which item it summarizes. That one identity buys the whole feature set: kick chains that fill tables to 97%, lookups that touch two buckets, and deletion that removes one slot's fingerprint with zero shared state to corrupt."
      cite={{
        text: 'Fan, Andersen, Kaminsky & Mitzenmacher, "Cuckoo Filter: Practically Better Than Bloom", CoNEXT 2014: partial-key cuckoo hashing on 12-bit fingerprints; deletion at last, and less space than Bloom below ~3% error, in a full table.',
        href: 'https://doi.org/10.1145/2674005.2674994',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Two bucket homes linked by the XOR rule with a fingerprint evicted along the chain">
        <text x="60" y="30" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">item x → fp = 12 bits · i₁ = hash(x) · i₂ = i₁ ⊕ hash(fp)</text>
        <rect x="80" y="60" width="150" height="100" rx="6" fill="none" stroke="#5da2ff" strokeWidth="1.6" />
        <text x="95" y="82" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="11">bucket i₁</text>
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={95 + i * 30} y={95} width={24} height={24} fill={i < 3 ? '#33507a' : 'none'} stroke="#33507a" />
        ))}
        <text x="95" y="145" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">3 of 4 slots taken</text>
        <rect x="410" y="60" width="150" height="100" rx="6" fill="none" stroke="#5da2ff" strokeWidth="1.6" />
        <text x="425" y="82" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="11">bucket i₂</text>
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={425 + i * 30} y={95} width={24} height={24} fill="#33507a" stroke="#33507a" />
        ))}
        <text x="425" y="145" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">full: someone gets evicted</text>
        <path d="M 305 110 L 400 110" fill="none" stroke="#f0b94b" strokeWidth="1.8" markerEnd="url(#ckArrow)" />
        <path d="M 335 125 L 250 125" fill="none" stroke="#f0b94b" strokeWidth="1.8" markerEnd="url(#ckArrow)" />
        <defs>
          <marker id="ckArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#f0b94b" />
          </marker>
        </defs>
        <text x="255" y="100" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">⊕ hash(fp)</text>
        <text x="255" y="142" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">⊕ hash(fp)</text>
        <text x="60" y="196" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">the involution: either home computes the other from the fingerprint alone: no item needed</text>
        <text x="60" y="222" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">measured: 97.1% fill (b=4) vs 52.1% (b=1) · FPR 0.1535% vs law 0.1490% · 25,000 deletes, zero collateral</text>
        <text x="60" y="248" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">the Bloom contrast: naive deletion false-negatived 96% of the surviving members</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'cuckoo_filter_fingerprint_eviction.py',
  Viz: CuckooViz,
  narration,
};
