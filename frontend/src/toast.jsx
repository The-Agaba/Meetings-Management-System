import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const ToastCtx = createContext(null);

const ICONS = {
  success: <CheckCircle2 size={18} />,
  error: <AlertCircle size={18} />,
  info: <Info size={18} />,
};

/** Stable id so error toasts always replace — never stack duplicates. */
const ERROR_ID = '__error__';
let _id = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});
  const lastErrorRef = useRef({ message: '', at: 0 });

  const clearTimer = (id) => {
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  };

  const push = useCallback((message, type = 'info', duration = 4500) => {
    if (!message) return;

    if (type === 'error') {
      const now = Date.now();
      // Ignore the exact same error fired twice within 2 s (double-submit / StrictMode).
      if (lastErrorRef.current.message === message && now - lastErrorRef.current.at < 2000) return;
      lastErrorRef.current = { message, at: now };

      clearTimer(ERROR_ID);
      setToasts(prev => [...prev.filter(t => t.id !== ERROR_ID), { id: ERROR_ID, message, type }]);
      timersRef.current[ERROR_ID] = setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== ERROR_ID));
        lastErrorRef.current = { message: '', at: 0 };
        delete timersRef.current[ERROR_ID];
      }, duration);
      return;
    }

    const id = ++_id;
    clearTimer(id);
    setToasts(prev => [...prev, { id, message, type }]);
    timersRef.current[id] = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      delete timersRef.current[id];
    }, duration);
  }, []);

  const dismiss = useCallback((id) => {
    clearTimer(id);
    if (id === ERROR_ID) lastErrorRef.current = { message: '', at: 0 };
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="toast-host" role="status" aria-live="polite">
      {toasts.map(t => (
        <ToastItem key={t.id} {...t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ id, message, type, onDismiss }) {
  return (
    <div className={`toast-item toast-${type}`}>
      <span className="toast-icon">{ICONS[type] || ICONS.info}</span>
      <span className="toast-message">{message}</span>
      <button type="button" className="toast-dismiss" onClick={() => onDismiss(id)} aria-label="Dismiss">
        <X size={15} />
      </button>
    </div>
  );
}
