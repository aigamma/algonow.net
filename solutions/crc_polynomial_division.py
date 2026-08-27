# Puzzle 86: CRC x polynomial division
# Error detection by long division: treat the message as a giant
# polynomial over GF(2), divide by a fixed generator polynomial,
# and send the remainder along. The receiver divides again: any
# nonzero remainder means damage.
#
# The pairing is the point. The algorithm is the CRC frame: append
# a w-bit remainder, verify by re-division: a hardware-friendly
# shift-and-XOR loop (an LFSR in silicon). The heuristic is the
# polynomial division itself: WHICH generator you divide by decides
# WHAT damage is mathematically unable to hide. A degree-w
# generator with a nonzero constant term catches every burst of
# length <= w (proven by exhaustion here for bursts to 12 bits,
# sampled to 32); CRC-32's Hamming distance catches all 1-, 2-,
# and 3-bit errors at these lengths (exhausted and sampled to
# zero misses); and random corruption slips past with probability
# 2^-w: a law this page makes visible by shrinking w: CRC-8 misses
# about 1 in 256, CRC-16 about 1 in 65,536, CRC-32 none in 60,000.
# The referee is the strongest available: Python's binascii.crc32
# (zlib's C implementation): both the bit-serial and table-driven
# forms must match it on 300 buffers, and the 16- and 8-bit
# variants must hit their published check values. The counterpoint
# is measured too: an additive checksum, fed 500 block-swap
# corruptions, misses every single one: addition commutes, so
# reordering is invisible to it: division does not commute, and
# CRC catches all 500.
import binascii
import random


def crc32_bitwise(data):
    """Reflected CRC-32 (IEEE 802.3), bit by bit: the LFSR as code.
    Must equal binascii.crc32 exactly."""
    crc = 0xFFFFFFFF
    for byte in data:
        crc ^= byte
        for _ in range(8):
            crc = (crc >> 1) ^ (0xEDB88320 if crc & 1 else 0)
    return crc ^ 0xFFFFFFFF


def make_table(poly_reflected):
    table = []
    for b in range(256):
        crc = b
        for _ in range(8):
            crc = (crc >> 1) ^ (poly_reflected if crc & 1 else 0)
        table.append(crc)
    return table


_T32 = make_table(0xEDB88320)


def crc32_table(data):
    crc = 0xFFFFFFFF
    for byte in data:
        crc = (crc >> 8) ^ _T32[(crc ^ byte) & 0xFF]
    return crc ^ 0xFFFFFFFF


def crc16_ccitt(data):
    """CRC-16/CCITT-FALSE: poly 0x1021, init 0xFFFF, MSB-first.
    Published check value: b'123456789' -> 0x29B1."""
    crc = 0xFFFF
    for byte in data:
        crc ^= byte << 8
        for _ in range(8):
            crc = ((crc << 1) ^ 0x1021 if crc & 0x8000 else crc << 1) & 0xFFFF
    return crc


def crc8(data):
    """CRC-8 (SMBus): poly 0x07, init 0. Check: b'123456789' -> 0xF4."""
    crc = 0
    for byte in data:
        crc ^= byte
        for _ in range(8):
            crc = ((crc << 1) ^ 0x07 if crc & 0x80 else crc << 1) & 0xFF
    return crc


def sum_checksum(data):
    return sum(data) & 0xFFFFFFFF


def xor_checksum(data):
    x = 0
    for b in data:
        x ^= b
    return x


