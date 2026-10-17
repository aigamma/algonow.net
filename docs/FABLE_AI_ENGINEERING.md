# Fable authoring contract: Python AI engineering scenarios

Effective October 17, 2026. All new learning puzzles are practical AI
architecture or engineering scenarios implemented in Python. The existing 205
algorithm lessons remain a legacy reference collection, including the lessons
that happen to cover machine learning. Existing unregistered algorithm work is
legacy material, not the new scenario backlog.

Fable authors each exercise, starter, fixtures, reference implementation,
verification tests, explanation, alternatives, visual, and canonical narration
in the main thread. Infrastructure work may add validators and presentation
components. It must not invent a completed exercise or substitute a different
model's authored content for Fable's work. Record actual authorship in the
registry and commit trailer. The registry is deliberately empty until an
actual scenario satisfies the publication contract.

## What belongs here

Use a concrete engineering request involving an AI system: retrieval and RAG,
data pipelines, fine-tuning, distillation, evaluation, or serving and
architecture. The learner should need to frame a problem, inspect evidence,
write or repair Python, validate behavior, and explain a decision. An isolated
algorithm problem with an AI-themed title is not sufficient. A track label does
not prove relevance; Fable must review the actual request and work.

Prefer a small, reproducible local package with real inputs, outputs, failure
cases, and independently checked expectations. Use deterministic fixtures and
explicit seeds. A fixture standing in for a provider response must be described
as a fixture. Separate measured results from predictions. Optional expensive
training or provider calls need their own clear prerequisites and authorization;
the required validation path must run without credentials or paid requests.

Do not invent algorithm/heuristic pairs to fit the old registry. New routes are
`/scenarios/<slug>/`, and new records belong in `src/data/engineering.js`.

## Registry and discovery

`ENGINEERING_TRACKS` exposes six `{ id, title, description }` records:
`rag`, `data-pipelines`, `fine-tuning`, `distillation`, `evaluation`, `serving`.
`SCENARIOS` contains authored metadata, including drafts. `LIVE_SCENARIOS`
contains only published records and derives `href`, `html`, and `vite`.
Home, build entries, and discovery consume this published projection.

Home leads with scenario cards, not empty category panels. Each card renders
the registry title, summary, first three skills, difficulty, and task duration,
alongside a small conceptual workflow for its practice area. These workflow
icons are navigation cues, not the scenario's checked teaching visual or a
claim about measured results. No extra card assets are required from Fable.
One published scenario gets a wide card; larger collections use a responsive
grid. Area filters list only populated tracks, and search appears at four
published scenarios. Drafts remain absent, with a compact empty state until
the first publication. Keep the `scenarios` and `tracks` anchors stable.

Each authored registry record has these fields:

| Field | Contract |
| --- | --- |
| `slug` | Unique lowercase words separated by single hyphens; no collision with a legacy lesson or its narration identity |
| `title`, `summary` | Actual scenario title and concise engineering request |
| `track` | One of the six track IDs |
| `language` | Exactly `python` |
| `status` | `draft` or `published` |
| `difficulty` | `foundation`, `intermediate`, or `advanced` |
| `durationMinutes` | Positive integer estimate for completing the work |
| `skills` | Nonempty list of concrete skills practiced |
| `authoringModel` | `Claude Fable 5`; record actual provenance, never claim it for content written elsewhere |
| `listenMinutes` | Required when published: estimate for the complete recorded narration, separate from the task duration |
| `added` | Required when published: actual publication date in `YYYY-MM-DD` form |

Do not set published status to make an unfinished card appear on Home.
No draft counts as a completed scenario. Derived routes are not authored links
and cannot be overridden to point elsewhere.

## File layout and entry plumbing

Each scenario owns this layout, with the Python import package named in its
contract:

```text
scenarios/<slug>/
  index.html
  main.jsx
  content.jsx
  scenario.json
  visuals/                  checked SVG or canvas source
  python/
    pyproject.toml
    requirements.lock       required for third-party dependencies
    src/<package>/
      __init__.py
      starter.py
      solution.py
    tests/test_*.py
    fixtures/               actual, small reproducible input files
src/content/<slug>.narration.js
src/data/narration/<slug>.json
infra/narration/receipts/<slug>.json
```

