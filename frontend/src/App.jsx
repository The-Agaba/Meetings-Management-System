import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle, BellRing, CalendarDays, CheckCircle2, ChevronRight, Clock3, Download,
  FileUp, Loader2, LayoutDashboard, LogOut, MapPin, Plus,
  QrCode, Send, Settings2, Users, X, XCircle
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Brand } from './ui.jsx';
import { copy, api } from './utils.js';
import LoginOtp from './LoginOtp.jsx';
import Attendance from './Attendance.jsx';
import { useToast } from './toast.jsx';

/* ── Layout Shell ───────────────────────────────────────── */

function Shell({ lang, setLang, user, onLogout, children, onAccount, view, onNavigate }) {
  const t = copy[lang];
  return (
    <>
      <Brand lang={lang} setLang={setLang} />
      <div className="app-shell">
        <aside className="sidebar">
          <div className="side-label">MAIN MENU</div>
          <button
            className={`side-link ${view === 'dashboard' ? 'active' : ''}`}
            onClick={() => onNavigate('dashboard')}
          >
            <LayoutDashboard size={17} />{t.dashboard}
          </button>
          <button
            className={`side-link ${view === 'meetings' ? 'active' : ''}`}
            onClick={() => onNavigate('meetings')}
          >
            <CalendarDays size={17} />{t.meetings}
          </button>
          <div className="side-spacer" />
          <div className="side-label">ACCOUNT</div>
          <button
            className={`side-link ${view === 'account' ? 'active' : ''}`}
            onClick={() => onAccount()}
          >
            <Settings2 size={17} />{t.account}
          </button>
          <button className="side-link" onClick={onLogout}>
            <LogOut size={17} />{t.signOut}
          </button>
          <div className="user-chip">
            <div className="avatar">{(user?.name || 'A')[0]}</div>
            <div>
              <strong>{user?.name || 'Administrator'}</strong>
              <small>{user?.role || 'Staff'}</small>
            </div>
          </div>
        </aside>
        <main className="content">{children}</main>
      </div>
    </>
  );
}

/* ── Shared Metric Card ─────────────────────────────────── */

