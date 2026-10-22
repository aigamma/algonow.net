# QA sweeps: the release gate over a built dist

`npm run qa` runs the browser and link sweeps that used to live in a session
scratchpad, against the dist that `npm run build` just produced. It needs
Node 22 (global fetch and WebSocket), Python 3.11+ (stdlib only), and a Chrome
binary (the `CHROME` environment variable, or the usual install paths). No new
npm dependencies.

```
npm run qa                       # links, prose, sweep, phone: the default gate
npm run qa:quick                 # the same stages over a sample of pages
npm run qa -- clip               # the lesson figures' canvas text audit (slow)
npm run qa -- --base http://localhost:4173 sweep phone   # against a running server
```

Without `--base`, the runner starts `vite preview` on port 4199 and stops it
afterwards. `--base https://algonow.net` sweeps the live site. Outputs land in
`build/qa/` (gitignored): `sweep-1200.jsonl`, `sweep-390.jsonl`, the page
lists, `external-links.txt`, `clip-lessons.txt`, and `summary.txt`. Exit code 1
when any stage fails; 2 when dist is missing.

## Stages

| Stage | Tool | Fails when |
| --- | --- | --- |
| `links` | `crawl-dist.py` | any href, src, or modulepreload in any built page does not resolve to a file in dist (a page's `<base href>` is honoured). External targets are written out, never fetched. |
| `prose` | `scan-prose.py` | an em or en dash or the forbidden word appears in a lesson page, any narration, the registry, or a lesson's Python; a doubled word; "a" before a vowel sound or "an" before a consonant; a double space inside a narration string; a lesson page link to a missing page; a registry `listenMinutes` more than a minute and a half from the Aoede track's length. The reviewed spoken forms ("plus plus", "first first", "a exclusive"...) are skipped by exact phrase. |
| `sweep` | `cdp-shot.mjs sweep` at 1200 px | a page fails to load; no h1 (the app did not mount); an empty `#root`; a browser-speech listen button anywhere; a content page (lesson or legacy puzzle) without the preserved "voices" disclosure; an in-page anchor with no target; any console error, warning, or uncaught exception. |
| `phone` | the same at 390 px | all of the above, plus any horizontal page overflow (the offending elements are named). |
| `clip` | `cdp-shot.mjs clip` | a lesson figure draws text past its canvas edge or two visible texts over each other at any step. Opt in: about a minute per figure. |

Page list: the home, `/legacy/`, `/atlas/`, `/404.html`, every published
lesson, every legacy puzzle, and three pages of each atlas kind (algorithm,
problem, category, topic). The atlas is thousands of static pages from one
template, so the sample stands for it and the link crawl covers the rest.
`--quick` keeps five legacy pages and one page per atlas kind.

## The capture tool on its own

`cdp-shot.mjs` drives one headless Chrome over the DevTools protocol (the
driver is `cdp.mjs`). Figure captures:

```
node scripts/qa/cdp-shot.mjs shot http://localhost:4173 build/qa/shots 1200 mmr-diversify-results@0,8,16
node scripts/qa/cdp-shot.mjs shot http://localhost:4173 build/qa/shots 390 grounding-check-by-sentence-overlap@step:4
node scripts/qa/cdp-shot.mjs shot http://localhost:4173 build/qa/shots 1200 /astar-manhattan/@full
node scripts/qa/cdp-shot.mjs eval http://localhost:4173 /scenarios/retry-with-backoff/ "document.title"
```

A slug names a lesson; a leading slash names any site path. `@t` pauses the
figure at second t through `?viz-t=`; `step:N` presses Next step N-1 times;
`sel:<css>[:n[:waitms]]` captures the nth matching element; `full` captures
the whole page. `REDUCED_MOTION=1` emulates prefers-reduced-motion for the
load. A `@file` argument reads one path per line.

## Notes that keep mattering

- Under Git Bash a leading-slash argument becomes a Windows path; run the
  node tools with `MSYS_NO_PATHCONV=1`.
- The live site forbids framing and a figure's `#visual` anchor does not
  scroll on a fresh load, which is why captures go through CDP (scroll into
  view, clip) rather than a plain headless screenshot.
- A full-page capture of the atlas index fails with "Page is too large";
  capture its viewport (`@0`) instead.
- A live probe for narration must read the `narration-<slug>-<hash>.js`
  manifest chunk, not the page chunk.
- The sweep's "voices" fact is the preserved player's disclosure text; the
  home, the indexes, and the atlas have no player by design and are not
  content pages for that rule.