After Fable has entered draft metadata, generate only the route plumbing:

```text
node scripts/scaffold-engineering.mjs --slug <registered-draft-slug>
```

This creates `index.html` and `main.jsx`, never overwrites existing files, and
writes no exercise, solution, fixture, or narration. The entry uses
`src/components/ScenarioPage.jsx` with `{ scenario, content, narrationPlayer }`.
The preserved player is configured with its component, manifest, and media base
URL; the actual canonical narration array is loaded together with the lazy
player component (it is needed only for the character check and the text
panel once a reader opens the player), so it does not ride in the page chunk
next to the whole Python package. The manifest check still runs statically:
the entry fails closed while required recorded audio is missing or invalid.
Validate authored content and Python independently while preparing the
complete release. The page chunk budget (20 KB gzipped, enforced by
`npm run check`) covers the prose, every `?raw` file, the visual, and
`ScenarioPage`; estimate it before paying for narration, because the
narration is hash-bound once generated and only the page can be trimmed.

## Page content

`content.jsx` must export a literal `content` object with all seven keys:

| Key | Value and purpose |
| --- | --- |
| `brief` | React content describing the request, context, interfaces, constraints, and success criteria |
| `starter` | React content explaining environment setup, the starting state, and how to attempt the work |
| `files` | Literal array of actual source/fixture files, described below |
| `evidence` | React content explaining checks, measured outputs, failure cases, and limits |
| `solution` | React content explaining the reference approach and debugging decisions |
| `visual` | React content rendering a pertinent checked diagram or animation |
| `tradeoffs` | Two or three `{ name, preferWhen, cost }` string records comparing viable alternatives |

Each file record is `{ path, description, source, language, role }`. The path
is relative to the scenario directory. Import `source` from that exact file
with `?raw`; do not maintain a copied snippet that can drift from executable
code. Languages are `python`, `json`, `toml`, or `text`. Roles are `starter`,
`fixture`, `test`, or `reference`. Include at least one of each role. Starter,
reference, and test code must be Python under `python/`. Use the reference
role for solutions so presentation can keep them behind an explicit reveal.

React and JavaScript are delivery infrastructure, not alternative exercise
languages. Reference disclosure controls prevent accidental exposure, not
inspection of downloaded page assets. Do not advertise a secure interview
assessment unless the runtime actually isolates reference answers. Likewise,
a code listing or editable scratchpad is not an execution environment. Never
label prepared output as a fresh execution or display an unperformed pass.

## Machine-readable scenario contract

`scenario.json` is JSON with these required properties:

- `schemaVersion`: `1`.
- `slug`, `track`, `language`: exactly match the registry.
- `system.context` and `system.request`: nonempty strings.
- `system.inputs`, `system.outputs`, `system.constraints`, and
  `system.successCriteria`: nonempty string arrays describing the actual work.
- `python.package`: a valid lowercase Python import-package name.
- `python.dependencies`: `stdlib` or `locked`.
- `fixtures`: nonempty array of `{ path, description, sha256 }`. Paths start
  with `python/fixtures/`; hashes bind the exact fixture bytes.
- `checks`: records `{ id, kind, description, file, function }`. IDs are unique
  lowercase hyphenated names. Kinds are `correctness`, `failure`, or
  `evaluation`, with at least one of each. Each record names an actual
  `python/tests/test_*.py` file and a `test_*` function in it.
- `visuals`: one or more `{ kind, path, description, correctness, check }`
  records. Kind is `svg` or `canvas`; source lives under `visuals/`. The
  `correctness` text states what was checked, and `check` cites a declared
  executable check that supports the visual's values or relationships.

The Python package must include its import package, starter, reference
implementation, tests, and fixtures. Its `pyproject.toml` declares `[project]`,
a project name, and `requires-python = ">=3.11"` or a supported newer minor.
A standard-library package declares `dependencies = []`. Otherwise provide
`requirements.lock` with exact dependency versions and document the prepared
environment. The structural checker requires the lock file; the author must
verify that it resolves the declared dependencies. The checker never installs
packages automatically.

