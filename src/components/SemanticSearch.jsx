import { useEffect, useRef, useState } from 'react';

export default function SemanticSearch({ category, tier }) {
  const [query, setQuery] = useState('');
  const [state, setState] = useState({ status: 'idle', results: [] });
  const current = useRef(null);
  useEffect(() => () => current.current?.abort(), []);
  useEffect(() => {
    current.current?.abort(); current.current = null;
    setState({ status: 'idle', results: [] });
  }, [category, tier]);

  async function search(event) {
    event.preventDefault();
    if (!query.trim()) return;
    current.current?.abort();
    const controller = new AbortController(); current.current = controller;
    const timer = setTimeout(() => controller.abort(), 30000);
    setState({ status: 'loading', results: [] });
    try {
      const params = new URLSearchParams({ q: query.trim() });
      if (category) params.set('category', category);
      if (tier) params.set('tier', String(tier));
      const response = await fetch(`/api/search?${params}`, { signal: controller.signal });
      const data = await response.json();
      if (!response.ok || !data.available || !Array.isArray(data.results)) throw new Error('unavailable');
      if (current.current === controller) setState({ status: 'ready', results: data.results, query: query.trim(), ranking: data.ranking });
    } catch {
      if (current.current === controller) setState({ status: 'unavailable', results: [] });
    } finally { clearTimeout(timer); }
  }

  return (
    <details style={{ margin: '1.5rem 0', padding: '1rem', border: '1px solid var(--line)', borderRadius: '0.6rem' }}>
      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Find an algorithm for your problem</summary>
      <p style={{ color: 'var(--ink-dim)' }}>Describe what you need to solve. Category and tier selections below also apply here.</p>
      <form onSubmit={search} style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
        <input type="search" className="atlas-search" maxLength={300} required
          aria-label="Describe a problem to search by meaning" placeholder="Find near-duplicate documents at scale"
          value={query} onChange={event => setQuery(event.target.value)} style={{ flex: '1 1 260px' }} />
        <button className="btn btn-primary" type="submit" disabled={state.status === 'loading'}>
          {state.status === 'loading' ? 'searching...' : 'search by meaning'}
        </button>
      </form>
      <div role="status" aria-live="polite">
        {state.status === 'loading' && <p>Finding relevant catalog entries...</p>}
        {state.status === 'unavailable' && <p>Semantic search is temporarily unavailable. You can still filter the catalog below.</p>}
        {state.status === 'ready' && <p>{state.results.length} matches for &ldquo;{state.query}&rdquo;{state.ranking === 'dense' ? ' (similarity ranking)' : ''}.</p>}
      </div>
      {state.results.length > 0 && <ul className="atlas-list">
        {state.results.map((result, index) => <li className="atlas-entry" key={index}>
          <span className="ae-pair"><a className="t-algo" href={result.url}>{result.algorithm}</a>
            {result.heuristic && <span className="t-heur"> × {result.heuristic}</span>}</span>
          <span className="ae-domain">{result.problem}</span>
          <span className="ae-tier">{result.topic}</span>
        </li>)}
      </ul>}
    </details>
  );
}
