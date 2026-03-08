import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';
import { postMessage } from './types/messages';

// Global error handler — catches anything React misses
window.onerror = (msg, src, line, col, err) => {
  try { postMessage({ type: 'log', level: 'error', message: `[GLOBAL] ${msg}`, data: `${src}:${line}:${col} ${err?.stack || ''}` }); } catch (_e) { /* */ }
};
window.onunhandledrejection = (e) => {
  try { postMessage({ type: 'log', level: 'error', message: `[UNHANDLED] ${e.reason}` }); } catch (_e) { /* */ }
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
