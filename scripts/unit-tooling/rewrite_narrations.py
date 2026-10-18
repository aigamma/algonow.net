"""Rewrite the six recorded narrations so that no passage reads a code line
aloud: every replacement describes what a construct does and keeps the numbers.
Reads src/content/<slug>.narration.js, writes build/narration-rewrites/<slug>.narration.js.
Usage: python scripts/unit-tooling/rewrite_narrations.py   (then copy each file into place and ship_lesson.sh it)
Each old string must occur exactly once; otherwise nothing is written for that slug."""
import pathlib
import sys

ROOT = pathlib.Path(r"D:\algonow.net")
OUT = pathlib.Path(__file__).resolve().parent / "narration-rewrites"
OUT.mkdir(exist_ok=True)

REWRITES = {
    "rag-chunk-boundary-recall": [
        ("Writing block, then the key heading in square brackets, reads that value.",
         "Square brackets after a dictionary look up a key, which is how each block’s heading and text are read."),
        ("The chunk text function takes a heading and a text and returns the heading, plus a newline, plus the text. The plus sign joins strings, and backslash n is a newline.",
         "The chunk text function takes a heading and a text and returns them joined into one string with a newline between. The plus sign joins strings, and the newline is written as an escape sequence."),
        ("The function starts with chunks equal to an empty list. For block in blocks visits each record in order, and heading equals block at heading copies a value into a short name so the lines below read plainly.",
         "The function starts with an empty list of chunks and visits each block in order, copying the block’s heading and text into short names so the lines below read plainly."),
        ("If the block’s own chunk text is over the budget, raise value error stops the function with an error.",
         "If the block’s own chunk text is over the budget, the function raises a value error, which stops it with an error."),
        ("The condition reads: if chunks, and the heading of the last chunk equals this heading. An empty list counts as false in Python, so the line means: if there is an open chunk and its heading matches. Chunks at minus one is the last element; negative indexes count from the end.",
         "The condition asks two things at once: whether there is an open chunk, and whether its heading matches this block’s. An empty list counts as false in Python, so the list itself answers the first question, and a negative index reaches the last chunk, because negative indexes count from the end."),
        ("If the chunk text of that candidate fits, the last chunk’s text is replaced by joined, in place, and continue jumps to the next block, skipping everything below.",
         "If the chunk text of that candidate fits, the last chunk’s text is replaced by the candidate, in place, and continue jumps to the next block, skipping everything below."),
        ("Chunks dot append adds a new dictionary to the end of the list, built from the heading and the text.",
         "The append method adds a new dictionary to the end of the list, built from the heading and the text."),
        ("Return chunks hands the list back.",
         "The return statement hands the list back."),
        ("The line if name equals main runs only when the file is executed directly, not when a test imports it.",
         "The main guard at the bottom runs the demonstration only when the file is executed directly, not when a test imports it."),
        ("Enumerate, with start equal to one, yields a number and a chunk together",
         "Enumerate, told to start counting at one, yields a number and a chunk together"),
        ("Try and except value error catch the rejection and print it.",
         "A try block with an except clause for the value error catches the rejection and prints it."),
    ],
    "rank-fusion-keyword-vector": [
        ("Calling items on the dictionary yields each pair of name and list, and writing for name, comma, ranking, in, unpacks the pair into two names in one step.",
         "The items method yields each pair of name and list, and the loop header unpacks each pair into two names in one step."),
        ("Enumerate with start equal to one yields a rank and a document together.",
         "Enumerate, told to start counting at one, yields a rank and a document together."),
        ("Scores at doc equals scores dot get of doc and zero point zero, plus one over k plus rank. The get method returns the stored score, or zero point zero the first time a document is seen. Writing scores at doc plus equals would fail with a key error on that first time.",
         "The accumulator line reads the document’s running score with the get method, falling back to zero point zero the first time the document is seen, adds one over k plus rank, and stores the result back under the document. The shorthand that adds in place would fail with a key error on that first time."),
        ("The call sorted, of scores dot items, with key equal to fusion order, sorts the pairs of document and score by whatever the fusion order function returns for each pair.",
         "Sorted is handed the dictionary’s items, the pairs of document and score, and the fusion order function as its key, so it orders the pairs by whatever that function returns for each pair."),
        ("Each element is a tuple, so the demonstration writes for position, comma, then in parentheses doc comma score, in enumerate of fused with start equal to one. That is nested unpacking: the position from enumerate and the two halves of the pair, all in one line.",
         "Each element is a tuple, so the demonstration loops with enumerate over the fused pairs and unpacks each pair inside the loop header. That is nested unpacking: the position from enumerate and the two halves of the pair, all in one line."),
        ("The format specs do the alignment: a colon two right aligns a number in two columns, a colon twenty two pads a string to twenty two characters, and a colon point six f prints six decimals. A comma and a space, dot join of a list, glues the strings together with that separator.",
         "Format specifications inside the f string do the alignment: a width of two right aligns the position, a width of twenty two pads the document name, and a fixed six decimals prints the score. The join method glues a list of strings together with a separator, here a comma and a space."),
    ],
    "paired-prompt-comparison": [
        ("The for line reads: for ticket, label, answer A, answer B in zip of the four lists, strict set to true. Zip walks the lists in step",
         "The loop header hands zip the four lists with strict mode on, and unpacks one value from each list per pass into four names. Zip walks the lists in step"),
        ("Third, booleans from double equals. Answer A double equals label is either true or false.",
         "Third, booleans from a comparison. Comparing an answer with the label using the equality operator gives true or false."),
        ("The line counts at a right, b right, plus equals one looks up the cell from the two booleans and adds one.",
         "The counting line looks up the cell with the two booleans as a tuple key and adds one in place."),
        ("written as one expression in square brackets: the value to collect, then for and the names, then if and the condition.",
         "written as one expression: what to collect, where it comes from, and the condition that filters."),
        ("The percent helper divides and formats with point zero percent, which multiplies by one hundred and prints a whole percent sign; it returns zero percent for an empty set instead of dividing by zero. The table lines pad the row label to ten characters, left aligned, with the less than sign, and right align each count in nine or ten characters with the greater than sign.",
         "The percent helper divides and uses the percentage format specification, which multiplies by one hundred, rounds to a whole number, and adds the percent sign; it returns zero percent for an empty set instead of dividing by zero. The table lines pad the row label to ten characters on the left and right align each count in nine or ten, using the alignment markers of the format specification."),
        ("If name equals main runs only when the file is executed directly.",
         "The main guard runs the demonstration only when the file is executed directly."),
        ("check A’s total a second way by summing the booleans of answer double equals label, where true counts as one",
         "check A’s total a second way by summing the booleans of each answer compared with its label, where true counts as one"),
        ("so the function returns text dot strip, dot lower; the result of one call is a string, and the next method applies to it directly.",
         "so the function returns the text stripped and then lowered; the result of one call is a string, and the next method applies to it directly."),
    ],
    "retry-with-backoff": [
        ("Inside the loop, writing call with parentheses runs the first, and writing sleep with the delay in parentheses runs the second. Production passes the real request function and time dot sleep, and nothing in the loop changes.",
         "Inside the loop, calling the first makes the request, and calling the second with the delay performs the wait. Production passes the real request function and the sleep function from the time module, and nothing in the loop changes."),
        ("For attempt in range from one to max attempts plus one counts one, two, three, four. A range stops just before its end value, which is why the end is one past the cap.",
         "The attempt loop counts with a range from one up to the cap: one, two, three, four. A range stops just before its end value, which is why the end is written one past the cap."),
        ("Except, then in parentheses timeout error and connection error, then as error, catches either of the two kinds, and the name error holds the exception object; putting it inside an f string gives its message.",
         "The except clause lists the two retryable types as a tuple and binds the caught exception to a name, so either kind is caught and its message is available to an f string."),
        ("If attempt equals max attempts, raise runtime error with an f string creates a new exception that names the count and carries the last error’s message.",
         "When the attempt number has reached the cap, the function raises a runtime error whose f string names the count and carries the last error’s message."),
        ("The delay is the base delay times two to the power of attempt minus one; two asterisks mean raise to a power.",
         "The delay is the base delay times two to the power of attempt minus one, using the power operator."),
        ("A list called waits starts empty, and record wait appends to it; together they replace the clock. Waits dot clear empties the list in place between scripts, sum of waits adds the floats, and the join method on a comma and a space prints a list as one line.",
         "A list of waits starts empty, and the recording function appends to it; together they replace the clock. The clear method empties the list in place between scripts, the built in sum adds the floats, and the join method prints a list as one line separated by commas."),
    ],
    "stable-split-by-hash": [
        ("The lines import hashlib and import random bring in two standard library modules, and their functions are reached with a dot, as in hashlib dot sha two fifty six.",
         "Two import statements bring in the hashlib and random modules from the standard library, and their functions are reached with a dot."),
        ("Then hashlib dot sha two fifty six builds the hash, and its hexdigest method returns it as sixty four hex characters, which is a string.",
         "Then the sha two fifty six constructor builds the hash, and its hexdigest method returns it as sixty four hex characters, which is a string."),
        ("Digest with a slice of colon eight is the first eight characters. The int function, given that slice and the base sixteen, reads the characters as a hexadecimal number, which can be up to about four billion.",
         "A slice takes the first eight characters of the digest. The int function, told that the base is sixteen, reads those characters as a hexadecimal number, which can be up to about four billion."),
        ("The early return of validation inside the if means the last line, return train, runs only when the test failed, so no else is needed.",
         "The early return inside the if means the last line, which returns train, runs only when the test failed, so no else is needed."),
        ("The key line reads: sides, then in square brackets a call to side of, then dot append with the record id. It does two things.",
         "The key line indexes the dictionary with the result of the side of call and appends the record id to the list it finds there. It does two things."),
        ("Sixth, guards with in. Writing record id in sides at train asks whether that list already contains the value. Two such checks joined by or catch a duplicate before it is appended, and raise value error stops the function with a message that names it.",
         "Sixth, membership guards. A membership test asks whether a list already contains the id. Two such tests joined by or catch a duplicate before it is appended, and a value error stops the function with a message that names it."),
        ("Random dot Random with a seed is a random generator with a fixed starting point, and its shuffle method reorders the copy in place.",
         "A Random object built with a seed is a random generator with a fixed starting point, and its shuffle method reorders the copy in place."),
        ("Inside an f string, the bucket value followed by a colon and the number two is padded to two characters, so the columns line up. Join with a comma and a space, applied to a sorted list of strings, prints them in order. The expression a in x, not equal to a in y, compares two yes or no answers and is true when they differ, which is exactly what moved means. Try and except value error catch the rejection and print it",
         "Inside an f string, a width of two in the format specification pads the bucket to two characters, so the columns line up. The join method, applied to a sorted list of strings, prints them in order with commas between. Comparing two membership tests with the not equal operator is true when the answers differ, which is exactly what moved means. A try block with an except clause for the value error catches the rejection and prints it"),
    ],
    "validate-jsonl-records": [
        ("A real file is read the same way: open the path with the with statement, then for line in file hands out one line at a time with its newline still attached",
         "A real file is read the same way: open the path with the with statement, then loop over the file object, which hands out one line at a time with its newline still attached"),
        ("For number, line in enumerate of lines, with start equal to one, yields a pair on every pass, and the two names on the left of the word in unpack it.",
         "Enumerate over the lines, told to start counting at one, yields a pair on every pass, and the loop header unpacks it into the number and the line."),
        ("If the stripped text equals the empty string, continue jumps to the next line without recording anything.",
         "When the stripped text is empty, continue jumps to the next line without recording anything."),
        ("The rejections list gets one pair appended, the line’s number and the words malformed JSON, where the inner parentheses build the tuple, and continue moves on.",
         "The rejections list gets one pair appended, the line’s number and the words malformed JSON, built as a tuple, and continue moves on."),
        ("For record in validate drives the generator, and the kept list appends what it yields; wrapping the call in list would do the same in one line.",
         "Looping over the generator drives it, and the kept list appends what it yields; wrapping the call in the list constructor would do the same in one line."),
        ("Create it before the loop with the set constructor, test membership with the word in after the other checks have passed, and add the prompt to the set just before the record is yielded.",
         "Create it before the loop with the set constructor, test membership after the other checks have passed, and add the prompt to the set just before the record is yielded."),
    ],
}

failed = False
for slug, pairs in REWRITES.items():
    source = ROOT / "src" / "content" / f"{slug}.narration.js"
    text = source.read_text(encoding="utf-8")
    problems = []
    for old, new in pairs:
        count = text.count(old)
        if count != 1:
            problems.append(f"  {count} matches for: {old[:70]}...")
            continue
        text = text.replace(old, new)
    if problems:
        failed = True
        print(f"{slug}: NOT written")
        print("\n".join(problems))
        continue
    target = OUT / f"{slug}.narration.js"
    target.write_text(text, encoding="utf-8", newline="\n")
    print(f"{slug}: {len(pairs)} passages rewritten, {len(text)} characters")
sys.exit(1 if failed else 0)
