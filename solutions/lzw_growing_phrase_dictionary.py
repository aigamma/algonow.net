# Puzzle 60: LZW x growing phrase dictionary
# Compress a byte stream by learning a dictionary of phrases FROM the
# stream itself, while the decoder grows the identical dictionary one
# step behind: so no dictionary is ever transmitted.
#
# The pairing is the point. The algorithm is the greedy longest-match
# scan: read the longest phrase the table already knows, emit its
# code, and register that phrase plus one more byte as a new entry.
# The heuristic is the growing phrase dictionary itself: both sides
# build the same table from the same emitted history, which is why
# the codes alone suffice: including the one famous corner (KwKwK)
# where the decoder receives a code it has not built yet and must
# reconstruct it as w + w[0]: exercised and counted here, not cited.
# The referee is the round trip (decode(encode(x)) == x, byte for
# byte, 300 mixed trials) plus zlib, the shipped DEFLATE standard,
# racing on every corpus. Codes are fixed 12-bit for legible
# accounting (Unix compress and GIF grew widths 9 to 12 and added a
# CLEAR code; the freeze-on-drift lesson below is why).
import random
import zlib

MAX_BITS = 12
CAP = 1 << MAX_BITS
CODE_BITS = MAX_BITS  # fixed-width output codes


def lzw_encode(data, stats=None):
    table = {bytes([i]): i for i in range(256)}
    next_code = 256
    codes = []
    w = b""
    for b in data:
        wc = w + bytes([b])
        if wc in table:
            w = wc
        else:
            codes.append(table[w])
            if next_code < CAP:
                table[wc] = next_code
                next_code += 1
            w = bytes([b])
    if w:
        codes.append(table[w])
    if stats is not None:
        stats["table"] = len(table)
        stats["codes"] = len(codes)
    return codes


def lzw_decode(codes, stats=None):
    if not codes:
        return b""
    table = {i: bytes([i]) for i in range(256)}
    next_code = 256
    w = table[codes[0]]
    out = [w]
    for code in codes[1:]:
        if code in table:
            entry = table[code]
        elif code == next_code:
            # KwKwK: the code the encoder just minted, arriving before
            # the decoder has built it: it can only be w + w[0].
            entry = w + w[:1]
            if stats is not None:
                stats["kwkwk"] = stats.get("kwkwk", 0) + 1
        else:
            raise ValueError("corrupt code stream")
        out.append(entry)
        if next_code < CAP:
            table[next_code] = w + entry[:1]
            next_code += 1
        w = entry
    return b"".join(out)


def lzw_bits(data):
    return CODE_BITS * len(lzw_encode(data))


