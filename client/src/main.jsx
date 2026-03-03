import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import './ui-upgrade.css';
import './facebook-orange.css';

const rootElement = document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
