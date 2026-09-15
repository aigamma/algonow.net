import { useEffect, useState } from 'react';
import MotionControl from './MotionControl.jsx';
import { CREATOR_LINK, HEADER_LINKS } from '../data/site-chrome.js';

export function Wordmark() {
  return (
    <a className="wordmark" href="/" aria-label="algonow.net home">
      <span className="wm-algo">algo</span>now
      <span className="wm-tld">.net</span>
    </a>
  );
}

export default function SiteShell({ children, newCount: given = null }) {
  // The header's new-puzzle count loads lazily in the browser so the
  // registry never joins SiteShell's shared chunk (it blew the 20KB
  // page budget when imported statically); the chunk it lives in is
  // already cached by every hydrated page.
  //
  // A page that already holds the registry passes the count in instead. The
  // homepage does, which is what lets the pill be prerendered: arriving in the
  // markup rather than after a dynamic import, it cannot reflow the header.
  const [loaded, setLoaded] = useState(0);
  const newCount = given ?? loaded;
  useEffect(() => {
    if (given !== null) return undefined;
    let alive = true;
    import('../data/puzzles.js')
      .then(({ LIVE_PUZZLES, isNewPuzzle }) => {
        if (alive) setLoaded(LIVE_PUZZLES.filter((p) => isNewPuzzle(p)).length);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [given]);
  return (
    <>
      <header className="site-header">
        <div className="wrap">
          <Wordmark />
          <div className="site-header-right">
            <nav className="site-nav" aria-label="Site">
              {newCount > 0 && (
                <a className="nav-pill nav-new" href="/#new">
                  new · {newCount}
                </a>
              )}
              {HEADER_LINKS.map((link) => (
                <a
                  key={link.href}
                  className={`nav-pill nav-pill-${link.tone}`}
                  href={link.href}
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <MotionControl />
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <div className="wrap">
          <span>algonow.net · algorithms, paired with the heuristics that steer them</span>
          <span>
            written twice: once for your eyes, once for your ears · solutions in{' '}
            <a href="https://www.python.org" rel="noopener">Python</a>
          </span>
          <a className="site-footer-author" href={CREATOR_LINK.href}>
            {CREATOR_LINK.label}
          </a>
        </div>
      </footer>
    </>
  );
}
