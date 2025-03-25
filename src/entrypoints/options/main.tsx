import React from 'react';
import { createRoot } from 'react-dom/client';
import OptionsPage from '@/entrypoints/options/OptionsPage';
import '@/assets/tailwind.css';

const root = document.getElementById('app');
if (!root) {
  throw new Error('Root element not found');
}

createRoot(root).render(
  <React.StrictMode>
    <OptionsPage />
  </React.StrictMode>
);