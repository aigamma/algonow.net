import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import './theme.css';
import Home from './pages/Home.jsx';

// The build prerenders this page into #root, so first paint no longer waits
// for React to download, parse, and run: the browser paints the header and the
// hero straight from the HTML. Measured on a throttled phone profile, that is
// the difference between painting at 2.4s and painting at 1.6s.
//
// Hydrate when that markup is there and render normally when it is not, which
// is the dev server, where #root is empty and there is nothing to match.
const container = document.getElementById('root');
// Keep bookmarks into the former homepage's classic collection useful.
function redirectLegacyBookmark() {
  const hash = window.location.hash;
  if (['#pairs', '#new', '#listen'].includes(hash) || hash.startsWith('#cat-')) {
    window.location.replace(`/legacy/${hash === '#new' ? '#pairs' : hash}`);
  }
}
redirectLegacyBookmark();
window.addEventListener('hashchange', redirectLegacyBookmark);
const app = (
  <React.StrictMode>
    <Home />
  </React.StrictMode>
);

if (container.firstChild) hydrateRoot(container, app);
else createRoot(container).render(app);
