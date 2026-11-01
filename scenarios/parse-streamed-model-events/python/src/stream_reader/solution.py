"""Worked example: assemble a streamed model reply from network chunks.

Orbit's gateway streams the model's reply to the browser. It read the
provider's stream in network chunks and treated each chunk as one complete
event. A chunk can carry two events, or half of one, so the JSON parser
crashed and the reply died at a random word. This file keeps a buffer: each
chunk is appended, complete lines are split off and parsed, and whatever is
left after the last line break waits for the next chunk.

Input: the network chunks in arrival order. Output: one line per chunk with
what the buffer held and what the text had become, then the assembled reply.
Run alone: python solution.py
"""
import json

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
    number of events parsed, and a log of (chunk number, chunk length, events
    parsed from it, bytes left waiting in the buffer, text so far)."""
    buffer = ""
    text = ""
    events = 0
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
    return text, events, log


if __name__ == "__main__":
    text, events, log = read_stream(CHUNKS)
    print(f"{len(CHUNKS)} network chunks")
    print(f"{'chunk':<5} {'chars':>5} {'events':>6} {'waiting':>7}  text so far")
    for number, length, parsed, waiting, so_far in log:
        print(f"{number:<5} {length:>5} {parsed:>6} {waiting:>7}  {so_far!r}")
    print(f"\n{events} events parsed; reply: {text!r}")

    print("\nwhat shipped, each chunk parsed as one event:")
    delivered = ""
    for number, chunk in enumerate(CHUNKS, start=1):
        payload = chunk.removeprefix("data:").strip()
        try:
            delivered += json.loads(payload).get("delta", "")
        except json.JSONDecodeError:
            print(f"  crashed at chunk {number}; the browser had received {delivered!r}")
            break

    for bad in (['data: {"delta": "x"\n\n'], ['data: {"delta": "x"}\n\n']):
        try:
            read_stream(bad)
        except ValueError as error:
            print(f"rejected: {error}")

    assert text == "Restart the worker, then set the timeout."
    assert events == 6 and [entry[2] for entry in log] == [1, 2, 0, 1, 1, 1], "two events in chunk 2, none in the split chunk 3"
    assert log[2][3] == 11 and log[3][3] == 0, "the split event waits in the buffer until chunk 4 completes it"
    print("\nOK")
