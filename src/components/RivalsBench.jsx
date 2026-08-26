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
import { LIVE_PUZZLES } from '../data/puzzles.js';

export function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/\*/g, ' star ')
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}


// Normalized algorithm name -> its live lesson, so a rival card whose method
// is itself a full unit links the lesson beside the reference page. Same
// normalizer as the atlas live check, so possessives match.
const normName = (s) =>
  String(s ?? '').toLowerCase().replace(/['’]s\b/g, '').replace(/[^a-z0-9+*]+/g, ' ').trim();
const LIVE_BY_ALGO = new Map(LIVE_PUZZLES.map((p) => [normName(p.algorithm), `/${p.slug}/`]));

export default function RivalsBench({ problem, problemSlug, rivals, neverUse, currentSlug }) {
  // Other LIVE units on the same problem: the site's richest artifacts for
  // one contract should see each other (A* and Dijkstra both attack
  // single-source shortest paths and taught in mutual ignorance until this).
  const siblings = LIVE_PUZZLES.filter(
    (p) => p.problemSlug && p.problemSlug === problemSlug && p.slug !== currentSlug
  );
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
          {siblings.length > 0 && (
            <>
              {' '}· also live for this problem:{' '}
              {siblings.map((p, i) => (
                <span key={p.slug}>
                  {i > 0 && ', '}
                  <a href={`/${p.slug}/`}>
                    <strong>{p.algorithm} × {p.heuristic}</strong>
                  </a>
                </span>
              ))}
            </>
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
              {!r.isThisUnit && LIVE_BY_ALGO.has(normName(r.algoName ?? r.name)) && (
                <a className="rival-badge rival-live" href={LIVE_BY_ALGO.get(normName(r.algoName ?? r.name))}>
                  full lesson ▸
                </a>
              )}
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
