import DeBruijnViz from '../viz/DeBruijnViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/de_bruijn_kmer_assembly.py?raw';
import { narration } from './de-bruijn-kmer-assembly.narration.js';

export const content = {
  given:
    'A genome nobody can read whole: only millions of short fragments, order lost, from a molecule 50,000 times longer than any read.',
  task: 'Reassemble it exactly: shred everything into k-mers, wire each as an edge from its prefix to its suffix, and walk every edge once: the genome is the Eulerian path.',
  constraint:
    'The referee is string equality with the original, end to end: 300 random genomes reassembled exactly from their k-mer multisets; the repeat ambiguity proven by exhibiting two distinct assemblies both consistent with every single k-mer (both spectra asserted equal); the coverage curve measured 21 → 4 → 1 contigs; and the error bubble healed by count thresholding.',

  origins: (
    <p>
      Assembly&apos;s first era ran overlap-layout-consensus:
      compare all read pairs, then order them: a Hamiltonian-path
      flavored problem, NP-hard, and the engine of the Human
      Genome Project&apos;s assemblers. Pevzner, Tang, and
      Waterman&apos;s <strong>2001</strong> PNAS paper turned the
      board ninety degrees: make sequences the <em>edges</em>{' '}
      instead of the nodes, and the ordering problem becomes{' '}
      <strong>Eulerian</strong>: solvable in linear time by a
      method Euler sketched for Königsberg&apos;s bridges in 1736.
      When short-read sequencers arrived (billions of 100-base
      reads), the de Bruijn formulation became the only viable
      road: Velvet, SPAdes, and every short-read assembler since
      are this page&apos;s pipeline, industrialized.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>graph and the walk</strong>: nodes are
      (k−1)-mers, each k-mer is an edge from its prefix to its
      suffix, and Hierholzer&apos;s algorithm finds a walk using
      every edge exactly once in linear time: the assembled string
      just reads off the walk. Counted here:{' '}
      <strong>300 random genomes reassembled exactly</strong> from
      their k-mer multisets, and the 3,000-base client end-to-end
      exact at 20× coverage after cleaning: string equality, the
      referee no narrative survives.
    </p>
  ),
  heurRole: (
    <p>
      Supplies <strong>adjacency for free</strong>: two k-mers
      connect when one&apos;s (k−1)-suffix is the other&apos;s
      (k−1)-prefix: no alignment, no scoring, no all-pairs
      comparison: the overlap is implicit in the spelling. The
      price is the k dial, and this page measures both of its
      edges: k too small and repeats collapse (the two-truths
      oracle); k too large and coverage gaps shatter the walk
      (21 contigs at 2×). Assembly practice is the art of living
      between those cliffs.
    </p>
  ),

  picture: (
    <p>
      A shredded book, and a clerk who never reads two strips
      together. Instead the clerk files every strip by its first
      words and last words: strip &quot;…the quick brown&quot;
      hangs from hook &quot;the quick&quot; and points to hook
      &quot;quick brown.&quot; The book is rebuilt by walking hook
      to hook, using every strip exactly once: no strip is ever
      compared with another, because the filing system <em>is</em>{' '}
      the comparison. The famous failure is a phrase the author
      loved: printed three times, its strips hang from one shared
      hook, and the walk can visit that hook&apos;s side-loops in
      either order: two different books, each using every strip
      exactly once. No clerk can tell them apart: only longer
      strips: a bigger k: can.
    </p>
  ),

  steps: [
    <>
      <strong>Shred:</strong> every read into its k-mers: order
      within reads kept, order between reads irrelevant.
    </>,
    <>
      <strong>Wire:</strong> k-mer → edge from (k−1)-prefix to
      (k−1)-suffix: adjacency implicit, no comparisons.
    </>,
    <>
      <strong>Clean the spectrum:</strong> true k-mers appear ~
      coverage times, error k-mers once or twice: threshold at 3
      (measured healing the planted error).
    </>,
    <>
      <strong>Walk (Hierholzer):</strong> every edge exactly once,
      linear time: the string reads off the path.
    </>,
    <>
      <strong>Distrust the tangles:</strong> a repeat longer than
      k−1 collapses: two spectrum-consistent truths (proven here):
      report contigs, or raise k.
    </>,
  ],

  signals: [
    <>
      <strong>Massive short-fragment data:</strong> billions of
      reads make all-pairs comparison unthinkable: implicit
      k-mer adjacency is the only linear road.
    </>,
    <>
      <strong>No reference exists:</strong> de novo assembly:
      novel organisms, metagenomes, plasmids: when there is
      nothing to map against (else see the mapping card).
    </>,
    <>
      <strong>Reduction instinct:</strong> the founding move:
      restate a Hamiltonian-shaped ordering as an Eulerian walk
      by shifting what nodes mean: worth carrying far beyond
      genomics.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>overlap-layout-consensus</strong>:
      all-pairs read overlap, then an ordering problem that is
      NP-hard in general: gloriously effective for a few thousand
      long reads, unthinkable for a billion short ones. The de
      Bruijn move does not solve OLC&apos;s problem: it{' '}
      <em>restates</em> the problem so the hard part disappears.
    </>
  ),

  strength: (
    <>
      <strong>Exactness where possible, and honest ambiguity
      where not.</strong> 300 genomes reassembled to string
      equality; the repeat theorem run rather than recited (two
      distinct assemblies, both verified against every k-mer,
      ambiguity landing exactly at k ≤ repeat+1, uniqueness at
      repeat+2, with flank effects controlled); the coverage
      curve 21 → 4 → 1 measured; and the error bubble healed by
      the count-3 threshold with true k-mers at ~20× and noise at
      1×.
    </>
  ),
  weakness: (
    <>
      <strong>Repeats are the wall, and k cannot climb it
      alone.</strong> A repeat longer than k−1 collapses into one
      node and the spectrum genuinely cannot decide the order of
      what hangs between copies (proven by two-truths here): real
      genomes are full of such repeats, which is why real
      assemblers output contigs and buy resolution elsewhere
      (paired reads, long reads). Raising k costs coverage: the
      same page measured 21 contigs at 2×: and sequencing errors
      multiply spurious edges (one substitution: k wrong k-mers):
      cleaning is mandatory, not optional. The Eulerian guarantee
      is exactly as good as the graph is faithful.
    </>
  ),

  problem: 'Genome assembly',
  problemSlug: 'genome-assembly',
  rivals: [
    {
      name: 'de Bruijn × k-mers',
      isThisUnit: true,
      algoName: 'de Bruijn graph assembly',
      cost: 'O(total bases)',
      wins: (
        <>
          <strong>Adjacency without comparison</strong>: linear in
          the data, Eulerian in the walk: the only road that
          scales to billions of short reads.
        </>
      ),
      costs: (
        <>
          Repeats past k−1 collapse into proven ambiguity, and
          error k-mers demand spectral cleaning.
        </>
      ),
      when: 'Short-read de novo assembly: which is to say, Velvet, SPAdes, and every modern pipeline.',
    },
    {
      name: 'Overlap-layout-consensus',
      algoName: 'Overlap-layout-consensus',
      cost: 'O(n²) overlaps',
      wins: (
        <>
          The first era&apos;s road, and the long-read
          renaissance&apos;s: with reads spanning whole repeats,
          all-pairs overlap is affordable again and resolves what
          k-mers cannot.
        </>
      ),
      costs: (
        <>
          Quadratic comparison and a Hamiltonian-flavored layout:
          unthinkable at short-read scale.
        </>
      ),
      when: 'Few, long, noisy reads: PacBio and Nanopore assembly lives here again.',
    },
    {
      name: 'String graph × reduction',
      algoName: 'String graph assembly',
      cost: 'overlaps + reduction',
      wins: (
        <>
          OLC refined: build the overlap graph, remove transitively
          implied edges, and read contigs off what remains: keeps
          whole-read information the k-mer shredder discards.
        </>
      ),
      costs: (
        <>
          Still needs the overlap computation de Bruijn exists to
          avoid: the refinement inherits the bill.
        </>
      ),
      when: 'Long-read pipelines wanting OLC rigor with cleaner graph structure.',
    },
    {
      name: 'BWT read alignment',
      algoName: 'Burrows-Wheeler read alignment',
      cost: 'O(read) per query',
      wins: (
        <>
          The other question entirely: when a reference genome
          exists, do not assemble: <em>map</em> reads onto it via
          FM-index backward search: the live BWT unit&apos;s
          machinery serving genomics.
        </>
      ),
      costs: (
        <>
          Needs the reference de novo assembly exists to create:
          the two tools bootstrap each other.
        </>
      ),
      when: 'Resequencing a known species: variant calling maps; only novelty assembles.',
    },
  ],
  neverUse: {
    name: 'Shipping one walk through a tangled graph',
    why: (
      <>
        This page proved the danger by construction: at k below
        the repeat length, <em>two different genomes</em> are
        consistent with every single k-mer: both walks verified
        against the full spectrum: and an assembler that silently
        returns whichever walk its tie-breaking happened upon is
        manufacturing sequence. The output looks perfect: right
        length, right composition, every read consistent: and the
        segment order between repeat copies is an artifact of
        iteration order, not of evidence. This is misassembly,
        the field&apos;s quiet plague, and the discipline is
        structural: report unambiguous contigs and stop at
        tangles, or bring evidence that spans them (mate pairs,
        long reads). An answer the data cannot distinguish from
        its rivals is not an answer: the site&apos;s oldest rule,
        written in DNA.
      </>
    ),
  },

  contest: {
    instance:
      'reassemble a 3,000-base genome from 60-base reads; referee: exact string equality with the original, end to end',
    columns: ['contigs', 'exact?'],
    rows: [
      {
        method: 'Coverage 2×',
        values: ['21', 'no'],
        verdict: 'gaps in the spectrum: the walk shatters',
      },
      {
        method: 'Coverage 5×',
        values: ['4', 'no'],
        verdict: 'fewer holes, still fragmented',
      },
      {
        method: 'Coverage 20×, cleaned',
        isThisUnit: true,
        values: ['1', 'yes'],
        best: 0,
        verdict: 'assembled end-to-end, exactly: string equality with the original',
      },
    ],
    source:
      "python solutions/de_bruijn_kmer_assembly.py prints this table and asserts: 300 random genomes reassembled exactly from their k-mer multisets; the repeat theorem on a 40-base motif planted three times with flank characters controlled (k ∈ {20, 30, 41}: two DISTINCT assemblies both verified equal to the full spectrum: k ∈ {42, 50}: unique and exact: the cliff at repeat+2, and a two-copy repeat shown still uniquely assemblable); the coverage curve 21 → 4 → 1 contigs at 2×/5×/20× with 2× breaking exactness and 20× achieving it; and the error bubble (one substituted base) breaking assembly raw and healed exactly by dropping k-mers seen fewer than 3 times.",
  },

  figure: (
    <Figure
      id="fig-debruijn-euler"
      aspect="16 / 7"
      caption="Sequences as edges, and the genome as an Eulerian walk. Each k-mer is an edge from its (k−1)-prefix to its (k−1)-suffix: adjacency is implicit in the spelling, no read ever compared with another, and Hierholzer finds the walk in linear time: the 2001 reduction that turned assembly's Hamiltonian ordering into Euler's bridges. The wall is measured, not feared: a repeat longer than k−1 collapses into one node, its interleaved loops reorder freely, and two different genomes match every single k-mer: proven here by exhibiting both. Real assemblers stop at tangles and report contigs: an answer the data cannot distinguish from its rival is not an answer."
      cite={{
        text: 'Pevzner, Tang & Waterman, "An Eulerian path approach to DNA fragment assembly", PNAS 98(17), 2001: the reduction that carried genomics into the short-read era.',
        href: 'https://doi.org/10.1073/pnas.171285098',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="k-mers as edges through shared nodes, with a collapsed repeat node holding two interchangeable loops">
        {[[80, 90], [200, 90], [320, 90], [440, 90], [560, 90]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={15} fill="rgba(93,162,255,0.15)" stroke="#5da2ff" strokeWidth="1.6" />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <line x1={95 + i * 120} y1={90} x2={185 + i * 120} y2={90} stroke="#f0b94b" strokeWidth="2" />
            <text x={115 + i * 120} y={82} fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">k-mer</text>
          </g>
        ))}
        <text x="80" y="130" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">nodes: (k−1)-mers · edges: k-mers · the walk uses every edge once and spells the genome</text>
        <circle cx="200" cy="205" r="18" fill="rgba(226,96,108,0.2)" stroke="#e2606c" strokeWidth="2" />
        <path d="M 200 187 C 160 150, 240 150, 200 187" fill="none" stroke="#e2606c" strokeWidth="1.6" />
        <path d="M 200 223 C 160 258, 240 258, 200 223" fill="none" stroke="#e2606c" strokeWidth="1.6" />
        <text x="230" y="200" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">a repeat past k−1: one node, two loops,</text>
        <text x="230" y="216" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">two spectrum-identical genomes: proven</text>
        <text x="80" y="262" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">measured: 300 exact reassemblies · coverage 21→4→1 contigs · error bubble healed at count ≥ 3 · cliff at repeat+2</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'de_bruijn_kmer_assembly.py',
  Viz: DeBruijnViz,
  narration,
};
