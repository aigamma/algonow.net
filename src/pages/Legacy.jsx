import SiteShell from '../components/SiteShell.jsx';
import HeroDemo from '../viz/HeroDemo.jsx';
import { LIVE_PUZZLES, puzzlePath } from '../data/puzzles.js';
import { CATEGORIES } from '../data/atlas-categories.js';

function PairCard({ puzzle }) {
  return (
    <a className="pair-card" href={puzzlePath(puzzle)}>
      <span className="pc-number">
        <span>puzzle {String(puzzle.number).padStart(2, '0')}</span>
        <span>▶ ~{puzzle.listenMinutes} min</span>
      </span>
      <h3>
        <span className="t-algo">{puzzle.algorithm}</span>
        <span className="t-x">×</span>
        <span className="t-heur">{puzzle.heuristic}</span>
      </h3>
      <p className="pc-domain">{puzzle.domain}</p>
    </a>
  );
}

// Preserve the original category grouping and every published lesson URL.
const GROUPS = CATEGORIES.map((category) => ({
  key: category.key,
  label: category.label,
  puzzles: LIVE_PUZZLES.filter((puzzle) => puzzle.category === category.key),
})).filter((group) => group.puzzles.length > 0);

export default function Legacy() {
  return (
    <SiteShell newCount={0}>
      <div className="wrap">
        <section className="home-hero">
          <div>
            <p className="eyebrow">legacy collection</p>
            <h1>Classical algorithms and heuristics.</h1>
            <p className="hero-sub">
              The original {LIVE_PUZZLES.length} algonow lessons pair an algorithm
              with the heuristic that guides it. Explore the live diagrams,
              tested Python solutions, and complete narrations.
            </p>
            <p className="hero-sub">
              New puzzles focus on Python AI architecture and engineering.
              This collection remains available at its original lesson URLs.
            </p>
            <div className="hero-ctas">
              <a className="btn btn-primary" href="#pairs">Browse all {LIVE_PUZZLES.length} lessons</a>
              <a className="btn" href="/">AI engineering puzzles</a>
            </div>
          </div>
          <HeroDemo />
        </section>

        <nav className="cat-strip" aria-label="Legacy collection resources">
          <a className="chip" href="/atlas/">Algorithm atlas</a>
          <a className="chip" href="/problem/">Problems and rival methods</a>
          <a className="chip" href="/category/">Fields</a>
          <a className="chip" href="#listen">Listening</a>
        </nav>

        <section id="pairs">
          <h2 className="eyebrow">all {LIVE_PUZZLES.length} legacy lessons</h2>
          <nav className="cat-strip" aria-label="Jump to a legacy category">
            {GROUPS.map((group) => (
              <a key={group.key} className="chip" href={`#cat-${group.key}`}>
                {group.label} <b className="cat-count">{group.puzzles.length}</b>
              </a>
            ))}
          </nav>
          {GROUPS.map((group) => (
            <section key={group.key} className="pairs-group" aria-labelledby={`cat-${group.key}`}>
              <h3 className="eyebrow cat-head" id={`cat-${group.key}`}>{group.label}</h3>
              <div className="pairs-grid">
                {group.puzzles.map((puzzle) => <PairCard key={puzzle.slug} puzzle={puzzle} />)}
              </div>
            </section>
          ))}
        </section>

        <section id="listen" className="doctrine">
          <h2 className="eyebrow">read or listen</h2>
          <p>
            Each lesson has a written explanation and a spoken version. Open a
            lesson and use its Listen or Text Narration control. Recorded lessons
            offer two voices; earlier lessons use the voices available in your browser.
          </p>
          <p>
            Listening requires no account. Choose a voice and pace in the player.
            The legacy lessons keep their existing recordings and playback controls.
          </p>
        </section>
      </div>
    </SiteShell>
  );
}
