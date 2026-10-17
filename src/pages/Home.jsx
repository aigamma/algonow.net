import { useState } from 'react';
import SiteShell from '../components/SiteShell.jsx';
import { ENGINEERING_TRACKS, LIVE_SCENARIOS } from '../data/engineering.js';
import './engineering.css';

const PRACTICE_STEPS = [
  ['Understand the system', 'Read the brief, trace the data, and identify the constraints.'],
  ['Work in Python', 'Build or repair the implementation using the supplied files.'],
  ['Prove the result', 'Run tests, inspect failures, and check the quality of the output.'],
  ['Explain the choices', 'Compare alternatives and defend the engineering tradeoffs.'],
];

function SystemMap() {
  return (
    <figure className="system-map">
      <figcaption><span className="map-dot" /> RAG architecture <span>example</span></figcaption>
      <div className="map-lane">
        <span className="map-label">prepare the knowledge</span>
        <ol>
          <li><b>Documents</b><span>load &amp; clean</span></li>
          <li><b>Chunks</b><span>split &amp; embed</span></li>
          <li><b>Index</b><span>store vectors + text</span></li>
        </ol>
      </div>
      <div className="map-connection"><span>retrieval searches the prepared index</span></div>
      <div className="map-lane">
        <span className="map-label">answer a question</span>
        <ol>
          <li><b>Retrieve</b><span>embed query &amp; search</span></li>
          <li><b>Context</b><span>select evidence</span></li>
          <li><b>Generate</b><span>model + context</span></li>
        </ol>
      </div>
      <p className="map-check"><span aria-hidden="true">↳</span> Evaluate retrieval and answer quality</p>
    </figure>
  );
}

export function ScenarioCatalog({ scenarios = LIVE_SCENARIOS }) {
  const [track, setTrack] = useState('all');
  const [query, setQuery] = useState('');
  const visible = scenarios.filter((s) => (track === 'all' || s.track === track)
    && `${s.title} ${s.summary} ${s.skills.join(' ')}`.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <section id="scenarios" className="engineering-section" aria-labelledby="scenario-heading">
      <div className="section-heading">
        <div><p className="section-kicker">the new collection</p><h2 id="scenario-heading">Engineering scenarios</h2></div>
        <span className="collection-count">{scenarios.length} published · Python</span>
      </div>
      {scenarios.length > 0 ? (
        <>
          <div className="scenario-filters">
            <label>Practice area<select value={track} onChange={(event) => setTrack(event.target.value)}>
              <option value="all">All areas</option>
              {ENGINEERING_TRACKS.map((area) => <option key={area.id} value={area.id}>{area.title}</option>)}
            </select></label>
            <label>Find a scenario<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks or skills" /></label>
          </div>
          <p className="result-count" role="status">{visible.length} scenario{visible.length === 1 ? '' : 's'}</p>
          <div className="scenario-grid">{visible.map((s) => (
            <a className="scenario-card" key={s.slug} href={s.href}>
              <span className="section-kicker">{ENGINEERING_TRACKS.find((area) => area.id === s.track)?.title}</span>
              <h3>{s.title}</h3><p>{s.summary}</p>
              <span className="scenario-meta">{s.difficulty} · {s.durationMinutes} min · Python <span aria-hidden="true">↗</span></span>
            </a>
          ))}</div>
          {visible.length === 0 && <p>No scenarios match those filters. Try another area or search term.</p>}
        </>
      ) : (
        <div className="collection-empty">
          <span className="empty-symbol" aria-hidden="true">[ ]</span>
          <div><h3>The first AI engineering scenarios are coming.</h3>
            <p>All new puzzles will focus on building, troubleshooting, or evaluating AI systems in Python. The practice areas below define the new collection.</p>
          </div>
          <a href="#tracks">Explore the areas <span aria-hidden="true">↓</span></a>
        </div>
      )}
    </section>
  );
}

export default function Home() {
  return (
    <SiteShell>
      <div className="wrap engineering-home">
        <section className="engineering-hero">
          <div>
            <p className="section-kicker"><span className="python-tag">Python</span> AI architecture &amp; engineering</p>
            <h1>AI engineering.<br /><span>Solved in Python.</span></h1>
            <p className="engineering-intro">Build a RAG pipeline. Troubleshoot retrieval. Set up fine-tuning and distillation. Practice the engineering work that makes AI systems useful.</p>
            <div className="hero-ctas">
              <a className="btn btn-primary" href="#scenarios">Explore AI scenarios <span aria-hidden="true">↓</span></a>
              <a className="text-link" href="#practice">How you&apos;ll practice →</a>
            </div>
            <p className="hero-footnote">Hands-on tasks. Runnable Python. Decisions you can explain.</p>
          </div>
          <SystemMap />
        </section>
        <ScenarioCatalog />
        <section id="tracks" className="engineering-section" aria-labelledby="tracks-heading">
          <div className="section-heading"><div><p className="section-kicker">what you&apos;ll work on</p><h2 id="tracks-heading">The systems behind the model</h2></div></div>
          <div className="track-grid">
            {ENGINEERING_TRACKS.map((track, index) => (
              <article className="track-card" key={track.id}>
                <span className="track-number">0{index + 1}</span>
                <h3>{track.title}</h3><p>{track.description}</p>
                <span className="track-status">{LIVE_SCENARIOS.some((s) => s.track === track.id)
                  ? `${LIVE_SCENARIOS.filter((s) => s.track === track.id).length} published scenarios`
                  : 'Planned practice area'}</span>
              </article>
            ))}
          </div>
        </section>
        <section id="practice" className="engineering-section practice-section" aria-labelledby="practice-heading">
          <div><p className="section-kicker">practice with a purpose</p><h2 id="practice-heading">Write the code.<br />Explain why it works.</h2>
            <p>Prepare for the moment when someone is watching you solve a problem: understand the task, make a change, test it, and talk through your reasoning.</p>
            <p className="practice-note">The scenario format includes a brief, starter files, testable outcomes, a system visual, and a reference solution to reveal when you are ready.</p>
          </div>
          <ol className="practice-steps">{PRACTICE_STEPS.map(([title, description], index) => <li key={title}><span>0{index + 1}</span><div><h3>{title}</h3><p>{description}</p></div></li>)}</ol>
        </section>
        <aside className="legacy-entrance" aria-labelledby="legacy-heading">
          <div><p className="section-kicker">the original collection · legacy</p><h2 id="legacy-heading">Classic algorithms &amp; heuristics</h2>
            <p>The original puzzles, Python solutions, visualizations, and recordings now live together in the legacy collection.</p></div>
          <a className="btn" href="/legacy/">Browse legacy classics →</a>
        </aside>
      </div>
    </SiteShell>
  );
}
