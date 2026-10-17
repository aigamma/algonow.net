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

// Intentionally empty. Infrastructure is not a completed learning scenario.
// See docs/FABLE_AI_ENGINEERING.md before adding an authored entry.
export const SCENARIOS = Object.freeze([]);

export function publishedScenarios(scenarios) {
  return Object.freeze(scenarios.filter(scenario => scenario.status === 'published').map(scenario => Object.freeze({
    ...scenario,
    href: scenarioHref(scenario.slug),
    html: scenarioPaths(scenario.slug).html,
    vite: `scenario-${scenario.slug}`,
  })));
}

export const LIVE_SCENARIOS = publishedScenarios(SCENARIOS);
