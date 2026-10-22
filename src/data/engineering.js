// New learning scenarios belong here. The algorithm catalog is a legacy reference.
// Metadata is infrastructure; Fable authors every scenario and its Python work.
export const ENGINEERING_TRACKS = Object.freeze([
  { id: 'rag', title: 'Retrieval and RAG', description: 'Build, diagnose, and evaluate retrieval systems and grounded answer pipelines.' },
  { id: 'data-pipelines', title: 'Data pipelines', description: 'Prepare, validate, and version the data that AI systems depend on.' },
  { id: 'fine-tuning', title: 'Fine-tuning', description: 'Adapt models with reproducible training, suitable data, and measured evaluation.' },
  { id: 'distillation', title: 'Distillation', description: 'Transfer model behavior while measuring quality, latency, and deployment cost.' },
  { id: 'evaluation', title: 'Evaluation', description: 'Design useful checks, diagnose regressions, and test AI system behavior.' },
  { id: 'serving', title: 'Serving and architecture', description: 'Build reliable inference services and reason about operational tradeoffs.' },
].map(Object.freeze));

export const ENGINEERING_DIFFICULTIES = Object.freeze(['foundation', 'intermediate', 'advanced']);
export const ENGINEERING_SECTIONS = Object.freeze(['brief', 'starter', 'files', 'evidence', 'solution', 'visual', 'tradeoffs']);

export function scenarioHref(slug) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug || '')) throw new Error('Invalid engineering scenario slug');
  return `/scenarios/${slug}/`;
}

export function scenarioPaths(slug) {
  const href = scenarioHref(slug);
  const directory = href.slice(1, -1);
  return Object.freeze({
    href, directory, html: `${directory}/index.html`, main: `${directory}/main.jsx`,
    content: `${directory}/content.jsx`, contract: `${directory}/scenario.json`,
    python: `${directory}/python`,
    narration: `src/content/${slug}.narration.js`,
    manifest: `src/data/narration/${slug}.json`,
    receipt: `infra/narration/receipts/${slug}.json`,
  });
}

