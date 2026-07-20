# The atlas: algonow's build map

`src/data/atlas/*.json` is the master catalog of units this site can teach:
every entry is either a standalone algorithm or an algorithm × heuristic
pair. It is the strategy document Eric asked for, kept as data so the check
script can hold it to account.

## Entry schema

One JSON object per line inside a per-family array:

```json
{"a": "A* search", "h": "Manhattan distance", "d": "Grid pathfinding", "t": 1}
{"a": "Heapsort", "h": null, "d": "In-place comparison sorting", "t": 1}
```

- `a` : the algorithm (the control structure; blue on every site surface)
- `h` : the heuristic (the guiding rule; amber), or `null` for standalone
  algorithms with no canonical pairing
- `d` : terse domain phrase (what problem this attacks), 2–6 words
- `t` : build tier. 1 = canon, teach early. 2 = solid standard. 3 =
  specialist or recreational.

The family is the filename. `npm run check` enforces schema, global
uniqueness of the normalized (a, h) pair across all files, and that every
live pair in `src/data/puzzles.js` appears in the atlas.

## Rules of the catalog

1. **Real names only.** Every entry is an established, named method. When a
   pairing is uncertain, the entry goes in standalone or not at all; the
   atlas never coins algorithms.
2. **Pairs are distinct units.** A* × Manhattan and A* × landmarks are
   different lessons; both belong. A bare algorithm is not listed separately
   once its pairs are (the pair pages subsume it).
3. **Uniqueness is mechanical.** The checker normalizes case, possessives,
   and punctuation; synonym discipline (no "Dijkstra" vs "Dijkstra's
   algorithm" twins) is editorial.

## How the site gets filled in

A pair graduates from the atlas to a live page through the 6-file unit
pipeline in CLAUDE.md (registry entry, Vite entry, tight content, narration,
canvas viz, tested Python solution), one pair per unit of work, committed and
pushed each. Build order: rotate across families taking tier 1 first, so
breadth arrives before depth; within a family, prefer the pair whose measured
contrast makes the best evidence (the 482-vs-2,000,000 style numbers).
The homepage bench stays a curated hand-picked slice of the atlas, not a dump
of it; the atlas itself is data, deliberately not rendered at this size.
