// The rivals bench. The site's purpose is trade-off fluency, so every unit
// puts its method among the other real methods that attack the same problem:
// what each wins, what it costs, and when you would reach for it instead.
// `neverUse` carries the extreme negative example, which teaches the same
// instinct from the other side.
export default function RivalsBench({ problem, rivals, neverUse }) {
  return (
    <div className="rivals">
      {problem && (
        <p className="rivals-problem">
          all of these attack one problem: <strong>{problem}</strong>
        </p>
      )}
      <div className="rival-grid">
        {rivals.map((r) => (
          <article
            key={r.name}
            className={`rival${r.isThisUnit ? ' rival-self' : ''}`}
          >
            <header className="rival-head">
              <h3>{r.name}</h3>
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
