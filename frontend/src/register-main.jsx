import React from 'react';
import { createRoot } from 'react-dom/client';
import RegisterApp from './RegisterApp.jsx';
import { ToastProvider } from './toast.jsx';
import './styles.css';
import './flag-theme.css';

createRoot(document.getElementById('root')).render(
  <ToastProvider><RegisterApp /></ToastProvider>
);