function Metric({ icon, label, value }) {
  return (
    <div className="metric">
      {icon && <div className="metric-icon">{icon}</div>}
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

/* ── Meeting Table ──────────────────────────────────────── */

function MeetingTable({ rows, t, onSelect }) {
  const statusColor = (m) => {
    if (m.past) return 'grey';
    if (m.status === 'published') return 'green';
    if (m.status === 'draft') return 'gold';
    return 'grey';
  };
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{t.title}</th>
            <th>{t.date}</th>
            <th>{t.location}</th>
            <th>Guests</th>
            <th>{t.status}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(m => (
            <tr key={m.id} className={m.past ? 'past-row' : ''}>
              <td>
                <strong>{m.title}</strong>
                <small>{m.reference}</small>
              </td>
              <td>{new Date(m.start_at).toLocaleString()}</td>
              <td>
                <span className="location-cell">
                  <MapPin size={14} />{m.location || 'Council venue'}
                </span>
              </td>
              <td>{m.guest_count || 0}</td>
              <td>
                <span className={`badge ${statusColor(m)}`}>
                  {m.past ? 'Past' : m.status}
                </span>
              </td>
              <td>
                <button className="icon-button" title={t.view} onClick={() => onSelect(m.id)}>
                  <ChevronRight size={17} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Create Meeting Modal ───────────────────────────────── */

function MeetingModal({ t, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    title: '', purpose: '', start_at: '', end_at: '', location: '',
    department: 'Bukoba Municipal Council', meeting_type: 'internal',
    priority: 'normal', status: 'draft'
  });
  const [loading, setLoading] = useState(false);
  const minDateTime = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString().slice(0, 16);
  const update = (k, v) => setForm({ ...form, [k]: v });

  const save = async (e) => {
    e.preventDefault();
    const start = new Date(form.start_at);
    const end = new Date(form.end_at);
    if (start <= new Date()) { toast('Meeting start must be in the future.', 'error'); return; }
    if (end <= start) { toast('Meeting end must be after the start time.', 'error'); return; }
    setLoading(true);
    try {
      await api('/api/meetings', {
        method: 'POST',
        body: JSON.stringify({ ...form, start_at: start.toISOString(), end_at: end.toISOString() })
      });
      toast('Meeting created successfully.', 'success');
      onSaved();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <section className="modal">
        <div className="modal-head">
          <div>
            <div className="eyebrow green">NEW RECORD</div>
            <h2>{t.create}</h2>
          </div>
          <button className="icon-button" onClick={onClose}><X /></button>
        </div>
        <form onSubmit={save}>
          <div className="form-grid">
            <label>{t.title}<input value={form.title} onChange={e => update('title', e.target.value)} required /></label>
            <label>{t.department}<input value={form.department} onChange={e => update('department', e.target.value)} required /></label>
            <label>{t.start}<input type="datetime-local" min={minDateTime} value={form.start_at} onChange={e => update('start_at', e.target.value)} required /></label>
            <label>{t.end}<input type="datetime-local" min={form.start_at || minDateTime} value={form.end_at} onChange={e => update('end_at', e.target.value)} required /></label>
            <label className="span-2">{t.location}<input value={form.location} onChange={e => update('location', e.target.value)} /></label>
            <label className="span-2">{t.purpose}<textarea value={form.purpose} onChange={e => update('purpose', e.target.value)} /></label>
          </div>
          <div className="modal-actions">
            <button type="button" className="secondary" onClick={onClose}>Cancel</button>
            <button className="primary" disabled={loading}>
              {loading ? <Loader2 size={16} className="spinner" /> : <>{t.save}<ChevronRight size={16} /></>}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

/* ── QR Code Section ────────────────────────────────────── */

function QrSection({ meetingId, t }) {
  const toast = useToast();
  const [qr, setQr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef(null);

  const generate = async () => {
    setLoading(true);
    try {
      const data = await api(`/api/meetings/${meetingId}/attendance/qr`);
      setQr(data);
      const expiresAt = new Date(data.expires_at).getTime();
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        const secs = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
        setSecondsLeft(secs);
        if (secs === 0) clearInterval(timerRef.current);
      }, 1000);
      toast('QR code generated. Display it for participants to scan.', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  return (
    <div className="qr-section">
      <h3><QrCode size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />Session Attendance QR</h3>
      {qr ? (
        <div className="qr-display">
          <QRCodeSVG value={qr.payload} size={220} level="H" includeMargin />
          <p className="qr-expiry">
            {secondsLeft > 0
              ? <><strong>{secondsLeft}s</strong> remaining — display on screen for participants</>
              : <>QR expired. <button className="text-button" onClick={generate}>Generate a new one</button></>
            }
          </p>
          {secondsLeft > 0 && (
            <button className="secondary" onClick={generate}>
              <QrCode size={15} /> Refresh QR
            </button>
          )}
          <p className="qr-hint">
            Participants scan this with their Personal Sign-In Link page to record attendance.
          </p>
        </div>
      ) : (
        <button className="secondary" onClick={generate} disabled={loading}>
          {loading ? <Loader2 size={15} className="spinner" /> : <QrCode size={15} />}
          Generate Session QR Code
        </button>
      )}
    </div>
  );
}

/* ── CSV Import Section ─────────────────────────────────── */

function GuestImport({ meetingId, t, onDone }) {
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [skipped, setSkipped] = useState([]);

  const upload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const r = await fetch(`/api/meetings/${meetingId}/guests/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.token}` },
        body
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw Error(data.message || `Upload failed (${r.status})`);
      const skippedNote = data.skipped?.length ? `, ${data.skipped.length} row(s) skipped` : '';
      toast(`✓ Added ${data.added} guest${data.added !== 1 ? 's' : ''}${skippedNote}.`, 'success');
      setSkipped(data.skipped || []);
      setFile(null);
      if (data.added > 0) onDone();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form className="csv-import" onSubmit={upload}>
        <FileUp size={18} style={{ color: 'var(--green)', flexShrink: 0 }} />
        <input
          type="file"
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          onChange={e => setFile(e.target.files[0])}
        />
        <button className="secondary" type="submit" disabled={!file || loading}>
          {loading ? <Loader2 size={14} className="spinner" /> : t.importGuests}
        </button>
      </form>
      {skipped.length > 0 && (
        <ul className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          <li><strong>{t.skippedRows}:</strong></li>
          {skipped.map(row => <li key={row.row}>Row {row.row}: {row.reason}</li>)}
        </ul>
      )}
    </>
  );
}

/* ── Meeting Detail Modal ───────────────────────────────── */

function DetailModal({ meetingId, t, onClose }) {
  const toast = useToast();
  const [m, setM] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [guestForm, setGuestForm] = useState({ name: '', phone: '', email: '', organization: '', role_title: '' });
  const [sendLoading, setSendLoading] = useState(false);

  const refresh = () => api('/api/meetings/' + meetingId).then(setM).catch(err => setLoadError(err.message));
  useEffect(() => { refresh(); }, [meetingId]);

  if (loadError) return (
    <div className="modal-backdrop">
      <section className="modal">
        <p className="error">{loadError}</p>
        <button className="secondary" onClick={onClose}>Close</button>
      </section>
    </div>
  );
  if (!m) return (
    <div className="modal-backdrop">
      <section className="modal"><p className="muted">Loading meeting details…</p></section>
    </div>
  );

  const cancelled = m.status === 'cancelled';
  const readOnly = new Date(m.end_at) <= new Date() || cancelled;

  const downloadReport = async () => {
    try {
      const r = await fetch(`/api/meetings/${meetingId}/report.csv`, {
        headers: { Authorization: `Bearer ${localStorage.token}` }
      });
      if (!r.ok) throw Error('Download failed. Please sign in again and retry.');
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${m.reference}-attendance.csv`; a.click();
      URL.revokeObjectURL(url);
      toast('Attendance report downloaded.', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const sendInvites = async () => {
    setSendLoading(true);
    try {
      await api(`/api/meetings/${meetingId}/send-invites`, { method: 'POST' });
      await refresh();
      toast('Invitations sent successfully.', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSendLoading(false);
    }
  };

  const remind = async () => {
    try {
      const result = await api(`/api/meetings/${meetingId}/reminders`, { method: 'POST' });
      await refresh();
      toast(`${t.reminded} (${result.reminded})`, 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const cancelMeeting = async () => {
    const reason = window.prompt(t.cancelReason);
    if (reason === null) return;
    try {
      await api(`/api/meetings/${meetingId}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) });
      await refresh();
      toast(t.cancelled, 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const addGuest = async (e) => {
    e.preventDefault();
    try {
      await api(`/api/meetings/${meetingId}/guests`, { method: 'POST', body: JSON.stringify(guestForm) });
      setGuestForm({ name: '', phone: '', email: '', organization: '', role_title: '' });
      await refresh();
      toast('Guest added successfully.', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <div className="modal-backdrop">
      <section className="modal detail-modal">
        <div className="modal-head">
          <div>
            <div className="eyebrow green">{m.reference}</div>
            <h2>{m.title}</h2>
          </div>
          <button className="icon-button" onClick={onClose}><X /></button>
        </div>

        <div className="detail-meta">
          <span><CalendarDays size={16} />{new Date(m.start_at).toLocaleString()} – {new Date(m.end_at).toLocaleTimeString()}</span>
          <span><MapPin size={16} />{m.location || 'Council venue'}</span>
        </div>

        {m.purpose && <p className="muted" style={{ marginBottom: 16 }}>{m.purpose}</p>}
        {readOnly && <div className="notice">{cancelled ? t.cancelled : 'This meeting has ended. The record is available for viewing only.'}</div>}

        <div className="detail-stats">
          <Metric label="Confirmed" value={m.counts.confirmed} />
          <Metric label="Declined" value={m.counts.declined} />
          <Metric label="Tentative" value={m.counts.tentative} />
          <Metric label="No response" value={m.counts.no_response} />
          <Metric label={t.checkedIn} value={m.counts.attended} />
        </div>

        <div className="modal-actions">
          <button className="secondary" onClick={downloadReport}>
            <Download size={16} />{t.report}
          </button>
          {!readOnly && (
            <>
              <button className="primary" onClick={sendInvites} disabled={sendLoading}>
                {sendLoading ? <Loader2 size={16} className="spinner" /> : <Send size={16} />}
                {t.send}
              </button>
              <button className="secondary" onClick={remind}><BellRing size={16} />{t.remind}</button>
              <button className="secondary" onClick={cancelMeeting}><XCircle size={16} />{t.cancelMeeting}</button>
            </>
          )}
        </div>

        {/* Guest list */}
        {m.guests.length > 0 && (
          <div className="guest-list">
            {m.guests.map(g => (
              <div className="guest-row" key={g.id}>
                <div className="avatar small">{g.name[0]}</div>
                <span>
                  {g.name}
                  <small>{g.organization || g.role_title || 'Participant'}</small>
                </span>
                <span className={`badge ${g.status === 'confirmed' ? 'green' : g.status === 'declined' ? 'grey' : 'gold'}`}>
                  {g.status}
                </span>
                <small className="muted">{t.delivery}: {g.delivery_status}{g.channel ? ` (${g.channel})` : ''} · {g.attended ? t.attended : t.notAttended}</small>
              </div>
            ))}
          </div>
        )}

        {/* Add guest manually */}
        {!readOnly && (
          <form className="guest-add-form" onSubmit={addGuest}>
            <h3>Add guest manually</h3>
            <div className="form-grid compact-grid">
              <label>Name<input value={guestForm.name} onChange={e => setGuestForm({ ...guestForm, name: e.target.value })} required /></label>
              <label>Organisation<input value={guestForm.organization} onChange={e => setGuestForm({ ...guestForm, organization: e.target.value })} /></label>
              <label>WhatsApp number<input value={guestForm.phone} onChange={e => setGuestForm({ ...guestForm, phone: e.target.value })} placeholder="0757219157" /></label>
              <label>Email<input type="email" value={guestForm.email} onChange={e => setGuestForm({ ...guestForm, email: e.target.value })} /></label>
              <label className="span-2">Job title / Role<input value={guestForm.role_title} onChange={e => setGuestForm({ ...guestForm, role_title: e.target.value })} placeholder="e.g. Director of Finance" /></label>
            </div>
            <button className="secondary" type="submit">Add guest</button>
          </form>
        )}

        {/* CSV import */}
        {!readOnly && (
          <div style={{ marginTop: 14 }}>
            <p className="section-label">{t.importGuests}</p>
            <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>{t.importHint}</p>
            <GuestImport meetingId={meetingId} t={t} onDone={refresh} />
          </div>
        )}

        {/* QR Code — only for upcoming meetings */}
        {!readOnly && <QrSection meetingId={meetingId} t={t} />}
      </section>
    </div>
  );
}

/* ── Dashboard / Meetings Page ──────────────────────────── */

function Dashboard({ lang, user, view = 'dashboard' }) {
  const t = copy[lang];
  const toast = useToast();
  const [meetings, setMeetings] = useState([]);
  const [show, setShow] = useState(false);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trends, setTrends] = useState(null);

  const refresh = () => {
    setLoading(true);
    return api('/api/meetings')
      .then(setMeetings)
      .catch(err => toast(err.message, 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { refresh(); }, []);
  useEffect(() => {
    if (user?.role === 'admin') api('/api/reports/summary').then(setTrends).catch(() => setTrends(null));
  }, [user?.role]);

  const upcoming = meetings.filter(m => !m.past);
  const past = meetings.filter(m => m.past);
  const isMeetingsView = view === 'meetings';

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow green">OFFICE OF THE MUNICIPAL DIRECTOR</div>
          <h1>{isMeetingsView ? t.meetings : `${t.welcome}, ${user?.name?.split(' ')[0] || 'Administrator'}`}</h1>
          <p className="muted">
            {isMeetingsView
              ? 'Full list of all council meeting records.'
              : `${t.portal}. Review and coordinate council meetings from one place.`}
          </p>
        </div>
        <button className="primary" onClick={() => setShow(true)}>
          <Plus size={18} />{t.newMeeting}
        </button>
      </div>

      {!isMeetingsView && (
        <div className="metric-grid">
          <Metric icon={<CalendarDays />} label={t.upcoming} value={upcoming.length} />
          <Metric icon={<Users />} label={t.guests} value={meetings.reduce((a, m) => a + (m.guest_count || 0), 0)} />
          <Metric icon={<Clock3 />} label={t.past} value={past.length} />
        </div>
      )}

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>{isMeetingsView ? 'All meetings' : t.upcoming}</h2>
            <p className="muted">{isMeetingsView ? 'Click a row to view, edit guests, send invitations, or generate a QR code.' : 'Scheduled and active council coordination'}</p>
          </div>
          <button className="text-button" onClick={() => setShow(true)}>
            {t.create} <ChevronRight size={15} />
          </button>
        </div>
        {loading
          ? <div className="empty"><Loader2 size={22} className="spinner" style={{ color: 'var(--green)' }} /></div>
          : (isMeetingsView ? meetings : upcoming).length
            ? <MeetingTable rows={isMeetingsView ? meetings : upcoming} t={t} onSelect={setSelected} />
            : <div className="empty">{t.noMeetings}</div>
        }
      </section>

      {!isMeetingsView && past.length > 0 && (
        <section className="panel past-panel">
          <div className="panel-head">
            <div>
              <h2>{t.past}</h2>
              <p className="muted">Read-only records for official reference</p>
            </div>
          </div>
          <MeetingTable rows={past} t={t} onSelect={setSelected} />
        </section>
      )}

      {!isMeetingsView && trends && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>{t.trends}</h2>
              <p className="muted">Historical response and attendance across all council meetings</p>
            </div>
          </div>
          <div className="metric-grid">
            <Metric label={t.invited} value={trends.totals.invited} />
            <Metric label="Confirmed" value={trends.totals.confirmed} />
            <Metric label="Declined" value={trends.totals.declined} />
            <Metric label="No response" value={trends.totals.no_response} />
            <Metric label={t.checkedIn} value={trends.totals.checked_in} />
          </div>
        </section>
      )}

      {show && <MeetingModal lang={lang} t={t} onClose={() => setShow(false)} onSaved={() => { setShow(false); refresh(); }} />}
      {selected && <DetailModal meetingId={selected} t={t} onClose={() => setSelected(null)} />}
    </>
  );
}

/* ── Account Settings ───────────────────────────────────── */

function Account({ lang, user, onBack }) {
  const t = copy[lang];
  const toast = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api('/api/me')
      .then(p => { setName(p.name || ''); setPhone(p.phone || ''); })
      .catch(err => toast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await api('/api/me', { method: 'PUT', body: JSON.stringify({ name, phone }) });
      toast(`${t.saved}${r.phone ? ` Phone: ${r.phone}` : ''}`, 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="panel account-panel">
      <button className="text-button" onClick={onBack}>
        <ChevronRight size={15} style={{ transform: 'rotate(180deg)' }} /> {t.dashboard}
      </button>
      <div className="page-head compact">
        <div>
          <div className="eyebrow green">PROFILE</div>
          <h1>{t.account}</h1>
          <p className="muted">Update the information used for council notifications.</p>
        </div>
      </div>
      {loading
        ? <p className="muted"><Loader2 size={16} className="spinner" style={{ color: 'var(--green)' }} /> Loading profile…</p>
        : (
          <form className="account-form" onSubmit={save}>
            <label>{t.name || 'Full name'}<input value={name} onChange={e => setName(e.target.value)} required /></label>
            <label>{t.email}<input value={user?.email || ''} disabled /></label>
            <label>{t.phone}<input value={phone} onChange={e => setPhone(e.target.value)} placeholder="0757219157" /></label>
            <label>Role<input value={user?.role || ''} disabled /></label>
            <button className="primary" disabled={saving}>
              {saving ? <Loader2 size={16} className="spinner" /> : <>{t.saveAccount}<ChevronRight size={16} /></>}
            </button>
          </form>
        )}
    </section>
  );
}

/* ── RSVP Page ──────────────────────────────────────────── */

function Rsvp({ lang, setLang }) {
  const t = copy[lang];
  const toast = useToast();
  const token = new URLSearchParams(location.search).get('token');
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('');
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      fetch('/api/rsvp/' + token)
        .then(async r => {
          if (!r.ok) throw Error('This RSVP link is invalid or has expired.');
          return r.json();
        })
        .then(setData)
        .catch(() => setData(false));
    }
  }, [token]);

  if (!data) {
    return (
      <>
        <Brand lang={lang} setLang={setLang} />
        <main className="auth-shell">
          <section className="auth-card">
            <p className="error">{data === false ? t.invalid : 'Loading…'}</p>
          </section>
        </main>
      </>
    );
  }

  const submit = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/rsvp/' + token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason, language: lang })
      });
      const body = await r.json().catch(() => ({}));
      if (r.ok) {
        const responseLabel = { confirmed: 'Attendance confirmed', tentative: 'Marked as tentative', declined: 'Attendance declined' }[status] || 'Response recorded';
        setMsg(t.responseSaved);
        toast(`${responseLabel}. Thank you.`, 'success');
      } else {
        const errMsg = body.message || body.detail || 'The response could not be saved. Please try again.';
        setMsg(errMsg);
        toast(errMsg, 'error');
      }
    } catch {
      const errMsg = 'The service is unavailable. Check your connection and try again.';
      setMsg(errMsg);
      toast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Brand lang={lang} setLang={setLang} />
      <main className="rsvp-shell">
        <section className="rsvp-card">
          <div className="eyebrow green">{data.meeting.reference}</div>
          <h1>{t.rsvp}</h1>
          <p className="rsvp-name">{data.guest.name}</p>
          <div className="rsvp-event">
            <h2>{data.meeting.title}</h2>
            <p>{data.meeting.purpose}</p>
            <div><CalendarDays size={17} />{new Date(data.meeting.start_at).toLocaleString()}</div>
            <div><MapPin size={17} />{data.meeting.location}</div>
          </div>
          <div className="choice-grid">
            {[['confirmed', t.confirm, 'green'], ['tentative', t.tentative, 'gold'], ['declined', t.decline, 'red']].map(([v, l, c]) => (
              <button key={v} className={`choice ${status === v ? 'selected' : ''} ${c}`} onClick={() => setStatus(v)}>{l}</button>
            ))}
          </div>
          {status === 'declined' && (
            <label>{t.reason}<textarea value={reason} onChange={e => setReason(e.target.value)} required /></label>
          )}
          <button className="primary full" disabled={!status || loading} onClick={submit}>
            {loading ? <Loader2 size={17} className="spinner" /> : <>{t.submit}<ChevronRight size={17} /></>}
          </button>
          {msg && <p className={msg === t.responseSaved ? 'success' : 'error'}>{msg}</p>}
        </section>
      </main>
    </>
  );
}

/* ── Root App Component ─────────────────────────────────── */

export default function App() {
  const [lang, setLang] = useState(localStorage.lang || 'en');
  const [user, setUser] = useState(null);
  const [account, setAccount] = useState(false);
  const [view, setView] = useState('dashboard');
  const toast = useToast();

  if (location.pathname === '/rsvp.html') {
    return <Rsvp lang={lang} setLang={setLang} />;
  }

  if (location.pathname === '/attendance.html') {
    return <Attendance lang={lang} setLang={setLang} />;
  }

  if (!localStorage.token && !user) {
    return <LoginOtp lang={lang} setLang={setLang} onLogin={u => { setUser(u); setView('dashboard'); }} />;
  }

  const current = user || { name: 'Administrator', role: 'admin' };

  const handleLogout = () => {
    localStorage.removeItem('token');
    toast('You have been signed out.', 'info');
    setUser(null);
  };

  return (
    <Shell
      lang={lang} setLang={setLang} user={current}
      onLogout={handleLogout}
      view={account ? 'account' : view}
      onNavigate={next => { setAccount(false); setView(next); }}
      onAccount={() => { setAccount(true); setView('dashboard'); }}
    >
      {account
        ? <Account lang={lang} user={current} onBack={() => setAccount(false)} />
        : <Dashboard lang={lang} user={current} view={view} />
      }
    </Shell>
  );
}
