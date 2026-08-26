# Runs every solution's self-test and demands an OK. The site renders these
# exact files, so a green run here is the correctness oracle for what readers
# copy.
import subprocess
import sys
from pathlib import Path

solutions = sorted(Path(__file__).resolve().parent.parent.joinpath("solutions").glob("*.py"))
if not solutions:
    print("FAIL: no solution files found")
    sys.exit(1)

failures = 0
for path in solutions:
    result = subprocess.run(
        [sys.executable, str(path)], capture_output=True, text=True, timeout=300
    )
    out = result.stdout.strip()
    # The comparative standard prints each solution's measured contest table
    # before its verdict, so the OK line ends the output rather than opening
    # it. The contract is "prints OK", not "prints OK first".
    ok_line = next((ln for ln in out.splitlines() if ln.startswith("OK")), None)
    if result.returncode == 0 and ok_line:
        print(f"PASS {path.name}: {ok_line}")
    else:
        failures += 1
        print(f"FAIL {path.name}: exit {result.returncode}")
        if out:
            print(f"     stdout: {out[:300]}")
        if result.stderr:
            print(f"     stderr: {result.stderr.strip()[:300]}")

print(f"\n{len(solutions) - failures}/{len(solutions)} solutions verified")
sys.exit(1 if failures else 0)
