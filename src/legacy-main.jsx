import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import './theme.css';
import Legacy from './pages/Legacy.jsx';

const container = document.getElementById('root');
const app = <React.StrictMode><Legacy /></React.StrictMode>;

if (container.firstChild) hydrateRoot(container, app);
else createRoot(container).render(app);
