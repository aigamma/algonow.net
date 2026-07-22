// The rivals bench. The site's purpose is trade-off fluency, so every unit
// puts its method among the other real methods that attack the same problem:
// what each wins, what it costs, and when you would reach for it instead.
// `neverUse` carries the extreme negative example, which teaches the same
// instinct from the other side.
//
// Names link into the prerendered data surface, so a rival mentioned here
// leads to its own page and to every other method for the same problem. The
// slug rule must match scripts/prerender.mjs exactly, including the star and
// plus encoding, or the links point at pages that do not exist.
export function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/\*/g, ' star ')
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function RivalsBench({ problem, problemSlug, rivals, neverUse }) {
  return (
    <div className="rivals">
      {problem && (
        <p className="rivals-problem">
          all of these attack one problem:{' '}
          {problemSlug ? (
            <a href={`/problem/${problemSlug}/`}>
              <strong>{problem}</strong>
            </a>
          ) : (
            <strong>{problem}</strong>
          )}
        </p>
      )}
      <div className="rival-grid">
        {rivals.map((r) => (
          <article
            key={r.name}
            className={`rival${r.isThisUnit ? ' rival-self' : ''}`}
          >
            <header className="rival-head">
              <h3>
                <a href={`/algo/${slugify(r.algoName ?? r.name)}/`}>{r.name}</a>
              </h3>
              {r.isThisUnit && <span className="rival-badge">this unit</span>}
            </header>
            {r.cost && <p className="rival-cost">{r.cost}</p>}
            <dl className="rival-dl">
              <dt>wins</dt>
              <dd>{r.wins}</dd>
              <dt>costs</dt>
              <dd>{r.costs}</dd>
              <dt>reach for it when</dt>
              <dd>{r.when}</dd>
            </dl>
          </article>
        ))}
      </div>
      {neverUse && (
        <div className="never-use">
          <h3>
            <span className="nu-tag">never here</span> {neverUse.name}
          </h3>
          <p>{neverUse.why}</p>
        </div>
      )}
    </div>
  );
}
