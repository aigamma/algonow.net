// The spoken lesson for puzzle one hundred fifty two, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle one hundred fifty two: dynamic time warping, paired with elastic alignment, for series similarity. Here is the puzzle. Time series that are the same shape spoken at different speeds: a peak that arrives early in one and late in the other, a plateau that lasts twice as long, noise on top. Say how similar two series are, well enough to classify one hundred twenty test series into six shapes, and to search a library without computing every distance. Euclidean distance compares sample i with sample i, and pays in full for every shift in timing. The method is dynamic time warping. A dynamic program over the grid of all sample pairs finds the cheapest monotone path from the first corner to the last, stepping right, up, or diagonally, so that each sample of one series is matched to one or more samples of the other. The heuristic is the elastic alignment itself: time may stretch and compress locally, inside a band of a few samples, so shape is compared while timing is forgiven, up to a point. On this page the recovered alignment is held to a time map the generator knows, the distance is held to a classification task, the band is measured both ways, and the lower bound that makes the search possible is checked on every pair.',
  },
  {
    section: 'origins',
    text:
      'Vintsyuk used dynamic programming in nineteen sixty eight to align spoken words of different durations. Sakoe and Chiba, in nineteen seventy eight, in the IEEE Transactions on Acoustics, Speech, and Signal Processing, under the title Dynamic Programming Algorithm Optimization for Spoken Word Recognition, gave the form still used, with the diagonal band that carries their name, and Itakura gave the parallelogram constraint in nineteen seventy five. Berndt and Clifford carried it from speech into data mining in nineteen ninety four, where it became the distance to beat for time series classification. Keogh and Ratanamahatana made it searchable in two thousand five with a lower bound cheap enough to skip most of the warps. Salvador and Chan approximated it in linear time in two thousand seven, as FastDTW. Rakthanmanon and colleagues searched a trillion subsequences with a cascade of bounds in twenty twelve. Cuturi and Blondel smoothed the minimum into soft DTW in twenty seventeen so it could be a loss function, and it sits inside speech, gesture, electrocardiogram, and handwriting systems to this day.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the optimal path. Among all monotone alignments of the two series, the dynamic program finds the one with the least total cost, exactly, in n times m cell updates, and the cost of that path is the distance. The referee is a time map the generator knows. The recovered path tracks it within about two samples on average, and the distance it reports, thirty nine hundredths, is a tenth of the Euclidean distance of four point one on the same pair, the difference being pure timing. On the classification task the same distance gives ninety nine percent against Euclidean’s eighty three. The algorithm also owns the bound that makes it searchable. Keogh’s lower bound, an envelope distance computed in linear time, is provably never larger than the true warping distance, checked here on all one thousand eight hundred pairs with zero violations, and the search that trusts it finds the same nearest neighbor on sixty of sixty queries after only three hundred fifty eight of three thousand six hundred full computations. The heuristic supplies the forgiveness, and its limit. Letting each sample match one or more samples of the other series is what turns timing differences into cheap steps, and the Sakoe and Chiba band is what stops the forgiveness from becoming nonsense. The band is measured both ways. At five percent of the length it is tighter than the warps in the data, and accuracy falls to ninety percent. At ten percent it computes one thousand nine hundred ninety of ten thousand cells at one hundred percent. Without it, a single spike aligns to a sixty sample plateau at distance zero, one sample stretched over sixty, which is the pathological path every practitioner has been bitten by; with the band the same pair is six point two apart and no sample matches more than twenty one. And warping is only ever about time. Two flat series a level apart are ten apart under warping and ten under Euclidean, because no rearrangement of time changes a level.',
  },
  {
    section: 'picture',
    text:
      'Two singers performing the same melody, one rushing the verse and dragging the chorus, the other the reverse. Compare them beat for beat and they never match: the note one singer holds on beat twelve, the other reaches on beat fifteen. Instead, lay the two recordings on a table and draw a line through every pair of moments that should correspond, never going backward in either recording, letting one moment of the first pair with several of the second where a note is held. Among all such lines, find the one along which the notes agree best. That line is the warp, its cost is the distance, and the rule that the line may not stray too far from the diagonal is what keeps a single held note from being matched to an entire verse.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Grid: the corner cell is zero and everything else is infinite, and the local cost of a pair is the squared difference of the two samples. Fill: for each cell inside the band, the cost is the local cost plus the cheapest of the three predecessors, to the left, above, and diagonal. Distance: the square root of the far corner, and the path is read back from that corner by following the minima. Bound: Keogh’s envelope of the query over the band gives a lower bound, and the full computation runs only if the bound could beat the best so far. Check: the band against the warps in the data, and the path against anything known about the true alignment. On this page, the ten sample band: one thousand nine hundred ninety cells per pair instead of ten thousand, the same accuracy as the unbounded grid, and the pruned search at a tenth of the full computations with every answer unchanged.',
  },
  {
    section: 'signals',
    text:
      'The signals that this pair fits. First: same shape, different tempo. Speech, gestures, pulse traces, gait, handwriting; timing varies and means little. Second: whole series comparison, not a pointwise fit. The question is, is this that pattern, not, what is the value at time t. Third: a library to search. Nearest neighbor classification and subsequence search, where the lower bound turns a quadratic cost per pair into something you can afford.',
  },
  {
    section: 'tradeoffs',
    text:
      'Now the rivals. FastDTW: it coarsens the series, warps at low resolution, and refines within a radius, so long series align in about linear time. It is approximate, and on short series a good band is both faster and exact. Reach for it on series of many thousands of samples where the full grid is out of reach. The matrix profile: every subsequence’s nearest neighbor in one sweep, so motifs, discords, and anomalies fall out without a query. It is Euclidean on normalized windows, so there is no elasticity, and it answers a different question from how far apart are these two. Reach for it to find repeated or anomalous patterns inside one long recording. And the longest common subsequence: the same grid, but samples may be skipped, so outliers and dropouts cost nothing. It needs a match threshold, and it returns a similarity count rather than a distance. Reach for it on series with spikes, gaps, or missing samples that a warp would be forced to explain.',
  },
  {
    section: 'tradeoffs',
    text:
      'The honest weaknesses of the hero: quadratic, not a metric, and too forgiving unbounded. It costs n times m cells per pair before any band, ten thousand here and a million for thousand sample series. The triangle inequality does not hold, so metric indexes cannot be used, and the lower bound is the workaround. Without a band a spike matches a plateau perfectly. And it forgives only time: amplitude, offset, and trend must be normalized away first, or two flat series a level apart stay a level apart.',
  },
  {
    section: 'tradeoffs',
    text:
      'And the negative example: unbounded warping. Drop the band, and the alignment may stretch any one sample over any number of the other series. Measured: a single spike against a plateau sixty samples wide matches at distance zero, the spike’s one sample paired with all sixty, the zeros paired with the zeros, a perfect score for two series that look nothing alike. With a ten sample band the same pair is six point two apart, and no sample matches more than twenty one. The elasticity is the whole point of the method and the whole danger of it. The band is not an optimization; it is the statement of how much timing you are prepared to forgive. Set it from the warps you expect, which were about fourteen samples here, where a five sample band lost ten points, and then measure.',
  },
  {
    section: 'code',
    text:
      'The code on this page is the warping program, the lower bound, a shape generator with random time warps, and the referees. The warping function fills the grid inside a band, counts the cells, and reads the path back. Keogh’s bound builds the envelope of the query and sums the excursions outside it. The generator draws six shapes and warps time by a random walk in log speed, keeping the map so the alignment can be checked. The self test asserts: the recovered path within three samples of the true map on average and twelve at worst, with the warping distance under four tenths of the Euclidean; warping at least five points above Euclidean and above ninety percent on nearest neighbor classification; the ten percent band under a quarter of the full cells and within five points of the unbounded accuracy; the lower bound never above the true distance, and the pruned search agreeing on every query at under half the computations; flat series at least nine tenths of their Euclidean distance apart; and the unbounded spike against plateau path matching one sample to at least fifty, while the banded one matches at most twenty one. When it prints O K, elasticity has been measured against a warp that was known in advance. The file would fail before it would lie to you.',
  },
];
