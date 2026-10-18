"""Practice: change one behavior of the worked example.

The worked solution caps the number of attempts. Add a cap on the total
time spent waiting: before each wait, if the seconds waited so far plus the
next delay would exceed max_wait, stop retrying and raise
RuntimeError("wait budget of 3.0 s exhausted after N attempts: <last error>")
where N is the number of attempts made.

Hint: keep a running total in a variable that starts at 0.0 before the loop.
After computing the delay, compare the total plus the delay with max_wait;
raise if it would go over, otherwise add the delay to the total before sleeping.

Expected: on the all-timeout script the waits are 0.5 and 1.0 (total 1.5),
the next wait of 2.0 would make 3.5, over the 3.0 budget, so the loop stops
after attempt 3 instead of attempt 4. The recovering script still succeeds.
Run alone: python starter.py   (it prints NOT OK until the change is made)
"""
import sys

MAX_ATTEMPTS = 4
BASE_DELAY = 0.5   # seconds before the second attempt; every later wait doubles
MAX_WAIT = 3.0     # seconds of waiting in all, the practice cap

ANSWER = "The key is not active yet; rotation finishes after seven days."

RECOVERS = ["timeout", "rate limited", "ok"]
EXHAUSTS = ["timeout", "timeout", "timeout", "timeout"]


def scripted_endpoint(script):
    """Build a fake model call that follows a script, one outcome per call."""
    remaining = list(script)   # a copy, consumed one outcome per call

    def call():
        outcome = remaining.pop(0)
        if outcome == "timeout":
            raise TimeoutError("no response in 10 seconds")
        if outcome == "rate limited":
            raise ConnectionError("429 too many requests")
        if outcome == "invalid request":
            raise ValueError("prompt is empty")
        return ANSWER

    return call


def call_with_retry(call, sleep, max_attempts, base_delay, max_wait):
    """Call until it succeeds. A timeout or a connection error is retried after
    a wait that doubles each time; any other error is not caught.
    The wait budget max_wait is not used yet: your change goes here."""
    for attempt in range(1, max_attempts + 1):
        try:
            answer = call()
            print(f"attempt {attempt}: ok")
            return answer
        except (TimeoutError, ConnectionError) as error:
            if attempt == max_attempts:
                raise RuntimeError(f"gave up after {max_attempts} attempts: {error}")
            delay = base_delay * 2 ** (attempt - 1)
            print(f"attempt {attempt}: {error}, waiting {delay} s")
            sleep(delay)


if __name__ == "__main__":
    waits = []

    def record_wait(seconds):
        """Stands in for time.sleep: remembers the wait instead of waiting."""
        waits.append(seconds)

    print("scripted outcomes: " + ", ".join(RECOVERS) + f" (wait budget {MAX_WAIT} s)")
    answer = call_with_retry(scripted_endpoint(RECOVERS), record_wait, MAX_ATTEMPTS, BASE_DELAY, MAX_WAIT)
    print(f"answer: {answer}")
    print(f"total waited: {sum(waits)} s over {len(waits) + 1} attempts")
    if waits != [0.5, 1.0]:
        print(f"\nNOT OK: the recovering script should still wait [0.5, 1.0], got {waits}")
        sys.exit(1)

    waits.clear()
    print("\nscripted outcomes: " + ", ".join(EXHAUSTS) + f" (wait budget {MAX_WAIT} s)")
    try:
        call_with_retry(scripted_endpoint(EXHAUSTS), record_wait, MAX_ATTEMPTS, BASE_DELAY, MAX_WAIT)
    except RuntimeError as error:
        print(f"stopped: {error}")
    print(f"total waited: {sum(waits)} s over {len(waits) + 1} attempts")
    if waits != [0.5, 1.0]:
        print(f"\nNOT OK: expected the waits [0.5, 1.0] under a {MAX_WAIT} s budget, got {waits}")
        print("Make call_with_retry stop before a wait that would push the total past max_wait.")
        sys.exit(1)
    print("\nOK")
