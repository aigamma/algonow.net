// Build-time aggregation of the atlas topic files into the three-tier catalog
// the /atlas page renders: Category -> Topic -> Entry. Topic files are globbed,
// so adding one needs no edit here. Used only by the atlas page entry, so the
// homepage and puzzle pages never pay for this module.

import { CATEGORIES, CATEGORY_OF_TOPIC, CATEGORY_BY_KEY } from './atlas-categories.js';
import { isRegistryKey } from './atlas-registry.js';

const modules = import.meta.glob('./atlas/*.json', { eager: true });

// Human-readable topic labels. A topic file with no entry here falls back to a
// title-cased version of its key, so a new topic still renders sanely.
const TOPIC_LABELS = {
  'sorting': 'Sorting & selection',
  'search-structures': 'Search & data structures',
  'graphs-paths': 'Graphs: paths & search',
  'graphs-structure': 'Graphs: structure & flow',
  'network-science': 'Network science',
  'metaheuristics': 'Metaheuristics',
  'game-search': 'Adversarial & game search',
  'backtracking-cp': 'Backtracking & constraints',
  'automated-reasoning': 'Automated reasoning & theorem proving',
  'strings': 'Strings & text',
  'computational-geometry': 'Computational geometry',
  'numerical': 'Numerical & linear algebra',
  'numerical-pde': 'PDE & scientific computing',
  'machine-learning': 'Machine learning',
  'deep-learning': 'Deep learning',
  'reinforcement-learning': 'Reinforcement learning',
  'time-series': 'Time series & forecasting',
  'recommender-causal': 'Recommenders & causal inference',
  'probabilistic-streaming': 'Probabilistic & streaming',
  'stochastic-simulation': 'Stochastic & simulation',
  'queueing-performance': 'Queueing & performance modeling',
  'dynamic-programming': 'Dynamic programming',
  'combinatorial-enumeration': 'Combinatorial enumeration',
  'cryptography-number-theory': 'Cryptography & number theory',
  'privacy-security': 'Privacy & security',
  'compression-coding': 'Compression & coding',
  'distributed-concurrent': 'Distributed & concurrent',
  'fault-tolerance-storage': 'Fault tolerance & storage',
  'operating-systems': 'Operating systems',
  'networking': 'Networking',
  'quantum': 'Quantum',
  'unconventional-computing': 'Unconventional computing',
  'online-competitive': 'Online & competitive',
  'scheduling-operations': 'Scheduling & operations research',
  'computational-biology': 'Computational biology',
  'signal-image': 'Signal & image processing',
  'graphics-rendering': 'Graphics & rendering',
  'audio-speech': 'Audio & speech',
  'databases-query': 'Databases & query processing',
  'automata-languages': 'Automata & languages',
  'program-analysis': 'Program analysis',
  'robotics-planning': 'Robotics & motion planning',
  'game-theory-social-choice': 'Game theory & social choice',
  'information-retrieval-nlp': 'Information retrieval & NLP',
  'vector-search': 'Vector search & ANN',
  'approximation': 'Approximation algorithms',
  'quantitative-finance': 'Quantitative finance',
  'puzzles-recreational': 'Puzzles & recreational',
};

function topicKey(path) {
  return path.replace('./atlas/', '').replace('.json', '');
}

function titleCase(key) {
  return key.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// aliases.json and problems.json are registries (name and problem metadata),
// not topics of entries; see atlas-registry.js.
export const TOPICS = Object.entries(modules)
  .filter(([path]) => !isRegistryKey(topicKey(path)))
  .map(([path, mod]) => {
    const key = topicKey(path);
    const entries = (mod.default || []).slice().sort((a, b) => {
      if (a.t !== b.t) return a.t - b.t;
      return a.a.localeCompare(b.a);
    });
    return { key, label: TOPIC_LABELS[key] || titleCase(key), category: CATEGORY_OF_TOPIC[key], entries };
  })
  .sort((a, b) => b.entries.length - a.entries.length);

// Topics grouped under their category, in the canonical category order.
export const CATEGORY_GROUPS = CATEGORIES.map((cat) => {
  const topicList = TOPICS.filter((t) => t.category === cat.key).sort((a, b) => a.label.localeCompare(b.label));
  const count = topicList.reduce((n, t) => n + t.entries.length, 0);
  return { ...cat, topicList, count };
}).filter((g) => g.topicList.length);

// Flat list of every entry with its category and topic attached, for the
// random button and the search filter.
export const ALL_ENTRIES = TOPICS.flatMap((t) =>
  t.entries.map((e) => ({ ...e, topicKey: t.key, topicLabel: t.label, categoryKey: t.category }))
);

export const ALIASES = modules['./atlas/aliases.json']?.default || {};

// The rivals table: problem slug -> { label, phrases }. Inverted here into the
// lookup the UI needs, a normalized `d` phrase -> problem, so any entry can
// find the other methods that attack the same problem.
export const PROBLEMS = modules['./atlas/problems.json']?.default || {};
const normPhrase = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
export const PROBLEM_OF_PHRASE = (() => {
  const map = {};
  for (const [slug, meta] of Object.entries(PROBLEMS)) {
    if (slug.startsWith('_') || !meta?.phrases) continue;
    for (const phrase of meta.phrases) map[normPhrase(phrase)] = slug;
  }
  return map;
})();

// Every entry that attacks the same problem as `entry`, itself excluded. A
// same-`a` entry is a heuristic variant of the same method, not a rival, so
// the whole algorithm is excluded, not just the exact (a, h) pair. Falls
// back to an exact phrase match when the phrase is not registered yet.
export function rivalsOf(entry) {
  const slug = PROBLEM_OF_PHRASE[normPhrase(entry.d)];
  return ALL_ENTRIES.filter((e) => {
    if (e === entry || e.a === entry.a) return false;
    return slug ? PROBLEM_OF_PHRASE[normPhrase(e.d)] === slug : normPhrase(e.d) === normPhrase(entry.d);
  });
}
export const TOTAL = ALL_ENTRIES.length;
export const CATEGORY_COUNT = CATEGORY_GROUPS.length;
export const TOPIC_COUNT = TOPICS.length;
export const TIER_LABEL = { 1: 'canon', 2: 'standard', 3: 'specialist' };
export { CATEGORY_BY_KEY };
