// Build-time aggregation of the atlas family files into one catalog the /atlas
// page renders. Import globbed JSON so adding a family file needs no edit here.
// This module is used only by the atlas page entry, so the homepage and puzzle
// pages never pay for it.

import { CATEGORIES, CATEGORY_OF_FAMILY, CATEGORY_BY_KEY } from './atlas-categories.js';

const modules = import.meta.glob('./atlas/*.json', { eager: true });

const FAMILY_LABELS = {
  'sorting': 'Sorting & selection',
  'search-structures': 'Search & data structures',
  'graphs-paths': 'Graphs: paths & search',
  'graphs-structure': 'Graphs: structure & flow',
  'metaheuristics': 'Metaheuristics',
  'game-search': 'Adversarial & game search',
  'backtracking-cp': 'Backtracking & constraints',
  'strings': 'Strings & text',
  'computational-geometry': 'Computational geometry',
  'numerical': 'Numerical & linear algebra',
  'machine-learning': 'Machine learning',
  'probabilistic-streaming': 'Probabilistic & streaming',
  'dynamic-programming': 'Dynamic programming',
  'cryptography-number-theory': 'Cryptography & number theory',
  'compression-coding': 'Compression & coding',
  'distributed-concurrent': 'Distributed & concurrent',
  'quantum': 'Quantum',
  'unconventional-computing': 'Unconventional computing',
  'online-competitive': 'Online & competitive',
  'scheduling-operations': 'Scheduling & operations research',
  'computational-biology': 'Computational biology',
  'signal-image': 'Signal & image processing',
  'graphics-rendering': 'Graphics & rendering',
  'databases-query': 'Databases & query processing',
  'automata-languages': 'Automata & languages',
  'networking': 'Networking',
  'robotics-planning': 'Robotics & motion planning',
  'combinatorial-enumeration': 'Combinatorial enumeration',
  'game-theory-social-choice': 'Game theory & social choice',
  'stochastic-simulation': 'Stochastic & simulation',
  'information-retrieval-nlp': 'Information retrieval & NLP',
  'approximation': 'Approximation algorithms',
  'fault-tolerance-storage': 'Fault tolerance & storage',
  'puzzles-recreational': 'Puzzles & recreational',
};

function familyKey(path) {
  return path.replace('./atlas/', '').replace('.json', '');
}

// aliases.json is metadata (canonical -> synonyms), not a family of entries.
export const FAMILIES = Object.entries(modules)
  .filter(([path]) => familyKey(path) !== 'aliases')
  .map(([path, mod]) => {
    const key = familyKey(path);
    const entries = (mod.default || []).slice().sort((a, b) => {
      if (a.t !== b.t) return a.t - b.t;
      return a.a.localeCompare(b.a);
    });
    return { key, label: FAMILY_LABELS[key] || key, category: CATEGORY_OF_FAMILY[key], entries };
  })
  .sort((a, b) => b.entries.length - a.entries.length);

// Families grouped under their major category, in the canonical category order.
export const CATEGORY_GROUPS = CATEGORIES.map((cat) => {
  const families = FAMILIES.filter((f) => f.category === cat.key);
  const count = families.reduce((n, f) => n + f.entries.length, 0);
  return { ...cat, familyList: families, count };
}).filter((g) => g.familyList.length);

export const ALIASES = modules['./atlas/aliases.json']?.default || {};
export const TOTAL = FAMILIES.reduce((n, f) => n + f.entries.length, 0);
export const CATEGORY_COUNT = CATEGORY_GROUPS.length;
export const TIER_LABEL = { 1: 'canon', 2: 'standard', 3: 'specialist' };
export { CATEGORY_BY_KEY };
