// The rivals table, deliberately kept OUT of the atlas page bundle.
//
// problems.json is 112 KB raw, about 26 KB gzipped, and nothing the browser
// renders ever reads it. rivalsOf is a build-time and test-time helper: the
// /atlas page imports CATEGORY_GROUPS, ALL_ENTRIES, ALIASES and the counts,
// and never calls this. While the registry was pulled in through atlas.js's
// eager glob, Vite had no way to drop it, so every atlas visitor downloaded
// the whole rivals registry to support a function no page calls. Importing it
// from its own module means it lands only in bundles that ask for it.
import PROBLEMS_JSON from './atlas/problems.json';
import { ALL_ENTRIES } from './atlas.js';

// problem slug -> { label, phrases }
export const PROBLEMS = PROBLEMS_JSON || {};

const normPhrase = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

// Inverted into the lookup the callers need: a normalized `d` phrase -> the
// problem slug that owns it, so any entry can find the other methods that
// attack the same problem.
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
