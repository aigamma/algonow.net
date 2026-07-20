import React from 'react';
import { createRoot } from 'react-dom/client';
import '../src/theme.css';
import PuzzlePage from '../src/components/PuzzlePage.jsx';
import { PUZZLES } from '../src/data/puzzles.js';
import { content } from '../src/content/branchbound-fractional.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PuzzlePage puzzle={PUZZLES['/branchbound-fractional/']} content={content} />
  </React.StrictMode>
);
