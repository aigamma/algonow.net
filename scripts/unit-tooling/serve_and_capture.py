"""Serve the local dist/ on a loopback port, capture a lesson figure at the
given seconds with scripts/unit-tooling/capture_viz.py, then stop the server.
Usage: python serve_and_capture.py <slug> <seconds...>"""
import pathlib
import socket
import subprocess
import sys
import time

ROOT = pathlib.Path(__file__).resolve().parents[2]
slug = sys.argv[1]
seconds = sys.argv[2:]
port = 4180
server = subprocess.Popen([sys.executable, "-m", "http.server", str(port), "--directory", str(ROOT / "dist"), "--bind", "127.0.0.1"],
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    deadline = time.time() + 15
    while time.time() < deadline:
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=0.5):
                break
        except OSError:
            time.sleep(0.2)
    out = ROOT / "build" / "shots" / slug
    result = subprocess.run([sys.executable, str(ROOT / "scripts/unit-tooling/capture_viz.py"), str(out),
                             f"http://127.0.0.1:{port}/scenarios/{slug}/", *seconds], capture_output=True, text=True, timeout=600)
    print(result.stdout[-3000:], result.stderr[-2000:])
finally:
    server.terminate()
    server.wait(timeout=10)
