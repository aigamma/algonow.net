// Which files in src/data/atlas/ are REGISTRIES (metadata about the catalog)
// rather than TOPICS (arrays of {a,h,d,t} entries).
//
// Single source of truth on purpose. atlas.js globs the directory to build the
// browse page and scripts/check.mjs walks it to count topics; when the two kept
// their own hand-written exclusion lists, adding problems.json made check.mjs
// ignore it correctly while atlas.js treated it as a topic and called .slice()
// on a plain object, which throws at page load. The build still exited 0
// because Vite never runs client code. One list, imported by both.
export const REGISTRY_KEYS = ['aliases', 'problems'];

export const isRegistryKey = (key) => REGISTRY_KEYS.includes(key);
