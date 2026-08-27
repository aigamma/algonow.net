# Puzzle 38: LZ77 x sliding-window matching
# Lossless compression of real byte streams by replacing repeats with
# back-references into a window of recent output.
#
# The pairing is the point. The algorithm is the token stream: a
# sequence of literals and (distance, length) copy commands whose
# decoder is ten lines and cannot drift, because every copy points into
# text it already wrote. The heuristic is the sliding window: match only
# against the recent past, bounding memory and search while betting that
# repetition is local. Every claim here is refereed by the only oracle
# compression respects: decompress(compress(x)) == x, byte for byte, on
# this repository's own files, plus the honest edges: the incompressible
# random stream (measured expansion, pigeonhole made concrete) and the
# all-same stream (collapse to almost nothing).
import heapq
import random
import zlib
from pathlib import Path

MIN_MATCH = 3
MAX_MATCH = 255


def compress(data, window=4096):
    """Greedy longest-match LZ77 with 3-byte hash chains, emitted in the
    flag-bit framing of Storer & Szymanski's LZSS refinement (named
    honestly: same window idea, one bit instead of a byte to say which
    kind of token follows). Format: [flags byte][up to 8 tokens], flag
    bit set = match (dist_hi, dist_lo, len: 3 bytes), clear = literal
    (1 byte). DEFLATE's entropy stage is priced separately in the tests."""
    n = len(data)
    tokens = []
    chains = {}
    i = 0
    while i < n:
        best_len = 0
        best_dist = 0
        if i + MIN_MATCH <= n:
            key = bytes(data[i : i + MIN_MATCH])
            for j in reversed(chains.get(key, ())):
                if i - j > window:
                    break
                length = 0
                limit = min(MAX_MATCH, n - i)
                while length < limit and data[j + length] == data[i + length]:
                    length += 1
                if length > best_len:
                    best_len = length
                    best_dist = i - j
                    if length == limit:
                        break
        if best_len >= MIN_MATCH:
            tokens.append((best_dist, best_len))
            end = i + best_len
        else:
            tokens.append(data[i])
            end = i + 1
        while i < end:
            if i + MIN_MATCH <= n:
                chains.setdefault(bytes(data[i : i + MIN_MATCH]), []).append(i)
            i += 1
    out = bytearray()
    for g in range(0, len(tokens), 8):
        group = tokens[g : g + 8]
        flags = 0
        for b, tok in enumerate(group):
            if isinstance(tok, tuple):
                flags |= 1 << b
        out.append(flags)
        for tok in group:
            if isinstance(tok, tuple):
                dist, length = tok
                out.append(dist >> 8)
                out.append(dist & 0xFF)
                out.append(length)
            else:
                out.append(tok)
    return bytes(out)


def decompress(blob):
    out = bytearray()
    i = 0
    while i < len(blob):
        flags = blob[i]
        i += 1
        for b in range(8):
            if i >= len(blob):
                break
            if flags & (1 << b):
                dist = (blob[i] << 8) | blob[i + 1]
                length = blob[i + 2]
                i += 3
                start = len(out) - dist
                for k in range(length):  # byte-at-a-time: overlaps self-copy
                    out.append(out[start + k])
            else:
                out.append(blob[i])
                i += 1
    return bytes(out)


def huffman_payload_bits(data):
    """Exact payload size of a byte-level Huffman code (table excluded,
    and said so): sum over symbols of freq * codelength."""
    freq = {}
    for b in data:
        freq[b] = freq.get(b, 0) + 1
    if len(freq) == 1:
        return len(data)  # one symbol: one bit each, degenerate
    heap = [(f, sym, None, None) for sym, f in freq.items()]
    heapq.heapify(heap)
    tick = 256
    while len(heap) > 1:
        f1, s1, l1, r1 = heapq.heappop(heap)
        f2, s2, l2, r2 = heapq.heappop(heap)
        heapq.heappush(heap, (f1 + f2, tick, (s1, l1, r1), (s2, l2, r2)))
        tick += 1
    depths = {}

    def walk(sym, left, right, d):
        if left is None:
            depths[sym] = max(d, 1)
            return
        walk(*left, d + 1)
        walk(*right, d + 1)

    walk(heap[0][1], heap[0][2], heap[0][3], 0)
    return sum(freq[s] * depths[s] for s in freq)


