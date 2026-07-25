/* generated_from: fabric/company/v1/runtime/commands/runtime.mjs
 * target: src/main.jsx
 * fabric_version: v1
 * generated_at_utc: 2026-05-05T18:11:21.498Z
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { LocaleProvider } from './lib/i18n/index.js';
import './styles.css';
import './design-system/tokens.css';
import './design-system/layout.css';
import './register-service-worker.js';
import './lib/installPrompt/installPromptCapture.js';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LocaleProvider>
      <App />
    </LocaleProvider>
  </React.StrictMode>,
);
