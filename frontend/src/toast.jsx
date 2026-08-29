import React, { createContext, useCallback, useContext, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

/* ── Context ─────────────────────────────────────────────── */

const ToastCtx = createContext(null);

const ICONS = {
  success: <CheckCircle2 size={18} />,
  error:   <AlertCircle  size={18} />,
  info:    <Info         size={18} />,
};

let _id = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, type = 'info', duration = 4500) => {
    const id = ++_id;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const dismiss = useCallback(id => setToasts(prev => prev.filter(t => t.id !== id)), []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastCtx.Provider>
  );
}

/** Call this hook anywhere inside ToastProvider to push notifications. */
export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

/* ── Container + individual toast ────────────────────────── */

function ToastContainer({ toasts, onDismiss }) {
  return (
    <div style={{
      position: 'fixed', top: 20, right: 20, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 10,
      pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <ToastItem key={t.id} {...t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ id, message, type, onDismiss }) {
  const colors = {
    success: { bg: '#1a6e3c', accent: '#22c55e' },
    error:   { bg: '#7f1d1d', accent: '#ef4444' },
    info:    { bg: '#1e3a5f', accent: '#60a5fa' },
  };
  const { bg, accent } = colors[type] || colors.info;

  return (
    <div
      className="toast-item"
      style={{
        background: bg,
        borderLeft: `4px solid ${accent}`,
        color: '#fff',
        padding: '13px 16px',
        borderRadius: 9,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontSize: 13,
        fontWeight: 600,
        maxWidth: 380,
        boxShadow: '0 8px 24px rgba(0,0,0,.25)',
        pointerEvents: 'auto',
        animation: 'toastSlideIn .28s cubic-bezier(.175,.885,.32,1.275)',
      }}
    >
      <span style={{ color: accent, flexShrink: 0 }}>{ICONS[type]}</span>
      <span style={{ flex: 1 }}>{message}</span>
      <button
        onClick={() => onDismiss(id)}
        style={{
          border: 0, background: 'none', color: '#ffffff88',
          cursor: 'pointer', padding: 2, display: 'grid', placeItems: 'center',
          flexShrink: 0,
        }}
        aria-label="Dismiss"
      >
        <X size={15} />
      </button>
    </div>
  );
}
