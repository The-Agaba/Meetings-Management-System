import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Clock, Mail, Phone, ShieldCheck, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { Brand } from './ui.jsx';
import { copy, api } from './utils.js';
import OtpBoxes from './OtpBoxes.jsx';
import { useToast } from './toast.jsx';

const RESEND_COOLDOWN = 60;

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

export default function Register({ lang, setLang }) {
  const t = copy[lang];
  const toast = useToast();

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [stage, setStage] = useState('details');
  const [codes, setCodes] = useState({ email: '', whatsapp: '' });
  const [whatsapp, setWhatsapp] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  useEffect(() => {
    if (!error) return;
    const id = setTimeout(() => setError(''), 6000);
    return () => clearTimeout(id);
  }, [error]);

  /* ── Submit ──────────────────────────────────────────── */
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (stage === 'details' && form.password !== form.confirmPassword) {
      const msg = lang === 'en' ? 'Passwords do not match' : 'Manenosiri hayalingani';
      setError(msg); toast(msg, 'error'); return;
    }
    setLoading(true);
    try {
      if (stage === 'details') {
        const result = await api('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name: form.name, email: form.email, phone: form.phone, password: form.password })
        });
        setDevelopmentCode(result.development_email_otp || '');
        const cfg = await api('/api/auth/config');
        setWhatsapp(cfg.whatsapp_enabled);
        setStage(cfg.whatsapp_enabled ? 'verify-both' : 'verify-email');
        startCooldown('email');
        if (cfg.whatsapp_enabled) startCooldown('phone');
        toast(lang === 'en' ? 'Account created. Verify your OTP to activate it.' : 'Akaunti imeundwa. Thibitisha OTP yako.', 'info');
      } else {
        await api('/api/auth/verify', { method: 'POST', body: JSON.stringify({ email: form.email, channel: 'email', code: codes.email }) });
        if (whatsapp) await api('/api/auth/verify', { method: 'POST', body: JSON.stringify({ email: form.email, channel: 'phone', code: codes.whatsapp }) });
        toast(lang === 'en' ? 'Account verified! You can now sign in.' : 'Akaunti imethibitishwa! Sasa unaweza kuingia.', 'success', 6000);
        setDone(true);
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
        lang === 'en'
          ? `OTP resent via ${channel === 'email' ? 'email' : 'WhatsApp'}.`
          : `OTP imetumwa tena kwa ${channel === 'email' ? 'barua pepe' : 'WhatsApp'}.`,
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
          <div className="auth-kicker"><ShieldCheck size={16} /> SECURE STAFF REGISTRATION</div>
          <h1>{done ? t.verifyOtp : t.register}</h1>
          {done ? (
            <>
              <p className="success">{lang === 'en' ? 'Account verified. You can now sign in.' : 'Akaunti imethibitishwa. Sasa unaweza kuingia.'}</p>
              <a className="primary full button-link" href="/">{t.backToSignIn}<ChevronRight size={17} /></a>
            </>
          ) : (
            <>
              <p className="muted">{stage === 'details' ? t.registrationNote : whatsapp ? t.otpBoth : t.otpEmail}</p>
              <form onSubmit={submit}>
                {stage === 'details' ? (
                  <>
                    <label>{t.name}<input id="reg-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></label>
                    <label>{t.email}
                      <div className="input-wrap"><Mail size={17} />
                        <input id="reg-email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                      </div>
                    </label>
                    <label>{t.phone}
                      <div className="input-wrap"><Phone size={17} />
                        <input id="reg-phone" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required />
                      </div>
                    </label>
                    <label>{t.password}
                      <div className="input-wrap">
                        <input id="reg-password" type={showPassword ? 'text' : 'password'} minLength="8" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
                        <button type="button" className="icon-button" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>
                    </label>
                    <label>{lang === 'en' ? 'Confirm password' : 'Thibitisha nenosiri'}
                      <div className="input-wrap">
                        <input id="reg-confirm-password" type={showConfirmPassword ? 'text' : 'password'} minLength="8" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} required />
                        <button type="button" className="icon-button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                          {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>
                    </label>
                  </>
                ) : (
                  <>
                    <label>{t.emailVerification}
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
                    {whatsapp && (
                      <label>{t.whatsappVerification}
                        <OtpBoxes label={t.whatsappVerification} value={codes.whatsapp} onChange={v => setCodes({ ...codes, whatsapp: v })} />
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

                <button id="reg-submit" className="primary full" disabled={loading} style={{ marginTop: 10 }}>
                  {loading ? <Loader2 size={17} className="spinner" /> : (stage === 'details' ? t.continue : t.verifyOtp)}
                  {!loading && <ChevronRight size={17} />}
                </button>
              </form>
              <a className="auth-link" href="/"><ChevronLeft size={14} />{t.backToSignIn}</a>
            </>
          )}
        </section>
      </main>
    </>
  );
}
