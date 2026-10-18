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
    status: 'draft',
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
    status: 'draft',
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
    status: 'draft',
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
    status: 'draft',
    difficulty: 'intermediate',
    durationMinutes: 30,
    skills: ['Stable train and validation assignment by content hash', 'hashlib, encode, hexdigest, and int with base sixteen', 'Buckets with the modulo operator and a threshold', 'A dictionary of lists', 'Why a seeded shuffle still moves records', 'A three-way split (practice)'],
    authoringModel: 'Claude Fable 5',
  },
  {
    slug: 'validate-jsonl-records',
    title: 'Validate a JSONL training file line by line and count what you reject',
    summary: 'An overnight fine-tuning job crashed on one malformed line of a JSONL export, and after a manual fix it trained on records with empty answers. A worked Python example streams the file with a generator: seven inline lines, json.loads inside try and except, checks for missing and empty fields, kept records yielded one at a time, rejections counted by reason with their line numbers, its exact output, and one practice variation that drops duplicate prompts.',
    track: 'data-pipelines',
    language: 'python',
    status: 'draft',
    difficulty: 'intermediate',
    durationMinutes: 30,
    skills: ['Streaming validation of JSONL records', 'json.loads and JSONDecodeError', 'A generator function with yield', 'Counting rejections by reason with Counter', 'Skipping duplicates with a set (practice)'],
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
