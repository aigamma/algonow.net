// The spoken lesson for puzzle ninety five, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle ninety five: Shamir secret sharing, paired with polynomial interpolation, for threshold secret splitting. Here is the puzzle. One key that must not die with one person, and must not leak through one traitor: root credentials, a recovery seed, the master key of a certificate authority. Split it into n shares so that any k of them reconstruct it exactly: and any k minus one of them reveal nothing at all. And nothing must mean NOTHING: not hard to guess, not expensive to crack: mathematically absent. This page measures both halves of that promise to the integer. Three hundred splits, and every single k sized subset of shares: three thousand two hundred thirty five of them: reconstructs exactly. And in a small field where exhaustion is possible, the page enumerates every polynomial consistent with an attacker’s k minus one shares, and counts, for each of the two hundred fifty seven possible secrets, exactly how many fit: the table comes out perfectly flat: every secret exactly as likely as every other: zero information, exhibited rather than asserted.',
  },
  {
    section: 'origins',
    text:
      'Adi Shamir, nineteen seventy nine, in the Communications of the A C M: two pages, titled How to Share a Secret. Hide the secret as the constant term of a random polynomial: hand out points on the curve: done. George Blakley published a geometric version the same year, independently: secrets as points, shares as hyperplanes: but Shamir’s algebraic form won on elegance, share size, and perfect secrecy. The scheme now quietly runs the world’s worst case plans: hardware security module quorums, certificate authority key ceremonies where officers each carry a share, cryptocurrency custody, HashiCorp Vault’s unseal keys. And it hides a beautiful kinship this page measures directly: Shamir shares ARE Reed Solomon codeword symbols: redundancy against loss and secrecy against theft turn out to be the same polynomial, read two different ways.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the split and the field. Work modulo a large prime: this page uses two to the one twenty seventh minus one, a Mersenne prime: draw k minus one random coefficients, set the polynomial’s value at zero to the secret, and deal share i as the point i comma f of i. Reconstruction is Lagrange interpolation evaluated at zero: exact integer arithmetic, no approximation anywhere in the scheme. The heuristic is the threshold geometry of interpolation itself: k points determine a degree k minus one polynomial uniquely: so k shares walk straight back to f of zero: while through any k minus one shares AND any candidate secret whatsoever passes exactly one polynomial: so every candidate remains exactly equally consistent. The cliff between k minus one and k is vertical. This page measures both faces of it: guessing with k minus one shares succeeded seventy six times in twenty thousand: the field’s one in two fifty seven floor: and with k shares, always.',
  },
  {
    section: 'picture',
    text:
      'A parabola is pinned by three points, and by no fewer. Put the vault code where the parabola crosses the y axis, and give five trustees one point each on the curve. Any three trustees lay their points on the table, trace the single parabola that passes through all three, and read off the crossing: the code, exactly. Now watch two trustees try: alone or colluding, they hold two points: and through two points pass parabolas crossing the axis at every possible height: one candidate curve for every candidate code, each one fitting their evidence perfectly. Their combined knowledge is a police lineup in which every suspect matches the description. That is not security through difficulty. There is nothing to crack, no pattern to find, no shortcut waiting: the information is simply not present in what they hold. Add the third point, and the lineup collapses to one.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Choose the field: a prime bigger than any secret you will store. Hide at zero: constant term equals the secret: k minus one coefficients drawn fresh and random: this randomness is the secrecy, never reuse it. Deal the points. Reconstruct by Lagrange whenever any k holders convene: this page verified every quorum of every split, three thousand plus subsets, all exact, including all ten quorums of the three of five escrow client carrying a one hundred twenty seven bit key. And mind the silence: Lagrange interpolation has no error light. Feed it k values and it returns A secret, confidently, whether or not the shares were honest: one corrupted share gave a wrong answer three hundred times out of three hundred, with zero warnings. The antidote is the Reed Solomon kinship: deal k plus two shares, reconstruct from every subset, take the majority: healed, three hundred out of three hundred. Integrity is purchased with redundancy: it is never included for free.',
  },
  {
    section: 'signals',
    text:
      'The signals that this pair fits. First: no single point of trust or failure is acceptable: key escrow, recovery seeds, signing quorums: anywhere the sentence one person could is the vulnerability, in either direction: one person could lose it, one person could leak it. Second: the guarantee must be unconditional. Shamir’s secrecy is information theoretic: it survives any amount of compute, quantum computers included, because there is nothing to compute toward: when the stakes justify it, this is the strongest species of promise cryptography offers. Third: thresholds, not unanimity. The k of n dial tolerates loss and betrayal simultaneously: n minus k shares can burn in a fire while k minus one sit in an adversary’s hands, and the secret is still both recoverable and unknown. Few mechanisms buy resilience in both directions at once: this one does it with high school algebra.',
  },
  {
    section: 'tradeoffs',
    text:
      'Now the rivals. Blakley’s scheme, the same year, independently: the secret is a point in k dimensional space, each share is a hyperplane passing through it, and k hyperplanes intersect in exactly the point. Geometrically vivid, historically important: but the raw form is not perfectly secret: each hyperplane genuinely shrinks the candidate space: and shares are k times larger than the secret. Shamir’s algebra won for reasons you can measure. X O R splitting is the humble cousin: n minus one random pads and one remainder, X O R ing to the secret: perfectly secret, trivially simple, and strictly all or nothing: lose one share and the secret is gone forever. It is the right tool for two of two escrow: and the moment you want tolerance for loss, the threshold dial is exactly what it lacks, and Shamir is X O R splitting with that dial installed. One more algebraic cousin deserves naming: Chinese remainder splitting, the Asmuth Bloom scheme: shares are the secret’s residues modulo pairwise coprime numbers, and k residues rebuild it by the remainder theorem: the same threshold, different algebra, and only statistically secret unless the moduli are chosen with real care: Shamir’s flat table is the cleaner proof and the cleaner teaching.',
  },
  {
    section: 'tradeoffs',
    text:
      'Reed Solomon deserves its own beat, because it is not so much a rival as the same object in a different job. A Shamir dealing is a Reed Solomon encoding of the secret plus randomness: shares are codeword symbols: lost shares are erasures: corrupted shares are errors: and the classical decoder’s promise: correct t errors given two t extra symbols: is exactly why this page’s k plus two dealing healed one corrupted share by majority, three hundred for three hundred. The difference is aim: pure Reed Solomon wants reliability and often transmits data in the clear inside systematic codewords: the secrecy in Shamir comes entirely from the random coefficients. One polynomial, two readings: keep data alive, or keep it unknown: and the mature systems: verifiable secret sharing, robust reconstruction: are precisely the marriages of the two readings.',
  },
  {
    section: 'tradeoffs',
    text:
      'And the negative example: chopping the key into substrings. The folk scheme every custody guide warns about by name: cut the twenty four word seed phrase in half, one half to each sibling: it feels like sharing a secret, and it is the opposite of this page in every measurable way. Each fragment IS information: holding half the words cuts the attacker’s search space from two hundred fifty six bits to one hundred twenty eight: from impossible to merely industrial: and two colluding holders of a three way chop possess two thirds of the key outright. Set that against the flat table: a Shamir shareholder’s candidate space is the ENTIRE field, uniformly, no matter how many co conspirators short of k they recruit. Chopping degrades linearly, share by share: Shamir holds absolutely until the threshold, then opens completely. The seduction of the chop is that it needs no mathematics. The mathematics is two pages long. Read the two pages.',
  },
  {
    section: 'code',
    text:
      'The code on this page is the whole scheme and its referees. Share dealing by Horner evaluation over the Mersenne field: Lagrange reconstruction at zero with modular inverses: and the oracles. Every quorum of every split: three thousand two hundred thirty five subsets: exact. The secrecy table, built by enumerating every polynomial through the attacker’s shares in a two fifty seven element field: asserted perfectly flat, one polynomial per candidate secret, the true secret indistinguishable from its neighbors. The guessing floor at one over p, measured. The silent poison: one corrupt share, wrong answer, no warning, three hundred of three hundred: and the k plus two majority antidote healing every one. And the escrow client: ten quorums, ten exact round trips of a one hundred twenty seven bit key. When it prints O K, you have watched the strongest promise in this catalog: not hard, but absent: hold under exhaustion.',
  },
];
