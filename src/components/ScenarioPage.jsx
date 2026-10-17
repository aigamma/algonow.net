import SiteShell from './SiteShell.jsx';
import { useEffect } from 'react';
import CodeBlock from './CodeBlock.jsx';
import { ENGINEERING_TRACKS } from '../data/engineering.js';
import '../pages/engineering.css';
import { initTelemetry } from '../lib/telemetry.js';

function ScenarioFile({ file }) {
  return (
    <details>
      <summary>{file.path} · {file.role}</summary>
      <p>{file.description}</p>
      {file.language === 'python'
        ? <CodeBlock filename={file.path} code={file.source} />
        : <pre><code>{file.source}</code></pre>}
    </details>
  );
}

// Fable supplies the authored brief, evidence, code and explanation. This
// shared frame keeps solutions closed until the learner chooses to reveal them.
export default function ScenarioPage({ scenario, content, narrationPlayer }) {
  useEffect(() => { initTelemetry(scenario.slug); }, [scenario.slug]);
  const track = ENGINEERING_TRACKS.find((area) => area.id === scenario.track);
  const PreservedPlayer = narrationPlayer?.Component;
  const referenceFiles = content.files.filter((file) => file.role === 'reference');
  return (
    <SiteShell>
      <article className="wrap scenario-page">
        <nav aria-label="Breadcrumb"><a href="/#scenarios">AI engineering scenarios</a> / {track?.title}</nav>
        <header>
          <p className="section-kicker">{scenario.difficulty} · {scenario.durationMinutes} min · Python</p>
          <h1>{scenario.title}</h1>
          <p className="scenario-lead">{scenario.summary}</p>
          {PreservedPlayer && <PreservedPlayer label={`Listen to ${scenario.title}`} manifest={narrationPlayer.manifest}
            listenMinutes={scenario.listenMinutes} mediaBaseUrl={narrationPlayer.mediaBaseUrl} narration={narrationPlayer.narration} />}
        </header>
        <nav className="cat-strip" aria-label="Scenario sections">
          <a className="chip" href="#brief">Brief</a><a className="chip" href="#visual">System view</a>
          <a className="chip" href="#starter">Get started</a><a className="chip" href="#files">Files</a>
          <a className="chip" href="#evidence">Validation</a><a className="chip" href="#solution">Solution</a>
        </nav>
        <section id="brief" aria-labelledby="brief-heading"><h2 className="eyebrow" id="brief-heading">The engineering task</h2>{content.brief}</section>
        <section id="visual" aria-labelledby="visual-heading"><h2 className="eyebrow" id="visual-heading">System view</h2><div className="scenario-visual">{content.visual}</div></section>
        <section id="starter" aria-labelledby="starter-heading"><h2 className="eyebrow" id="starter-heading">Get started in Python</h2>{content.starter}</section>
        <section id="files" aria-labelledby="files-heading"><h2 className="eyebrow" id="files-heading">Working files</h2>
          {content.files.filter((file) => file.role !== 'reference').map((file) => <ScenarioFile key={file.path} file={file} />)}
        </section>
        <section id="evidence" aria-labelledby="evidence-heading"><h2 className="eyebrow" id="evidence-heading">Check your result</h2>{content.evidence}</section>
        <section id="solution" aria-labelledby="solution-heading"><h2 className="eyebrow" id="solution-heading">Reference solution</h2>
          <details><summary>Reveal the solution and reasoning</summary>{content.solution}
            {referenceFiles.map((file) => <ScenarioFile key={file.path} file={file} />)}
          </details>
        </section>
        <section id="tradeoffs" aria-labelledby="tradeoffs-heading"><h2 className="eyebrow" id="tradeoffs-heading">Compare the alternatives</h2>
          <details><summary>Reveal the engineering tradeoffs</summary>
            <ul className="scenario-tradeoffs">{content.tradeoffs.map((alternative) => <li key={alternative.name}>
              <strong>{alternative.name}</strong><p>{alternative.preferWhen}</p><p>{alternative.cost}</p>
            </li>)}</ul>
          </details>
        </section>
        <a className="btn" href="/#scenarios">All AI engineering scenarios →</a>
      </article>
    </SiteShell>
  );
}