def zlib_bits(data):
    return 8 * len(zlib.compress(data, 9))


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: the round trip, 300 mixed trials: full-range random
    # bytes, tiny alphabets, run-heavy strings, plus the edges.
    kw_total = {}
    for trial in range(300):
        n = rng.randrange(0, 2000)
        kind = trial % 3
        if kind == 0:
            data = bytes(rng.randrange(256) for _ in range(n))
        elif kind == 1:
            k = rng.randrange(2, 6)
            data = bytes(rng.randrange(k) for _ in range(n))
        else:
            out = bytearray()
            while len(out) < n:
                out += bytes([rng.randrange(4)]) * rng.randrange(1, 30)
            data = bytes(out[:n])
        assert lzw_decode(lzw_encode(data), stats=kw_total) == data, trial
    assert lzw_decode(lzw_encode(b"")) == b""
    assert lzw_decode(lzw_encode(b"x")) == b"x"
    assert kw_total.get("kwkwk", 0) > 0  # the corner arises in the wild

    # Oracle 2: the KwKwK corner, forced deterministically. A run of
    # one symbol makes the encoder emit a code the instant it mints
    # it: the decoder must reconstruct w + w[0] or die.
    kw_run = {}
    run = b"a" * 10
    assert lzw_decode(lzw_encode(run), stats=kw_run) == run
    assert kw_run["kwkwk"] >= 1

    # Oracle 3: the growth invariant, exact. Every emission except the
    # final flush registers exactly one new phrase (below the cap), so
    # the encoder's table ends at 256 + codes - 1.
    growth = {}
    sample = bytes(rng.randrange(8) for _ in range(1500))
    lzw_encode(sample, stats=growth)
    assert growth["table"] == 256 + growth["codes"] - 1, growth

    # The corpora: deterministic, built once.
    vocab = (
        "the unit shipped after its checks passed and the referee "
        "agreed with the dictionary truth on every trial because the "
        "stream carried its own table one step behind the encoder "
    ).split()
    text = (" ".join(rng.choice(vocab) for _ in range(8000)) + "\n").encode()

    paths = ["/api/v2/units", "/api/v2/atlas", "/static/theme.css", "/api/tel"]
    log_lines = []
    for _ in range(1200):
        log_lines.append(
            f"10.0.{rng.randrange(256)}.{rng.randrange(256)} GET "
            f"{rng.choice(paths)}/{rng.randrange(60)} 200 {rng.randrange(5, 90)}ms"
        )
    log = ("\n".join(log_lines) + "\n").encode()

    noise = bytes(rng.randrange(256) for _ in range(20_480))

    # Oracle 4: the contest. LZW compresses structure and EXPANDS
    # noise (12 fixed bits per mostly-1-byte phrase); zlib, the
    # shipped DEFLATE, wins throughout: the honest table.
    rows = []
    for name, data in [("english-ish text", text), ("server log", log), ("random bytes", noise)]:
        raw = 8 * len(data)
        lz = lzw_bits(data)
        zl = zlib_bits(data)
        assert lzw_decode(lzw_encode(data)) == data
        rows.append((name, len(data), raw / lz, raw / zl))
    assert rows[0][2] > 2.0          # text compresses well past 2x
    assert rows[1][2] > 2.5          # the log's repeated phrases pay more
    assert rows[2][2] < 0.75         # noise EXPANDS: ratio under 0.75 means 1.33x+ growth
    for _, _, lz_ratio, zl_ratio in rows:
        assert zl_ratio > lz_ratio   # the shipped standard wins every corpus

    # Oracle 5: the freeze-on-drift lesson, measured. Cap the table at
    # 4096 and change the data mid-stream: the frozen dictionary is an
    # asset turned liability. Compressing text+DNA concatenated costs
    # MORE bits than compressing each half with its own fresh
    # dictionary: while for two halves of the SAME kind, sharing the
    # learned dictionary is cheaper than starting over.
    dna = bytes(rng.choice(b"acgt") for _ in range(len(text)))
    drift_joint = lzw_bits(text + dna)
    drift_split = lzw_bits(text) + lzw_bits(dna)
    assert drift_joint > drift_split
    text2 = (" ".join(rng.choice(vocab) for _ in range(8000)) + "\n").encode()
    same_joint = lzw_bits(text + text2)
    same_split = lzw_bits(text) + lzw_bits(text2)
    assert same_joint < same_split
    drift_pct = 100 * (drift_joint - drift_split) / drift_split
    reuse_pct = 100 * (same_split - same_joint) / same_split

    print("contest: three corpora, compression factor (higher is better); referee: decode(encode(x)) == x byte-for-byte on every corpus and 300 mixed trials")
    print(f"  {'corpus':<18} {'bytes':>8} {'LZW 12-bit':>11} {'zlib -9':>9}")
    for name, size, lz_ratio, zl_ratio in rows:
        print(f"  {name:<18} {size:>8,} {lz_ratio:>10.2f}x {zl_ratio:>8.2f}x")
    print(f"the corner, counted: KwKwK hit {kw_run['kwkwk']} time(s) on the run gadget and {kw_total['kwkwk']} time(s) across the 300 round-trip trials: the decoder rebuilt codes it had never seen")
    print(f"the growth invariant: table == 256 + codes - 1, exact; the drift lesson: joint text+dna costs {drift_pct:.0f}% MORE than fresh dictionaries per half, while same-kind halves save {reuse_pct:.0f}% by sharing: compress's CLEAR code exists for this")
    print("OK: 300 round trips plus edges, the KwKwK corner forced and counted, the growth invariant exact, noise expansion and the zlib race measured, and the freeze-on-drift lesson asserted both directions")
