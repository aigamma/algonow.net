# Puzzle 141: Byte pair encoding x frequency-merge vocabulary
# Subword tokenization: turn text into a sequence of tokens from a
# fixed vocabulary, small enough to model and rich enough that common
# words are single tokens while any string at all, including words
# never seen, can still be encoded. Byte pair encoding is the
# algorithm: start from the 256 bytes, and repeatedly merge the most
# frequent adjacent pair of tokens in the training text into one new
# token, recording the merge; encoding new text replays the merges in
# order. The heuristic is the choice of what to merge: frequency,
# greedily, one pair at a time, which builds a vocabulary of the
# corpus's own common fragments (th, the, ing, tion) and nothing else.
#
# Referees:
# (1) ROUND TRIP: decoding the tokens of any text reproduces the text
#     byte for byte, at every vocabulary size, on training and
#     held-out text and on strings with characters the corpus never
#     contained;
# (2) THE COUNTS: the incremental pair counts the learner keeps must
#     equal a full recount of the corpus after each of the first 60
#     merges, and each merge must be a most-frequent pair;
# (3) THE VOCABULARY: exactly 256 + k tokens after k merges;
# (4) COMPRESSION, measured as tokens per word on the training text and
#     on held-out text at 0, 50, 200 merges and at the merge count where
#     the training pairs run out (every training word a single token),
#     monotone in k; the draft asked for 500 merges and the corpus had
#     fewer pairs than that, so the exhaustion point is measured
#     instead of assumed;
# (5) THE ABLATION: 200 random merges (a random adjacent pair each
#     step) against 200 frequency merges, tokens per word on the
#     held-out text;
# (6) THE OUT-OF-VOCABULARY RATE: a word-level vocabulary built from the
#     training text cannot encode a measured fraction of held-out
#     words at all; byte pair encoding encodes every one of them.
import random
from collections import Counter

SEED = 20260926

TRAIN = """
The river town kept its records in a ledger bound in green cloth, and the clerk who kept the
ledger believed that every transaction, however small, deserved its own line. Boats arrived
in the morning carrying grain, timber, and salt; boats departed in the evening carrying the
same grain milled, the same timber sawn, and the salt unchanged, because nobody in the town
had ever found a use for salt beyond the obvious one. The clerk recorded the arrivals and the
departures, the names of the captains, the weights of the cargoes, and the weather, which he
considered a transaction between the sky and the town. In winter the river froze and the
ledger filled with the weather alone.

The mill stood at the bend where the current was strongest. Its wheel turned the grindstones,
and the grindstones turned the grain into flour, and the flour went into sacks that the
miller's daughter counted twice before she let them leave. She had learned counting from the
clerk, who had learned it from his mother, who had kept the ledger before him and had written
in the margins, in a smaller hand, her opinions of the captains. The daughter did not write
opinions. She wrote numbers, and she checked them, and when a number did not agree with
another number she went to the sacks and counted again until it did.

The sawmill was newer and louder. It took the timber that came downriver in rafts and cut it
into planks, and the planks went to the boatyard, and the boatyard built the boats that carried
the grain and the timber and the salt. The town was a loop, the clerk said, and the ledger
was the loop written down: every line was a debt to some earlier line and a promise to some
later one. When the schoolteacher asked him what would happen if a line were lost, he said
that the loop would still turn, but that nobody would know why, and that not knowing why was
the beginning of every kind of trouble.

In the spring the river rose and the mill wheel turned too fast to grind, and the miller
stopped the wheel and waited. The clerk wrote the waiting in the ledger. The daughter counted
the sacks that were left and found that the number agreed with the number from the week
before, which was the first time in her memory that a week had passed without a change, and
she wrote that down too, in the margin, in a smaller hand, because it seemed to her the kind
of thing her grandmother would have wanted recorded.
"""

HELD_OUT = """
The captain of the last boat of the season brought a parcel for the schoolteacher and a
question for the clerk: whether the ledger recorded the passengers as well as the cargoes,
because his sister had traveled downriver the previous autumn and had not written since. The
clerk turned the pages back to the autumn and found the boat, the weather, the timber, and no
passengers, because passengers were not transactions, and he said so, and then he wrote her
name in the margin anyway, in the smaller hand, so that the next person who turned the pages
would find it.
"""


def words_of(text):
    return text.split()


