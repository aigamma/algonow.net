import MotionControl from './MotionControl.jsx';
import { CREATOR_LINK, HEADER_LINKS, RELATED_LINKS } from '../data/site-chrome.js';

export function Wordmark() {
  return (
    <a className="wordmark" href="/" aria-label="algonow.net home">
      <span className="wm-algo">algo</span>now
      <span className="wm-tld">.net</span>
    </a>
  );
}

export default function SiteShell({ children }) {
  return (
    <>
      <header className="site-header">
        <div className="wrap">
          <Wordmark />
          <div className="site-header-right">
            <nav className="site-nav" aria-label="Site">
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
          <span>algonow.net · AI engineering, solved in Python</span>
          <span>
            Build, troubleshoot, and evaluate AI systems with{' '}
            <a href="https://www.python.org" rel="noopener">Python</a>
          </span>
          <nav className="related-links" aria-label="Related sites">
            {RELATED_LINKS.map((link) => <a key={link.href} href={link.href}>{link.label}</a>)}
          </nav>
          <a className="site-footer-author" href={CREATOR_LINK.href}>
            {CREATOR_LINK.label}
          </a>
        </div>
      </footer>
    </>
  );
}
