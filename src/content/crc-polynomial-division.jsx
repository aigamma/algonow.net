import CRCViz from '../viz/CRCViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/crc_polynomial_division.py?raw';
import { narration } from './crc-polynomial-division.narration.js';

export const content = {
  given:
    'Bytes crossing a wire, a disk, a radio link: and the certainty that some of them will arrive wrong.',
  task: 'Detect the damage: append a 32-bit remainder from polynomial division, re-divide on arrival, and reject anything with a nonzero remainder.',
  constraint:
    "The referee is zlib's own C implementation (binascii.crc32): the bit-serial and table-driven forms here must match it bit-for-bit on 300 buffers, and the 16- and 8-bit variants must hit their published check values (0x29B1, 0xF4). Every detection claim is then exhausted or sampled to zero misses.",

  origins: (
    <p>
      W. Wesley Peterson and D. T. Brown, <strong>1961</strong>:
      treat a message as a polynomial over GF(2), divide by a fixed
      generator, keep the remainder: and the algebra of that
      division decides, in advance, which error patterns are
      mathematically unable to hide. The scheme was born for
      hardware: the division loop is a shift register with XOR
      taps, one gate delay per bit: which is why CRCs live in
      Ethernet (whose CRC-32 polynomial, standardized in 1983,
      this page implements), ZIP, PNG, SATA, CAN, Bluetooth: nearly
      every frame your machines exchange ends in one of these
      remainders. Castagnoli&apos;s 1993 search found better
      polynomials (CRC-32C), and modern CPUs ship the instruction.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>frame discipline</strong>: sender divides the
      message (times x³²) by the generator and appends the 32-bit
      remainder; receiver divides the whole frame and accepts only
      remainder zero: verified here on 1,200 frames, 349 damaged
      ones all rejected. The loop is the hardware&apos;s: shift,
      and XOR the tap pattern whenever the popped bit is one: this
      page runs it bit-serial and table-driven, both{' '}
      <strong>equal to zlib bit-for-bit</strong> on 300 buffers.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>choice of divisor</strong>, which is the
      choice of what cannot hide. A degree-32 generator with a
      nonzero constant term detects <em>every</em> burst of 32 bits
      or fewer: exhausted here over 443,186 bursts, zero escapes.
      CRC-32&apos;s Hamming distance detects all 1-, 2-, and 3-bit
      errors at frame lengths to 91,607 bits: 512 singles, 130,816
      doubles, 50,000 triples, zero missed. What remains is the
      width law: random corruption slips past with probability
      2⁻ʷ: made visible by shrinking w: CRC-8 missed 202 of
      60,000, CRC-16 and CRC-32 none.
    </p>
  ),

  picture: (
    <p>
      A warehouse tallies crates with two clerks. The lazy clerk
      adds up the weights: swap two crates between trucks and the
      totals still balance: addition commutes, so order is
      invisible to it. The careful clerk runs each manifest through
      a paper shredder with a very particular blade pattern and
      keeps the confetti signature: feed the same crates in a
      different order and the confetti comes out different, because
      shredding does not commute. CRC is the careful clerk: long
      division&apos;s remainder depends on where every bit sits,
      not just which bits are present: measured here as 500 of 500
      word swaps caught while the sum checksum missed all 500.
    </p>
  ),

  steps: [
    <>
      <strong>Divide:</strong> the message as a GF(2) polynomial,
      times x³², divided by the generator: a shift register with
      XOR taps, one step per bit.
    </>,
    <>
      <strong>Append:</strong> the 32-bit remainder rides behind the
      message: the frame.
    </>,
    <>
      <strong>Re-divide on arrival:</strong> the framed message
      divides to remainder zero: anything else is damage: reject.
    </>,
    <>
      <strong>Know what cannot hide:</strong> all bursts ≤ 32 bits
      (exhausted), all 1-, 2-, 3-bit errors at these lengths
      (exhausted), by the generator&apos;s algebra.
    </>,
    <>
      <strong>Price the residue:</strong> random corruption escapes
      with probability 2⁻³²: the width law, measured across w = 8,
      16, 32.
    </>,
  ],

  signals: [
    <>
      <strong>Random damage, not adversaries:</strong> noise,
      cosmic rays, worn flash: CRC&apos;s guarantees are against
      physics: an adversary forges CRCs by linear algebra.
    </>,
    <>
      <strong>Bursts are the enemy:</strong> real channels fail in
      runs (fades, scratches): the burst theorem is exactly the
      shape of the threat, and it is total up to the width.
    </>,
    <>
      <strong>Hardware on the path:</strong> the LFSR costs a few
      gates per bit: line-rate framing (Ethernet, CAN, SATA) wants
      the division machine, not a software hash.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>additive checksum</strong>:
      sum the bytes, ship the total: one add per byte, and blind by
      algebra to anything that preserves the multiset: 500 of 500
      word swaps missed here, forever, because addition commutes.
      The XOR checksum is the same blindness in cheaper clothes.
      They still catch simple value changes: which is why they
      linger in old protocols: and nothing more.
    </>
  ),

  strength: (
    <>
      <strong>Guarantees you can exhaust, against the strongest
      referee available.</strong> Two independent implementations
      equal to zlib&apos;s C code on 300 buffers; published check
      values hit for three widths; 443,186 bursts and 131,328
      small-error patterns tested with zero escapes; the 2⁻ʷ law
      measured (202 misses at w = 8, none at 32); and the
      commutativity trap shown 500-for-500 against the sum
      checksum. The claims are theorems, and the theorems were run.
    </>
  ),
  weakness: (
    <>
      <strong>Detection only, physics only, width only.</strong> A
      CRC locates nothing and repairs nothing: one flipped bit
      forces a full retransmit (Reed-Solomon buys repair with more
      redundancy). Its guarantees stop at the width: bursts past 32
      bits and random garbage escape at 2⁻³²: rare, not never. And
      it is linear: an adversary can adjust any forged message to
      carry a valid CRC with pencil and paper: WEP&apos;s designers
      used CRC-32 as an integrity check, and attackers flipped
      payload bits and fixed the CRC to match: authentication
      needs keyed cryptography, never remainders.
    </>
  ),

  problem: 'Error detection',
  problemSlug: 'error-detection',
  rivals: [
    {
      name: 'CRC × polynomial division',
      isThisUnit: true,
      algoName: 'CRC',
      cost: 'O(n), gates in hardware',
      wins: (
        <>
          <strong>Provable coverage</strong>: every burst ≤ w, all
          small errors at real frame lengths: exhausted here, zero
          escapes: at shift-register cost.
        </>
      ),
      costs: (
        <>
          Detects, never corrects: and linear, so worthless against
          an adversary.
        </>
      ),
      when: 'The default integrity tag on any link or format where damage is physics, not malice.',
    },
    {
      name: 'Fletcher × positional sums',
      algoName: 'Fletcher checksum',
      cost: 'O(n), adds only',
      wins: (
        <>
          Two running sums, the second weighting position: catches
          the reorderings that blind a plain sum, at pure-addition
          speed: TCP/UDP&apos;s spiritual family, Adler-32 in zlib.
        </>
      ),
      costs: (
        <>
          No burst theorem: coverage is statistical where
          CRC&apos;s is algebraic: weaker on short frames.
        </>
      ),
      when: 'Software-only paths where multiply-free speed beats provable burst coverage.',
    },
    {
      name: 'Reed-Solomon × correction',
      algoName: 'Reed-Solomon',
      cost: 'O(n log n)-ish, 2t symbols',
      wins: (
        <>
          Spend 2t redundant symbols and <em>repair</em> t symbol
          errors instead of just detecting: CDs, QR codes, RAID-6,
          deep space: no retransmit channel needed.
        </>
      ),
      costs: (
        <>
          Real decoder machinery (syndromes, Berlekamp-Massey)
          against CRC&apos;s handful of gates.
        </>
      ),
      when: 'No way to ask again: storage and broadcast, where the fix must ride with the data.',
    },
    {
      name: 'SHA-256 × keyed HMAC',
      algoName: 'SHA-256',
      cost: 'O(n), heavy per byte',
      wins: (
        <>
          Collision resistance against <em>adversaries</em>: with a
          key (HMAC), forging a valid tag is computationally
          infeasible: the property CRC structurally lacks.
        </>
      ),
      costs: (
        <>
          Orders of magnitude past an LFSR, and no burst theorem:
          overkill where damage is only noise.
        </>
      ),
      when: 'Integrity against tampering: signatures, tokens, downloads: whenever an attacker exists.',
    },
  ],
  neverUse: {
    name: 'CRC as message authentication',
    why: (
      <>
        The catastrophe has a name: WEP. Wi-Fi&apos;s first
        security protocol used CRC-32 as its integrity check
        inside encryption, and because CRC is <em>linear</em>:
        crc(a⊕b) = crc(a)⊕crc(b)⊕c: an attacker who flips payload
        bits can compute exactly which CRC bits to flip so the
        frame still verifies, without knowing the key or the
        plaintext. The property that makes CRC great against noise
        (predictable, analyzable algebra) is precisely what makes
        it worthless against intent: noise cannot solve linear
        equations, adversaries can. Authentication requires a
        keyed, nonlinear construction (HMAC, AEAD modes): a
        remainder is a receipt for physics, never a signature.
      </>
    ),
  },

  contest: {
    instance:
      "error detection on a byte stream; referee: zlib's binascii.crc32 matched bit-for-bit by both implementations on 300 buffers, plus published check values for CRC-16 (0x29B1) and CRC-8 (0xF4)",
    columns: ['swap misses', 'random misses'],
    rows: [
      {
        method: 'Sum checksum',
        values: ['500/500', 'n/a'],
        verdict: 'addition commutes: reordering is invisible, forever',
      },
      {
        method: 'CRC-8',
        values: ['0/500', '202/60,000'],
        verdict: 'the 2⁻⁸ law: about 1 in 256 random corruptions slips through',
      },
      {
        method: 'CRC-32',
        isThisUnit: true,
        values: ['0/500', '0/60,000'],
        best: 0,
        verdict: 'all bursts ≤ 32 and all 1-2-3-bit errors: exhausted, zero escapes',
      },
    ],
    source:
      'python solutions/crc_polynomial_division.py prints this table and asserts: bit-serial and table-driven CRC-32 equal to binascii.crc32 on 300 buffers including the empty one; CRC-16/CCITT and CRC-8 hitting their published check values; the burst theorem exhausted over 443,186 bursts (every position and endpoint-anchored pattern to 12 bits, 100,000 sampled to 32) with zero escapes; all 512 single-bit and 130,816 double-bit flips plus 50,000 triples detected on a 512-bit message; the width law measured (CRC-8 misses within the 2⁻⁸ band, CRC-16 ≤ 6, CRC-32 exactly 0 of 60,000); the sum and XOR checksums missing all 500 word swaps while CRC catches all 500; and 1,200 framed-link frames with every damaged frame rejected and every clean frame accepted.',
  },

  figure: (
    <Figure
      id="fig-crc-lfsr"
      aspect="16 / 7"
      caption="The division machine. The message streams through a shift register; whenever the popped bit is one, the generator's tap pattern XORs in: that is long division over GF(2), one gate delay per bit, which is why every serious link protocol runs it in silicon. The remainder left behind is the CRC; the receiver divides the whole frame and accepts only remainder zero. The generator decides what cannot hide: every burst up to the register width (exhausted here: 443,186 bursts, zero escapes), all 1-, 2-, 3-bit errors at real frame lengths, and random garbage at 2⁻ʷ: a law this page measures by shrinking w until misses appear."
      cite={{
        text: 'Peterson & Brown, "Cyclic Codes for Error Detection", Proceedings of the IRE 49(1), 1961: the paper that turned long division into the integrity tag on nearly every frame since.',
        href: 'https://doi.org/10.1109/JRPROC.1961.287814',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A shift register with XOR taps: message bits enter, the remainder stays, damaged frames divide to nonzero">
        {[...Array(12)].map((_, i) => (
          <rect key={i} x={60 + i * 42} y={70} width={36} height={34} fill={[2, 7, 11].includes(i) ? 'rgba(240,185,75,0.3)' : 'rgba(93,162,255,0.18)'} stroke={[2, 7, 11].includes(i) ? '#f0b94b' : '#5da2ff'} strokeWidth="1.5" />
        ))}
        {[2, 7, 11].map((i) => (
          <text key={i} x={70 + i * 42} y={126} fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="13">⊕</text>
        ))}
        <text x="60" y="52" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="11">the shift register: one step per message bit</text>
        <text x="60" y="148" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">amber taps: the generator polynomial: the choice of what cannot hide</text>
        <path d="M 30 87 L 56 87" stroke="#9aa5bd" strokeWidth="1.6" />
        <text x="8" y="91" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">bits</text>
        <text x="60" y="190" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">receiver: divide message + CRC: remainder 0 = accept (1,200 frames: all clean accepted, all 349 damaged rejected)</text>
        <text x="60" y="214" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">the sum checksum missed 500/500 word swaps: addition commutes, division does not</text>
        <text x="60" y="252" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">measured: bursts ≤ 32 bits: 0/443,186 escaped · 1-2-3-bit errors: 0/181,328 · random: 2⁻ʷ (202 misses at w=8, 0 at w=32)</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'crc_polynomial_division.py',
  Viz: CRCViz,
  narration,
};
