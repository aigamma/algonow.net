"""Practice: change one behavior of the worked example.

The provider sends one more event before the end marker: a usage object
with the output token count, which the gateway needs for billing and logs.
The worked solution parses that event and adds nothing to the text, which is
right, but then forgets it. Make read_stream remember the usage object and
return it as a fourth value. Everything else stays the same.

Hint: create a variable usage set to None before the loop. After an event is
parsed, test whether the key usage is in the event dictionary with the in
operator, and when it is, store the event's usage value in the variable.
Return it between the event count and the log.

Expected: usage comes back as a dictionary with output tokens of 9, the
text and the six events are unchanged, and the file prints the usage line
before OK. Run alone: python starter.py   (it prints NOT OK until the change
is made)
"""
import json
import sys

CHUNKS = [
    'data: {"delta": "Restart "}\n\n',
    'data: {"delta": "the "}\n\ndata: {"delta": "worker"}\n\n',
    'data: {"del',
    'ta": ", then "}\n\n: keepalive\n\n',
    'data: {"delta": "set the timeout."}\n\n',
    'data: {"usage": {"output_tokens": 9}}\n\ndata: [DONE]\n\ndata: {"delta": "ignored after done"}\n\n',
]


def read_stream(chunks):
    """Feed the chunks through a line buffer. Returns the assembled text, the
    number of events parsed, the usage object from the stream (not captured
    yet: always None as shipped), and a log of (chunk number, chunk length,
    events parsed from it, characters left waiting in the buffer, text so far)."""
    buffer = ""
    text = ""
    events = 0
    usage = None
    done = False
    log = []
    for number, chunk in enumerate(chunks, start=1):
        if done:
            break                                   # nothing after the end marker is read
        buffer += chunk                             # strings are immutable: this builds a new, longer string
        parsed_here = 0
        while "\n" in buffer and not done:
            line, buffer = buffer.split("\n", 1)    # the first complete line, and everything after it
            line = line.strip()
            if not line.startswith("data:"):
                continue                            # a blank separator or a ": keepalive" comment
            payload = line.removeprefix("data:").strip()
            if payload == "[DONE]":
                done = True
                break
            try:
                event = json.loads(payload)
            except json.JSONDecodeError:
                raise ValueError(f"chunk {number}: malformed event {payload!r}")
            text += event.get("delta", "")          # an event without text, such as usage, adds nothing
            events += 1
            parsed_here += 1
        log.append((number, len(chunk), parsed_here, len(buffer), text))
    if not done:
        raise ValueError(f"stream ended without [DONE]; {len(buffer)} characters still waiting")
    return text, events, usage, log


if __name__ == "__main__":
    text, events, usage, log = read_stream(CHUNKS)
    if usage != {"output_tokens": 9}:
        print(f"NOT OK: expected the usage event to be captured as {{'output_tokens': 9}}, got {usage!r}")
        print("Make read_stream remember the usage object when an event carries a usage key.")
        sys.exit(1)
    print(f"{len(CHUNKS)} network chunks")
    print(f"{'chunk':<5} {'chars':>5} {'events':>6} {'waiting':>7}  text so far")
    for number, length, parsed, waiting, so_far in log:
        print(f"{number:<5} {length:>5} {parsed:>6} {waiting:>7}  {so_far!r}")
    print(f"\n{events} events parsed; reply: {text!r}")
    print(f"usage: {usage['output_tokens']} output tokens, reported by the stream itself")

    try:
        read_stream(['data: {"delta": "x"}\n\n'])
    except ValueError as error:
        print(f"\nrejected: {error}")

    print("\nOK")
