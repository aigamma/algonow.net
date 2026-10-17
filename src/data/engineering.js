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
    status: 'draft',
    difficulty: 'intermediate',
    durationMinutes: 30,
    skills: ['Greedy packing under a prompt budget', 'Records as a list of dictionaries', 'A loop with a guard, a join test, and continue', 'Rejecting an oversized unit loudly', 'Splitting at line breaks (practice)'],
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
