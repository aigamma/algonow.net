import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import './theme.css';
import Home from './pages/Home.jsx';
import { stampedDay } from './lib/day.js';

// The build prerenders this page into #root, so first paint no longer waits
// for React to download, parse, and run: the browser paints the header and the
// hero straight from the HTML. Measured on a throttled phone profile, that is
// the difference between painting at 2.4s and painting at 1.6s.
//
// Hydrate when that markup is there and render normally when it is not, which
// is the dev server, where #root is empty and there is nothing to match.
const container = document.getElementById('root');
const day = stampedDay(container);
const app = (
  <React.StrictMode>
    <Home day={day} />
  </React.StrictMode>
);

if (container.firstChild) hydrateRoot(container, app);
else createRoot(container).render(app);
