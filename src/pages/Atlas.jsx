import { useEffect, useMemo, useRef, useState } from 'react';
import SiteShell from '../components/SiteShell.jsx';
import {
  CATEGORY_GROUPS,
  ALL_ENTRIES,
  TOTAL,
  CATEGORY_COUNT,
  TOPIC_COUNT,
  TIER_LABEL,
  ALIASES,
} from '../data/atlas.js';
import { LIVE_PUZZLES } from '../data/puzzles.js';

const norm = (s) =>
  String(s ?? '').toLowerCase().replace(/['’]s\b/g, '').replace(/[^a-z0-9+*]+/g, ' ').trim();
const LIVE = new Set(LIVE_PUZZLES.map((p) => `${norm(p.algorithm)}|${norm(p.heuristic)}`));
const isLive = (e) => LIVE.has(`${norm(e.a)}|${norm(e.h)}`);

// Reverse alias index: any known synonym -> its canonical name.
const ALIAS_INDEX = (() => {
  const idx = {};
  for (const [canonical, meta] of Object.entries(ALIASES)) {
    if (canonical.startsWith('_')) continue;
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
  const canon = ALIAS_INDEX[query];
  if (canon && norm(canon) === norm(e.a)) return true;
  const meta = ALIASES[e.a];
  return meta ? (meta.aka || []).some((aka) => aka.toLowerCase().includes(query)) : false;
}

function EntryRow({ e }) {
  const live = isLive(e);
  const hasAka = ALIASES[e.a];
  return (
    <li className={`atlas-entry${live ? ' atlas-live' : ''}`}>
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
}

// The atlas: the site's build map, three tiers deep (Category -> Topic ->
// Entry). Instant client-side filter by text (alias-aware), category, and
// tier, plus a random button that surfaces one algorithm to learn.
export default function Atlas() {
  const [q, setQ] = useState('');
  const [tier, setTier] = useState(0);
  const [cat, setCat] = useState(''); // '' = all categories
  const [pick, setPick] = useState(null); // random entry
  const pickRef = useRef(null);

  const query = q.trim().toLowerCase();

  const groups = useMemo(() => {
    return CATEGORY_GROUPS.filter((c) => !cat || c.key === cat)
      .map((c) => {
        const topicList = c.topicList
          .map((t) => ({
            ...t,
            shown: t.entries.filter((e) => (tier ? e.t === tier : true) && (query ? entryMatches(e, query) : true)),
          }))
          .filter((t) => t.shown.length);
        const shown = topicList.reduce((n, t) => n + t.shown.length, 0);
        return { ...c, topicList, shown };
      })
      .filter((c) => c.topicList.length);
  }, [query, tier, cat]);

  const shownCount = groups.reduce((n, c) => n + c.shown, 0);

  const roll = () => {
    const pool = ALL_ENTRIES.filter(
      (e) => (!cat || e.categoryKey === cat) && (!tier || e.t === tier)
    );
    if (!pool.length) return;
    // No Math.random in module scope constraints here (browser runtime), fine.
    const e = pool[Math.floor(Math.random() * pool.length)];
    setPick(e);
  };

  useEffect(() => {
    if (pick && pickRef.current) pickRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [pick]);

  return (
    <SiteShell>
      <div className="wrap">
        <section className="puzzle-hero" style={{ paddingBottom: '0.8rem' }}>
          <p className="eyebrow" style={{ marginBottom: '0.9rem' }}>the atlas</p>
          <h1 style={{ fontSize: 'clamp(1.7rem, 4.5vw, 2.5rem)' }}>
            <span className="t-algo">{TOTAL.toLocaleString()}</span> ways to solve a problem
          </h1>
          <p className="hero-oneliner">
            Every algorithm and algorithm-heuristic pair the site is built to teach, three tiers
            deep: {CATEGORY_COUNT} categories, {TOPIC_COUNT} topics, {TOTAL.toLocaleString()}{' '}
            entries. The classical core beside the exotic: quantum, DNA and slime-mold computing,
            the nature-inspired swarm, and the puzzle solvers.
          </p>
        </section>

        {pick && (
          <div className="atlas-pick" ref={pickRef} role="status">
            <span className="ap-label">🎲 random pick</span>
            <span className="ap-pair">
              <span className="t-algo">{pick.a}</span>
              {pick.h && (
                <>
                  <span className="t-x"> × </span>
                  <span className="t-heur">{pick.h}</span>
                </>
              )}
            </span>
            <span className="ap-meta">
              {pick.topicLabel} · {pick.d} · {TIER_LABEL[pick.t]}
            </span>
            <button type="button" className="btn" onClick={roll}>roll again</button>
            <button type="button" className="lp-close" onClick={() => setPick(null)} aria-label="Dismiss">✕</button>
          </div>
        )}

        <div className="atlas-controls">
          <input
            type="search"
            className="atlas-search"
            placeholder="filter by name, alias, heuristic, or domain…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Filter the atlas"
          />
          <button type="button" className="btn btn-listen" onClick={roll}>🎲 random</button>
          <select
            className="atlas-catselect"
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            aria-label="Filter by category"
          >
            <option value="">all categories</option>
            {CATEGORY_GROUPS.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label} ({c.count})
              </option>
            ))}
          </select>
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

        {!query && !tier && !cat && (
          <nav className="cat-nav" aria-label="Categories">
            {CATEGORY_GROUPS.map((c) => (
              <button key={c.key} type="button" className="cat-chip" onClick={() => setCat(c.key)}>
                {c.label} <span>{c.count}</span>
              </button>
            ))}
          </nav>
        )}

        {groups.map((c) => (
          <section key={c.key} className="atlas-category" id={`cat-${c.key}`}>
            <div className="cat-header">
              <h2>{c.label}</h2>
              <p>{c.blurb}</p>
            </div>
            {c.topicList.map((t) => (
              <section key={t.key} className="atlas-topic" id={`topic-${t.key}`}>
                <h3 className="eyebrow">
                  {t.label}
                  <span style={{ color: 'var(--ink-faint)', fontWeight: 400 }}>{t.shown.length}</span>
                </h3>
                <ul className="atlas-list">
                  {t.shown.map((e, i) => (
                    <EntryRow key={i} e={e} />
                  ))}
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
