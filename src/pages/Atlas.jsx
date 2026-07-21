import { useMemo, useState } from 'react';
import SiteShell from '../components/SiteShell.jsx';
import { CATEGORY_GROUPS, TOTAL, CATEGORY_COUNT, TIER_LABEL, ALIASES } from '../data/atlas.js';
import { LIVE_PUZZLES } from '../data/puzzles.js';

const norm = (s) =>
  String(s ?? '').toLowerCase().replace(/['’]s\b/g, '').replace(/[^a-z0-9+*]+/g, ' ').trim();
const LIVE = new Set(LIVE_PUZZLES.map((p) => `${norm(p.algorithm)}|${norm(p.heuristic)}`));
const isLive = (e) => LIVE.has(`${norm(e.a)}|${norm(e.h)}`);

// Reverse alias index: any known synonym -> its canonical name, so a search
// for "DSU" or "partition-exchange sort" finds Union-Find or Quicksort.
const ALIAS_INDEX = (() => {
  const idx = {};
  for (const [canonical, meta] of Object.entries(ALIASES)) {
    for (const aka of meta.aka || []) idx[aka.toLowerCase()] = canonical;
  }
  return idx;
})();

function entryMatches(e, query) {
  if (
    e.a.toLowerCase().includes(query) ||
    (e.h || '').toLowerCase().includes(query) ||
    e.d.toLowerCase().includes(query)
  ) {
    return true;
  }
  // Alias hit: does the query name a synonym of this entry's algorithm?
  const canon = ALIAS_INDEX[query];
  if (canon && norm(canon) === norm(e.a)) return true;
  const meta = ALIASES[e.a];
  return meta ? (meta.aka || []).some((aka) => aka.toLowerCase().includes(query)) : false;
}

// The atlas: the site's build map, grouped under the major categories, with an
// instant client-side filter (text + tier) that also resolves known aliases.
export default function Atlas() {
  const [q, setQ] = useState('');
  const [tier, setTier] = useState(0);

  const query = q.trim().toLowerCase();
  const groups = useMemo(() => {
    return CATEGORY_GROUPS.map((cat) => {
      const familyList = cat.familyList
        .map((f) => ({
          ...f,
          shown: f.entries.filter((e) => (tier ? e.t === tier : true) && (query ? entryMatches(e, query) : true)),
        }))
        .filter((f) => f.shown.length);
      const shown = familyList.reduce((n, f) => n + f.shown.length, 0);
      return { ...cat, familyList, shown };
    }).filter((cat) => cat.familyList.length);
  }, [query, tier]);

  const shownCount = groups.reduce((n, c) => n + c.shown, 0);

  return (
    <SiteShell>
      <div className="wrap">
        <section className="puzzle-hero" style={{ paddingBottom: '1rem' }}>
          <p className="eyebrow" style={{ marginBottom: '0.9rem' }}>the atlas</p>
          <h1 style={{ fontSize: 'clamp(1.7rem, 4.5vw, 2.5rem)' }}>
            <span className="t-algo">{TOTAL.toLocaleString()}</span> ways to solve a problem
          </h1>
          <p className="hero-oneliner">
            Every algorithm and algorithm-heuristic pair the site is built to teach, sorted into{' '}
            {CATEGORY_COUNT} major categories. The classical core sits beside the exotic: quantum,
            DNA and slime-mold computing, the nature-inspired swarm, and the puzzle solvers.
            Live pairs are marked; the rest are the map for what comes next.
          </p>
        </section>

        <div className="atlas-controls">
          <input
            type="search"
            className="atlas-search"
            placeholder="filter by name, alias, heuristic, or domain…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Filter the atlas"
          />
          <div className="atlas-tiers" role="group" aria-label="Filter by tier">
            {[
              [0, 'all'],
              [1, 'canon'],
              [2, 'standard'],
              [3, 'specialist'],
            ].map(([t, label]) => (
              <button
                key={t}
                type="button"
                className={`btn${tier === t ? ' btn-primary' : ''}`}
                aria-pressed={tier === t}
                onClick={() => setTier(t)}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="atlas-count">{shownCount.toLocaleString()} shown</span>
        </div>

        {!query && !tier && (
          <nav className="cat-nav" aria-label="Categories">
            {CATEGORY_GROUPS.map((c) => (
              <a key={c.key} href={`#cat-${c.key}`} className="cat-chip">
                {c.label} <span>{c.count}</span>
              </a>
            ))}
          </nav>
        )}

        {groups.map((cat) => (
          <section key={cat.key} className="atlas-category" id={`cat-${cat.key}`}>
            <div className="cat-header">
              <h2>{cat.label}</h2>
              <p>{cat.blurb}</p>
            </div>
            {cat.familyList.map((f) => (
              <section key={f.key} className="atlas-family" id={`fam-${f.key}`}>
                <h3 className="eyebrow">
                  {f.label}
                  <span style={{ color: 'var(--ink-faint)', fontWeight: 400 }}>{f.shown.length}</span>
                </h3>
                <ul className="atlas-list">
                  {f.shown.map((e, i) => {
                    const live = isLive(e);
                    const hasAka = ALIASES[e.a];
                    return (
                      <li key={i} className={`atlas-entry${live ? ' atlas-live' : ''}`}>
                        <span className="ae-pair">
                          <span className="t-algo">{e.a}</span>
                          {e.h && (
                            <>
                              <span className="t-x"> × </span>
                              <span className="t-heur">{e.h}</span>
                            </>
                          )}
                          {hasAka && (
                            <span className="ae-aka" title={`also: ${hasAka.aka.join(', ')}`}>
                              +{hasAka.aka.length} aka
                            </span>
                          )}
                        </span>
                        <span className="ae-domain">{e.d}</span>
                        <span className={`ae-tier ae-tier-${e.t}`}>{TIER_LABEL[e.t]}</span>
                        {live && <span className="ae-live-tag">live ▸</span>}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </section>
        ))}

        {!groups.length && (
          <p style={{ color: 'var(--ink-dim)', padding: '2rem 0' }}>No entries match that filter.</p>
        )}
      </div>
    </SiteShell>
  );
}