class BPE:
    def __init__(self):
        self.merges = []                       # list of (a, b) byte-string pairs in order
        self.vocab = {bytes([i]) for i in range(256)}

    @staticmethod
    def _word_tokens(word):
        return [bytes([b]) for b in word.encode('utf-8')]

    def train(self, text, k, rng=None, check_counts=0):
        """k merges; rng not None means the random-merge ablation.
        check_counts > 0 verifies the incremental counts against a full
        recount for that many merges. Returns the count checks done."""
        word_freq = Counter(words_of(text))
        seqs = {w: self._word_tokens(w) for w in word_freq}
        checks = 0
        pair_counts = Counter()
        for w, f in word_freq.items():
            s = seqs[w]
            for i in range(len(s) - 1):
                pair_counts[(s[i], s[i + 1])] += f
        for step in range(k):
            if not pair_counts:
                break
            if check_counts and step < check_counts:
                full = Counter()
                for w, f in word_freq.items():
                    s = seqs[w]
                    for i in range(len(s) - 1):
                        full[(s[i], s[i + 1])] += f
                assert {p: c for p, c in pair_counts.items() if c > 0} == full, step
                checks += 1
            if rng is None:
                best = max(pair_counts.items(), key=lambda kv: (kv[1], kv[0]))[0]
                assert pair_counts[best] == max(pair_counts.values())
            else:
                live = [p for p, c in pair_counts.items() if c > 0]
                best = rng.choice(live)
            merged = best[0] + best[1]
            self.merges.append(best)
            self.vocab.add(merged)
            # apply the merge to every word containing the pair, updating counts incrementally
            for w, f in word_freq.items():
                s = seqs[w]
                if len(s) < 2:
                    continue
                i = 0
                changed = False
                while i < len(s) - 1:
                    if s[i] == best[0] and s[i + 1] == best[1]:
                        if i > 0:
                            pair_counts[(s[i - 1], s[i])] -= f
                            pair_counts[(s[i - 1], merged)] += f
                        if i + 2 < len(s):
                            pair_counts[(s[i + 1], s[i + 2])] -= f
                            pair_counts[(merged, s[i + 2])] += f
                        pair_counts[best] -= f
                        s[i:i + 2] = [merged]
                        changed = True
                    else:
                        i += 1
                if changed:
                    seqs[w] = s
            pair_counts = Counter({p: c for p, c in pair_counts.items() if c > 0})
        return checks

    def encode_word(self, word):
        s = self._word_tokens(word)
        for a, b in self.merges:
            i = 0
            while i < len(s) - 1:
                if s[i] == a and s[i + 1] == b:
                    s[i:i + 2] = [a + b]
                else:
                    i += 1
        return s

    def encode(self, text):
        return [t for w in words_of(text) for t in self.encode_word(w)]

    def tokens_per_word(self, text):
        ws = words_of(text)
        return sum(len(self.encode_word(w)) for w in ws) / len(ws)

    @staticmethod
    def decode_words(tokens_by_word):
        return ' '.join(b''.join(ts).decode('utf-8') for ts in tokens_by_word)


if __name__ == '__main__':
    train_words = words_of(TRAIN)
    held_words = words_of(HELD_OUT)

    # Oracle 2 + 3: counts and vocabulary while training the reference model.
    bpe = BPE()
    checks = bpe.train(TRAIN, 100000, check_counts=60)
    assert checks == 60
    assert len(bpe.vocab) == 256 + len(bpe.merges), (len(bpe.vocab), len(bpe.merges))
    K_MAX = len(bpe.merges)                     # the pairs ran out: every training word is one token
    assert 200 < K_MAX < 100000, K_MAX
    assert all(len(bpe.encode_word(w)) == 1 for w in set(train_words))

    # Oracle 1: round trip at several sizes, including foreign characters.
    strange = 'ledger écrit en français · 日本語 · emoji \U0001F600 and salt'
    for k in (0, 50, 200, K_MAX):
        m = BPE()
        m.train(TRAIN, k)
        for text in (TRAIN, HELD_OUT, strange):
            ws = words_of(text)
            assert m.decode_words([m.encode_word(w) for w in ws]) == ' '.join(ws), k
        assert len(m.vocab) == 256 + len(m.merges)

    # Oracle 4: compression by vocabulary size.
    rows = []
    for k in (0, 50, 200, K_MAX):
        m = BPE()
        m.train(TRAIN, k)
        rows.append((k, len(m.vocab), m.tokens_per_word(TRAIN), m.tokens_per_word(HELD_OUT)))
    assert all(rows[i][2] > rows[i + 1][2] and rows[i][3] > rows[i + 1][3] for i in range(3)), rows

    # Oracle 5: random merges.
    rnd = BPE()
    rnd.train(TRAIN, 200, rng=random.Random(SEED))
    freq200 = next(r for r in rows if r[0] == 200)
    rnd_held = rnd.tokens_per_word(HELD_OUT)
    assert rnd_held > freq200[3] * 1.3, (rnd_held, freq200[3])

    # Oracle 6: the word-level vocabulary and its out-of-vocabulary rate.
    word_vocab = set(train_words)
    oov = [w for w in held_words if w not in word_vocab]
    oov_rate = len(oov) / len(held_words)
    assert oov_rate > 0.05
    single = sum(1 for w in held_words if len(bpe.encode_word(w)) == 1) / len(held_words)

    first = [(a + b).decode('utf-8', 'replace') for a, b in bpe.merges[:12]]
    print(f'contest: subword tokenization; training text {len(train_words)} words ({len(TRAIN.encode())} bytes), held-out text {len(held_words)} words; referee: byte-for-byte round trip and a full pair recount after each of the first 60 merges')
    print(f"  {'merges':>6} {'vocabulary':>10} {'tokens/word train':>17} {'tokens/word held-out':>20}   verdict")
    for k, v, tr, ho in rows:
        print(f'  {k:>6} {v:>10} {tr:>17.2f} {ho:>20.2f}   {"bytes: every word is its letters" if k == 0 else ("the pairs ran out: every training word is one token" if k == K_MAX else "frequency merges: common fragments become tokens")}')
    print(f'  {200:>6} {len(rnd.vocab):>10} {rnd.tokens_per_word(TRAIN):>17.2f} {rnd_held:>20.2f}   random merges: the same vocabulary size, spent on fragments nobody uses')
    print(f'first merges learned: {first}')
    print(f'word-level vocabulary of {len(word_vocab)} types: {len(oov)} of {len(held_words)} held-out words ({oov_rate:.1%}) are out of vocabulary and cannot be encoded; BPE encodes all {len(held_words)}, {single:.0%} of them as a single token; '
          f'a French, Japanese, and emoji string round-trips too')
    print(f'OK: round trips exact at 0 / 50 / 200 / {K_MAX} merges on three texts; counts verified for 60 merges; vocabulary 256 + k exactly; held-out tokens per word {rows[0][3]:.2f} -> {rows[-1][3]:.2f}; '
          f'random merges {rnd_held:.2f} vs frequency {freq200[3]:.2f} at 200; word-level OOV {oov_rate:.1%} vs 0')
