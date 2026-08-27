import React from 'react';
import { createRoot } from 'react-dom/client';
import '../src/theme.css';
import PuzzlePage from '../src/components/PuzzlePage.jsx';
import { PUZZLES } from '../src/data/puzzles.js';
import { content } from '../src/content/gibbs-coordinate-conditionals.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PuzzlePage puzzle={PUZZLES['/gibbs-coordinate-conditionals/']} content={content} />
  </React.StrictMode>
);
