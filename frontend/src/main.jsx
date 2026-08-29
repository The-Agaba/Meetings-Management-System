import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { ToastProvider } from './toast.jsx';
import './styles.css';
import './flag-theme.css';
import './pwa';

createRoot(document.getElementById('root')).render(
  <ToastProvider><App /></ToastProvider>
);
