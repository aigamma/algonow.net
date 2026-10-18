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

function PrimaryPythonFile({ file }) {
  const filename = file.path.split('/').pop();
  return <div className="primary-python-file">
    <div className="primary-file-description"><p>{file.description}</p>
      <a className="btn" href={`data:text/plain;charset=utf-8,${encodeURIComponent(file.source)}`} download={filename}>Download {filename}</a>
    </div>
    <CodeBlock filename={filename} code={file.source} />
  </div>;
}

// Fable supplies the authored brief, evidence, code and explanation. Primary
// files present a worked example first, with practice available separately.
export default function ScenarioPage({ scenario, content, narrationPlayer }) {
  useEffect(() => { initTelemetry(scenario.slug); }, [scenario.slug]);
  const track = ENGINEERING_TRACKS.find((area) => area.id === scenario.track);
  const PreservedPlayer = narrationPlayer?.Component;
  const referenceFiles = content.files.filter((file) => file.role === 'reference');
  const primaryStarter = content.files.find((file) => file.primary && file.role === 'starter');
  const primaryReference = referenceFiles.find((file) => file.primary);
  const singleFile = Boolean(primaryStarter && primaryReference);
  const workingFiles = content.files.filter((file) => file.role !== 'reference');
  const sections = singleFile
    ? [['brief', 'Brief'], ['visual', 'Watch it run'], ['solution', 'Worked solution'], ['evidence', 'Validation'], ['tradeoffs', 'Alternatives'], ['starter', 'Practice']]
    : [['brief', 'Brief'], ['starter', 'Get started'], ['solution', 'Solution'], ['visual', 'System view'], ['evidence', 'Validation'], ['files', 'Files']];
  const tradeoffs = <ul className="scenario-tradeoffs">{content.tradeoffs.map((alternative) => <li key={alternative.name}>
    <strong>{alternative.name}</strong><p>{alternative.preferWhen}</p><p>{alternative.cost}</p>
  </li>)}</ul>;
  const solution = <section id="solution" aria-labelledby="solution-heading"><h2 className="eyebrow" id="solution-heading">{singleFile ? 'Worked solution' : 'Reference solution'}</h2>
    <details open={singleFile}><summary>{singleFile ? 'Complete Python code and explanation' : 'Reveal the solution and reasoning'}</summary>
      {singleFile && <PrimaryPythonFile file={primaryReference} />}
      {content.solution}
      {!singleFile && referenceFiles.map((file) => <ScenarioFile key={file.path} file={file} />)}
    </details>
  </section>;
  const starter = <section id="starter" aria-labelledby="starter-heading"><h2 className="eyebrow" id="starter-heading">{singleFile ? 'Practice this pattern' : 'Get started in Python'}</h2>
    {singleFile ? <details><summary>Open optional practice</summary>
      {content.starter}<PrimaryPythonFile file={primaryStarter} />
    </details> : content.starter}
  </section>;
  const visual = <section id="visual" aria-labelledby="visual-heading"><h2 className="eyebrow" id="visual-heading">System view</h2><div className="scenario-visual">{content.visual}</div></section>;
  const files = <section id="files" className={singleFile ? 'project-download-note' : undefined} aria-labelledby="files-heading"><h2 className="eyebrow" id="files-heading">{singleFile ? 'Optional full project' : 'Working files'}</h2>
    {singleFile ? <p><a href={`/downloads/${scenario.slug}-project.zip`} download>Download full project ZIP (includes solution)</a></p>
      : workingFiles.map((file) => <ScenarioFile key={file.path} file={file} />)}
  </section>;
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
          {sections.map(([id, label]) => <a className="chip" href={`#${id}`} key={id}>{label}</a>)}
        </nav>
        <section id="brief" aria-labelledby="brief-heading"><h2 className="eyebrow" id="brief-heading">The engineering task</h2>{content.brief}</section>
        {singleFile && visual}
        {singleFile && solution}
        {!singleFile && visual}
        {!singleFile && starter}
        {!singleFile && files}
        <section id="evidence" aria-labelledby="evidence-heading"><h2 className="eyebrow" id="evidence-heading">Check your result</h2>{content.evidence}</section>
        {!singleFile && solution}
        <section id="tradeoffs" aria-labelledby="tradeoffs-heading"><h2 className="eyebrow" id="tradeoffs-heading">Compare the alternatives</h2>
          {singleFile ? tradeoffs : <details><summary>Reveal the engineering tradeoffs</summary>{tradeoffs}</details>}
        </section>
        {singleFile && starter}
        {singleFile && files}
        <a className="btn" href="/#scenarios">All AI engineering scenarios →</a>
      </article>
    </SiteShell>
  );
}
