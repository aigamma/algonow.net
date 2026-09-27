// The spoken lesson for puzzle one hundred fifty three, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle one hundred fifty three: the Hough transform, paired with parameter space voting, for line detection. Here is the puzzle. An edge image of two hundred by two hundred pixels with three straight lines in it, each sampled as forty edge points with less than a pixel of noise, buried in two hundred clutter points. Find the lines: how many there are and where. Fitting one line to all the points is meaningless when there are several and most points belong to none; measured, it puts six of the three hundred twenty points within a pixel and a half of the result. The method is the Hough transform. Every edge point votes for every line that could pass through it, and lines are the cells of the parameter space with the most votes. The heuristic is the parametrization and the voting: lines as a distance and an angle, rho equals x cosine theta plus y sine theta, so each point traces one sinusoid through a bounded accumulator, and a line’s points meet in one cell while clutter spreads its votes thin. On this page the elected lines are held to the planted ones, the clutter is turned up until the margin narrows, the grain of the accumulator is measured both ways, and two rivals run on the same points.',
  },
  {
    section: 'origins',
    text:
      'Paul Hough patented the method in nineteen sixty two, under the title Method and Means for Recognizing Complex Patterns, to find particle tracks in bubble chamber photographs, voting in slope and intercept, a parameter space that is unbounded for vertical lines. Duda and Hart, in nineteen seventy two, in Communications of the ACM, Use of the Hough Transformation to Detect Lines and Curves in Pictures, replaced it with the normal form of distance and angle, bounded on both axes, which is the form every implementation uses. Ballard generalized the vote to arbitrary shapes in nineteen eighty one, through a lookup table of edge orientations. Kiryati, Eldar, and Bruckstein showed in nineteen ninety one that a random subset of the points suffices, and Matas, Galambos, and Kittler made that progressive in two thousand, which is the probabilistic line finder in OpenCV. The same idea is the Radon transform in tomography, and it reappears wherever many noisy observations must agree on a few parameters: lane detection, document deskewing, and the circle finder in every lab microscope.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the vote. A line is not fitted to points but elected by them, and the election tolerates any number of abstentions. Each of the three hundred twenty points casts one hundred eighty votes, one per angle, and the accumulator is simply counted. The referee is the set of planted lines. All three are the three tallest peaks, each within two pixels of distance and two degrees of angle, and the tallest peak that is not a line has half the votes of the weakest that is: fifty against eighty six. The algorithm also owns its robustness curve, measured. With eight hundred clutter points, twenty for every line point, the weakest line still out polls the tallest clutter peak, one hundred twenty two to ninety one, because clutter votes land in a different cell every time and line votes land in the same one. And it owns what least squares cannot: six of three hundred twenty points near the single fitted line, against forty near each elected one. The heuristic supplies the parameter space and its grain. The normal form bounds both axes, so the accumulator is a finite table, five hundred sixty six by one hundred eighty here, and a point’s votes trace one sinusoid across it. Two points’ sinusoids cross at the one line through both; forty points’ cross at one cell. The grain is the trade the file measures both ways. Pixel noise splits a line’s forty votes across adjacent cells, only ten to twenty six landing in the exact one, so peaks are read from three by three sums. Two degree by two pixel bins gather one hundred votes on the weakest line in a quarter of the cells. Four degree bins let a line whose angle falls between bins spread its distance over seven pixels at the image edge, and lose one of the three. One degree by two pixel bins gather one hundred thirty and localize the angle exactly. Coarse bins collect, fine bins locate, and the smoothing is what lets the two be had together.',
  },
  {
    section: 'picture',
    text:
      'A town meeting about where the new road should run. Every resident who has seen a stretch of it stands on the map and names every straight road that could pass through their spot; each naming is one vote in a ledger indexed by the road’s direction and its distance from the town hall. A resident who saw nothing real votes for a full circle of roads, one each. But the residents who saw the same road all name it, among their many other guesses, and its line in the ledger fills up while every other line gets a scattering. Read the ledger’s tallest entries and you have the roads, however many there are, and the confused residents never had to be identified.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Accumulator: angles in steps from zero to one hundred eighty degrees, distances in steps from minus the image diagonal to plus, all zeros. Vote: for each edge point and each angle, compute the distance and increment that cell. Sum: each cell plus its eight neighbors, so noise that split a line’s votes is gathered back. Peaks: cells above a threshold that are maxima in their neighborhood, remembering that a distance and an angle name the same line as the negated distance at the angle plus one hundred eighty. Verify: count the points within a pixel or two of each elected line, and refit them by least squares if a precise line is wanted. On this page, fifty seven thousand six hundred votes, three peaks, three lines. Sequential RANSAC on the same points also recovers three of three, at one hundred sixty eight thousand residual evaluations, one line at a time, and told in advance to look for three.',
  },
  {
    section: 'signals',
    text:
      'The signals that this pair fits. First: several instances of a few parameter shape. Lines, circles, ellipses, where a fit would need to know which points belong to which. Second: more clutter than signal. Votes from unrelated points spread thin, and the transform never has to say which points are outliers. Third: a parameter space you can grid. Two or three dimensions; the accumulator grows as the product of the resolutions.',
  },
  {
    section: 'tradeoffs',
    text:
      'Now the rivals. RANSAC: no accumulator, any model a minimal sample fixes, and exact sub pixel lines from the refit; three of three here. It cost one hundred sixty eight thousand residual evaluations for three lines, finds one line at a time, and needs the count or a stopping rule. Reach for it with one dominant model, or a model with too many parameters to grid. The generalized Hough transform: Ballard’s table of edge orientations lets any shape vote for its position, not only shapes with a formula. Scale and rotation add axes to the accumulator, and the table needs a clean template. Reach for it to locate a known arbitrary outline in clutter. And the line segment detector: it grows regions of aligned gradient and validates each segment statistically, endpoints included, with no parameters to tune. It needs gradients from an image rather than a point set, and it breaks long lines into pieces at gaps. Reach for it on real photographs where segments, not infinite lines, are the answer.',
  },
  {
    section: 'tradeoffs',
    text:
      'The honest weaknesses of the hero: the accumulator is the cost, and the grain is a decision. Cells grow as the product of the resolutions, one hundred two thousand at one degree by one pixel, and votes as points times angle steps; each extra parameter multiplies both, which is why circles need a third axis and ellipses are out of reach. The bin size trades peak height against localization and can drop a line outright: four degree bins found two of three. And the peaks give infinite lines, not segments, so the endpoints need a second pass over the points.',
  },
  {
    section: 'tradeoffs',
    text:
      'And the negative example: one least squares line through all the points. Least squares answers, which single line is closest to these points, and when the points come from three lines and a cloud of clutter, the answer is a line close to none of them. Measured on the three hundred twenty points: a line with six points within a pixel and a half of it, against forty on each of the lines that are actually there. The squared residual makes every point pull, so the fit lands in the middle of everything; no threshold, weighting, or iteration rescues a method that assumes one model when the data holds three. The transform’s vote is the opposite assumption: many models, each elected by its own supporters, and the losers never enter the arithmetic.',
  },
  {
    section: 'code',
    text:
      'The code on this page is a point generator, the transform, a peak finder, and two rivals. The generator lays forty noisy points along each planted line inside the image and scatters the clutter. The transform loops over points and angles, computing the distance and incrementing the cell. The peak finder sums each cell with its neighbors, keeps the maxima above a threshold with the angle wrapped, and reports the summed and the raw votes. Sequential RANSAC fits, removes inliers, and repeats; total least squares fits one line to everything. The self test asserts: every planted line among the peaks within two pixels and two degrees, the three tallest peaks all planted lines, and the weakest planted peak more than one and a half times the tallest clutter peak; all lines found at zero, two hundred, and four hundred clutter points, with the tallest clutter peak rising with clutter; one and two degree bins finding all three lines and four degree bins fewer, with two by two bins gathering at least as many votes as one by one; RANSAC recovering all three; and least squares placing fewer than twenty points within a pixel and a half of its line. Two notes are recorded in the file: on raw cells the third line peaked at nineteen of forty votes and sat under the threshold, which is why the sums exist, and the draft asked for a factor of two over the clutter and measured one point seven. When it prints O K, the election has been held against the candidates that were planted. The file would fail before it would lie to you.',
  },
];
