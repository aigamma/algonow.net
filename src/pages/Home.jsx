import { useEffect, useState } from 'react';
import SiteShell from '../components/SiteShell.jsx';
import HeroDemo from '../viz/HeroDemo.jsx';
import { LIVE_PUZZLES, ROADMAP, pairTitle, puzzlePath, isNewPuzzle } from '../data/puzzles.js';
import { CATEGORIES } from '../data/atlas-categories.js';
import { dayNow, dayStart } from '../lib/day.js';

function PairTitle({ algorithm, heuristic }) {
  return (
    <h3>
      <span className="t-algo">{algorithm}</span>
      <span className="t-x">×</span>
      <span className="t-heur">{heuristic}</span>
    </h3>
  );
}

function PairCard({ p, now }) {
  return (
    <a className="pair-card" href={puzzlePath(p)}>
      <span className="pc-number">
        <span>
          puzzle {String(p.number).padStart(2, '0')}
          {isNewPuzzle(p, now) && <span className="pc-new">new</span>}
        </span>
        <span>▶ ~{p.listenMinutes} min</span>
      </span>
      <PairTitle algorithm={p.algorithm} heuristic={p.heuristic} />
      <p className="pc-domain">{p.domain}</p>
      <span className="pc-meta">
        <span className="chip">time {p.time}</span>
        <span className="chip">vs {p.baseline}</span>
      </span>
    </a>
  );
}

// The pairs section groups by atlas category (G7): the registry declares each
// pair's category and the check derives the truth from the atlas, so this
// grouping scales without importing atlas data into the homepage chunk. The
// jump strip means a growing catalog is navigated, not scrolled.
const GROUPS = CATEGORIES.map((c) => ({
  key: c.key,
  label: c.label,
  pairs: LIVE_PUZZLES.filter((p) => p.category === c.key),
})).filter((g) => g.pairs.length > 0);

// How much of the catalog the prerendered HTML carries. The rest is rendered
// straight after hydration, below the fold, which is why it costs no layout
// shift.
//
// This exists because of how PageSpeed Insights' mobile runner behaves, and
// the numbers are worth keeping. The whole catalog in the HTML is 69KB and
// 1559 elements, and that page first-paints at about 2.4 seconds there, even
// though every byte has arrived by 686ms, the main thread does 0.2s of work,
// and there are no long tasks. The stall tracks document size and nothing
// else: on the same host and stylesheet, /category/ at 86 elements paints at
// 281ms, /problem/ at 2043 elements paints at 2361ms, and copies of this page
// cut to eight of eighteen sections (43KB) paint at 220ms and score 100 on a
// runner slower than any of the failures.
//
// The budget counts CARDS rather than categories so it holds as the catalog
// grows by about ten a week: adding pairs shortens the opening list instead of
// quietly fattening the HTML back past the cliff.
export const FIRST_PAINT_CARDS = 70;

// Categories in order until one would push the card count past the budget. At
// least one always survives, however large the first category becomes.
export function openingGroups(groups, budget = FIRST_PAINT_CARDS) {
  const opening = [];
  let cards = 0;
  for (const g of groups) {
    if (opening.length && cards + g.pairs.length > budget) break;
    opening.push(g);
    cards += g.pairs.length;
  }
  return opening;
}

const OPENING = openingGroups(GROUPS);

// The daily anchor: the site's purpose is daily exposure, so every visitor
// sees the same deterministic pick on the same day, with zero storage and
// zero fetches. UTC days-since-epoch keeps the pick identical across
// timezones and across visitors.
export function todaysPair(day = dayNow()) {
  return LIVE_PUZZLES[day % LIVE_PUZZLES.length];
}

