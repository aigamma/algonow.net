import ReedSolomonViz from '../viz/ReedSolomonViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/reed_solomon_berlekamp_massey.py?raw';
import { narration } from './reed-solomon-berlekamp-massey.narration.js';

export const content = {
  given:
    'A message of 223 bytes to send through a channel that scratches, bursts, and flips bits in clumps: a CD groove, a deep-space link, a QR code with a coffee stain. No retransmission.',
  task: 'Treat the bytes as a polynomial over GF(256) and multiply it by a generator with 32 consecutive roots, so any 16 corrupted bytes, wherever they land and whatever they became, can be found and repaired from the 32 syndromes.',
  constraint:
    'Every decode is checked against the truth: 48 random codewords with 0 to 16 random byte errors all recover the exact message with the located positions equal to the injected ones; an independent decoder (Peterson-Gorenstein-Zierler, Gaussian elimination over the field) agrees with Berlekamp-Massey on the error locator in all 48; 17 errors are never silently accepted (40 failures, 0 miscorrections); bursts of 16 bytes with every bit flipped (128 bit errors) are corrected 12/12 and bursts of 17 rejected 12/12.',

  origins: (
    <p>
      Irving Reed and Gustave Solomon, <strong>1960</strong>, in a
      five-page paper (Polynomial Codes over Certain Finite Fields,
      Journal of the SIAM) that had no practical decoder for eight
      years. Elwin Berlekamp&apos;s 1968 book supplied one, and James
      Massey showed in 1969 that Berlekamp&apos;s iteration was
      exactly the synthesis of the shortest linear-feedback shift
      register generating the syndrome sequence: the form on this
      page. Chien&apos;s search (1964) and Forney&apos;s formula
      (1965) complete the chain. The code then went everywhere
      bursts live: the compact disc (1982, cross-interleaved),
      DVDs, QR codes, DSL, RAID-6, and the CCSDS deep-space standard
      RS(255, 223) that this page runs, the code that brought back
      Voyager&apos;s pictures and every Mars image since.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>algebra of the code</strong>. Symbols are
      elements of GF(256); the 223 message bytes are polynomial
      coefficients; the codeword is the message shifted and
      completed with the remainder modulo a generator whose 32 roots
      are α⁰ through α³¹, so every clean codeword evaluates to zero
      at all of them. The receiver evaluates the received word at
      the same 32 points: the syndromes. Zero syndromes, no errors;
      otherwise the syndromes depend only on the errors, not the
      message, and 32 equations can pin down 16 unknown positions
      and 16 unknown values. Measured: <strong>48 of 48</strong>{' '}
      exact recoveries with 0 to 16 errors, every located position
      equal to the injected one.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>shortest-recurrence trick</strong>. The
      syndromes S₀…S₃₁ satisfy a linear recurrence whose connection
      polynomial has a root at the inverse of every error position;
      Berlekamp-Massey synthesizes the shortest such recurrence in
      one pass, correcting each discrepancy with the previous
      correction and lengthening the register only when it must:
      O(t²) field operations, <strong>258 multiplications</strong>{' '}
      per locator here. The independent referee, PGZ, solves the
      syndrome system by Gaussian elimination, retrying at each
      smaller error count while the system is singular: 8,322
      multiplications, the same locator in all 48 trials. Chien
      search finds the roots by trying every position, Forney reads
      the values, and the 17th error is refused (40/40), never
      guessed.
    </p>
  ),

  picture: (
    <p>
      A library ships a 223-volume encyclopedia by unreliable
      courier, and instead of insuring each volume it adds 32
      volumes of cross-sums: not copies, but combinations of every
      volume evaluated 32 different ways. When the crates arrive
      scuffed, the receiving librarian recomputes the 32 sums from
      what came. If all 32 match, nothing was damaged. If not, the
      mismatches are a fingerprint of the damage alone: which
      volumes, and by how much. The trick of this page is reading
      the fingerprint: the 32 mismatches obey a hidden pattern, a
      recurrence that each mismatch predicts from the previous
      ones, and the shortest rule that explains all 32 has its
      roots at the damaged volumes. Sixteen volumes can be named
      and restored from 32 sums; a seventeenth breaks the pattern,
      and the librarian says so instead of guessing.
    </p>
  ),

  steps: [
    <>
      <strong>Encode:</strong> message × x³² modulo the generator;
      the remainder is 32 parity bytes, and every clean codeword has
      roots at α⁰…α³¹.
    </>,
    <>
      <strong>Syndromes:</strong> evaluate the received word at the
      32 roots; all zero means clean.
    </>,
    <>
      <strong>Berlekamp-Massey:</strong> the shortest LFSR
      generating the syndromes; its length is the error count, its
      polynomial the locator.
    </>,
    <>
      <strong>Chien and Forney:</strong> try every position for a
      root; at each root, the error value from the evaluator
      polynomial.
    </>,
    <>
      <strong>Repair and re-check:</strong> subtract the values,
      recompute the syndromes: zero, or refuse (40/40 at 17 errors).
    </>,
  ],

  signals: [
    <>
      <strong>Bursts, not scattered bits:</strong> a byte with one
      flipped bit and a byte with eight cost the same symbol; 128
      consecutive bit errors were corrected here.
    </>,
    <>
      <strong>No retransmission:</strong> storage media, broadcast,
      deep space: the decoder must fix or refuse on its own, and
      this one refused 40/40 past the bound.
    </>,
    <>
      <strong>Rate you can dial:</strong> 2t parity symbols buy t
      corrections, exactly; RS(255, 223) spends 12.5% for 16.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>Peterson-Gorenstein-Zierler</strong>:
      write the syndromes as a linear system in the locator
      coefficients and solve it by Gaussian elimination, trying
      t, then t − 1, and so on until the system is nonsingular. It
      is the referee on this page and it agrees with
      Berlekamp-Massey 48 times out of 48, at 8,322 multiplications
      per locator against 258: O(t⁴) against O(t²), and the gap
      widens with every extra correctable symbol.
    </>
  ),

  strength: (
    <>
      <strong>Guaranteed correction of any t symbol errors, with
      the guarantee measured from both sides.</strong> Every trial
      inside the bound recovered the exact message and the exact
      positions; every trial past it was refused, never miscorrected;
      128-bit bursts were repaired because bytes, not bits, are the
      unit; and the locator costs 258 field multiplications where
      the textbook linear-algebra route costs 8,322.
    </>
  ),
  weakness: (
    <>
      <strong>Hard decisions, a hard wall, and byte-sized
      blindness.</strong> Bounded-distance decoding sees only 2t
      syndromes: the 17th error is a refusal, not a graceful
      degradation, and soft channel information (how confident each
      bit was) is thrown away, which is where LDPC and turbo codes
      win their extra decibels. A single flipped bit costs a whole
      symbol of the budget. And the finite-field arithmetic is
      table-driven and fiddly: the sign conventions of the Forney
      factor alone have sunk many implementations, which is why the
      self-test recomputes the syndromes after every repair.
    </>
  ),

  problem: 'Error-correcting codes',
  problemSlug: 'error-correcting-codes',
  rivals: [
    {
      name: 'Reed-Solomon × Berlekamp-Massey',
      isThisUnit: true,
      algoName: 'Reed-Solomon',
      cost: 'O(t²) locator, O(n t) decode',
      wins: (
        <>
          <strong>Bursts and guarantees</strong>: 48/48 exact, 128-bit
          bursts repaired, 17 errors refused 40/40, 258
          multiplications per locator.
        </>
      ),
      costs: (
        <>
          Hard-decision only, a cliff at t + 1, and one flipped bit
          spends a whole symbol.
        </>
      ),
      when: 'Storage and broadcast where damage comes in clumps and nobody can ask for a resend.',
    },
    {
      name: 'Hamming code',
      cost: 'one bit per block',
      wins: (
        <>
          The 1950 original: r parity bits protect 2ʳ − r − 1 data
          bits and the syndrome is the error&apos;s address in
          binary; ECC memory still runs a variant.
        </>
      ),
      costs: (
        <>
          One bit per block: the 128-bit burst this page repairs
          would need 128 separate blocks to survive it.
        </>
      ),
      when: 'Memory and buses where errors are single, independent bit flips.',
    },
    {
      name: 'LDPC codes',
      cost: 'iterative, soft-decision',
      wins: (
        <>
          Belief propagation on a sparse parity-check graph uses the
          confidence of every bit and approaches the Shannon limit:
          Wi-Fi, 5G, and modern storage run it.
        </>
      ),
      costs: (
        <>
          No guarantee for a given error count, an iterative decoder
          with an error floor, and no natural burst handling without
          interleaving.
        </>
      ),
      when: 'Noisy channels with soft information and a decibel to win, when average performance beats a hard promise.',
    },
    {
      name: 'CRC',
      cost: 'detect only',
      wins: (
        <>
          The live unit here: a 32-bit remainder that catches every
          burst up to 32 bits and almost everything else, at almost
          no cost.
        </>
      ),
      costs: (
        <>
          It says corrupt, never where or what: useless without a
          retransmission path.
        </>
      ),
      when: 'Links with acknowledgments, where detection plus resend is cheaper than correction.',
    },
  ],
  neverUse: {
    name: 'Searching error patterns until the syndromes vanish',
    why: (
      <>
        The syndromes are a fingerprint of the errors, so the
        tempting decoder is to guess: try every set of up to 16
        positions with every combination of values and keep the
        first that zeroes the syndromes. The count is the sum over e
        of C(255, e) · 255ᵉ, which this page evaluates to{' '}
        <strong>3.02 × 10⁶³ candidates</strong>. Not slow: never.
        Berlekamp-Massey turns the same 32 syndromes into the
        locator in 258 multiplications by treating them as a
        sequence with a hidden recurrence rather than a lock to be
        picked. When the algebra hands you the structure, the
        search is not a fallback; it is a failure to read.
      </>
    ),
  },

  contest: {
    instance:
      'RS(255, 223) over GF(256), t = 16: 48 random codewords with 0 to 16 random byte errors, 40 with 17, 24 with bursts; currency: field multiplications to find the error locator; referees: exact recovery, the injected positions, an independent PGZ decoder',
    columns: ['mults per locator', 'agreement'],
    rows: [
      {
        method: 'Berlekamp-Massey (shortest LFSR)',
        isThisUnit: true,
        values: ['258', '48/48'],
        best: 0,
        verdict: 'O(t²): each syndrome checked once, one discrepancy fix per step',
      },
      {
        method: 'Peterson-Gorenstein-Zierler',
        values: ['8,322', '48/48'],
        verdict: 'O(t⁴): Gaussian elimination retried at each smaller error count while singular',
      },
      {
        method: 'Brute force over error patterns',
        values: ['3.02 × 10⁶³', '-'],
        verdict: 'the sum over e of C(255, e) · 255ᵉ candidates: never',
      },
    ],
    source:
      'python solutions/reed_solomon_berlekamp_massey.py prints this table and asserts: the generator’s 32 roots are α⁰…α³¹; 48/48 exact recoveries with every located position equal to the injected one; Berlekamp-Massey and PGZ agree on the locator polynomial 48/48; 17 errors are never accepted as the original (40 decoding failures, 0 miscorrections); 12/12 bursts of 16 bytes with every bit flipped corrected and 12/12 bursts of 17 rejected; and BM costing under a third of PGZ’s multiplications.',
  },

  figure: (
    <Figure
      id="fig-reed-solomon-chain"
      aspect="16 / 7"
      caption="The decoding chain. A codeword with 32 parity bytes is hit by up to 16 byte errors; evaluating it at the generator’s 32 roots gives the syndromes, which depend on the errors alone. Berlekamp-Massey finds the shortest linear recurrence generating the syndrome sequence; its connection polynomial is the error locator, of degree equal to the error count. Chien search tries every position for a root; Forney’s formula reads each error value; the repaired word has zero syndromes. Measured: 48/48 exact recoveries, PGZ agreeing 48/48 at 8,322 multiplications against 258, 17 errors refused 40/40, 128-bit bursts repaired 12/12."
      cite={{
        text: 'I. S. Reed, G. Solomon, "Polynomial codes over certain finite fields," J. SIAM 8(2), 1960, DOI 10.1137/0108018; J. L. Massey, "Shift-register synthesis and BCH decoding," IEEE Trans. Inf. Theory 15(1), 1969, DOI 10.1109/TIT.1969.1054260.',
        href: 'https://doi.org/10.1109/TIT.1969.1054260',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A codeword row with corrupted symbols, an arrow to the syndrome row, an arrow to the shortest shift register, and arrows to the located positions">
        {[...Array(20).keys()].map((i) => (
          <rect key={i} x={30 + i * 29} y={40} width={25} height={22} rx="4" fill={[4, 11, 15].includes(i) ? 'rgba(226,96,108,0.35)' : i < 14 ? 'rgba(93,162,255,0.14)' : 'rgba(240,185,75,0.16)'} stroke={[4, 11, 15].includes(i) ? '#e2606c' : i < 14 ? '#5da2ff' : '#f0b94b'} strokeWidth="1.3" />
        ))}
        <text x="30" y="30" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">received word: 223 message bytes (blue) + 32 parity bytes (amber), 3 corrupted (red)</text>
        <path d="M 320 70 L 320 92" stroke="#9aa5bd" strokeWidth="1.4" />
        <text x="30" y="112" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">syndromes Sⱼ = r(αʲ), j = 0 … 31: nonzero, and a function of the errors alone</text>
        <path d="M 320 122 L 320 144" stroke="#9aa5bd" strokeWidth="1.4" />
        <rect x="120" y="150" width="400" height="34" rx="8" fill="rgba(240,185,75,0.12)" stroke="#f0b94b" strokeWidth="1.6" />
        <text x="132" y="172" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">Berlekamp-Massey: shortest LFSR generating S → Λ(x), degree = error count (258 mults)</text>
        <path d="M 320 190 L 320 212" stroke="#9aa5bd" strokeWidth="1.4" />
        <text x="30" y="232" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="11">Chien: Λ(α⁻ⁱ) = 0 at the 3 corrupted positions · Forney: the error values · repaired word: syndromes all zero</text>
        <text x="30" y="262" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">measured: 48/48 exact (positions matched) · PGZ agrees 48/48 at 8,322 mults · 17 errors refused 40/40 · 128-bit bursts fixed 12/12</text>
        <text x="30" y="282" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">guessing error patterns instead: 3.02 × 10⁶³ candidates</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'reed_solomon_berlekamp_massey.py',
  Viz: ReedSolomonViz,
  narration,
};