Tests must use `unittest` discovery and meaningful independent expectations.
Include boundary and invalid-input behavior, data leakage checks where
relevant, and evaluation that can distinguish a useful implementation from a
plausible-looking failure. Explain which expectations are exact, approximate,
or stochastic. A starter may intentionally fail; the verified reference must
pass. Do not redefine success merely to accept the reference implementation.

## Visuals and explanation

A clear static diagram is sufficient when motion adds no explanatory value.
Static SVGs need a viewBox and legible labels. Animated state must implement
the claimed process, expose accurate quantities, terminate correctly, and
respect motion and visibility preferences. Use existing diagram enlargement
and canvas support. Check actual callbacks when animation is used.

Validate the visual against the fixture or model and inspect its rendering at
narrow and wide widths. Distinguish an illustrative topology from a measured
run. Check every caption, label, unit, normalization, and comparison. No
clipping, invented measurements, or incorrect terminal state. The contract's
check reference supports this review; its presence alone does not prove that
a diagram is correct.

Alternatives must be viable ways to solve the same engineering request, with
specific conditions under which each wins and what it costs. Discuss quality,
latency, cost, failure behavior, maintainability, or deployment constraints
where they matter. A clearly unsuitable alternative can be explained as a
negative comparison without pretending it was an equally good candidate.

## Canonical narration and paid release

Export `narration` from `src/content/<slug>.narration.js` as the complete ordered
array of `{ section, text }` records. Use only `brief`, `starter`, `files`,
`evidence`, `solution`, `visual`, and `tradeoffs`; cover each section, with as
many prose records as needed. Speak the code explanation and alternatives,
not executable code, file contents, or interface chrome. Write numbers and
symbols for listening. Preserve the no-U+2014 rule.

The existing narration pipeline supports these section names. It retains the
internal `puzzle:<slug>` identity and existing source/manifest/receipt paths
for compatibility; this does not put the scenario in the algorithm registry
or require algorithm/heuristic fields.

Use the existing dry-run, review, generation, validation, publication, and live
verification workflow in `infra/narration/README.md` and
`docs/TTS-TELEMETRY.md`. Both Aoede and Algieba must match the same complete
canonical source hash. Keep Aoede and 1.25x as defaults, with exactly the
existing four playback rates. Missing, pending, stale, or incomplete audio is
a publication blocker and must never invoke browser speech as a fallback.

Initial generation follows the existing owner consent, reviewed exact hash,
current pricing, explicit ceiling, exclusive lock, and fail-closed outcome
rules. Regeneration after publication and ambiguous retries still follow the
existing human-review requirements. A new scenario is not an excuse to bypass
those gates. Do not synthesize audio while merely scaffolding infrastructure.

## Verification and publication sequence

1. Fable authors one complete scenario at a time and keeps its registry
   status `draft` while working.
2. Run `node scripts/check-engineering.mjs --include-drafts` for file,
   contract, raw-import, visual, and narration-section consistency.
3. Prepare the declared Python environment. Run
   `node scripts/check-engineering.mjs --include-drafts --run-python`.
   Set `PYTHON` to the intended interpreter when necessary. The command uses
   the actual package and tests with its `src` directory on `PYTHONPATH`.
   No dependency installation, provider request, or paid generation occurs.
4. Review the displayed work, alternatives, all visuals and captions, and
   the complete canonical narration. Obtain and verify the recorded release
   through the established process.
5. Set `status: 'published'`, the real `added` date, and `listenMinutes`.
   Run `node scripts/check-engineering.mjs --run-python`, `npm run build`,
   and `npm run check`. Ensure the shared page renders through the real
   entry and the published scenario is discoverable from Home and its route.
6. Check the page and both audio tracks live after the explicit deployment.
   Follow the main-thread commit/push and deployment rules in `CLAUDE.md`.

The checker verifies declared scope and structural consistency, actual tests
when requested, current narration hashes, both tracks, and the receipt's
release inventory. It does not prove teaching quality, actual Fable provenance,
all-input correctness, dependency reproducibility, or live CDN delivery.
Those require the corresponding author review, executable evidence, and
existing live publication verification. Report them separately and honestly.
