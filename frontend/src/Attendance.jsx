import React, { useEffect, useRef, useState } from 'react';
import { CalendarDays, CheckCircle2, Loader2, MapPin, QrCode } from 'lucide-react';
import { Brand } from './ui.jsx';
import { copy } from './utils.js';
import { useToast } from './toast.jsx';

/* Participant sign-in page: scans the rotating Session QR Code shown by the organiser
   and posts it together with the personal token from the Personal Sign-In Link. */
export default function Attendance({ lang, setLang }) {
  const t = copy[lang];
  const toast = useToast();
  const token = new URLSearchParams(location.search).get('token');
  const [data, setData] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState('');
  const [done, setDone] = useState('');
  const [busy, setBusy] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const load = () => fetch('/api/attendance/' + token)
    .then(async r => { if (!r.ok) throw Error('invalid'); return r.json(); })
    .then(setData)
    .catch(() => setData(false));

  useEffect(() => { if (token) load(); }, [token]);
  useEffect(() => () => streamRef.current?.getTracks().forEach(track => track.stop()), []);

  const submit = async (payload) => {
    setBusy(true);
    try {
      const r = await fetch('/api/attendance/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personal_token: token, qr_payload: payload })
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw Error(body.message || t.signInFailed);
      streamRef.current?.getTracks().forEach(track => track.stop());
      setScanning(false);
      setDone(t.signedIn);
      toast(t.signedIn, 'success');
      await load();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const startCamera = async () => {
    if (!('BarcodeDetector' in window)) { setScanning('manual'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setScanning(true);
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const tick = async () => {
        if (!streamRef.current?.active || !videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length) { await submit(codes[0].rawValue); return; }
        } catch { /* frame not ready */ }
        requestAnimationFrame(tick);
      };
      setTimeout(() => { if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); tick(); } }, 0);
    } catch {
      setScanning('manual');
      toast(t.cameraUnavailable, 'error');
    }
  };

  if (!token || data === false) {
    return (
      <>
        <Brand lang={lang} setLang={setLang} />
        <main className="auth-shell"><section className="auth-card"><p className="error">{t.invalid}</p></section></main>
      </>
    );
  }
  if (!data) {
    return (
      <>
        <Brand lang={lang} setLang={setLang} />
        <main className="auth-shell"><section className="auth-card"><p className="muted">{t.loading}</p></section></main>
      </>
    );
  }

  return (
    <>
      <Brand lang={lang} setLang={setLang} />
      <main className="rsvp-shell">
        <section className="rsvp-card">
          <div className="eyebrow green">{data.meeting.reference}</div>
          <h1>{t.attendance}</h1>
          <p className="rsvp-name">{data.participant}</p>
          <div className="rsvp-event">
            <h2>{data.meeting.title}</h2>
            <div><CalendarDays size={17} />{new Date(data.meeting.start_at).toLocaleString()}</div>
            <div><MapPin size={17} />{data.meeting.location}</div>
          </div>

          {data.attended || done ? (
            <p className="success"><CheckCircle2 size={17} /> {t.signedIn}{data.signed_in_at ? ` — ${new Date(data.signed_in_at).toLocaleString()}` : ''}</p>
          ) : (
            <>
              <p className="muted">{t.scanHint}</p>
              {scanning === true && <video ref={videoRef} playsInline muted style={{ width: '100%', borderRadius: 12, marginBottom: 12 }} />}
              {scanning !== true && (
                <button className="primary full" onClick={startCamera} disabled={busy}>
                  {busy ? <Loader2 size={17} className="spinner" /> : <><QrCode size={17} />{t.scanQr}</>}
                </button>
              )}
              <label>{t.qrManual}
                <textarea value={manual} onChange={e => setManual(e.target.value)} rows={3} />
              </label>
              <button className="secondary full" disabled={!manual || busy} onClick={() => submit(manual)}>{t.signIn}</button>
            </>
          )}
        </section>
      </main>
    </>
  );
}
