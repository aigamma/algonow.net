import { useMemo, useState } from 'react';
import SiteShell from '../components/SiteShell.jsx';
import { FAMILIES, TOTAL, TIER_LABEL } from '../data/atlas.js';
import { LIVE_PUZZLES } from '../data/puzzles.js';

const norm = (s) =>
  String(s ?? '').toLowerCase().replace(/['’]s\b/g, '').replace(/[^a-z0-9+*]+/g, ' ').trim();
const LIVE = new Set(LIVE_PUZZLES.map((p) => `${norm(p.algorithm)}|${norm(p.heuristic)}`));

function isLive(e) {
  return LIVE.has(`${norm(e.a)}|${norm(e.h)}`);
}

// The atlas: the site's build map, browsable. The homepage stays a curated
// bench; this page is the full catalog, filterable by text and tier.
export default function Atlas() {
  const [q, setQ] = useState('');
  const [tier, setTier] = useState(0); // 0 = all

  const query = q.trim().toLowerCase();
  const families = useMemo(() => {
    return FAMILIES.map((f) => {
      const entries = f.entries.filter((e) => {
        if (tier && e.t !== tier) return false;
        if (!query) return true;
        return (
          e.a.toLowerCase().includes(query) ||
          (e.h || '').toLowerCase().includes(query) ||
          e.d.toLowerCase().includes(query)
        );
      });
      return { ...f, shown: entries };
    }).filter((f) => f.shown.length);
  }, [query, tier]);

  const shownCount = families.reduce((n, f) => n + f.shown.length, 0);

  return (
    <SiteShell>
      <div className="wrap">
        <section className="puzzle-hero" style={{ paddingBottom: '1rem' }}>
          <p className="eyebrow" style={{ marginBottom: '0.9rem' }}>the atlas</p>
          <h1 style={{ fontSize: 'clamp(1.7rem, 4.5vw, 2.5rem)' }}>
            <span className="t-algo">{TOTAL.toLocaleString()}</span> ways to solve a problem
          </h1>
          <p className="hero-oneliner">
            Every algorithm and algorithm-heuristic pair the site is built to teach, across{' '}
            {FAMILIES.length} families. The classical core sits beside the exotic: quantum,
            DNA and slime-mold computing, the nature-inspired swarm, and the puzzle solvers.
            Live pairs are marked; the rest are the map for what comes next.
          </p>
        </section>

        <div className="atlas-controls">
          <input
            type="search"
            className="atlas-search"
            placeholder="filter by name, heuristic, or domain…"
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

        {families.map((f) => (
          <section key={f.key} className="atlas-family" id={`fam-${f.key}`}>
            <h2 className="eyebrow">
              {f.label}
              <span style={{ color: 'var(--ink-faint)', fontWeight: 400 }}>{f.shown.length}</span>
            </h2>
            <ul className="atlas-list">
              {f.shown.map((e, i) => {
                const live = isLive(e);
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

        {!families.length && (
          <p style={{ color: 'var(--ink-dim)', padding: '2rem 0' }}>
            No entries match that filter.
          </p>
        )}
      </div>
    </SiteShell>
  );
}
