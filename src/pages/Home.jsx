import SiteShell from '../components/SiteShell.jsx';
import HeroDemo from '../viz/HeroDemo.jsx';
import { LIVE_PUZZLES, ROADMAP, pairTitle, puzzlePath } from '../data/puzzles.js';
import atlasSummary from '../data/atlas-summary.json';

function PairTitle({ algorithm, heuristic }) {
  return (
    <h3>
      <span className="t-algo">{algorithm}</span>
      <span className="t-x">×</span>
      <span className="t-heur">{heuristic}</span>
    </h3>
  );
}

export default function Home() {
  return (
    <SiteShell>
      <div className="wrap">
        <section className="home-hero">
          <div>
            <h1>
              Every algorithm worth knowing
              <br />
              travels with a <span className="t-heur" style={{ color: 'var(--heur)' }}>heuristic</span>.
            </h1>
            <p className="hero-sub">
              algonow teaches the classics as <strong>pairs</strong>: the control
              structure that does the bookkeeping, and the guiding rule that
              gives it direction. Watch each one run live, take the tested
              Python solution, and <strong>listen</strong> to the whole lesson
              when your eyes are busy.
            </p>
            <div className="hero-ctas">
              <a className="btn btn-primary" href="/astar-manhattan/">
                Start with puzzle 01 · A*
              </a>
              <a className="btn" href="#listen">
                How listening works
              </a>
            </div>
          </div>
          <HeroDemo />
        </section>

        <section id="pairs">
          <h2 className="eyebrow">the pairs</h2>
          <div className="pairs-grid">
            {LIVE_PUZZLES.map((p) => (
              <a key={p.slug} className="pair-card" href={puzzlePath(p)}>
                <span className="pc-number">
                  <span>puzzle {String(p.number).padStart(2, '0')}</span>
                  <span>▶ ~{p.listenMinutes} min</span>
                </span>
                <PairTitle algorithm={p.algorithm} heuristic={p.heuristic} />
                <p className="pc-domain">{p.domain}</p>
                <span className="pc-meta">
                  <span className="chip">time {p.time}</span>
                  <span className="chip">vs {p.baseline}</span>
                </span>
              </a>
            ))}
          </div>

          <h2 className="eyebrow">on the bench</h2>
          <div className="pairs-grid">
            {ROADMAP.map((p) => (
              <div key={pairTitle(p)} className="pair-card pc-bench" aria-disabled="true">
                <span className="pc-number">
                  <span>soon</span>
                </span>
                <PairTitle algorithm={p.algorithm} heuristic={p.heuristic} />
                <p className="pc-domain">{p.domain}</p>
              </div>
            ))}
          </div>
        </section>

        <a href="/atlas/" className="atlas-teaser">
          <div>
            <span className="at-eyebrow">the atlas</span>
            <p className="at-headline">
              <b>{atlasSummary.total.toLocaleString()}</b> algorithms and pairs mapped,
              across {atlasSummary.families} families.
            </p>
            <p className="at-sub">
              The classical core beside the exotic: quantum, DNA and slime-mold computing,
              nature-inspired swarms, puzzle solvers. This is the map for the whole site.
            </p>
          </div>
          <span className="at-cta">browse the atlas →</span>
        </a>

        <section id="listen" className="doctrine">
          <h2 className="eyebrow">written twice</h2>
          <p>
            Every unit on this site exists in two forms. The page you read is
            the <strong>tight form</strong>: puzzle card, the pair, the picture,
            the loop, the trade-offs, the code. The <strong>▶ Listen</strong>{' '}
            button plays the <strong>spoken form</strong>: a longer narration
            written for the ear, with numbers spelled out and symbols read as
            words, delivered by your browser&apos;s own speech engine.
          </p>
          <p>
            Listening is free and private: synthesis runs entirely on your
            device, nothing is streamed, and no account exists to stream it to.
            Pick a voice and pace you like; the player follows the page as it
            reads.
          </p>
        </section>
      </div>
    </SiteShell>
  );
}
