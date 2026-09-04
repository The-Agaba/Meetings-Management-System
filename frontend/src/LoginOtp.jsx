import React, { useState, useEffect } from 'react';
import { ChevronRight, Mail, ShieldCheck, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Brand } from './ui.jsx';
import { copy, api } from './utils.js';
import OtpBoxes from './OtpBoxes.jsx';
import OfflineBanner from './OfflineBanner.jsx';
import { useToast } from './toast.jsx';

export default function LoginOtp({ lang, setLang, onLogin }) {
  const t = copy[lang];
  const toast = useToast();
  const text = lang === 'en' ? {
    access: 'SECURE STAFF ACCESS',
    signInHint: 'Sign in with your email and password.',
    resetPassword: 'Reset password',
    enterResetCode: 'Enter reset code',
    resetHint: 'We will email a one-time code if the account exists.',
    verificationCode: 'Verification code',
    newPassword: 'New password',
    sendResetCode: 'Send reset code',
    setNewPassword: 'Set new password',
    forgotPassword: 'Forgot password?',
    backToSignIn: 'Back to sign in',
    passwordUpdated: 'Password updated. You can now sign in.',
    officialUse: 'Official internal use only'
  } : {
    access: 'UFIKIAJI SALAMA WA WATUMISHI',
    signInHint: 'Ingia kwa kutumia barua pepe na nenosiri lako.',
    resetPassword: 'Weka upya nenosiri',
    enterResetCode: 'Ingiza msimbo wa kuweka upya',
    resetHint: 'Tutakutumia msimbo wa mara moja kwa barua pepe ikiwa akaunti ipo.',
    verificationCode: 'Msimbo wa uthibitisho',
    newPassword: 'Nenosiri jipya',
    sendResetCode: 'Tuma msimbo wa kuweka upya',
    setNewPassword: 'Weka nenosiri jipya',
    forgotPassword: 'Umesahau nenosiri?',
    backToSignIn: 'Rudi kwenye kuingia',
    passwordUpdated: 'Nenosiri limesasishwa. Sasa unaweza kuingia.',
    officialUse: 'Kwa matumizi rasmi ya ndani pekee'
  };

  const [form, setForm] = useState({ email: '', password: '' });
  const [stage, setStage] = useState('login');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (localStorage.token) location.replace('/');
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (stage === 'login') {
        const d = await api('/api/auth/login', { method: 'POST', body: JSON.stringify(form) });
        localStorage.token = d.access_token;
        history.replaceState(null, '', '/');
        toast(lang === 'en' ? 'Signed in successfully.' : 'Umeingia kikamilifu.', 'success');
        onLogin(d.user);
      } else if (stage === 'forgot-request') {
        const r = await api('/api/auth/password-reset/request', { method: 'POST', body: JSON.stringify({ email: form.email }) });
        setDevOtp(r.development_email_otp || '');
        setStage('forgot-confirm');
        toast(r.message, 'info');
      } else {
        await api('/api/auth/password-reset/confirm', {
          method: 'POST',
          body: JSON.stringify({ email: form.email, code: resetCode, password: newPassword })
        });
        toast(text.passwordUpdated, 'success');
        setStage('login');
        setResetCode('');
        setNewPassword('');
        setDevOtp('');
      }
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const title = stage === 'login' ? t.signIn : stage === 'forgot-request' ? text.resetPassword : text.enterResetCode;

  return (
    <>
      <OfflineBanner lang={lang} />
      <Brand lang={lang} setLang={setLang} />
      <main className="auth-shell">
        <section className="auth-card">
          <div className="auth-kicker"><ShieldCheck size={16} /> {text.access}</div>
          <h1>{title}</h1>
          <p className="muted">{stage === 'login' ? text.signInHint : text.resetHint}</p>

          <form onSubmit={submit}>
            {(stage === 'login' || stage === 'forgot-request') && (
              <label>
                {t.email}
                <div className="input-wrap">
                  <Mail size={17} />
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required autoComplete="email" />
                </div>
              </label>
            )}
            {stage === 'login' && (
              <label>
                {t.password}
                <div className="input-wrap">
                  <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required autoComplete="current-password" />
                  <button type="button" className="icon-button" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>
            )}
            {stage === 'forgot-confirm' && (
              <>
                <label>
                  {text.verificationCode}
                  <OtpBoxes label={text.verificationCode} value={resetCode} onChange={setResetCode} numeric />
                </label>
                <label>{text.newPassword}<input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={8} required autoComplete="new-password" /></label>
              </>
            )}

            <button className="primary full" disabled={loading} style={{ marginTop: 10 }}>
              {loading ? <Loader2 size={17} className="spinner" /> : (stage === 'login' ? t.continue : stage === 'forgot-request' ? text.sendResetCode : text.setNewPassword)}
              {!loading && <ChevronRight size={17} />}
            </button>
          </form>

          {stage === 'login' && (
            <>
              <button type="button" className="text-button auth-link" style={{ border: 0, width: '100%' }} onClick={() => setStage('forgot-request')}>
                {text.forgotPassword}
              </button>
              <a className="auth-link" href="/register.html" onClick={e => { e.preventDefault(); location.replace('/register.html'); }}>{t.register}</a>
            </>
          )}
          {stage !== 'login' && (
            <button type="button" className="text-button auth-link" style={{ border: 0, width: '100%' }} onClick={() => { setStage('login'); setResetCode(''); setNewPassword(''); setDevOtp(''); }}>
              {text.backToSignIn}
            </button>
          )}
          <div className="auth-footer">{text.officialUse}</div>
        </section>
      </main>
    </>
  );
}
