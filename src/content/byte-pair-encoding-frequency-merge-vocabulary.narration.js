// The spoken lesson for puzzle one hundred forty one, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle one hundred forty one: byte pair encoding, paired with a frequency-merge vocabulary, for subword tokenization. Here is the puzzle. A training text of four hundred forty one words, and a held-out passage of one hundred one words. Build a vocabulary of tokens small enough to model and rich enough that common words are single tokens, while any string at all, including words never seen and characters never seen, can still be encoded and decoded exactly. The method: start from the two hundred fifty six bytes. Count every adjacent pair of tokens in the training text, merge the most frequent pair into one new token everywhere it occurs, record the merge, and repeat. Encoding new text replays the merges in order, and decoding concatenates the bytes. The heuristic is the choice of what to merge: frequency, greedily, one pair at a time, which makes the vocabulary the corpus’s own common fragments and nothing else. On this page every round trip is checked byte for byte, the learner’s counts are checked against a full recount, the vocabulary is grown until the pairs run out, random merges are tried instead of frequent ones, and a plain word list is measured against it.',
  },
  {
    section: 'origins',
    text:
      'Philip Gage published byte pair encoding in nineteen ninety four, in the C Users Journal, as a compression trick: replace the most common pair of bytes with an unused byte, and repeat. Sennrich, Haddow, and Birch turned it into a vocabulary for neural machine translation in twenty sixteen, so that rare and unseen words become sequences of subwords instead of an unknown word token. Schuster and Nakajima’s WordPiece had done the same in twenty twelve with a likelihood criterion, and Kudo’s unigram model and SentencePiece, both twenty eighteen, made it language agnostic. GPT two, in twenty nineteen, took the base alphabet down to raw bytes so that no string could ever be out of vocabulary, which is the version on this page. Every large language model since tokenizes with a merge table learned exactly this way: about fifty thousand tokens for GPT two, about a hundred thousand for its successors, each one a fragment the training corpus used often.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the encoding and its exactness. A merge table applied in order turns any byte string into tokens, and concatenating the tokens’ bytes gives the string back. Measured: round trips exact at every vocabulary size on the training text, the held-out text, and a string with French, Japanese, and an emoji the corpus never contained; the vocabulary exactly two hundred fifty six plus k after k merges; the learner’s incremental pair counts equal to a full recount after each of the first sixty merges, and each merge a most frequent pair. The base of bytes is what makes it total: a word-level vocabulary from the same text cannot encode thirty six point six percent of the held-out words at all. The heuristic supplies the choice of what to merge: the most frequent adjacent pair, greedily, one at a time. The first merges learned here: h e, the, i n, e r, a n, e d, and, t o. Measured as tokens per word: four point four six, then two point seven four, one point six seven, and one point zero zero on the training text at zero, fifty, two hundred, and four hundred sixty seven merges; and four point six zero, two point nine nine, two point one three, and one point seven six held out. The gap is the generalization cost of a vocabulary fitted to four hundred forty one words. Merge random pairs instead, and the same two hundred token budget buys three point two two tokens per word held out, against two point one three: frequency is what makes a merge worth a vocabulary slot. At four hundred sixty seven merges the pairs run out, every training word is one token, and the held-out text is still one point seven six.',
  },
  {
    section: 'picture',
    text:
      'A stenographer inventing shorthand for one office. She starts with the alphabet and watches the mail. The letter pair that comes up most often, t followed by h, gets its own squiggle; then the squiggle followed by e; then i n, e r, a n. Every new squiggle is the most common pair of the symbols she already has, so the shorthand grows into exactly the words and word pieces this office uses, and after a few hundred squiggles most of the office’s words are one stroke. Mail from another office takes more strokes, because their words are built of the same pieces but not the same whole words, and a word she has never seen still takes a stroke per piece, never a shrug. Pick the squiggles at random instead, and she has the same number of symbols and nothing to use them on.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Base: every word as its bytes, a vocabulary of two hundred fifty six. Count: the adjacent token pairs across the corpus, weighted by how often each word occurs. Merge: the most frequent pair becomes one token everywhere it occurs; record the pair; update the counts incrementally. Repeat: the vocabulary is two hundred fifty six plus the number of merges, and here the pairs run out at four hundred sixty seven. Encode and decode: replay the merges in order, concatenate the bytes, and check the round trip byte for byte. On this page: at zero merges, four point four six tokens per word on the training text and four point six zero held out. At fifty, two point seven four and two point nine nine. At two hundred, one point six seven and two point one three. At four hundred sixty seven, one point zero zero and one point seven six. Two hundred random merges: two point eight six and three point two two. And the word list: thirty seven of one hundred one held-out words unencodable.',
  },
  {
    section: 'signals',
    text:
      'The signals that this pair fits. First: an open vocabulary. Names, typos, code, other languages, anything a fixed word list would call unknown. Second: a budget of tokens. A model’s input length and its embedding table are paid per token, and one point seven six per word beats four point six. Third: a corpus to learn from. The merges are the corpus’s statistics, and a different corpus wants a different table; the tokenizer is trained, not designed.',
  },
  {
    section: 'tradeoffs',
    text:
      'Now the rivals. WordPiece: merges the pair that most raises the corpus likelihood under a unigram model, not the most frequent one; it is BERT’s tokenizer. It costs a score per candidate merge and a word-initial convention to carry, and it earns its keep when merges should be judged by what they buy the model rather than by raw count. SentencePiece: language agnostic, raw text in with no pre-tokenization and spaces as symbols, and its unigram model can sample alternative segmentations for regularization during training. More machinery than a merge table, and the segmentation is a Viterbi search rather than a replay; reach for it for multilingual text, for scripts without spaces, or when the segmentation should be probabilistic.',
  },
  {
    section: 'tradeoffs',
    text:
      'The honest weaknesses of the hero. Greedy, corpus bound, and blind to meaning. Each merge is locally best and never revisited. The table fitted to four hundred forty one words leaves the held-out text at one point seven six tokens per word while the training text sits at one point zero zero. The tokens follow spelling, not morphology: i n g and e d appear, but so do fragments that mean nothing, and numbers and code split unpredictably. WordPiece’s likelihood criterion and the unigram model exist to choose merges by what they buy the model rather than by raw count.',
  },
  {
    section: 'tradeoffs',
    text:
      'And the negative example: a word-level vocabulary. Splitting on spaces and listing the words seen is the obvious tokenizer, and it fails on the first unseen word. Measured on this corpus: a vocabulary of two hundred nine words leaves thirty seven of one hundred one held-out words unencodable, thirty six point six percent, every one of them an unknown token that the model can neither read nor produce, while byte pair encoding encodes all one hundred one and seventy one percent of them as a single token. Names, plurals, typos, and other languages are not edge cases. They are a third of any text the list did not see.',
  },
  {
    section: 'code',
    text:
      'The code on this page is the learner, the encoder, and the referees. A byte pair encoder class with training that keeps incremental pair counts and optionally checks them against a full recount, a random merge switch for the ablation, encoding by replaying merges in order, and decoding by concatenation. Two embedded texts, one to train on and one held out, and a strange string with characters the corpus never saw. The self test asserts: the counts equal to a full recount for sixty merges with every merge a most frequent pair; the vocabulary exactly two hundred fifty six plus k; round trips exact at four vocabulary sizes on three texts; tokens per word strictly falling with the merge count on both texts; random merges at least thirty percent worse than frequency merges held out; and a word-level out of vocabulary rate above five percent. When it prints O K, the first thing every language model does to its input has been shown to be exact, total, and fitted to its corpus by nothing more than counting. The file would fail before it would lie to you.',
  },
];
