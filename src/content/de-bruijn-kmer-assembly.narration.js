// The spoken lesson for puzzle ninety six, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle ninety six: de Bruijn graph assembly, paired with k-mer overlap, for genome assembly. Here is the puzzle. A genome is a text three billion letters long, and no machine on earth can read it whole: sequencers deliver millions of fragments, sixty to a few hundred letters each, sampled at random, order lost. Reassemble the original: exactly. The first-generation answer compared every fragment with every other fragment and then solved an ordering problem that is N P hard. The de Bruijn answer refuses to compare reads at all: shred everything into k-mers: every window of k consecutive letters: wire each k-mer as an edge from its prefix to its suffix, and the genome reappears as an Eulerian path: a walk that uses every edge exactly once. The referee on this page is the harshest one available: string equality with the original, end to end: three hundred random genomes reassembled exactly: and where exactness is mathematically impossible, the page proves the impossibility by exhibiting it.',
  },
  {
    section: 'origins',
    text:
      'Assembly’s first era ran overlap layout consensus: compute all pairwise read overlaps, lay reads out consistently, take the consensus: the engine of the Human Genome Project, and at its heart a Hamiltonian flavored ordering problem: N P hard, wrestled by heuristics. Pevzner, Tang, and Waterman, in P N A S, two thousand one, turned the chessboard ninety degrees: let sequences be the EDGES of the graph rather than the nodes: and the ordering problem becomes Eulerian: walk every edge once: solvable in linear time by a method Leonhard Euler sketched for the bridges of Konigsberg in seventeen thirty six. When short read sequencers arrived a few years later: billions of hundred letter reads per run: all pairs comparison became unthinkable, and the de Bruijn formulation became the only viable road. Velvet, SPAdes, and every short read assembler since is this page’s pipeline, industrialized.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the graph and the walk. Nodes are k minus one mers. Each k-mer is an edge from its prefix to its suffix. Hierholzer’s algorithm: walk until stuck, splice in detours until every edge is used: finds an Eulerian path in time linear in the number of edges, and the assembled genome simply reads off the walk, one letter per step. Three hundred random genomes on this page came back exactly, string equal. The heuristic is the k-mer overlap itself, and its gift is subtle: adjacency is IMPLICIT. Two k-mers connect when one’s suffix is the other’s prefix: no alignment, no scoring matrix, no comparison of any read with any other read, ever. The filing system is the comparison. The price is the k dial, and this page measures both of its cliff edges: too small, and repeats collapse into genuine ambiguity: too large, and coverage gaps shatter the walk into twenty one contigs.',
  },
  {
    section: 'picture',
    text:
      'A shredded book, and a clerk who never reads two strips together. Instead, the clerk files every strip by its opening words and its closing words: the strip reading dot dot dot the quick brown hangs from the hook labeled the quick, and points onward to the hook labeled quick brown. To rebuild the book, walk from hook to hook, using every strip exactly once, writing one word per step. No strip is ever compared with another strip: the filing system already did it. And the famous failure is a phrase the author loved too much. Printed three times, its strips all hang from one shared hook: and the walk, arriving at that hook, can take its two side loops in either order: two different books, each using every strip exactly once, each perfectly consistent with the entire filing cabinet. No clerk can tell them apart. Only longer strips can: which, in this trade, means a bigger k.',
  },
  {
    section: 'run',
    text:
      'Here is the run, cliffs included. Shred reads into sixteen-mers. Clean the spectrum: at twenty fold coverage a true k-mer is seen about twenty times, while a k-mer created by one sequencing error is seen once or twice: drop everything below count three: this page plants one substituted base in one read, watches raw assembly break, and watches the threshold heal it exactly. Walk with Hierholzer. And respect the repeat theorem, which this page runs rather than recites: a forty base motif planted three times: for k up to forty one, the copies collapse, and TWO different assemblies: segment B before segment C, or C before B: are consistent with every single k-mer: both were generated, and both spectra asserted equal to the truth’s: the data genuinely cannot decide. At k forty two: one base past the repeat: the copies separate and the walk is unique and exact. The cliff sits at repeat length plus two, measured to the letter, with the flanking characters controlled so nothing extends the repeat by accident.',
  },
  {
    section: 'signals',
    text:
      'The signals that this pair fits. First: massive short fragment data: when reads number in the billions, anything quadratic in read pairs is fantasy: implicit k-mer adjacency is linear in the total bases and does not care how many reads there are. Second: no reference exists. De novo assembly: novel organisms, metagenomes, engineered plasmids: is for genomes with nothing to compare against: when a reference DOES exist, the right tool is mapping, not assembly: the rivals section returns to this. Third, and widest: the reduction instinct. The founding move here: restate a Hamiltonian shaped ordering problem as an Eulerian one by shifting what the nodes MEAN: is one of the great strategic maneuvers in the catalog: when a problem is hard, before optimizing the search, ask whether a change of representation makes the hardness evaporate.',
  },
  {
    section: 'tradeoffs',
    text:
      'Now the rivals, which are really eras. Overlap layout consensus: all pairs overlap, layout, consensus: was the first era, and it is also the current one: because long read sequencers changed the arithmetic back. A PacBio or Nanopore read spans tens of thousands of bases: whole repeats fit INSIDE one read: and with only a few hundred thousand such reads, quadratic overlap is affordable again. Long reads resolve exactly the tangles this page proved undecidable at small k: which is why modern flagship assemblies are long read O L C at the core, often polished with short read data. String graph assembly is O L C refined: build the overlap graph, delete every edge implied by transitivity, and read contigs off the clean structure: keeping whole read information that the k-mer shredder deliberately throws away. The lesson: the de Bruijn move was never universally better: it was the right restatement for the era when reads were short and countless.',
  },
  {
    section: 'tradeoffs',
    text:
      'The fourth rival answers a different question, and knowing the difference is the skill. Burrows Wheeler read alignment: the live B W T unit’s transform, built into an F M index: does not assemble anything: it MAPS reads onto a reference genome that already exists, one read at a time, in time proportional to the read’s length. Resequencing a known species: calling variants in a patient’s genome against the human reference: is mapping, not assembly, and running a de novo assembler there wastes the reference’s entire value. Only novelty assembles: and the two tools bootstrap each other, because every reference genome that mappers rely on was itself born from someone’s de novo assembly. Ask first: does a trustworthy reference exist? The answer picks the tool before any performance argument starts.',
  },
  {
    section: 'tradeoffs',
    text:
      'And the negative example: shipping one walk through a tangled graph. This page proved the danger by construction: below the repeat length, two different genomes matched every single k-mer: both verified against the full spectrum: and an assembler that silently returns whichever walk its tie breaking happened to find is not reporting evidence: it is manufacturing sequence. The output looks perfect: right length, right composition, every read consistent: and the order of the segments between repeat copies is an artifact of iteration order, nothing more. This is misassembly, the field’s quiet plague, and the discipline against it is structural: report the unambiguous contigs and STOP at the tangles: or bring evidence that spans them: mate pairs, long reads: and resolve them honestly. An answer the data cannot distinguish from its rivals is not an answer. That is this site’s oldest rule, and here it is written in D N A.',
  },
  {
    section: 'code',
    text:
      'The code on this page is the whole pipeline, referee included. K-mer counting. Graph building: prefix to suffix, multiplicity kept. Hierholzer’s walk with a tie breaking switch, which is how the two truths get exhibited. Read shredding with coverage, a planted error, and terminal reads granted: end coverage being a protocol matter, not an algorithmic one. Spectral cleaning at count three. The self test asserts: three hundred exact reconstructions from k-mer multisets: the repeat theorem with both ambiguous assemblies verified spectrum equal and the cliff at repeat plus two: the coverage curve, twenty one contigs to four to one, with two fold breaking exactness and twenty fold achieving it: and the error bubble broken raw, healed clean. When it prints O K, you have watched seventeen thirty six’s mathematics assemble two thousand one’s genomes: and learned exactly where it must stop and say: the data does not know.',
  },
];
