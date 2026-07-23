# Provenance alert: an Opus session authored catalog entries (2026-07-22)

**Read this before authoring anything.** It exists because a session that was
meant to run as Claude Fable 5 actually executed as **Claude Opus 4.8**, and
authored catalog entries and one unit page under a commit trailer that falsely
named Fable. CLAUDE.md rule 10 and the site's public claim require that every
atlas entry and every unit's content, narration, and solution be authored by
**Fable in the main thread**, with the authoring model named truthfully in the
commit trailer. That was violated. This file records the exact scope so a real
Fable session can get the provenance caught up.

## How it was caught

The owner flagged the downgrade mid-session. It is corroborated by the harness
itself: this session's commit-attribution boilerplate names `Claude Opus 4.8`,
not Fable. The environment block said "Fable 5", but the running model was
Opus. When the two disagree, the harness co-author string and the owner win.

## Commits that AUTHORED entries under a false "Claude Fable 5" trailer

Each of these carries `Co-Authored-By: Claude Fable 5` but was produced by
Opus 4.8. The content may be perfectly correct, but its provenance is wrong,
which for this site is a defect in itself. These need genuine Fable
re-authoring (rewrite / re-derive, not a trailer edit):

| Commit | What it authored |
| --- | --- |
| `12959ce` | Topic **vector-search**: 29 entries (24 net-new authored; LSH, HNSW, IVF-PQ, Product quantization, Annoy relocated from computational-geometry) |
| `f52d739` | Topic **automated-reasoning**: 30 new entries |
| `7723edb` | **program-analysis** densify: 11 new entries (+ a genuine SSA dedup merge) |
| `c3de125` | Topic **queueing-performance**: 25 entries (Jackson, Mean value analysis relocated from stochastic-simulation; the rest authored) |
| `401a69e` | **Puzzle 08 Union-find** full unit: `src/content/unionfind-rank-compression.jsx`, `.narration.js`, `solutions/unionfind_rank_compression.py`, plus Quick-find and Quick-union atlas entries |
| `647dfa8` | Topic **geospatial**: 19 new entries |
| `c616741` | Topic **computational-chemistry**: 30 new entries |

Net: roughly 138 authored atlas entries across 6 new topic files and one
densify, plus one complete unit page. All Opus, all mislabeled Fable.

## Commits that are FINE regardless of model (metadata / tooling / docs / ops)

Rule 10 permits these from any model. No re-authoring needed; review only if
desired:

- `a01ae18` rivalsOf self-exclusion fix (tooling code) + retiring the bare
  Dijkstra entry (dedup). Trailer names Fable but the work is tooling/dedup.
- `8ed0925` queue-keeping protocol (doc only).
- `eb94093` G2: folded 19 phrases into `problems.json` (registry metadata;
  editorial taxonomy, allowed, but worth a Fable sanity read).
- `d1245e5` G1: attached the domains to Netlify + wrote `docs/DNS.md` (ops +
  doc). The domain attachment is real and correct; see docs/DNS.md.

## Uncommitted work parked in a stash

The weather-climate topic (E6) was drafted by Opus and **not committed**. It is
in `git stash` as:

```
stash@{0}  opus-authored weather-climate E6 draft (DO NOT commit as Fable; re-author fresh)
```

It also failed the build (see the blocker below), so it was never landable.
**Do not `stash pop` and commit it as Fable.** Author E6 fresh, or drop the
stash. E6 is still marked `[ ]` in the plan, which is correct.

## Blocker the fresh session hits immediately: the atlas bundle is full

At 3,253 entries the atlas page chunk is **119.8 KB gzipped against a 120 KB
budget** (0.2 KB of headroom). The weather-climate draft's 28 entries pushed it
to 121.1 KB and the build FAILED. **The catalog cannot grow by even one more
topic until the atlas page stops shipping the entire catalog in one client
chunk.** This is tooling, not authoring, so any model may fix it. Likely
direction: split the per-entry data out of the JS bundle (a fetched/prerendered
JSON the atlas page loads), or paginate/lazy-load by category. This must be
solved before resuming Phase E growth toward 5,000.

## Suggested order for the fresh Fable session

1. Read this file and `docs/OVERNIGHT-PLAN.md`.
2. Fix the atlas-bundle scaling blocker (tooling; unblocks all further growth).
3. Decide the re-authoring remedy for the seven commits above with the owner:
   a genuine Fable rewrite/re-derivation pass per topic is the faithful option;
   a trailer-only correction is **not** sufficient under rule 10 because the
   content itself must be Fable's.
4. Re-author, commit per topic with a truthful `Co-Authored-By: Claude Fable 5`
   trailer, verify (`npm run build` exit 0, `npm run check` green,
   `python solutions/<slug>.py` prints OK), push.
5. Then resume the queue (E6 weather-climate is next, fresh).

State at handoff: clean working tree, `HEAD == origin/main` at the commit that
adds this file, `npm run check` green (9/9 tests, 2 planning warnings).
