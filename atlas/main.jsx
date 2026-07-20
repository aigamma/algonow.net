import React from 'react';
import { createRoot } from 'react-dom/client';
import '../src/theme.css';
import Atlas from '../src/pages/Atlas.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Atlas />
  </React.StrictMode>
);
