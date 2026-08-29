import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, Clock, Mail, ShieldCheck, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { Brand } from './ui.jsx';
import { copy, api } from './utils.js';
import OtpBoxes from './OtpBoxes.jsx';
import { useToast } from './toast.jsx';

/** Resend cooldown in seconds — 60 s is the industry standard (Google, GitHub, AWS Cognito, etc.) */
const RESEND_COOLDOWN = 60;

/** Live countdown + greyed resend button block */
function ResendCooldown({ seconds, label, onResend, resending, lang }) {
  const cooling = seconds > 0;
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <div style={{ marginTop: 8 }}>
      {cooling && (
        <div className="otp-cooldown-warning">
          <Clock size={14} style={{ flexShrink: 0 }} />
          <span>
            {lang === 'en'
              ? <>New OTP cannot be requested for <strong>{mm}:{ss}</strong></>
              : <>OTP mpya haiwezi kuombwa kwa <strong>{mm}:{ss}</strong></>}
          </span>
        </div>
      )}
      <button
        type="button"
        className="text-button otp-resend"
        onClick={onResend}
        disabled={cooling || resending}
        style={{ opacity: cooling ? 0.42 : 1, cursor: cooling ? 'not-allowed' : 'pointer' }}
      >
        {resending
          ? <><Loader2 size={13} className="spinner" /> {lang === 'en' ? 'Sending…' : 'Inatuma…'}</>
          : (lang === 'en' ? label.en : label.sw)}
      </button>
    </div>
  );
}

export default function LoginOtp({ lang, setLang, onLogin }) {
  const t = copy[lang];
  const toast = useToast();

  const [form, setForm] = useState({ email: '', password: '' });
  const [stage, setStage] = useState('credentials');
  const [codes, setCodes] = useState({ email: '', whatsapp: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resending, setResending] = useState({ email: false, phone: false });
  const [developmentCode, setDevelopmentCode] = useState('');

  /* ── Cooldown timers ─────────────────────────────────── */
  const [cooldown, setCooldown] = useState({ email: 0, phone: 0 });
  const timerRef = useRef({});

  const startCooldown = (channel) => {
    setCooldown(prev => ({ ...prev, [channel]: RESEND_COOLDOWN }));
    clearInterval(timerRef.current[channel]);
    timerRef.current[channel] = setInterval(() => {
      setCooldown(prev => {
        const next = Math.max(0, prev[channel] - 1);
        if (next === 0) clearInterval(timerRef.current[channel]);
        return { ...prev, [channel]: next };
      });
    }, 1000);
  };

  useEffect(() => () => Object.values(timerRef.current).forEach(clearInterval), []);

  /* ── Auto-dismiss inline error ───────────────────────── */
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(''), 6000);
    return () => clearTimeout(t);
  }, [error]);

  /* ── Submit ──────────────────────────────────────────── */
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (stage === 'credentials') {
        const d = await api('/api/auth/login/start', { method: 'POST', body: JSON.stringify(form) });
        setDevelopmentCode(d.development_email_otp || '');
        setStage(d.whatsapp_enabled ? 'both' : 'email');
        startCooldown('email');
        if (d.whatsapp_enabled) startCooldown('phone');
        toast(lang === 'en' ? 'OTP sent to your email.' : 'OTP imetumwa kwa barua pepe yako.', 'info');
      } else {
        const d = await api('/api/auth/login/verify', {
          method: 'POST',
          body: JSON.stringify({
            email: form.email,
            email_code: codes.email,
            whatsapp_code: stage === 'both' ? codes.whatsapp : ''
          })
        });
        localStorage.token = d.access_token;
        toast(lang === 'en' ? 'Signed in successfully.' : 'Umeingia kikamilifu.', 'success');
        onLogin(d.user);
      }
    } catch (err) {
      setError(err.message);
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  /* ── Resend ──────────────────────────────────────────── */
  const resend = async (channel) => {
    if (cooldown[channel] > 0) return;
    setResending(prev => ({ ...prev, [channel]: true }));
    try {
      const result = await api('/api/auth/resend', { method: 'POST', body: JSON.stringify({ email: form.email, channel }) });
      if (channel === 'email') setDevelopmentCode(result?.development_email_otp || '');
      startCooldown(channel);
      toast(
        lang === 'en' ? `OTP resent via ${channel === 'email' ? 'email' : 'WhatsApp'}.` : `OTP imetumwa tena kwa ${channel === 'email' ? 'barua pepe' : 'WhatsApp'}.`,
        'success'
      );
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setResending(prev => ({ ...prev, [channel]: false }));
    }
  };

  return (
    <>
      <Brand lang={lang} setLang={setLang} />
      <main className="auth-shell">
        <div className={`toast-error ${error ? 'show' : ''}`}><AlertCircle size={20} /><span>{error}</span></div>
        <section className="auth-card">
          <div className="auth-kicker"><ShieldCheck size={16} /> SECURE STAFF ACCESS</div>
          <h1>{t.signIn}</h1>
          <p className="muted">{t.portal}</p>

          <form onSubmit={submit}>
            {stage === 'credentials' ? (
              <>
                <label>
                  {t.email}
                  <div className="input-wrap">
                    <Mail size={17} />
                    <input id="login-email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required autoComplete="email" />
                  </div>
                </label>
                <label>
                  {t.password}
                  <div className="input-wrap">
                    <input id="login-password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required autoComplete="current-password" />
                    <button type="button" className="icon-button" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </label>
              </>
            ) : (
              <>
                <label>
                  {t.emailVerification}
                  <OtpBoxes label={t.emailVerification} value={codes.email} onChange={email => setCodes({ ...codes, email })} />
                  <small>{t.otpEmail}</small>
                  {developmentCode && <small className="dev-otp">Local test OTP: <strong>{developmentCode}</strong></small>}
                  <ResendCooldown
                    seconds={cooldown.email}
                    label={{ en: 'Resend email OTP', sw: 'Tuma tena OTP ya barua pepe' }}
                    onResend={() => resend('email')}
                    resending={resending.email}
                    lang={lang}
                  />
                </label>
                {stage === 'both' && (
                  <label>
                    {t.whatsappVerification}
                    <OtpBoxes label={t.whatsappVerification} value={codes.whatsapp} onChange={whatsapp => setCodes({ ...codes, whatsapp })} />
                    <small>{t.otpWhatsapp}</small>
                    <ResendCooldown
                      seconds={cooldown.phone}
                      label={{ en: 'Resend WhatsApp OTP', sw: 'Tuma tena OTP ya WhatsApp' }}
                      onResend={() => resend('phone')}
                      resending={resending.phone}
                      lang={lang}
                    />
                  </label>
                )}
              </>
            )}

            <button id="login-submit" className="primary full" disabled={loading} style={{ marginTop: 10 }}>
              {loading ? <Loader2 size={17} className="spinner" /> : (stage === 'credentials' ? t.continue : t.verifyOtp)}
              {!loading && <ChevronRight size={17} />}
            </button>
          </form>

          <a className="auth-link" href="/register.html">{t.register}</a>
          <div className="auth-footer">Official internal use only</div>
        </section>
      </main>
    </>
  );
}