if __name__ == "__main__":
    rng = random.Random(20260827)
    root = Path(__file__).resolve().parent.parent

    corpus = [
        root / "docs" / "OVERNIGHT-PLAN.md",
        root / "src" / "data" / "puzzles.js",
        root / "src" / "theme.css",
        root / "solutions" / "fft_cooley_tukey.py",
    ]

    # Oracle 1: the round trip, byte for byte, on this site's own files
    # and on the deliberate edges.
    results = {}
    for path in corpus:
        data = path.read_bytes()
        blob = compress(data)
        assert decompress(blob) == data, path
        results[path.name] = (len(data), len(blob))
    for edge in (b"", b"x", b"ab" * 1, bytes(rng.randrange(256) for _ in range(257))):
        assert decompress(compress(edge)) == edge

    # Oracle 2: the all-same stream collapses. 10,000 identical bytes
    # become a handful of maximum-length copies.
    same = b"a" * 10_000
    blob_same = compress(same)
    assert decompress(blob_same) == same
    assert len(same) / len(blob_same) > 50, len(blob_same)

    # Oracle 3: the incompressible stream expands: pigeonhole, measured.
    noise = bytes(rng.randrange(256) for _ in range(10_000))
    blob_noise = compress(noise)
    assert decompress(blob_noise) == noise
    assert len(blob_noise) > len(noise)  # no free lunch, by construction

    # Oracle 4: the window dial. Bigger windows can only find more:
    # measured monotone on the largest real file.
    big = max(corpus, key=lambda p: p.stat().st_size).read_bytes()
    sizes_by_window = {}
    for wdw in (256, 4096, 32768):
        blob = compress(big, window=wdw)
        assert decompress(blob) == big
        sizes_by_window[wdw] = len(blob)
    assert sizes_by_window[32768] <= sizes_by_window[4096] <= sizes_by_window[256]

    # Oracle 5: the pipeline ledger on the same file. Huffman alone
    # (symbol skew), LZ77 alone (repetition), DEFLATE (both stages,
    # via zlib level 9). The stages exploit different redundancy, and
    # the combination must beat each alone on real prose.
    h_bits = huffman_payload_bits(big)
    h_bytes = (h_bits + 7) // 8
    lz_bytes = sizes_by_window[32768]
    z_bytes = len(zlib.compress(big, 9))
    assert zlib.decompress(zlib.compress(big, 9)) == big
    assert z_bytes < lz_bytes and z_bytes < h_bytes

    name = max(corpus, key=lambda p: p.stat().st_size).name
    raw = len(big)
    print(f"contest: {name}, {raw:,} bytes of this site's own prose; every row round-tripped byte-exact")
    print(f"  {'method':<30} {'bytes':>9} {'ratio':>7}")
    print(f"  {'Raw':<30} {raw:>9,} {'1.00x':>7}")
    print(f"  {'Huffman alone (payload)':<30} {h_bytes:>9,} {raw / h_bytes:>6.2f}x   symbol skew only, blind to repeats")
    print(f"  {'LZ77, 32K window (LZSS bits)':<30} {lz_bytes:>9,} {raw / lz_bytes:>6.2f}x   repeats only, no entropy stage")
    print(f"  {'DEFLATE (zlib -9)':<30} {z_bytes:>9,} {raw / z_bytes:>6.2f}x   LZ77 THEN Huffman: both redundancies")
    print("window dial on the same file: " + " · ".join(f"{w}B window -> {s:,}B" for w, s in sorted(sizes_by_window.items())))
    print("round-trip corpus: " + " · ".join(f"{k} {a:,}->{b:,} ({a / b:.2f}x)" for k, (a, b) in results.items()))
    print(f"edges: 10,000 identical bytes -> {len(blob_same)} bytes ({len(same) / len(blob_same):.0f}x); 10,000 random bytes -> {len(blob_noise):,} bytes (EXPANDS: pigeonhole, measured)")
    print("OK: every compression on this page decompressed to the exact original bytes, the window dial is monotone, the all-same stream collapsed, the random stream expanded as it must, and the two-stage pipeline beat both single stages")
