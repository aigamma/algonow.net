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

// Fable supplies the authored brief, evidence, code and explanation. This
// shared frame keeps solutions closed until the learner chooses to reveal them.
export default function ScenarioPage({ scenario, content, narrationPlayer }) {
  useEffect(() => { initTelemetry(scenario.slug); }, [scenario.slug]);
  const track = ENGINEERING_TRACKS.find((area) => area.id === scenario.track);
  const PreservedPlayer = narrationPlayer?.Component;
  const referenceFiles = content.files.filter((file) => file.role === 'reference');
  const primaryStarter = content.files.find((file) => file.primary && file.role === 'starter');
  const primaryReference = referenceFiles.find((file) => file.primary);
  const singleFile = Boolean(primaryStarter && primaryReference);
  const supportingFiles = content.files.filter((file) => file.role !== 'reference' && (!singleFile || !file.primary));
  const tradeoffs = <ul className="scenario-tradeoffs">{content.tradeoffs.map((alternative) => <li key={alternative.name}>
    <strong>{alternative.name}</strong><p>{alternative.preferWhen}</p><p>{alternative.cost}</p>
  </li>)}</ul>;
  const solution = <section id="solution" aria-labelledby="solution-heading"><h2 className="eyebrow" id="solution-heading">{singleFile ? 'The complete Python solution' : 'Reference solution'}</h2>
    <details><summary>{singleFile ? 'Reveal the complete solution' : 'Reveal the solution and reasoning'}</summary>
      {singleFile && <PrimaryPythonFile file={primaryReference} />}
      {content.solution}
      {referenceFiles.filter((file) => !singleFile || !file.primary).map((file) => <ScenarioFile key={file.path} file={file} />)}
      {singleFile && <p className="project-download"><a className="btn" href={`/downloads/${scenario.slug}-project.zip`} download>Download full project (includes solution)</a></p>}
    </details>
  </section>;
  const visual = <section id="visual" aria-labelledby="visual-heading"><h2 className="eyebrow" id="visual-heading">System view</h2><div className="scenario-visual">{content.visual}</div></section>;
  const files = <section id="files" aria-labelledby="files-heading"><h2 className="eyebrow" id="files-heading">{singleFile ? 'Optional supporting project' : 'Working files'}</h2>
    {singleFile ? <details className="supporting-project"><summary>Explore supporting files, fixtures, and tests</summary>
      <p>These files support the larger project. The starter and solution above run on their own.</p>
      {supportingFiles.map((file) => <ScenarioFile key={file.path} file={file} />)}
    </details> : supportingFiles.map((file) => <ScenarioFile key={file.path} file={file} />)}
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
          <a className="chip" href="#brief">Brief</a>
          <a className="chip" href="#starter">{singleFile ? 'Your Python' : 'Get started'}</a>
          <a className="chip" href="#solution">{singleFile ? 'Study solution' : 'Solution'}</a><a className="chip" href="#visual">System view</a>
          <a className="chip" href="#evidence">Validation</a><a className="chip" href="#files">{singleFile ? 'Optional project' : 'Files'}</a>
        </nav>
        <section id="brief" aria-labelledby="brief-heading"><h2 className="eyebrow" id="brief-heading">The engineering task</h2>{content.brief}</section>
        {!singleFile && visual}
        <section id="starter" aria-labelledby="starter-heading"><h2 className="eyebrow" id="starter-heading">{singleFile ? 'Your Python file' : 'Get started in Python'}</h2>{content.starter}
          {singleFile && <PrimaryPythonFile file={primaryStarter} />}
        </section>
        {singleFile ? solution : files}
        {singleFile && visual}
        <section id="evidence" aria-labelledby="evidence-heading"><h2 className="eyebrow" id="evidence-heading">Check your result</h2>{content.evidence}</section>
        {!singleFile && solution}
        <section id="tradeoffs" aria-labelledby="tradeoffs-heading"><h2 className="eyebrow" id="tradeoffs-heading">Compare the alternatives</h2>
          {singleFile ? tradeoffs : <details><summary>Reveal the engineering tradeoffs</summary>{tradeoffs}</details>}
        </section>
        {singleFile && files}
        <a className="btn" href="/#scenarios">All AI engineering scenarios →</a>
      </article>
    </SiteShell>
  );
}
