Session tooling from the 2026-10-10 run (paths inside still point at that session's scratchpad; edit SP/qd before reuse).
- ship_unit.sh <slug> <num> "<A> x <H>" <Frow> fork|main: authorize, publish, install, verify, register, build, check (exit gated), commit, push, deploy, live-verify.
- fork_verify.mjs <num> <slug> <Viz>: re-verify an authored unit from its artifacts (solution OK, vizcheck, plan, static checks, chunk estimate).
- estimate_chunk.mjs <checklog|''> <slug>...: calibrated gz chunk estimate before the manifest exists (real = 0.972 to 0.978 of estimate).
- apply_registry.py, merge_wave3.py, vizcheck.mjs, coverage.mjs: registry application, pending-queue merge, viz invariant driver, atlas coverage map.
