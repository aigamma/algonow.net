import { useEffect, useState } from 'react';
import MotionControl from './MotionControl.jsx';

export function Wordmark() {
  return (
    <a className="wordmark" href="/" aria-label="algonow home">
      <span className="wm-algo">algo</span>now
      <span className="wm-caret" aria-hidden="true" />
    </a>
  );
}

export default function SiteShell({ children }) {
  // The header's new-puzzle count loads lazily in the browser so the
  // registry never joins SiteShell's shared chunk (it blew the 20KB
  // page budget when imported statically); the chunk it lives in is
  // already cached by every hydrated page.
  const [newCount, setNewCount] = useState(0);
  useEffect(() => {
    let alive = true;
    import('../data/puzzles.js')
      .then(({ LIVE_PUZZLES, isNewPuzzle }) => {
        if (alive) setNewCount(LIVE_PUZZLES.filter((p) => isNewPuzzle(p)).length);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return (
    <>
      <header className="site-header">
        <div className="wrap">
          <Wordmark />
          <div className="site-header-right">
            <nav className="site-nav" aria-label="Site">
              {newCount > 0 && (
                <a className="nav-new" href="/#new">
                  new · {newCount}
                </a>
              )}
              <a href="/#pairs">pairs</a>
              <a href="/atlas/">atlas</a>
              <a href="/problem/">problems</a>
              <a href="/category/">fields</a>
              <a href="/#listen">listen</a>
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
        </div>
      </footer>
    </>
  );
}
