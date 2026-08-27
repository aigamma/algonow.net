import ShamirViz from '../viz/ShamirViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/shamir_secret_sharing.py?raw';
import { narration } from './shamir-secret-sharing.narration.js';

export const content = {
  given:
    'One key that must not die with one person and must not leak through one traitor: root credentials, recovery seeds, launch codes, escrow.',
  task: 'Split it n ways so any k shares reconstruct it exactly: and any k−1 shares reveal, provably and measurably, nothing at all.',
  constraint:
    'Both halves are exhausted: 3,235 quorum subsets across 300 splits all reconstruct exactly; and in a 257-element field, given k−1 shares, every one of the 257 candidate secrets is consistent with exactly one polynomial: a perfectly flat table, asserted flat: zero information, not epsilon information.',

  origins: (
    <p>
      Adi Shamir, <strong>1979</strong>, two pages in CACM: hide
      the secret as the constant term of a random polynomial, hand
      out points on the curve. Blakley published a geometric
      version the same year independently; Shamir&apos;s algebraic
      form won on elegance and on <em>perfect</em> secrecy. The
      scheme quietly runs the modern world&apos;s worst-case
      plans: HSM quorums, certificate authority key ceremonies,
      cryptocurrency custody (k-of-n signers), Vault&apos;s unseal
      keys: and its mathematical kinship with Reed-Solomon codes
      (shares <em>are</em> codeword symbols) is what this
      page&apos;s healing oracle measures: redundancy against
      loss and secrecy against theft are the same polynomial,
      read two ways.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>split and the field</strong>: work in
      GF(p) (here 2¹²⁷−1, a Mersenne prime), draw k−1 random
      coefficients, set f(0) = secret, deal share i as (i, f(i)).
      Reconstruction is Lagrange interpolation evaluated at zero:
      exact integer arithmetic, no approximation anywhere:{' '}
      <strong>3,235 quorum subsets, zero failures</strong>,
      including every one of the ten 3-of-5 escrow quorums
      round-tripping a 127-bit key.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>threshold geometry</strong>: k points
      determine a degree-(k−1) polynomial uniquely, so k shares
      walk straight back to f(0): while through any k−1 shares{' '}
      <em>and any candidate secret whatsoever</em> passes exactly
      one polynomial: every secret equally consistent, which this
      page proves by enumeration (the flat table, asserted flat at
      one). The cliff is vertical and measured: guessing with k−1
      shares succeeds at the field&apos;s floor (76 of 20,000 ≈
      1/257): with k shares, always: <strong>no gradual leak
      exists to find</strong>.
    </p>
  ),

  picture: (
    <p>
      A parabola is pinned by three points, and no fewer. Put the
      vault code where the parabola crosses the y-axis, and give
      five trustees one point each on the curve. Any three
      trustees lay their points down, trace the one parabola
      through them, and read the crossing. Two trustees, alone or
      colluding, hold two points: and through two points pass{' '}
      <em>parabolas crossing the axis at every possible value</em>:
      one candidate curve per candidate code, each fitting their
      evidence perfectly. Their knowledge is a lineup where every
      suspect matches the description. That is not
      &quot;hard to crack&quot;: there is nothing to crack: the
      information is not there.
    </p>
  ),

  steps: [
    <>
      <strong>Choose the field:</strong> a prime larger than the
      secret (2¹²⁷−1 here): all arithmetic exact, mod p.
    </>,
    <>
      <strong>Hide at zero:</strong> f(0) = secret; k−1 random
      coefficients complete a degree-(k−1) polynomial.
    </>,
    <>
      <strong>Deal points:</strong> share i is (i, f(i)): n
      shares, any k of which suffice.
    </>,
    <>
      <strong>Reconstruct by Lagrange:</strong> interpolate the
      quorum at x = 0: exact: 3,235 subsets verified.
    </>,
    <>
      <strong>Mind the silence:</strong> Lagrange has no error
      light: one corrupt share gives a wrong secret with zero
      warnings (300/300 measured): spend extra shares to heal
      (k+2, majority: 300/300 healed).
    </>,
  ],

  signals: [
    <>
      <strong>No single point of trust or failure:</strong> key
      escrow, recovery seeds, signing quorums: wherever
      &quot;one person&quot; is the vulnerability in both
      directions.
    </>,
    <>
      <strong>The guarantee must be unconditional:</strong>{' '}
      information-theoretic secrecy survives any computer,
      quantum included: nothing to brute-force because nothing is
      there.
    </>,
    <>
      <strong>Thresholds, not unanimity:</strong> k-of-n tolerates
      lost shares AND leaked shares simultaneously: n−k can burn,
      k−1 can betray, and the secret holds both ways.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>XOR splitting</strong>: n
      random pads XORing to the secret: perfect secrecy too, but
      strictly n-of-n: lose ONE share and the secret is gone
      forever: no threshold, no tolerance. Shamir is XOR
      splitting&apos;s idea: information spread so pieces are
      individually worthless: upgraded with a dial for k.
    </>
  ),

  strength: (
    <>
      <strong>Both halves of the promise, exhausted.</strong>{' '}
      Every quorum of every split reconstructing exactly (3,235
      subsets); perfect secrecy exhibited by full enumeration (the
      flat table: each of 257 candidate secrets consistent with
      exactly one polynomial); the 1/p guessing floor measured;
      the silent-poison weakness measured at 100% and its
      Reed-Solomon-style antidote measured healing 300 of 300;
      and the escrow client round-tripping through all ten
      quorums.
    </>
  ),
  weakness: (
    <>
      <strong>Integrity is not included, and operations are the
      real attack surface.</strong> Lagrange reconstructs{' '}
      <em>something</em> from any k values: a corrupted share
      yields a confidently wrong secret with no alarm (300/300
      measured): verifiable secret sharing (Feldman commitments)
      or error-correcting decoding (the k+2t Reed-Solomon view,
      demonstrated) exist precisely for this. The dealer is a
      single point of trust at split time. Shares are as secret
      as their storage. And the scheme protects a{' '}
      <em>static</em> secret: using the key still reassembles it
      in one place for one moment: threshold signatures (never
      reassembling at all) are the modern escalation.
    </>
  ),

  problem: 'Secret sharing',
  problemSlug: 'secret-sharing',
  rivals: [
    {
      name: 'Shamir × interpolation',
      isThisUnit: true,
      algoName: 'Shamir secret sharing',
      cost: 'O(k²) reconstruct',
      wins: (
        <>
          <strong>Perfect secrecy with a threshold dial</strong>:
          the flat table exhausted, every quorum exact: two pages
          in 1979, load-bearing ever since.
        </>
      ),
      costs: (
        <>
          No integrity (the silent poison, measured), a trusted
          dealer, and reassembly-to-use.
        </>
      ),
      when: 'The default for splitting any high-value static secret: seeds, unseal keys, ceremonies.',
    },
    {
      name: 'Blakley × hyperplanes',
      algoName: 'Blakley secret sharing',
      cost: 'k-dim geometry',
      wins: (
        <>
          The same-year independent invention: the secret is a
          point, shares are hyperplanes through it, k of them
          intersect in exactly it: geometrically vivid.
        </>
      ),
      costs: (
        <>
          Raw form is not perfect: each hyperplane shrinks the
          candidate space: and shares are k times larger:
          Shamir&apos;s algebra won for reasons.
        </>
      ),
      when: 'Historically and pedagogically: the geometric lens on the same threshold idea.',
    },
    {
      name: 'Reed-Solomon × erasures',
      algoName: 'Reed-Solomon',
      cost: '2t extra symbols',
      wins: (
        <>
          The same polynomial read as a code: shares are codeword
          symbols, lost shares are erasures, corrupt shares are
          errors: this page&apos;s k+2 healing oracle is RS
          decoding in miniature.
        </>
      ),
      costs: (
        <>
          Pure RS aims at reliability, not secrecy: systematic
          encodings leak data outright: the secrecy came from
          Shamir&apos;s random coefficients.
        </>
      ),
      when: 'When shares can be damaged, not just lost: robust reconstruction against t liars needs k+2t.',
    },
    {
      name: 'CRT splitting × residues',
      algoName: 'Chinese remainder theorem',
      cost: 'O(k) reconstruct',
      wins: (
        <>
          The other algebraic road (Asmuth-Bloom): shares are the
          secret&apos;s residues mod pairwise-coprime moduli: k
          residues rebuild it by CRT: no polynomial in sight.
        </>
      ),
      costs: (
        <>
          Only statistically secret unless the moduli are chosen
          with care: Shamir&apos;s flat table is cleaner to prove
          and to teach.
        </>
      ),
      when: 'Niche deployments where CRT machinery already exists: the same threshold, different algebra.',
    },
  ],
  neverUse: {
    name: 'Chopping the key into substrings',
    why: (
      <>
        The folk scheme: cut a 24-word seed phrase in half, give
        each half to a different relative: and it is the opposite
        of this page in every measurable way. Each fragment{' '}
        <em>is</em> information: a holder of half the words has
        cut the brute-force space from 256 bits to 128: from
        impossible to merely hard: and two colluding holders of a
        3-way chop hold two-thirds of the key outright. Compare
        the flat table: a Shamir shareholder&apos;s candidate
        space is <em>the entire field, uniformly</em>, no matter
        how many shares short of k conspire. The seduction is
        that chopping needs no math: the price is that its
        secrecy degrades linearly while Shamir&apos;s holds
        vertically until the threshold and then opens completely.
        Real custody guides warn against exactly this practice by
        name: the math is two pages, and the folk scheme loses to
        it everywhere.
      </>
    ),
  },

  contest: {
    instance:
      'split a 127-bit key 3-of-5; referee: exhaustive reconstruction over every quorum, and exhaustive polynomial enumeration for the secrecy claim',
    columns: ['learns', 'nature'],
    rows: [
      {
        method: 'Key chopping (k pieces)',
        values: ['a fraction each', 'linear leak'],
        verdict: 'every fragment shrinks the brute-force space: collusion compounds',
      },
      {
        method: 'k−1 Shamir shares',
        values: ['nothing, exactly', 'flat table'],
        verdict: 'each of 257 candidate secrets consistent with exactly one polynomial: asserted flat',
      },
      {
        method: 'k Shamir shares',
        isThisUnit: true,
        values: ['everything, exactly', 'Lagrange'],
        best: 0,
        verdict: 'all 3,235 quorum subsets reconstructed exactly: the cliff is vertical',
      },
    ],
    source:
      'python solutions/shamir_secret_sharing.py prints this table and asserts: 300 splits with every k-subset of shares (3,235 in all) reconstructing exactly over GF(2¹²⁷−1); perfect secrecy by exhaustion in GF(257) (given k−1 shares, each of the 257 candidate secrets consistent with exactly one polynomial: the counts asserted identical); the guessing floor measured at 76/20,000 ≈ 1/257 with k−1 shares and 40/40 with k; the silent poison (one corrupt share: wrong secret 300/300, zero warnings) and the k+2 majority antidote (healed 300/300); and all ten 3-of-5 escrow quorums round-tripping a 127-bit key.',
  },

  figure: (
    <Figure
      id="fig-shamir-parabola"
      aspect="16 / 7"
      caption="k points pin the polynomial; k−1 pin nothing. The secret lives at f(0) on a random degree-(k−1) polynomial; shares are points on the curve. Three shares trace the unique parabola home: every quorum, exactly. Two shares admit one perfectly-fitting parabola per candidate secret: the y-axis fills uniformly, and this page proves the uniformity by enumerating every polynomial in a 257-element field: a flat table, asserted flat. The cliff between k−1 and k is vertical: there is no gradual leak to exploit, and nothing to brute-force, because the information is not there."
      cite={{
        text: 'Shamir, "How to Share a Secret", Communications of the ACM 22(11), 1979: two pages that run every key ceremony since. Blakley\'s geometric version appeared independently the same year.',
        href: 'https://doi.org/10.1145/359168.359176',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A parabola through share points hitting the secret at x=0, beside a fan of candidate parabolas through two points">
        <line x1="60" y1="30" x2="60" y2="240" stroke="#9aa5bd" strokeWidth="1.2" />
        <line x1="40" y1="220" x2="300" y2="220" stroke="#9aa5bd" strokeWidth="1.2" />
        <path d="M 60 90 Q 150 200 290 130" fill="none" stroke="#5da2ff" strokeWidth="2" />
        {[[110, 163], [180, 178], [255, 146]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={6} fill="#f0b94b" />
        ))}
        <circle cx="60" cy="90" r="7" fill="#62d98a" />
        <text x="72" y="86" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">f(0): the secret</text>
        <text x="80" y="250" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">3 shares: one curve: home</text>
        <line x1="380" y1="30" x2="380" y2="240" stroke="#9aa5bd" strokeWidth="1.2" />
        {[50, 90, 130, 170, 210].map((y0, i) => (
          <path key={i} d={`M 380 ${y0} Q 470 ${230 - i * 8} 600 ${100 + i * 22}`} fill="none" stroke="rgba(226,96,108,0.5)" strokeWidth="1.4" />
        ))}
        {[[470, 172], [545, 138]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={6} fill="#f0b94b" />
        ))}
        {[50, 90, 130, 170, 210].map((y0, i) => (
          <circle key={i} cx={380} cy={y0} r={4} fill="#e2606c" />
        ))}
        <text x="390" y="250" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">2 shares: every secret fits</text>
        <text x="40" y="278" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">measured: 3,235 quorums exact · the flat table exhausted · guessing floor 1/257 · poison 300/300, healed 300/300</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'shamir_secret_sharing.py',
  Viz: ShamirViz,
  narration,
};
