import React from 'react';
import { createRoot } from 'react-dom/client';
import '../src/theme.css';
import PuzzlePage from '../src/components/PuzzlePage.jsx';
import { PUZZLES } from '../src/data/puzzles.js';
import { content } from '../src/content/sieve-crossing-from-square.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PuzzlePage puzzle={PUZZLES['/sieve-crossing-from-square/']} content={content} />
  </React.StrictMode>
);