// `stamped` is the day the served markup was rendered for, handed down from
// the root element by main.jsx. The first client render has to reproduce that
// markup exactly or hydration throws it away, so the page opens on the stamped
// day and only then looks at the clock.
//
// The two date-driven things on this page correct differently, on purpose.
// The daily pair is the site's whole premise, so it adopts the reader's real
// day one effect after hydration: that swaps text inside a card whose box is
// already laid out, measured at 0.0004 CLS on a five day stale build.
//
// The new-this-week section does not correct, because it is structure rather
// than text. Letting it appear or vanish after hydration moves every section
// below it: measured at 0.1209 desktop CLS, over the 0.1 threshold, on top of
// being a worse thing to watch happen. It is a build-time fact instead, and
// the next deploy replaces it. A batch of about ten ships every week and the
// deploy rides along with it, so "the batch this build knows about" and "the
// batch still inside its seven day window" are the same set except in the day
// or so before a deploy lands, where a badge lingers rather than flickering.
export default function Home({ day: stamped = null }) {
  const buildDay = stamped ?? dayNow();
  const [day, setDay] = useState(buildDay);
  // The catalog opens at the prerendered length and completes itself once
  // hydration has matched. Both state changes happen in the one effect, so
  // React batches them into a single re-render.
  const [whole, setWhole] = useState(false);
  useEffect(() => {
    setDay(dayNow());
    setWhole(true);
  }, []);

  const now = dayStart(buildDay);
  const today = todaysPair(day);
  const fresh = LIVE_PUZZLES.filter((p) => isNewPuzzle(p, now));
  const groups = whole ? GROUPS : OPENING;
  const rendered = new Set(groups.map((g) => g.key));
  return (
    <SiteShell newCount={fresh.length}>
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
          <h2 className="eyebrow">today&apos;s pair</h2>
          <a className="pair-card pc-today" href={puzzlePath(today)}>
            <span className="pc-number">
              <span>
                puzzle {String(today.number).padStart(2, '0')} · today
                {isNewPuzzle(today, now) && <span className="pc-new">new</span>}
              </span>
              <span>▶ Listen · ~{today.listenMinutes} min</span>
            </span>
            <PairTitle algorithm={today.algorithm} heuristic={today.heuristic} />
            <p className="pc-domain">{today.oneLiner}</p>
          </a>

          {fresh.length > 0 && (
            <>
              <h2 className="eyebrow nav-new-target" id="new">
                new this week
              </h2>
              <div className="pairs-grid">
                {fresh.map((p) => (
                  <PairCard key={p.slug} p={p} now={now} />
                ))}
              </div>
            </>
          )}

          <h2 className="eyebrow">the pairs · {LIVE_PUZZLES.length} live</h2>
          {/* Every category is always in the strip, at full width, so it cannot
              reflow when the rest of the catalog arrives. A chip whose section
              is not on the page yet points at that category's own page, which
              is fully prerendered and needs no JavaScript, so the link works
              for a reader who has none and for the moment before hydration. */}
          <nav className="cat-strip" aria-label="Jump to a category">
            {GROUPS.map((g) => (
              <a
                key={g.key}
                className="chip"
                href={rendered.has(g.key) ? `#cat-${g.key}` : `/category/${g.key}/`}
              >
                {g.label} <b className="cat-count">{g.pairs.length}</b>
              </a>
            ))}
          </nav>
          {groups.map((g) => (
            <section key={g.key} className="pairs-group" aria-labelledby={`cat-${g.key}`}>
              <h3 className="eyebrow cat-head" id={`cat-${g.key}`}>
                {g.label}
              </h3>
              <div className="pairs-grid">
                {g.pairs.map((p) => (
                  <PairCard key={p.slug} p={p} now={now} />
                ))}
              </div>
            </section>
          ))}

          {ROADMAP.length > 0 && (
            <>
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
            </>
          )}
        </section>

        <a href="/atlas/" className="atlas-teaser">
          <div>
            <span className="at-eyebrow">the atlas</span>
            <p className="at-headline">
              Every puzzle above is one pairing from the atlas, this site&apos;s map of
              real named algorithms and heuristics.{' '}
              <b>{LIVE_PUZZLES.length} pairings are built out as full lessons</b>, and
              roughly <b>ten new puzzles land each week</b>.
            </p>
            <p className="at-sub">
              The rest of the map is the queue, not the content: index-card entries with
              nothing to learn from yet, each already wired to its rivals so tomorrow&apos;s
              lessons arrive connected. The atlas lives at the link below and in the
              header on every page.
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
