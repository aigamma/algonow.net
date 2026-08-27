// The spoken lesson for puzzle eighty six, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle eighty six: the cyclic redundancy check, paired with polynomial division, for error detection. Here is the puzzle. Bytes cross a wire, a disk, a radio link: and physics guarantees that some of them arrive wrong. The job: detect the damage, cheaply enough to run on every frame, with guarantees strong enough to bet a protocol on. The method: treat the message as one enormous polynomial with coefficients of zero and one, divide it by a fixed generator polynomial, and append the thirty two bit remainder. The receiver divides again: remainder zero means accept: anything else means damage. The referee on this page is the strongest available: zlib’s own C implementation, Python’s binascii dot c r c thirty two: the bit serial and table driven forms here must match it bit for bit on three hundred buffers, and the sixteen and eight bit variants must hit their published check values. Every detection claim after that is exhausted, or sampled, to zero misses.',
  },
  {
    section: 'origins',
    text:
      'Wesley Peterson and D. T. Brown, nineteen sixty one, in the Proceedings of the I R E: treat messages as polynomials over the field of two elements, divide by a well chosen generator, and the algebra decides in advance which error patterns are mathematically unable to hide. The scheme was born for hardware: the division loop is nothing but a shift register with exclusive or taps: one gate delay per bit: which is why C R Cs live everywhere frames live: Ethernet, whose thirty two bit polynomial was standardized in nineteen eighty three and is the one this page implements: ZIP and P N G files: serial A T A: the C A N bus in your car: Bluetooth. Castagnoli’s nineteen ninety three computer search found even better polynomials, and modern processors ship the C R C instruction in silicon. Nearly every frame your machines have ever exchanged ended in one of these remainders.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the frame discipline. The sender divides the message, shifted up by thirty two bits, by the generator, and appends the remainder. The receiver divides the entire frame: message and tag together: and accepts only a remainder of zero: verified here on twelve hundred frames, where all three hundred forty nine damaged ones were rejected and every clean one accepted. The heuristic is the choice of divisor, which is the choice of what cannot hide. A generator of degree thirty two with a nonzero constant term detects every burst of thirty two bits or fewer: this page exhausts four hundred forty three thousand bursts and zero escape. The Ethernet polynomial’s Hamming distance catches every one, two, and three bit error at real frame lengths: five hundred twelve singles, one hundred thirty thousand doubles, fifty thousand triples: zero missed. What remains is the width law: random corruption slips past with probability one in two to the w: and this page makes that law visible by shrinking w until misses appear: C R C eight missed two hundred two of sixty thousand: about one in two ninety seven, against the law’s one in two fifty six: C R C sixteen and thirty two missed none.',
  },
  {
    section: 'picture',
    text:
      'A warehouse tallies crates with two clerks. The lazy clerk adds up the weights. Swap two crates between trucks and his totals still balance: addition commutes, so order is invisible to him. The careful clerk feeds each manifest through a paper shredder with a very particular blade pattern, and keeps the confetti as the signature. Feed the same crates through in a different order and the confetti comes out different, because shredding does not commute. The C R C is the careful clerk. Long division’s remainder depends on where every bit sits, not just on which bits are present. Measured on this page: five hundred word swaps, and the sum checksum missed every single one while the C R C caught every single one. Five hundred to nothing, both ways.',
  },
  {
    section: 'run',
    text:
      'Here is the run, as the hardware sees it. A sixteen or thirty two bit register starts at zero. Each message bit shifts in from the right. Whenever the bit that falls off the top is a one, the generator’s tap pattern exclusive ors into the register: that single conditional is the entire long division. After the last bit, plus the width’s worth of zeros, the register holds the remainder: the C R C. Append it. The receiver runs the identical machine over message and tag together, and the register drains to exactly zero: the animation on this page shows the drain. Damage anywhere: a flipped bit, a burst, a swap: leaves a nonzero remainder, and the frame is rejected. In software the same loop runs a byte at a time from a two hundred fifty six entry table: this page implements both and proves them equal to zlib, bit for bit, on three hundred buffers.',
  },
  {
    section: 'signals',
    text:
      'The signals that this pair fits. First: the damage is random, not adversarial. Noise, cosmic rays, worn flash cells: C R C guarantees are guarantees against physics: against an intelligent attacker they are worthless, and knowing that boundary is part of knowing the tool. Second: bursts are the enemy. Real channels fail in runs: a fade, a scratch, a glitch: and the burst theorem is exactly the shape of that threat: total coverage up to the register width, exhausted on this page with zero escapes. Third: hardware sits on the path. The division machine costs a few gates per bit and runs at line rate: Ethernet does not have time for a software hash between frames, and it never needs one.',
  },
  {
    section: 'tradeoffs',
    text:
      'Now the rivals. The Fletcher checksum: and its zlib cousin Adler thirty two: keeps two running sums, the second one weighted by position, so the reorderings that blind a plain sum do change the tag. Pure addition, no shifts, very fast in software: the spiritual family of the T C P checksum. The cost: no burst theorem: its coverage is statistical where the C R C’s is algebraic, and it weakens on short frames. Reach for Fletcher on software only paths where multiply free speed matters more than provable burst coverage. Reed Solomon plays a different game entirely: spend two t redundant symbols and repair up to t symbol errors, rather than just detecting them: compact discs, Q R codes, RAID six, deep space probes: wherever there is no channel to ask for a retransmit, the fix must ride with the data, and detection alone is not enough.',
  },
  {
    section: 'tradeoffs',
    text:
      'The cryptographic road: S H A two fifty six, and with a key, H MAC. Collision resistance against adversaries: forging a valid tag without the key is computationally infeasible: the property the C R C structurally lacks. The cost is orders of magnitude more work per byte than a shift register, and no burst theorem at all: overkill where the only enemy is noise, mandatory the moment the enemy can think. The strategic split is clean: physics gets the C R C: malice gets keyed cryptography: repair gets Reed Solomon: and raw software speed gets Fletcher. Four tools, four threat models, no overlap worth arguing about.',
  },
  {
    section: 'tradeoffs',
    text:
      'And the negative example, which has a name: WEP. Wi-Fi’s first security protocol used C R C thirty two as its integrity check inside the encryption: and because the C R C is linear: the C R C of a exclusive or b equals the exclusive or of their C R Cs, up to a constant: an attacker who flips chosen payload bits can compute exactly which tag bits to flip so the frame still verifies. No key needed, no plaintext needed: pencil and paper. The property that makes the C R C magnificent against noise: predictable, fully analyzable algebra: is precisely what makes it worthless against intent, because noise cannot solve linear equations and adversaries can. A remainder is a receipt for physics. It is never a signature.',
  },
  {
    section: 'code',
    text:
      'The code on this page is the whole kit. The bit serial C R C thirty two: the shift register spelled as a loop. The table driven form: the same division, a byte at a time. C R C sixteen and C R C eight with their published check values. The Fletcher style counterpoints: sum and exclusive or checksums. And the referee stack: three hundred buffers against zlib bit for bit: four hundred forty three thousand bursts exhausted with zero escapes: one hundred eighty one thousand small error patterns, all caught: the width law measured across three widths: five hundred word swaps that blind the sum and never the C R C: and twelve hundred framed link frames with every damaged one rejected. When it prints O K, the theorems have not just been cited. They have been run.',
  },
];
