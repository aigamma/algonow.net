"""Worked example: retry a flaky model call with exponential backoff and a cap.

An assistant calls a hosted model. Under load the endpoint times out or
answers "rate limited" for a few seconds. Retrying at once in a tight loop
hammers an endpoint that is asking for room, and retrying an invalid request
forever hides a bug. This file wraps one call in a retry loop: a timeout or
a connection error is retried after a wait that doubles each time, up to a
cap on attempts; any other error is left alone; after the last failed
attempt the loop gives up loudly.

Input: the call to make and the sleep to use (both functions), the cap on
attempts, and the first delay in seconds. Output: whatever the call returns.
Run alone: python solution.py
"""

MAX_ATTEMPTS = 4
BASE_DELAY = 0.5   # seconds before the second attempt; every later wait doubles

ANSWER = "The key is not active yet; rotation finishes after seven days."

RECOVERS = ["timeout", "rate limited", "ok"]
EXHAUSTS = ["timeout", "timeout", "timeout", "timeout"]
INVALID = ["invalid request"]


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


def call_with_retry(call, sleep, max_attempts, base_delay):
    """Call until it succeeds. A timeout or a connection error is retried after
    a wait that doubles each time; any other error is not caught."""
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

    print("scripted outcomes: " + ", ".join(RECOVERS))
    answer = call_with_retry(scripted_endpoint(RECOVERS), record_wait, MAX_ATTEMPTS, BASE_DELAY)
    print(f"answer: {answer}")
    print(f"total waited: {sum(waits)} s over {len(waits) + 1} attempts")
    assert waits == [0.5, 1.0], "two waits, the second twice the first"

    waits.clear()
    print("\nscripted outcomes: " + ", ".join(EXHAUSTS))
    try:
        call_with_retry(scripted_endpoint(EXHAUSTS), record_wait, MAX_ATTEMPTS, BASE_DELAY)
    except RuntimeError as error:
        print(f"stopped: {error}")
    print(f"total waited: {sum(waits)} s over {len(waits) + 1} attempts")
    assert waits == [0.5, 1.0, 2.0], "three waits, then no wait after the last attempt"

    waits.clear()
    print("\nscripted outcomes: " + ", ".join(INVALID))
    try:
        call_with_retry(scripted_endpoint(INVALID), record_wait, MAX_ATTEMPTS, BASE_DELAY)
    except ValueError as error:
        print(f"attempt 1: ValueError not retried: {error}")
    assert waits == [], "an invalid request is never retried"
    print("\nOK")
