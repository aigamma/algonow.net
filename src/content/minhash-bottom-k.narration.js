// The spoken lesson for puzzle forty two, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle forty two: MinHash, paired with bottom k signatures, for similarity sketching and near duplicates. Here is the puzzle. You hold two large sets: documents turned into shingle sets, users turned into feature sets. Estimate their Jaccard similarity, the size of the intersection over the size of the union, from tiny sketches, without the sets ever meeting. The constraint is corpus scale: comparing all pairs of just two hundred documents means nineteen thousand nine hundred full set intersections, and real corpora hold millions. The sketches must be tiny, one pass, and composable: the sketch of a union must be computable from the sketches alone, and this page asserts that as exact equality, not approximation.',
  },
  {
    section: 'origins',
    text:
      'Andrei Broder invented min wise hashing at AltaVista in nineteen ninety seven, because the early web’s search engine was drowning in mirror copies of the same pages. The collision theorem is his: under a random permutation, the probability that two sets share their minimum element is their Jaccard similarity, exactly. Indyk and Motwani’s locality sensitive hashing, the following year, turned sketches from measurement into search. Genomics adopted the idea as the Mash distance, which has its own entry in this site’s atlas. And the largest deployment today is the deduplication of language model training sets: the same nineteen ninety seven trick, now standing guard over trillion token corpora.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns the collision theorem. Hash every element of both sets with one random function, and consider the minimum over the union. That minimum is a uniformly random element of the union, and the two sets report the same minimum precisely when that element lies in the intersection. So the probability of a collision equals the Jaccard similarity: not approximately: exactly. This page measures the theorem at its exact value: over two thousand independent hash functions, on a pair built to a true Jaccard of one third, the single minimum collided six hundred sixty eight times: zero point three three four zero. A one line theorem, verified to three decimal places. The heuristic supplies the economy. Repeating the theorem with k independent hash functions costs k hashes per element: two and a half million for one ten thousand element set at k of two hundred fifty six. Bottom k instead keeps the k smallest values of one single hash: ten thousand hashes, two hundred fifty six times cheaper, counted. One pass. And the sketch of a union is exactly the merge of the two sketches, asserted as list equality on one hundred out of one hundred pairs.',
  },
  {
    section: 'picture',
    text:
      'Picture two clubs holding a joint lottery. Every membership card gets a random ticket number, and members who belong to both clubs hold one card that counts for both. Now ask each club to announce its lowest ticket. The lowest card in the whole room is a uniformly random card, so the two clubs announce the same number exactly when that winning card belongs to both of them: probability equal to the shared membership fraction. One drawing gives one noisy bit of evidence. Keeping the k lowest tickets runs k lotteries from a single drawing. And notice what never happened: neither club showed anyone its membership list. The lists stayed home; only the lottery tickets traveled.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. Shingle: turn each document into a set: on this page, windows of three consecutive words: because sets are what Jaccard measures. Hash each element once, and keep the k smallest values: that sorted list is the signature. To estimate: merge two signatures, take the k smallest of the merged list, and count what fraction of them appear in both originals: that fraction is the estimate. To compose: the sketch of a union is the merge of sketches, exactly, so a distributed corpus sketches shard by shard and combines at the end. And to search rather than merely measure: split signatures into bands, hash each band, and let only band collisions become candidate pairs. On this page that banding found all five planted near duplicates while doing three thousand nine hundred eighty times fewer comparisons than all pairs.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, similarity at corpus scale: deduplication, plagiarism detection, near duplicate web pages, training set decontamination: any job where the all pairs wall is the real enemy. Second, your objects are sets and Jaccard is the honest question: shingles, n grams, feature sets. If your objects are weighted vectors and the honest question is the angle between them, the hyperplane cousin, SimHash, is the tool, and it sits on this page’s bench. Third, you need one pass, mergeable, and private ish: streams sketch as they flow, shards merge exactly, and the underlying sets never travel.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: an exact theorem, a priced error dial, and composability. The collision rate measured at its theoretical value to three decimals. The root mean square error halving for every quadrupling of k, exactly as one over root k promises: point zero nine six, point zero five zero, point zero two six, point zero one two, across sketch sizes sixteen to one thousand twenty four. Union sketches exact. And banding turning estimation into search with perfect recall on every planted duplicate. The weakness: Jaccard only, a noise floor, and a tuned S curve. The estimate carries noise of root J times one minus J over k, so telling apart similarity of two percent from four percent, and this site’s own two narrations measured three point four percent, needs k in the thousands. Weighted similarity wants SimHash or weighted MinHash variants. And the banding threshold is shaped, not free: bands catch what they were tuned to catch, and are blind by design to pairs far from the target.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers. The error ladder, two hundred trials per sketch size on sets of three thousand with exact referees: k of sixteen: error point zero nine six one. Sixty four: point zero five zero zero. Two hundred fifty six: point zero two five five: plus or minus two and a half points of similarity from a two kilobyte sketch, the deployed default. One thousand twenty four: point zero one one five. Each row tracks the binomial reference. The hashing bill: bottom k paid ten thousand hashes where k independent functions would pay two and a half million. This site’s own prose, refereed by full set operations: two narrations of different units share three point four percent of their three word shingles: the house style, quantified: and the build plan against its own front seventy percent measured seventy point three, estimated sixty five point six. And the banding demo: two hundred documents, five planted near duplicate pairs: all five surfaced, in exactly five candidate pairs, against nineteen thousand nine hundred all pairs comparisons. Perfect recall, perfect precision, one three thousand nine hundred eightieth of the work.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is all pairs exact comparison at corpus scale, and the framing matters, because exact Jaccard is not a bad method: it is this page’s referee, and per pair it is the right tool. As a corpus strategy it is a quadratic bill for mostly zero answers: nineteen thousand nine hundred intersections for two hundred documents, ten billion for a hundred thousand, and almost every one of them exists to confirm that two unrelated pages are, indeed, unrelated. The banding demo did the same job with five candidate comparisons. The principle is worth one sentence: spend exactness per candidate, never per pair: let a thirty two byte sketch dismiss the pairs that were never going to matter, and save the full comparison for the handful that might.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the bottom k sketch with a hash counter, the estimator over merged signatures, exact Jaccard as referee, controlled overlap set construction, shingling, and the banded L S H index. The self test asserts, in order: the collision theorem measured within three hundredths of its exact value over two thousand independent hash functions. Composability as exact list equality on one hundred pairs. The error ladder strictly monotone across four sketch sizes, with the quadruple k, halve the error law verified at better than a factor of two and a half. The hashing bill counted at exactly one hash per element. This repository’s own prose estimated within tolerance of full set referees. And the banding index surfacing every planted near duplicate, in under one hundredth of the all pairs comparisons. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
