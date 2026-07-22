// The measured contest. Every unit's Python solution races the rivals on one
// shared instance and prints the numbers; this table reproduces them. The
// point is evidence over adjectives: "fewer nodes" is a claim, "482 against
// 2,000,000 on the same maze" is a result. `source` names the exact command
// that produces the numbers so a reader can re-run it.
export default function ContestTable({ instance, columns, rows, source }) {
  return (
    <div className="contest">
      {instance && (
        <p className="contest-instance">
          one shared instance: <strong>{instance}</strong>
        </p>
      )}
      <div className="contest-scroll">
        <table className="contest-table">
          <thead>
            <tr>
              <th scope="col">method</th>
              {columns.map((c) => (
                <th key={c} scope="col">
                  {c}
                </th>
              ))}
              <th scope="col">verdict</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.method} className={r.isThisUnit ? 'contest-self' : undefined}>
                <th scope="row">
                  {r.method}
                  {r.isThisUnit && <span className="rival-badge">this unit</span>}
                </th>
                {r.values.map((v, i) => (
                  <td key={i} className={r.best === i ? 'contest-best' : undefined}>
                    {v}
                  </td>
                ))}
                <td className="contest-verdict">{r.verdict}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {source && <p className="contest-source">{source}</p>}
    </div>
  );
}