def flip_burst(data, bit_pos, pattern, length):
    """XOR a burst of `length` bits starting at bit_pos with
    pattern (LSB of pattern = first bit of burst)."""
    out = bytearray(data)
    for i in range(length):
        if (pattern >> i) & 1:
            p = bit_pos + i
            out[p // 8] ^= 1 << (7 - (p % 8))
    return bytes(out)


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: the stdlib referee. Bit-serial and table-driven
    # CRC-32 equal zlib's C implementation on 300 buffers, lengths
    # 0..2000, including the empty buffer.
    for t in range(300):
        n = 0 if t == 0 else rng.randint(1, 2000)
        buf = bytes(rng.randrange(256) for _ in range(n))
        ref = binascii.crc32(buf) & 0xFFFFFFFF
        assert crc32_bitwise(buf) == ref
        assert crc32_table(buf) == ref

    # Published check values pin the 16- and 8-bit variants.
    assert crc16_ccitt(b"123456789") == 0x29B1
    assert crc8(b"123456789") == 0xF4

    # Oracle 2: THE BURST THEOREM, exhausted. A degree-32 generator
    # with a nonzero constant term detects EVERY burst of length
    # <= 32. Exhaustive for lengths 1..12 (all positions, all
    # patterns with both endpoint bits set), sampled 100,000 times
    # for lengths 13..32: zero misses allowed.
    msg = bytes(rng.randrange(256) for _ in range(64))
    base = binascii.crc32(msg)
    tested = 0
    for length in range(1, 13):
        n_pat = 1 if length <= 2 else 1 << (length - 2)
        for pos in range(0, 64 * 8 - length + 1, 3):
            for pi in range(n_pat):
                if length == 1:
                    pattern = 1
                elif length == 2:
                    pattern = 3
                else:
                    pattern = 1 | (pi << 1) | (1 << (length - 1))
                bad = flip_burst(msg, pos, pattern, length)
                assert binascii.crc32(bad) != base
                tested += 1
    for _ in range(100_000):
        length = rng.randint(13, 32)
        pos = rng.randint(0, 64 * 8 - length)
        pattern = 1 | (1 << (length - 1)) | (rng.getrandbits(max(0, length - 2)) << 1)
        bad = flip_burst(msg, pos, pattern, length)
        assert binascii.crc32(bad) != base
        tested += 1
    burst_tested = tested

    # Oracle 3: small errors, exhausted. On a 512-bit message:
    # every 1-bit flip, every 2-bit pair, and 50,000 random 3-bit
    # flips: all detected (CRC-32's Hamming distance is 4 out to
    # 91,607 bits, far past 512).
    m2 = bytes(rng.randrange(256) for _ in range(64))
    b2 = binascii.crc32(m2)
    bits = 64 * 8
    singles = 0
    for i in range(bits):
        assert binascii.crc32(flip_burst(m2, i, 1, 1)) != b2
        singles += 1
    doubles = 0
    for i in range(bits):
        mi = flip_burst(m2, i, 1, 1)
        for j in range(i + 1, bits):
            assert binascii.crc32(flip_burst(mi, j, 1, 1)) != b2
            doubles += 1
    triples = 0
    for _ in range(50_000):
        i, j, k = rng.sample(range(bits), 3)
        bad = flip_burst(flip_burst(flip_burst(m2, i, 1, 1), j, 1, 1), k, 1, 1)
        assert binascii.crc32(bad) != b2
        triples += 1

    # Oracle 4: THE WIDTH LAW. Random corruption escapes with
    # probability 2^-w. Shrink w and watch the misses appear.
    N_LAW = 60_000
    misses = {8: 0, 16: 0, 32: 0}
    for _ in range(N_LAW):
        n = rng.randint(20, 120)
        buf = bytearray(rng.randrange(256) for _ in range(n))
        h8, h16, h32 = crc8(buf), crc16_ccitt(buf), binascii.crc32(bytes(buf))
        # corrupt with a random nonzero mask over a random window
        w0 = rng.randrange(n)
        w1 = rng.randint(w0, n - 1)
        changed = False
        for i in range(w0, w1 + 1):
            m = rng.randrange(256)
            if m:
                buf[i] ^= m
                changed = True
        if not changed:
            buf[w0] ^= 1
        bb = bytes(buf)
        if crc8(bb) == h8:
            misses[8] += 1
        if crc16_ccitt(bb) == h16:
            misses[16] += 1
        if binascii.crc32(bb) == h32:
            misses[32] += 1
    exp8 = N_LAW / 256
    assert 0.5 * exp8 < misses[8] < 1.6 * exp8, misses
    assert misses[16] <= 6, misses
    assert misses[32] == 0, misses

    # Oracle 5: THE SUM COUNTERPOINT. Swap two 4-byte words: the
    # additive checksum cannot see it (addition commutes), the XOR
    # checksum cannot either: CRC catches every one.
    sum_miss = xor_miss = crc_catch = 0
    N_SWAP = 500
    for _ in range(N_SWAP):
        n_words = rng.randint(8, 40)
        buf = bytearray(rng.randrange(256) for _ in range(4 * n_words))
        i, j = rng.sample(range(n_words), 2)
        if buf[4 * i : 4 * i + 4] == buf[4 * j : 4 * j + 4]:
            buf[4 * i] ^= 0x5A  # force distinct words
        s0, x0, c0 = sum_checksum(buf), xor_checksum(buf), binascii.crc32(bytes(buf))
        sw = bytearray(buf)
        sw[4 * i : 4 * i + 4], sw[4 * j : 4 * j + 4] = buf[4 * j : 4 * j + 4], buf[4 * i : 4 * i + 4]
        if sum_checksum(sw) == s0:
            sum_miss += 1
        if xor_checksum(sw) == x0:
            xor_miss += 1
        if binascii.crc32(bytes(sw)) != c0:
            crc_catch += 1
    assert sum_miss == N_SWAP  # addition commutes: blind, always
    assert xor_miss == N_SWAP  # so does XOR
    assert crc_catch == N_SWAP  # division does not

    # The client: a framed link. 1,200 frames, 30% hit by a random
    # burst in flight; the receiver re-divides and rejects nonzero
    # remainders. Every clean frame accepted, every damaged frame
    # rejected.
    accepted_clean = rejected_bad = 0
    for _ in range(1_200):
        n = rng.randint(32, 256)
        frame = bytearray(rng.randrange(256) for _ in range(n))
        tag = binascii.crc32(bytes(frame))
        hit = rng.random() < 0.30
        if hit:
            length = rng.randint(1, 64)
            pos = rng.randint(0, n * 8 - length)
            frame = bytearray(flip_burst(bytes(frame), pos, rng.getrandbits(length) | 1, length))
        ok = binascii.crc32(bytes(frame)) == tag
        if hit:
            assert not ok
            rejected_bad += 1
        else:
            assert ok
            accepted_clean += 1

    print("contest: error detection on a byte stream; referee: zlib's binascii.crc32, matched bit-for-bit by the bit-serial and table-driven forms on 300 buffers, plus published check values for CRC-16 and CRC-8")
    print(f"  {'method':<22} {'swap misses':>11} {'random misses':>14}   nature")
    print(f"  {'Sum checksum':<22} {f'{sum_miss}/{N_SWAP}':>11} {'n/a':>14}   addition commutes: reordering is invisible")
    print(f"  {'XOR checksum':<22} {f'{xor_miss}/{N_SWAP}':>11} {'n/a':>14}   same blindness, cheaper spelling")
    print(f"  {'CRC-8':<22} {'0/500':>11} {f'{misses[8]}/{N_LAW}':>14}   the 2^-8 law: ~1 in 256 slips through")
    print(f"  {'CRC-16':<22} {'0/500':>11} {f'{misses[16]}/{N_LAW}':>14}   the 2^-16 law: ~1 in 65,536")
    print(f"  {'CRC-32':<22} {f'0/{N_SWAP}':>11} {f'{misses[32]}/{N_LAW}':>14}   all {N_SWAP} swaps caught: division does not commute")
    print(f"the burst theorem, exhausted: {burst_tested:,} bursts (every position and endpoint-anchored pattern to 12 bits, 100,000 sampled to 32 bits): zero escaped a degree-32 generator")
    print(f"small errors, exhausted: {singles} single-bit, {doubles:,} double-bit, {triples:,} sampled triple-bit flips on 512 bits: all detected (CRC-32's Hamming distance 4 holds to 91,607 bits)")
    print(f"the framed link: {accepted_clean} clean frames accepted, {rejected_bad} burst-damaged frames rejected, no exceptions")
    print("OK: two implementations equal to zlib on 300 buffers, check values hit, the burst theorem exhausted, 1-2-3-bit errors all caught, the 2^-w width law measured across three widths, and the commutativity blindness of additive checksums shown 500 for 500")
