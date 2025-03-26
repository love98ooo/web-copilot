import React from 'react';
import { createRoot } from 'react-dom/client';
import { SettingsPage } from './SettingsPage';
import '@/index.css';

const container = document.getElementById('app');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <SettingsPage />
    </React.StrictMode>
  );
}