// Only Fable-authored scenarios belong here. See docs/FABLE_AI_ENGINEERING.md
// before adding an entry; a draft stays off Home until its package, visual,
// and both recorded narration tracks pass every check.
export const SCENARIOS = Object.freeze([
  {
    slug: 'rag-chunk-boundary-recall',
    title: 'Repair a RAG chunker that splits answers across chunks',
    summary: 'A support assistant stopped finding multi-step runbook procedures after ingest switched to fixed-size character windows. A worked Python example packs already-parsed blocks into chunks under a budget without cutting a procedure: five inline blocks, one short function over a list of dictionaries, its exact output, a line-by-line walkthrough, and one practice variation.',
    track: 'rag',
    language: 'python',
    status: 'published', added: '2026-10-17', listenMinutes: 12,
    difficulty: 'intermediate',
    durationMinutes: 30,
    skills: ['Greedy packing under a prompt budget', 'Records as a list of dictionaries', 'A loop with a guard, a join test, and continue', 'Rejecting an oversized unit loudly', 'Splitting at line breaks (practice)'],
    authoringModel: 'Claude Fable 5',
  },
  {
    slug: 'rank-fusion-keyword-vector',
    title: 'Fuse keyword and vector rankings with reciprocal rank fusion',
    summary: 'A support assistant retrieves runbook chunks from a keyword index and a vector index, and taking the vector list first buried exact matches for error codes. A worked Python example fuses two ranked lists with reciprocal rank fusion: two inline lists, a dictionary that accumulates scores, a sort with a key function, its exact output, a trace of every contribution, and one practice variation that weights the lists.',
    track: 'rag',
    language: 'python',
    status: 'published', added: '2026-10-17', listenMinutes: 12,
    difficulty: 'foundation',
    durationMinutes: 25,
    skills: ['Reciprocal rank fusion of two retrievers', 'A dictionary as a score accumulator with get and a default', 'Sorting with a key function and a tuple tie-break', 'Tuple unpacking in for loops', 'Weighting the lists (practice)'],
    authoringModel: 'Claude Fable 5',
  },
  {
    slug: 'paired-prompt-comparison',
    title: 'Compare two prompt versions ticket by ticket, not by accuracy alone',
    summary: 'A rewritten classification prompt scored higher on the evaluation set and shipped, then misrouted the outage tickets the old prompt got right. A worked Python example pairs the two prompts item by item: nine inline tickets, zip with strict length checking, a four-way count keyed by tuples, the regressions and gains by id, its exact output, and one practice variation that normalizes answers before comparing.',
    track: 'evaluation',
    language: 'python',
    status: 'published', added: '2026-10-17', listenMinutes: 12,
    difficulty: 'foundation',
    durationMinutes: 25,
    skills: ['Paired comparison of two model versions', 'zip over parallel lists with strict checking', 'Tuples as dictionary keys for a two-by-two count', 'List comprehensions with a condition', 'Formatted percentages and aligned tables', 'Normalizing answers before comparing (practice)'],
    authoringModel: 'Claude Fable 5',
  },
  {
    slug: 'retry-with-backoff',
    title: 'Retry a flaky model call with exponential backoff and a cap',
    summary: 'An assistant retried a hosted model in a tight loop, hammering a rate-limited endpoint and retrying invalid requests forever. A worked Python example wraps one call in a retry loop with exponential backoff: a scripted fake endpoint, functions passed as values, try and except on retryable errors only, a cap that gives up loudly, its exact output, and one practice variation that adds a total time budget.',
    track: 'serving',
    language: 'python',
    status: 'published', added: '2026-10-17', listenMinutes: 12,
    difficulty: 'intermediate',
    durationMinutes: 30,
    skills: ['Exponential backoff with a retry cap', 'Passing functions as arguments (the call and the sleep)', 'try, except on chosen exception types, and raising', 'A function that builds a scripted fake', 'A total wait budget (practice)'],
    authoringModel: 'Claude Fable 5',
  },
  {
    slug: 'stable-split-by-hash',
    title: 'Split a fine-tuning set by hashing ids so the split never moves',
    summary: 'A weekly fine-tuning job reshuffled its train and validation split each run, so examples drifted between sides and validation scores jumped. A worked Python example assigns each record by hashing its id with SHA-256 into a hundred buckets: six inline transcripts, hashlib and integer conversion, a dictionary of lists, proof that new records never move old ones, a seeded shuffle for comparison, its exact output, and one practice variation that adds a test split.',
    track: 'fine-tuning',
    language: 'python',
    status: 'published', added: '2026-10-17', listenMinutes: 12,
    difficulty: 'intermediate',
    durationMinutes: 30,
    skills: ['Stable train and validation assignment by content hash', 'hashlib, encode, hexdigest, and int with base sixteen', 'Buckets with the modulo operator and a threshold', 'A dictionary of lists', 'Why a seeded shuffle still moves records', 'A three-way split (practice)'],
    authoringModel: 'Claude Fable 5',
  },
  {
    slug: 'validate-jsonl-records',
    title: 'Validate a JSONL training file line by line and count what you reject',
    summary: 'An overnight fine-tuning job crashed on one malformed line of a JSONL export, and after a manual fix it trained on records with empty answers. A worked Python example streams the file with a generator: nine inline lines (eight records and a blank), json.loads inside try and except, checks for missing and empty fields, kept records yielded one at a time, rejections counted by reason with their line numbers, its exact output, and one practice variation that drops duplicate prompts.',
    track: 'data-pipelines',
    language: 'python',
    status: 'published', added: '2026-10-17', listenMinutes: 13,
    difficulty: 'intermediate',
    durationMinutes: 30,
    skills: ['Streaming validation of JSONL records', 'json.loads and JSONDecodeError', 'A generator function with yield', 'Counting rejections by reason with Counter', 'Skipping duplicates with a set (practice)'],
    authoringModel: 'Claude Fable 5',
  },
  {
    slug: 'calibrate-confidence-by-gradient-descent',
    title: 'Calibrate model confidence with a hand-written training loop',
    summary: 'An assistant escalates to a human below a confidence of 0.6, but its 0.9 answers were right only seven times in ten. A worked Python example fits a two-parameter calibration to eight scored answers with the loop PyTorch runs for you, forward, loss, gradient, update, written in plain Python: math.exp and the sigmoid, a function that returns two gradients, an epoch loop with running totals, its exact output, a trace of the weights, and one practice variation that stops early when the loss stops improving.',
    track: 'fine-tuning',
    language: 'python',
    status: 'published', added: '2026-10-17', listenMinutes: 14,
    difficulty: 'intermediate',
    durationMinutes: 35,
    skills: ['A training loop by hand: forward, loss, gradient, update', 'math.exp and the sigmoid', 'Functions that return several values as a tuple', 'Nested loops over epochs and examples with running totals', 'Early stopping with break (practice)'],
    authoringModel: 'Claude Fable 5',
  },
  {
    slug: 'warmup-cosine-learning-rate',
    title: 'Shape a learning-rate schedule: linear warmup, then cosine decay',
    summary: 'A fine-tune diverged in its first twenty steps because training began at the full learning rate. A worked Python example computes the rate for every step of a warmup-then-cosine schedule and prints the table a trainer would follow: a piecewise function with early returns, math.cos and math.pi, a loop over range, a list of step and rate pairs, its exact output, a trace of the phases, and one practice variation that holds the peak for a while before the decay.',
    track: 'fine-tuning',
    language: 'python',
    status: 'published', added: '2026-10-21', listenMinutes: 12,
    difficulty: 'foundation',
    durationMinutes: 25,
    skills: ['Learning-rate warmup and cosine decay as code', 'A piecewise function with early returns', 'math.cos, math.pi, and a formula turned into Python', 'Building a table as a list of tuples', 'A hold phase at the peak (practice)'],
    authoringModel: 'Claude Fable 5',
  },
  {
    slug: 'distill-soft-targets',
    title: 'Build distillation targets from a teacher with temperature softmax',
    summary: 'A small router model trained on hard labels alone stalled, while the large assistant it replaces knows which wrong answers are nearly right. A worked Python example turns the teacher logits into soft targets with a temperature and scores a student against them: three inline examples with four classes, a softmax with the max trick, cross-entropy against a distribution, lists of lists, its exact output, a trace of every probability, and one practice variation that blends the soft loss with the hard-label loss.',
    track: 'distillation',
    language: 'python',
    status: 'published', added: '2026-10-21', listenMinutes: 14,
    difficulty: 'intermediate',
    durationMinutes: 35,
    skills: ['Temperature softmax and soft targets', 'Lists of lists as small matrices', 'Numerical stability: subtract the max before exp', 'Cross-entropy against a distribution with math.log', 'Blending soft and hard losses (practice)'],
    authoringModel: 'Claude Fable 5',
  },
  {
    slug: 'benchmark-bootstrap-interval',
    title: 'Decide whether a benchmark gain is real with a bootstrap interval',
    summary: 'A new model scored four points higher than the old one on a twenty-five item benchmark, and the team wanted to ship on that. A worked Python example resamples the paired per-item results with a seeded random generator and reports a confidence interval for the difference: two inline result lists, random.Random, a resampling loop, sorting and percentile positions, its exact output, a trace of the resamples, and one practice variation that reports the probability that the new model is better.',
    track: 'evaluation',
    language: 'python',
    status: 'published', added: '2026-10-21', listenMinutes: 13,
    difficulty: 'intermediate',
    durationMinutes: 30,
    skills: ['Paired bootstrap for a benchmark difference', 'random.Random with a seed and randrange', 'Resampling with replacement in a loop', 'Percentiles by sorting and indexing', 'Probability of improvement (practice)'],
    authoringModel: 'Claude Fable 5',
  },
  {
    slug: 'dedupe-training-records',
    title: 'Deduplicate a training set with normalized keys and a set',
    summary: 'A fine-tuning set carried the same question dozens of times with different spacing and casing, and three evaluation questions verbatim. A worked Python example normalizes each prompt into a key and keeps the first record per key: eight inline records, string methods, a set of seen keys, a dictionary from key to the kept id, its exact output, a trace of every decision, and one practice variation that also drops records that overlap the evaluation set.',
    track: 'data-pipelines',
    language: 'python',
    status: 'published', added: '2026-10-21', listenMinutes: 13,
    difficulty: 'foundation',
    durationMinutes: 25,
    skills: ['Deduplication by a normalized key', 'String normalization with lower, split, join, and isalnum', 'Sets: add, membership, intersection', 'A dictionary from key to the first id kept', 'Removing evaluation overlap (practice)'],
    authoringModel: 'Claude Fable 5',
  },
  {
    slug: 'cosine-top-k-retrieval',
    title: 'Rank chunks by cosine similarity and keep the top k',
    summary: 'Orbit\'s assistant ranked runbook chunks by the raw dot product of each chunk\'s embedding with the question, so long chunks with large vectors won every time and a billing overview outranked the one paragraph about key rotation. A worked Python example scores five inline chunks against a query vector with cosine similarity written by hand: a dot product and a norm as loops over zip, math.sqrt, a sort with a key function and a tie-break, the top three cut with a slice, its exact output, a trace of every score, and one practice variation that drops chunks below a minimum similarity.',
    track: 'rag',
    language: 'python',
    status: 'draft',
    difficulty: 'foundation',
    durationMinutes: 25,
    skills: ['Cosine similarity from a dot product and two norms', 'Loops over zip with running totals and strict length checking', 'math.sqrt and a zero-vector guard', 'Sorting records with a key function and a tie-break, then slicing the top k', 'A minimum similarity threshold (practice)'],
    authoringModel: 'Claude Fable 5',
  },
].map(Object.freeze));

export function publishedScenarios(scenarios) {
  return Object.freeze(scenarios.filter(scenario => scenario.status === 'published').map(scenario => Object.freeze({
    ...scenario,
    href: scenarioHref(scenario.slug),
    html: scenarioPaths(scenario.slug).html,
    vite: `scenario-${scenario.slug}`,
  })));
}

export const LIVE_SCENARIOS = publishedScenarios(SCENARIOS);
