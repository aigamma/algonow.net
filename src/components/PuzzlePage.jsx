import { useEffect } from 'react';
import SiteShell from './SiteShell.jsx';
import CodeBlock from './CodeBlock.jsx';
import ListenPlayer from './ListenPlayer.jsx';
import RivalsBench from './RivalsBench.jsx';
import ContestTable from './ContestTable.jsx';
import { initTelemetry } from '../lib/telemetry.js';
import { ttsAvailable } from '../lib/tts.js';
import { nextPuzzle, pairTitle, puzzlePath } from '../data/puzzles.js';

function listen(section) {
  window.dispatchEvent(new CustomEvent('algonow:listen', { detail: { section } }));
}

function SectionHead({ id, label, section }) {
  return (
    <h2 className="eyebrow" id={`head-${id}`}>
      {label}
      {ttsAvailable() && (
        <button
          type="button"
          className="chip"
          onClick={() => listen(section ?? id)}
          aria-label={`Listen from the ${label} section`}
          style={{ cursor: 'pointer' }}
        >
          ▶
        </button>
      )}
    </h2>
  );
}

// The unit template. Every pair page renders through this component, so the
// polished structure (puzzle card, the pair, picture, run, signals,
// trade-offs, solution) stays identical across the catalog; content objects
// supply only the substance.
export default function PuzzlePage({ puzzle, content }) {
  const {
    given,
    task,
    constraint,
    origins,
    algoRole,
    heurRole,
    picture,
    steps,
    signals,
    baseline,
    strength,
    weakness,
    problem,
    rivals,
    neverUse,
    contest,
    figure,
    code,
    filename,
    Viz,
    narration,
  } = content;

  useEffect(() => {
    initTelemetry(puzzle.slug);
  }, [puzzle.slug]);

  const next = nextPuzzle(puzzle);
  const num = String(puzzle.number).padStart(2, '0');

  return (
    <SiteShell>
      <div className="wrap">
        <section className="puzzle-hero">
          <p className="eyebrow">
            puzzle {num} · {puzzle.domain}
          </p>
          <h1>
            <span className="t-algo">{puzzle.algorithm}</span>
            <span className="t-x">×</span>
            <span className="t-heur">{puzzle.heuristic}</span>
          </h1>
          <p className="hero-oneliner">{puzzle.oneLiner}</p>
          <div className="hero-chips">
            <span className="chip chip-algo">
              <i className="chip-dot" /> algorithm · {puzzle.algorithm}
            </span>
            <span className="chip chip-heur">
              <i className="chip-dot" /> heuristic · {puzzle.heuristic}
            </span>
            <span className="chip">time {puzzle.time}</span>
            <span className="chip">space {puzzle.space}</span>
            <button
              type="button"
              className="btn btn-listen"
              onClick={() => listen(null)}
              disabled={!ttsAvailable()}
              title={ttsAvailable() ? undefined : 'Listening needs a browser with speech synthesis'}
            >
              ▶ Listen · ~{puzzle.listenMinutes} min
            </button>
          </div>
        </section>

        <div className="viz-frame">
          <Viz />
        </div>

        <section className="section" id="sec-puzzle">
          <SectionHead id="puzzle" label="the puzzle" />
          <div className="puzzle-card">
            <div className="pz-row">
              <span className="pz-label">given</span>
              <span className="pz-value">{given}</span>
            </div>
            <div className="pz-row">
              <span className="pz-label">task</span>
              <span className="pz-value">{task}</span>
            </div>
            <div className="pz-row">
              <span className="pz-label">constraint</span>
              <span className="pz-value">{constraint}</span>
            </div>
          </div>
        </section>

        <section className="section" id="sec-origins">
          <SectionHead id="origins" label="origins" />
          {origins}
        </section>

        <section className="section" id="sec-pair">
          <SectionHead id="pair" label="the pair" />
          <div className="pair-split">
            <div className="pair-role role-algo">
              <span className="role-tag">algorithm · the control structure</span>
              <h3>{puzzle.algorithm}</h3>
              {algoRole}
            </div>
            <div className="pair-role role-heur">
              <span className="role-tag">heuristic · the guiding rule</span>
              <h3>{puzzle.heuristic}</h3>
              {heurRole}
            </div>
          </div>
        </section>

        <section className="section" id="sec-picture">
          <SectionHead id="picture" label="street-level picture" />
          {picture}
          {figure}
        </section>

        <section className="section" id="sec-run">
          <SectionHead id="run" label="how it runs" />
          <ol className="steps">
            {steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </section>

        <section className="section" id="sec-signals">
          <SectionHead id="signals" label="when to reach for it" />
          <ul className="signal-list">
            {signals.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
          <div className="complexity-row">
            <span className="metric">
              <span className="m-label">time</span>
              <span className="m-value">{puzzle.time}</span>
            </span>
            <span className="metric">
              <span className="m-label">space</span>
              <span className="m-value">{puzzle.space}</span>
            </span>
            <span className="metric">
              <span className="m-label">naive baseline</span>
              <span className="m-value">{puzzle.baseline}</span>
            </span>
          </div>
          <p>{baseline}</p>
        </section>

        <section className="section" id="sec-tradeoffs">
          <SectionHead id="tradeoffs" label="trade-offs" />
          <div className="tradeoffs">
            <div className="tradeoff t-strength">
              <h3>strength</h3>
              <p>{strength}</p>
            </div>
            <div className="tradeoff t-weakness">
              <h3>weakness</h3>
              <p>{weakness}</p>
            </div>
          </div>
          <RivalsBench problem={problem} rivals={rivals} neverUse={neverUse} />
        </section>

        <section className="section" id="sec-contest">
          <SectionHead id="contest" label="the same instance, every method" section="tradeoffs" />
          <ContestTable
            instance={contest.instance}
            columns={contest.columns}
            rows={contest.rows}
            source={contest.source}
          />
        </section>

        <section className="section" id="sec-code">
          <SectionHead id="code" label="the solution, in Python" />
          <CodeBlock code={code} filename={filename} />
        </section>

        <div className="next-pair">
          <div>
            <span className="np-label">next pair</span>
            {next.slug === puzzle.slug ? (
              <span style={{ color: 'var(--ink-dim)' }}>more pairs are on the bench</span>
            ) : (
              <a className="np-link" href={puzzlePath(next)}>
                {pairTitle(next)} →
              </a>
            )}
          </div>
          <a className="btn" href="/#pairs">
            all pairs
          </a>
        </div>
      </div>
      <ListenPlayer narration={narration} listenMinutes={puzzle.listenMinutes} />
    </SiteShell>
  );
}
