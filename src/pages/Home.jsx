import { useState } from 'react';
import SiteShell from '../components/SiteShell.jsx';
import ScenarioThumbnail from '../components/ScenarioThumbnail.jsx';
import HeroDemo from '../viz/HeroDemo.jsx';
import { ENGINEERING_TRACKS, LIVE_SCENARIOS } from '../data/engineering.js';
import './engineering.css';

const PRACTICE_STEPS = [
  ['Understand the system', 'Read the brief, trace the data, and identify the constraints.'],
  ['Work in Python', 'Build or repair the implementation using the supplied files.'],
  ['Prove the result', 'Run tests, inspect failures, and check the quality of the output.'],
  ['Explain the choices', 'Compare alternatives and defend the engineering tradeoffs.'],
];

export function ScenarioCatalog({ scenarios = LIVE_SCENARIOS }) {
  const [track, setTrack] = useState('all');
  const [query, setQuery] = useState('');
  const populatedTracks = ENGINEERING_TRACKS.filter((area) => scenarios.some((s) => s.track === area.id));
  const visible = scenarios.filter((s) => (track === 'all' || s.track === track)
    && `${s.title} ${s.summary} ${s.skills.join(' ')}`.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <section id="scenarios" className="engineering-section" aria-labelledby="scenario-heading">
      <div className="section-heading">
        <div><p className="section-kicker">pick a problem. write the fix.</p><h2 id="scenario-heading">Engineering scenarios</h2></div>
        <span className="collection-count">{scenarios.length} published · Python</span>
      </div>
      {scenarios.length > 0 ? (
        <>
          <div id="tracks" className="scenario-toolbar">
            <div className="track-filters" role="group" aria-label="Practice area">
              {populatedTracks.length > 1 && <button type="button" aria-pressed={track === 'all'} onClick={() => setTrack('all')}>All areas <span>{scenarios.length}</span></button>}
              {populatedTracks.map((area) => populatedTracks.length > 1
                ? <button type="button" key={area.id} aria-pressed={track === area.id} onClick={() => setTrack(area.id)}>{area.title} <span>{scenarios.filter((s) => s.track === area.id).length}</span></button>
                : <span className="track-label" key={area.id}>{area.title}</span>)}
            </div>
            {scenarios.length > 3 && <label className="scenario-search">Find a scenario<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks or skills" /></label>}
          </div>
          <p className="result-count" role="status">{visible.length} scenario{visible.length === 1 ? '' : 's'}</p>
          <div className="scenario-grid" data-count={visible.length}>{visible.map((s) => {
            const area = ENGINEERING_TRACKS.find((item) => item.id === s.track);
            return <a className="scenario-card" key={s.slug} href={s.href}>
              <ScenarioThumbnail track={s.track} title={area?.title || 'AI engineering'} />
              <div className="scenario-card-body">
                <span className="section-kicker">{area?.title}</span>
                <h3>{s.title}</h3><p>{s.summary}</p>
                <ul className="scenario-skills" aria-label="Skills practiced">{s.skills.slice(0, 3).map((skill) => <li key={skill}>{skill}</li>)}</ul>
                <div className="scenario-card-footer">
                  <span className="scenario-meta">{s.difficulty} · {s.durationMinutes} min · Python</span>
                  <span className="scenario-open">Open scenario <span aria-hidden="true">↗</span></span>
                </div>
              </div>
            </a>;
          })}</div>
          {visible.length === 0 && <div className="scenario-no-results"><p>No scenarios match those filters. Try another area or search term.</p><button type="button" className="btn" onClick={() => { setTrack('all'); setQuery(''); }}>Clear filters</button></div>}
        </>
      ) : (
        <>
          <div className="collection-empty">
            <p><strong>The first AI engineering scenarios are coming.</strong> Published puzzles will appear here with their task, skills, and Python files.</p>
            <a href="#tracks">Practice areas <span aria-hidden="true">↓</span></a>
          </div>
          <div id="tracks" className="planned-tracks">
            <span>Planned practice areas</span>
            <ul>{ENGINEERING_TRACKS.map((area) => <li key={area.id}>{area.title}</li>)}</ul>
          </div>
        </>
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
          </div>
          <HeroDemo />
        </section>
        <ScenarioCatalog />
        <section id="practice" className="engineering-section practice-section" aria-label="How to practice">
          <details>
            <summary>Practicing for an interview? <span>Read, build, test, explain.</span></summary>
            <p>Work with the supplied Python files, validate the result, and explain your decisions before revealing the reference solution.</p>
            <ol className="practice-steps">{PRACTICE_STEPS.map(([title, description], index) => <li key={title}><span>0{index + 1}</span><div><h3>{title}</h3><p>{description}</p></div></li>)}</ol>
          </details>
        </section>
        <aside className="legacy-entrance" aria-labelledby="legacy-heading">
          <div><p className="section-kicker">the original collection · legacy</p><h2 id="legacy-heading">Classic algorithms &amp; heuristics</h2>
            <p>The original puzzles, Python solutions, visualizations, and recordings.</p></div>
          <a className="btn" href="/legacy/">Browse legacy classics →</a>
        </aside>
      </div>
    </SiteShell>
  );
}
