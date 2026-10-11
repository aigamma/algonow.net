Session tooling from the 2026-10-10 run (paths inside still point at that session's scratchpad; edit SP/qd before reuse).
- ship_unit.sh <slug> <num> "<A> x <H>" <Frow> fork|main: authorize, publish, install, verify, register, build, check (exit gated), commit, push, deploy, live-verify.
- fork_verify.mjs <num> <slug> <Viz>: re-verify an authored unit from its artifacts (solution OK, vizcheck, plan, static checks, chunk estimate).
- estimate_chunk.mjs <checklog|''> <slug>...: calibrated gz chunk estimate before the manifest exists (real = 0.972 to 0.978 of estimate).
- apply_registry.py, merge_wave3.py, vizcheck.mjs, coverage.mjs: registry application, pending-queue merge, viz invariant driver, atlas coverage map.
- ssr_smoke.mjs [--from N]: server-render every live puzzle page from N on through the real PuzzlePage with its content, registry record, and manifest (run it from inside the project so React resolves, e.g. copy to build/). The build never executes page code, so this is the render oracle short of a browser.
- review_units.mjs [--from N] [--live] [--skip-solutions]: regression pass over live units (solution OK line, viz invariants, static scans, rival and problem pages, plan row, description, manifest currency against the present narration text via the credential-free plan, and with --live the deployed page, chunk, and CDN objects).
