export function Wordmark() {
  return (
    <a className="wordmark" href="/" aria-label="algonow home">
      <span className="wm-algo">algo</span>now
      <span className="wm-caret" aria-hidden="true" />
    </a>
  );
}

export default function SiteShell({ children }) {
  return (
    <>
      <header className="site-header">
        <div className="wrap">
          <Wordmark />
          <nav className="site-nav" aria-label="Site">
            <a href="/#pairs">pairs</a>
            <a href="/#listen">listen</a>
          </nav>
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
