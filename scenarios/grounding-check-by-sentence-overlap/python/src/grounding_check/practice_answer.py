"""Answer to the practice variation: with require_citation on, a sentence whose
best chunk is not among the chunks it cites is marked miscited instead of
supported. Everything outside the marked region is the practice starter,
unchanged. Run alone: python practice_answer.py
"""
import sys

CHUNKS = [
    {"id": "c1", "text": "To rotate an API key, create a replacement key with the same scopes "
                         "and deploy it to every service that uses the old key."},
    {"id": "c2", "text": "Revoke the old key only after the replacement has been deployed "
                         "everywhere; revocation takes effect within a minute."},
    {"id": "c3", "text": "A lost key cannot be recovered. Create a replacement key and revoke "
                         "the lost one as soon as possible."},
]

ANSWER = ("Create a replacement key with the same scopes and deploy it to each service [c1]. "
          "Revoke the old key only once the replacement is deployed everywhere [c3]. "
          "Then restart the gateway so the new key is picked up [c1]. "
          "Revocation takes effect within a minute [c2].")

THRESHOLD = 0.6   # a sentence is supported when its best chunk shares at least this share of its words

STOPWORDS = {"a", "an", "the", "to", "of", "and", "it", "is", "so", "with", "that",
             "then", "only", "after", "as", "has", "been", "be", "by"}


def split_sentences(text):
    """Cut the text at periods, question marks, and exclamation marks.
    Abbreviations such as "e.g." are out of scope for this lesson."""
    sentences = []
    buffer = ""
    for char in text:
        buffer = buffer + char
        if char in ".?!":
            sentence = buffer.strip()
            if sentence != "":
                sentences.append(sentence)
            buffer = ""
    leftover = buffer.strip()
    if leftover != "":
        sentences.append(leftover)
    return sentences


def split_citation(sentence):
    """Separate a sentence from its [c1] style citation.
    Returns the sentence without the bracket and the list of cited ids."""
    start = sentence.find("[")
    end = sentence.find("]")
    if start == -1 or end == -1 or end < start:
        return sentence, []
    cited = []
    for part in sentence[start + 1:end].split(","):
        cited.append(part.strip())
    text = sentence[:start].rstrip() + sentence[end + 1:]
    return text, cited


def content_words(text):
    """The set of lowercase words in the text, punctuation removed, stopwords dropped."""
    kept_chars = ""
    for char in text.lower():
        if char.isalnum() or char.isspace():
            kept_chars = kept_chars + char
        else:
            kept_chars = kept_chars + " "
    words = set()
    for word in kept_chars.split():
        if word not in STOPWORDS:
            words.add(word)
    return words


def support_score(sentence_words, chunk_words):
    """The share of the sentence's content words that the chunk also contains."""
    if len(sentence_words) == 0:
        return 0.0
    shared = sentence_words & chunk_words
    return len(shared) / len(sentence_words)


# --- answer begins ---
def check_grounding(answer, chunks, threshold=0.6, require_citation=False):
    """One row per sentence: its citation, the best supporting chunk, the score, and a verdict.
    With require_citation, a supported sentence must cite its best chunk or it is miscited."""
    sentences = split_sentences(answer)
    if len(sentences) == 0:
        raise ValueError("the answer has no sentences")
    rows = []
    for number, sentence in enumerate(sentences, start=1):
        text, cited = split_citation(sentence)
        words = content_words(text)
        best_id = None
        best_score = -1.0
        for chunk in chunks:
            score = support_score(words, content_words(chunk["text"]))
            if score > best_score:
                best_id = chunk["id"]
                best_score = score
        if len(words) == 0:
            verdict = "no content"
        elif best_score >= threshold:
            verdict = "supported"
        else:
            verdict = "unsupported"
        if require_citation and verdict == "supported" and best_id not in cited:
            verdict = "miscited"          # the support is real, but the reader is sent to the wrong chunk
        rows.append({"number": number, "text": text, "cited": cited,
                     "best": best_id, "score": best_score, "verdict": verdict})
    return rows
# --- answer ends ---


if __name__ == "__main__":
    rows = check_grounding(ANSWER, CHUNKS, threshold=THRESHOLD, require_citation=True)
    if rows[1]["verdict"] != "miscited":
        print(f"NOT OK: expected sentence 2 (best chunk c2, cites c3) to be miscited with require_citation=True, got '{rows[1]['verdict']}'")
        print("Make check_grounding turn a supported verdict into miscited when the best chunk is not among the cited ids.")
        sys.exit(1)
    print(f"{len(rows)} sentences, {len(CHUNKS)} retrieved chunks, support threshold {THRESHOLD}, citations required")
    print(f"{'#':<3}{'cites':<7}{'best':<6}{'score':>5}  {'verdict':<13}sentence")
    for row in rows:
        cites = ",".join(row["cited"])
        print(f"{row['number']:<3}{cites:<7}{row['best']:<6}{row['score']:>5.3f}  {row['verdict']:<13}{row['text']}")
    supported = 0
    flagged = []
    for row in rows:
        if row["verdict"] == "supported":
            supported += 1
        else:
            flagged.append(f"{row['number']} ({row['verdict']})")
    print(f"\n{supported} of {len(rows)} sentences supported; flagged: sentence {', '.join(flagged)}")

    try:
        check_grounding("   ", CHUNKS)
    except ValueError as error:
        print(f"\nrejected: {error}")

    if supported != 2 or [row["verdict"] for row in rows] != ["supported", "miscited", "unsupported", "supported"]:
        print("\nNOT OK: expected verdicts supported, miscited, unsupported, supported")
        sys.exit(1)
    print("\nOK")
