import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle, Ban, Bell, CalendarDays, CheckCircle2, ChevronRight, Clock3, Download,
  FileUp, Loader2, LayoutDashboard, LogOut, MapPin, MessageCircle, Plus,
  QrCode, RefreshCw, Search, Send, Settings2, ShieldCheck, Terminal, Trash2, UserCog, Users, X
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import jsQR from 'jsqr';
import { Brand } from './ui.jsx';
import { copy, api, parseApiError } from './utils.js';
import LoginOtp from './LoginOtp.jsx';
import OtpBoxes from './OtpBoxes.jsx';
import OfflineBanner from './OfflineBanner.jsx';
import { useToast } from './toast.jsx';
import { uiText } from './i18n.js';

async function downloadBlob(path, filename, token) {
  const r = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw Error('Download failed. Please sign in again and retry.');
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadText(content, filename, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvValue(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function downloadCsv(rows, columns, filename) {
  const csv = '\uFEFF' + [columns.map(column => csvValue(column.label)).join(','), ...rows.map(row => columns.map(column => csvValue(row[column.key])).join(','))].join('\r\n');
  downloadText(csv, filename, 'text/csv;charset=utf-8');
}

function messageStatusExportRows(logs) {
  return logs.flatMap(log => [
    { recipient: log.guest, channel: 'Email', address: log.email, status: log.email_status, details: log.email_error, sent_at: log.sent_at ? new Date(log.sent_at).toLocaleString() : 'Pending' },
    { recipient: log.guest, channel: 'WhatsApp', address: log.phone, status: log.whatsapp_status, details: log.whatsapp_error, sent_at: log.sent_at ? new Date(log.sent_at).toLocaleString() : 'Pending' }
  ]).filter(row => row.address || row.status !== 'PENDING');
}

function normalizeTanzaniaPhone(value) {
  const phone = value.trim();
  if (!phone) return '';
  if (/^0\d{9}$/.test(phone)) return `+255${phone.slice(1)}`;
  if (/^\+255\d{9}$/.test(phone)) return phone;
  throw new Error('Use a Tanzanian number in the format 07******** or +2557********.');
}

/* ── Layout Shell ───────────────────────────────────────── */

function Shell({ lang, setLang, user, onLogout, children, onAccount, onAdmin, view, onNavigate }) {
  const t = copy[lang];
  const text = uiText(lang);
  return (
    <>
      <Brand lang={lang} setLang={setLang} />
      <div className="app-shell">
        <aside className="sidebar" aria-label={text.mainNavigation}>
          <div className="side-label">{text.mainMenu}</div>
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
          {user?.role === 'admin' && (
            <button
              className={`side-link ${view === 'admin' ? 'active' : ''}`}
              onClick={() => onAdmin()}
            >
              <UserCog size={17} />{text.administration}
            </button>
          )}
          <div className="side-spacer" />
          <div className="side-label">{text.account}</div>
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
              <strong>{user?.name || text.administration}</strong>
              <small>{user?.role || text.staff}</small>
            </div>
          </div>
        </aside>
        <main className="content">{children}</main>
      </div>
      <nav className="mobile-nav" aria-label={text.mobileNavigation}>
        <button
          type="button"
          className={`mobile-nav-link ${view === 'dashboard' ? 'active' : ''}`}
          onClick={() => onNavigate('dashboard')}
        >
          <LayoutDashboard size={20} />
          <span>{t.dashboard}</span>
        </button>
        <button
          type="button"
          className={`mobile-nav-link ${view === 'meetings' ? 'active' : ''}`}
          onClick={() => onNavigate('meetings')}
        >
          <CalendarDays size={20} />
          <span>{t.meetings}</span>
        </button>
        {user?.role === 'admin' && (
          <button
            type="button"
            className={`mobile-nav-link ${view === 'admin' ? 'active' : ''}`}
            onClick={() => onAdmin()}
          >
            <UserCog size={20} />
            <span>{text.admin}</span>
          </button>
        )}
        <button
          type="button"
          className={`mobile-nav-link ${view === 'account' ? 'active' : ''}`}
          onClick={() => onAccount()}
        >
          <Settings2 size={20} />
          <span>{t.account}</span>
        </button>
        <button type="button" className="mobile-nav-link" onClick={onLogout}>
          <LogOut size={20} />
          <span>{t.signOut}</span>
        </button>
      </nav>
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
    if (m.status === 'cancelled') return 'red';
    if (m.past) return 'grey';
    if (m.status === 'published') return 'green';
    if (m.status === 'draft') return 'gold';
    return 'grey';
  };
  const statusLabel = (m) => {
    if (m.status === 'cancelled') return 'cancelled';
    if (m.past) return 'past';
    return m.status;
  };
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{t.title}</th>
            <th>{t.date}</th>
            <th>{t.location}</th>
            <th>{t.guests}</th>
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
                  {statusLabel(m)}
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

/* ── Create / Edit Meeting Modal ───────────────────────── */

function toLocalInput(iso) {
  if (!iso) return '';
  return new Date(iso).toISOString().slice(0, 16);
}

function MeetingModal({ lang, t, meeting, onClose, onSaved }) {
  const toast = useToast();
  const text = uiText(lang);
  const isEdit = !!meeting;
  const originalStart = meeting?.start_at;
  const originalEnd = meeting?.end_at;
  const [form, setForm] = useState({
    title: meeting?.title || '',
    purpose: meeting?.purpose || '',
    start_at: toLocalInput(meeting?.start_at),
    end_at: toLocalInput(meeting?.end_at),
    location: meeting?.location || '',
    department: meeting?.department || 'Bukoba Municipal Council',
    meeting_type: meeting?.meeting_type || 'internal',
    priority: meeting?.priority || 'normal',
    status: meeting?.status || 'draft'
  });
  const [loading, setLoading] = useState(false);
  const minDateTime = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString().slice(0, 16);
  const update = (k, v) => setForm({ ...form, [k]: v });

  const save = async (e) => {
    e.preventDefault();
    const start = new Date(form.start_at);
    const end = new Date(form.end_at);
    if (!isEdit && start <= new Date()) { toast(text.startFuture, 'error'); return; }
    if (end <= start) { toast(text.endAfterStart, 'error'); return; }
    setLoading(true);
    try {
      const payload = { ...form, start_at: start.toISOString(), end_at: end.toISOString() };
      if (isEdit) {
        await api(`/api/meetings/${meeting.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast(text.meetingUpdated, 'success');
        const datesChanged = originalStart !== start.toISOString() || originalEnd !== end.toISOString();
        onSaved({ notifyReschedule: datesChanged && meeting.status === 'published' });
      } else {
        await api('/api/meetings', { method: 'POST', body: JSON.stringify(payload) });
        toast(text.meetingCreated, 'success');
        onSaved({});
      }
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
            <div className="eyebrow green">{isEdit ? text.editRecord : text.newRecord}</div>
            <h2>{isEdit ? text.editMeeting : t.create}</h2>
          </div>
          <button className="icon-button" onClick={onClose}><X /></button>
        </div>
        <form onSubmit={save}>
          <div className="form-grid">
            <label>{t.title}<input value={form.title} onChange={e => update('title', e.target.value)} required /></label>
            <label>{t.department}<input value={form.department} onChange={e => update('department', e.target.value)} required /></label>
            <label>{t.start}<input type="datetime-local" min={isEdit ? undefined : minDateTime} value={form.start_at} onChange={e => update('start_at', e.target.value)} required /></label>
            <label>{t.end}<input type="datetime-local" min={form.start_at || minDateTime} value={form.end_at} onChange={e => update('end_at', e.target.value)} required /></label>
            <label className="span-2">{t.location}<input value={form.location} onChange={e => update('location', e.target.value)} /></label>
            <label>{t.status}<select value={form.status} onChange={e => update('status', e.target.value)}><option value="draft">Draft</option><option value="published">Published</option></select></label>
            <label>Priority<select value={form.priority} onChange={e => update('priority', e.target.value)}><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>
            <label className="span-2">{t.purpose}<textarea value={form.purpose} onChange={e => update('purpose', e.target.value)} /></label>
          </div>
          <div className="modal-actions">
            <button type="button" className="secondary" onClick={onClose}>{text.cancel}</button>
            <button className="primary" disabled={loading}>
              {loading ? <Loader2 size={16} className="spinner" /> : <>{isEdit ? text.saveChanges : t.save}<ChevronRight size={16} /></>}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

/* ── QR Code Section ────────────────────────────────────── */

function QrSection({ meetingId, t, lang }) {
  const toast = useToast();
  const text = uiText(lang);
  const [qr, setQr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef(null);

  const generate = async (isAuto = false) => {
    setLoading(true);
    try {
      const data = await api(`/api/meetings/${meetingId}/attendance/qr`);
      setQr(data);
      const expiresAt = new Date(data.expires_at).getTime();
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        const secs = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
        if (secs === 0) {
          clearInterval(timerRef.current);
          generate(true); // Auto-refresh when it hits 0
        } else {
          setSecondsLeft(secs);
        }
      }, 1000);
      
      if (isAuto !== true) {
        toast('QR code generated. Display it for participants to scan.', 'success');
      }
    } catch (err) {
      if (isAuto !== true) toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  return (
    <div className="qr-section">
      <h3><QrCode size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />{text.attendanceQr}</h3>
      {qr ? (
        <div className="qr-display">
          <QRCodeSVG value={qr.payload} size={220} level="H" includeMargin />
          <p className="qr-expiry">
            {secondsLeft > 0
              ? <><strong>{secondsLeft}s</strong> {text.remaining}</>
              : <>{text.refreshingQr}</>
            }
          </p>
          {secondsLeft > 0 && (
            <button className="secondary" onClick={() => generate(false)} disabled={loading}>
              {loading ? <Loader2 size={15} className="spinner" /> : <RefreshCw size={15} />} {text.refreshQr}
            </button>
          )}
          <p className="qr-hint" style={{ marginTop: 12 }}>
            {text.qrHint}
          </p>
        </div>
      ) : (
        <button className="secondary" onClick={() => generate(false)} disabled={loading}>
          {loading ? <Loader2 size={15} className="spinner" /> : <QrCode size={15} />}
          {text.generateQr}
        </button>
      )}
    </div>
  );
}

/* ── CSV Import Section ─────────────────────────────────── */

function CsvImport({ meetingId, onDone, lang }) {
  const text = uiText(lang);
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

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
      if (!r.ok) throw Error(parseApiError(data, `Upload failed (${r.status})`));
      const skippedNote = data.skipped?.length ? `, ${data.skipped.length} row(s) skipped` : '';
      toast(`✓ Added ${data.added} guest${data.added !== 1 ? 's' : ''}${skippedNote}.`, 'success');
      setFile(null);
      if (data.added > 0) onDone();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <a className="template-link" href="/api/templates/guest-import.xlsx" download="guest-list-template.xlsx">
        <Download size={14} /> {text.downloadTemplate}
      </a>
      <div className="import-guide" style={{ margin: '10px 0 12px', padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--card)' }}>
        <strong style={{ display: 'block', marginBottom: 6 }}>{text.importTitle}</strong>
        <p className="muted" style={{ margin: '0 0 6px', fontSize: 12 }}>{text.importIntro}</p>
        <ul className="muted" style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.55 }}>
          <li>{text.importRequired}</li>
          <li>{text.importPhone}</li>
          <li>{text.importDuplicate}</li>
          <li>{text.importFormats}</li>
        </ul>
      </div>
      <form className="csv-import" onSubmit={upload}>
      <FileUp size={18} style={{ color: 'var(--green)', flexShrink: 0 }} />
      <input
        type="file"
        accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={e => setFile(e.target.files[0])}
      />
      <button className="secondary" type="submit" disabled={!file || loading}>
        {loading ? <Loader2 size={14} className="spinner" /> : text.importFile}
      </button>
    </form>
    </div>
  );
}

/* ── Meeting Detail Modal ───────────────────────────────── */

function DetailModal({ meetingId, t, lang, onClose, onOpenDeliveryLogs }) {
  const toast = useToast();
  const text = uiText(lang);
  const [m, setM] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [guestForm, setGuestForm] = useState({ name: '', phone: '', email: '', organization: '', role_title: '' });
  const [sendLoading, setSendLoading] = useState(false);
  const [sendChannel, setSendChannel] = useState('');
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendComplete, setSendComplete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showNotify, setShowNotify] = useState(false);
  const [notifyNote, setNotifyNote] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const refresh = () => api('/api/meetings/' + meetingId).then(setM).catch(err => setLoadError(err.message));
  useEffect(() => { refresh(); }, [meetingId]);

  if (loadError) return (
    <div className="modal-backdrop">
      <section className="modal">
        <p className="error">{loadError}</p>
        <button className="secondary" onClick={onClose}>{lang === 'sw' ? 'Funga' : 'Close'}</button>
      </section>
    </div>
  );
  if (!m) return (
    <div className="modal-backdrop">
      <section className="modal"><p className="muted">{lang === 'sw' ? 'Inapakia taarifa za mkutano…' : 'Loading meeting details…'}</p></section>
    </div>
  );

  const readOnly = new Date(m.end_at) <= new Date();
  const isCancelled = m.status === 'cancelled';
  const canManage = !!m.can_manage && !readOnly && !isCancelled;

  if (editing) {
    return (
      <MeetingModal
        lang={lang}
        t={t}
        meeting={m}
        onClose={() => setEditing(false)}
        onSaved={({ notifyReschedule } = {}) => {
          setEditing(false);
          refresh().then(() => {
            if (notifyReschedule) setShowNotify(true);
          });
        }}
      />
    );
  }

  const downloadReport = async (format) => {
    try {
      const ext = format === 'pdf' ? 'pdf' : 'csv';
      await downloadBlob(
        `/api/meetings/${meetingId}/report.${ext}`,
        `${m.reference}-attendance.${ext}`,
        localStorage.token
      );
      toast(`${format.toUpperCase()} report downloaded.`, 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const sendInvites = async () => {
    if (!sendChannel) return;
    setSendLoading(true);
    try {
      await api(`/api/meetings/${meetingId}/send-invites-selected`, {
        method: 'POST',
        body: JSON.stringify({ channel: sendChannel })
      });
      await refresh();
      setSendComplete(true);
      toast('Invitations queued successfully.', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSendLoading(false);
    }
  };

  const downloadSupportingDocument = async (guest) => {
    try {
      await downloadBlob(`/api/meetings/${meetingId}/guests/${guest.id}/supporting-document`, `${m.reference}-${guest.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-document.pdf`, localStorage.token);
      toast('Supporting document downloaded.', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const notifyReschedule = async () => {
    setActionLoading(true);
    try {
      const r = await api(`/api/meetings/${meetingId}/notify-reschedule`, {
        method: 'POST',
        body: JSON.stringify({ message: notifyNote })
      });
      toast(`Reschedule notice sent to ${r.sent} guest(s).`, 'success');
      setShowNotify(false);
      setNotifyNote('');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const cancelMeeting = async () => {
    if (!cancelReason.trim()) { toast('Please provide a cancellation reason.', 'error'); return; }
    setActionLoading(true);
    try {
      const r = await api(`/api/meetings/${meetingId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: cancelReason })
      });
      toast(`Meeting cancelled. ${r.sent} guest(s) notified.`, 'success');
      setShowCancel(false);
      await refresh();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const addGuest = async (e) => {
    e.preventDefault();
    try {
      const phone = normalizeTanzaniaPhone(guestForm.phone);
      const email = guestForm.email.trim().toLowerCase();
      const duplicate = m.guests.some(guest =>
        (email && guest.email?.trim().toLowerCase() === email)
          || (phone && normalizeTanzaniaPhone(guest.phone || '') === phone)
      );
      if (duplicate) throw new Error('This email or WhatsApp number is already used for this meeting.');
      await api(`/api/meetings/${meetingId}/guests`, { method: 'POST', body: JSON.stringify({ ...guestForm, phone, email }) });
      setGuestForm({ name: '', phone: '', email: '', organization: '', role_title: '' });
      await refresh();
      toast('Guest added successfully.', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  if (showNotify) {
    return (
      <div className="modal-backdrop">
        <section className="modal">
          <div className="modal-head">
            <div>
              <div className="eyebrow green">{text.scheduleChange}</div>
              <h2>{text.notifyReschedule}</h2>
            </div>
            <button className="icon-button" onClick={() => setShowNotify(false)}><X /></button>
          </div>
          <p className="muted">{text.scheduleNotice}</p>
          <label>{text.noteOptional}
            <textarea value={notifyNote} onChange={e => setNotifyNote(e.target.value)} placeholder="e.g. Venue unchanged, only the time has moved." />
          </label>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setShowNotify(false)}>{text.skip}</button>
            <button className="primary" onClick={notifyReschedule} disabled={actionLoading}>
              {actionLoading ? <Loader2 size={16} className="spinner" /> : <Bell size={16} />}
              {text.sendNotice}
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (showCancel) {
    return (
      <div className="modal-backdrop">
        <section className="modal">
          <div className="modal-head">
            <div>
              <div className="eyebrow green">{text.cancellation}</div>
              <h2>{text.cancelMeeting}</h2>
            </div>
            <button className="icon-button" onClick={() => setShowCancel(false)}><X /></button>
          </div>
          <p className="muted">{text.cancellationNotice}</p>
          <label>{text.cancellationReason}
            <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} required placeholder="e.g. Postponed due to official travel" />
          </label>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setShowCancel(false)}>{text.keepMeeting}</button>
            <button className="primary" style={{ background: '#a32d2d' }} onClick={cancelMeeting} disabled={actionLoading}>
              {actionLoading ? <Loader2 size={16} className="spinner" /> : <Ban size={16} />}
              {text.confirmCancellation}
            </button>
          </div>
        </section>
      </div>
    );
  }

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
          <span><CalendarDays size={16} />{new Date(m.start_at).toLocaleString()} – {new Date(m.end_at).toLocaleString()}</span>
          <span><MapPin size={16} />{m.location || text.councilVenue}</span>
          <span className={`badge ${isCancelled ? 'red' : m.status === 'published' ? 'green' : 'gold'}`}>{m.status}</span>
        </div>

        {m.purpose && <p className="muted" style={{ marginBottom: 16 }}>{m.purpose}</p>}
        {isCancelled && (
          <div className="notice-cancel">
            <strong>{text.meetingCancelled}</strong>
            {m.cancellation_reason ? ` — ${m.cancellation_reason}` : ''}
          </div>
        )}
        {readOnly && !isCancelled && <div className="notice">{text.endedNotice}</div>}
        {!canManage && !readOnly && !isCancelled && (
          <div className="notice notice-blue">{text.readOnlyNotice}</div>
        )}

        {m.attendance && (
          <div className="detail-stats" style={{ marginTop: 0, marginBottom: 16 }}>
            <Metric label={text.invited} value={m.attendance.invited || 0} />
            <Metric label={text.attended} value={m.attendance.attended || 0} />
            <Metric label={text.absent} value={m.attendance.not_attended || 0} />
            <Metric label={text.rate} value={`${m.attendance.percentage || 0}%`} />
          </div>
        )}

        <div className="detail-stats">
          <Metric label={text.confirmed} value={m.counts?.confirmed || 0} />
          <Metric label={text.declined} value={m.counts?.declined || 0} />
          <Metric label={t.tentative} value={m.counts?.tentative || 0} />
          <Metric label={text.noResponse} value={m.counts?.no_response || 0} />
        </div>

        <div className="modal-actions report-actions">
          {canManage && (
            <button className="secondary" onClick={() => onOpenDeliveryLogs?.(meetingId, 'all')}>
              <MessageCircle size={16} /> Message status
            </button>
          )}
          <button className="secondary" onClick={() => downloadReport('csv')}>
            <Download size={16} />{text.csvReport}
          </button>
          <button className="secondary" onClick={() => downloadReport('pdf')}>
            <Download size={16} />{text.pdfReport}
          </button>
          {canManage && (
            <button className="secondary" onClick={() => setEditing(true)}>
              <Settings2 size={16} /> {text.editMeeting}
            </button>
          )}
          {canManage && m.status === 'published' && (
            <button className="secondary" onClick={() => setShowNotify(true)}>
              <Bell size={16} /> {text.notifyReschedule}
            </button>
          )}
          {canManage && (
            <button className="secondary" onClick={() => setShowCancel(true)} style={{ color: '#a32d2d' }}>
              <Ban size={16} /> {text.cancelMeeting}
            </button>
          )}
          {canManage && (
            <button className="primary" onClick={() => { setSendChannel(''); setShowSendModal(true); }} disabled={sendLoading}>
              <Send size={16} /> {t.send}
            </button>
          )}
        </div>

        {showSendModal && (
          <div className="modal-backdrop" role="presentation">
            <section className="modal" role="dialog" aria-modal="true" aria-labelledby="invitation-channel-title">
              <div className="modal-head">
                <div>
                  <div className="eyebrow green">{text.invitationChannelTitle}</div>
                  <h2 id="invitation-channel-title">{text.invitationChannelTitle}</h2>
                </div>
                <button className="icon-button" onClick={() => setShowSendModal(false)} aria-label={lang === 'sw' ? 'Funga' : 'Close'}><X /></button>
              </div>
              {!sendComplete ? <>
              <p className="muted">{text.invitationChannelPrompt}</p>
              <div style={{ display: 'grid', gap: 10, margin: '18px 0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>
                  <input type="radio" name="invitation-channel" value="whatsapp" checked={sendChannel === 'whatsapp'} onChange={e => setSendChannel(e.target.value)} />
                  <MessageCircle size={18} /> {text.sendViaWhatsApp}
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>
                  <input type="radio" name="invitation-channel" value="email" checked={sendChannel === 'email'} onChange={e => setSendChannel(e.target.value)} />
                  <Send size={18} /> {text.sendViaEmail}
                </label>
              </div>
              <div className="modal-actions">
                <button className="secondary" onClick={() => setShowSendModal(false)}>{text.cancel}</button>
                <button className="primary" onClick={sendInvites} disabled={!sendChannel || sendLoading}>
                  {sendLoading ? <Loader2 size={16} className="spinner" /> : <Send size={16} />}
                  {text.confirmSend}
                </button>
              </div>
              <button className="text-button invitation-status-link" onClick={() => { setShowSendModal(false); onOpenDeliveryLogs?.(meetingId, sendChannel || 'all'); }}>
                <MessageCircle size={14} /> {text.monitorMessageStatus}
              </button>
              </> : <>
                <p className="success">Invitations were queued. You can monitor pending and failed messages separately.</p>
                <div className="modal-actions">
                  <button className="secondary" onClick={() => setShowSendModal(false)}>{text.close}</button>
                  <button className="primary" onClick={() => { setShowSendModal(false); onOpenDeliveryLogs?.(meetingId, sendChannel); }}><MessageCircle size={16} /> View message status</button>
                </div>
              </>}
            </section>
          </div>
        )}

        {/* Guest list */}
        {m.guests.length > 0 && (
          <div className="guest-list">
            {m.guests.map(g => (
              <div className="guest-row" key={g.id}>
                <div className="avatar small">{g.name[0]}</div>
                <span>
                  {g.name}
                  <small>
                    {[g.organization || g.role_title, g.phone, g.email].filter(Boolean).join(' · ') || text.participant}
                  </small>
                </span>
                <span className={`badge ${g.attended ? 'green' : 'grey'}`}>
                  {g.attended ? text.checkedIn : m.past ? text.absent : text.notCheckedIn}
                </span>
                <span className={`badge ${g.status === 'confirmed' ? 'green' : g.status === 'declined' ? 'grey' : 'gold'}`}>
                  {g.status === 'no_response' ? text.noRsvp : g.status.charAt(0).toUpperCase() + g.status.slice(1)}
                </span>
                {g.whatsapp_status && (
                  <span className={`badge ${
                    g.whatsapp_status === 'READ' ? 'green' :
                    g.whatsapp_status === 'DELIVERED' ? 'green' :
                    g.whatsapp_status === 'SENT' ? 'gold' :
                    g.whatsapp_status === 'FAILED' ? 'red' : 'grey'
                  }`} title={g.whatsapp_error || ''}>
                    WA: {g.whatsapp_status.toLowerCase()}
                  </span>
                )}
                {g.supporting_document && canManage && <button className="icon-button" title="Download supporting document" onClick={() => downloadSupportingDocument(g)}><Download size={15} /></button>}
              </div>
            ))}
          </div>
        )}

        {/* Add guest manually */}
        {canManage && (
          <form className="guest-add-form" onSubmit={addGuest}>
            <h3>{text.addGuest}</h3>
            <div className="form-grid compact-grid">
              <label>Name<input value={guestForm.name} onChange={e => setGuestForm({ ...guestForm, name: e.target.value })} required /></label>
              <label>{text.organisation}<input value={guestForm.organization} onChange={e => setGuestForm({ ...guestForm, organization: e.target.value })} /></label>
              <label>WhatsApp number<input value={guestForm.phone} onChange={e => setGuestForm({ ...guestForm, phone: e.target.value })} placeholder="07******** or +2557********" /></label>
              <label>Email<input type="email" value={guestForm.email} onChange={e => setGuestForm({ ...guestForm, email: e.target.value })} /></label>
              <label className="span-2">{text.jobRole}<input value={guestForm.role_title} onChange={e => setGuestForm({ ...guestForm, role_title: e.target.value })} placeholder="e.g. Director of Finance" /></label>
            </div>
            <button className="secondary" type="submit">{text.add}</button>
          </form>
        )}

        {/* CSV import */}
        {canManage && (
          <div style={{ marginTop: 14 }}>
            <p className="section-label">{text.importFrom}</p>
            <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
              Download the XLSX template, fill in guests, then upload CSV or XLSX.
            </p>
            <CsvImport meetingId={meetingId} onDone={refresh} lang={lang} />
          </div>
        )}

        {/* QR Code — only for upcoming meetings */}
        {canManage && <QrSection meetingId={meetingId} t={t} lang={lang} />}
      </section>
    </div>
  );
}

/* ── Dashboard / Meetings Page ──────────────────────────── */

function Dashboard({ lang, user, view = 'dashboard', onOpenDeliveryLogs }) {
  const t = copy[lang];
  const text = uiText(lang);
  const toast = useToast();
  const [meetings, setMeetings] = useState([]);
  const [show, setShow] = useState(false);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    setLoading(true);
    return api('/api/meetings')
      .then(setMeetings)
      .catch(err => toast(err.message, 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { refresh(); }, []);

  const upcoming = meetings.filter(m => !m.past);
  const past = meetings.filter(m => m.past);
  const isMeetingsView = view === 'meetings';

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow green">{text.office}</div>
          <h1>{isMeetingsView ? t.meetings : `${t.welcome}, ${user?.name?.split(' ')[0] || 'Administrator'}`}</h1>
          <p className="muted">
            {isMeetingsView
              ? 'Full list of all council meeting records.'
              : `${t.portal}. ${text.reviewMeetings}`}
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
            <h2>{isMeetingsView ? text.allMeetings : t.upcoming}</h2>
            <p className="muted">{isMeetingsView ? text.meetingRecords : text.scheduledCoordination}</p>
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
              <p className="muted">{text.officialRecords}</p>
            </div>
          </div>
          <MeetingTable rows={past} t={t} onSelect={setSelected} />
        </section>
      )}

      {show && <MeetingModal lang={lang} t={t} onClose={() => setShow(false)} onSaved={() => { setShow(false); refresh(); }} />}
      {selected && <DetailModal meetingId={selected} t={t} lang={lang} onClose={() => setSelected(null)} onOpenDeliveryLogs={onOpenDeliveryLogs} />}
    </>
  );
}

function MessageStatusPage({ lang, meetingId, channel, onBack }) {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const text = uiText(lang);

  const refresh = () => api(`/api/meetings/${meetingId}/delivery-logs?channel=all`).then(nextLogs => {
    setLogs(previous => JSON.stringify(previous) === JSON.stringify(nextLogs) ? previous : nextLogs);
  }).catch(err => toast(err.message, 'error'));
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 3000);
    return () => clearInterval(timer);
  }, [meetingId, channel]);

  const getStatus = log => {
    const statuses = [log.email_status, log.whatsapp_status].filter(Boolean);
    if (statuses.includes('FAILED')) return 'failed';
    if (statuses.includes('PENDING')) return 'pending';
    if (statuses.includes('READ')) return 'read';
    if (statuses.includes('DELIVERED')) return 'delivered';
    return 'sent';
  };
  const visibleLogs = statusFilter === 'all' ? logs : logs.filter(log => getStatus(log) === statusFilter);
  const counts = logs.reduce((result, log) => { result[getStatus(log)] += 1; return result; }, { all: logs.length, sent: 0, delivered: 0, read: 0, pending: 0, failed: 0 });

  return (
    <section className="message-status-page">
      <button className="text-button" onClick={onBack}><ChevronRight size={15} style={{ transform: 'rotate(180deg)' }} /> {text.meetings}</button>
      <div className="message-status-head">
        <div>
          <div className="eyebrow green">MESSAGE STATUS</div>
          <h1>Message status</h1>
          <p className="muted">Showing all email and WhatsApp delivery statuses. This page refreshes automatically.</p>
        </div>
        <button className="secondary message-status-download" onClick={() => downloadCsv(messageStatusExportRows(logs), [
          { key: 'recipient', label: 'Recipient' }, { key: 'channel', label: 'Channel' }, { key: 'address', label: 'Email or WhatsApp' },
          { key: 'status', label: 'Status' }, { key: 'details', label: 'Details' }, { key: 'sent_at', label: 'Sent at' }
        ], `message-status-${meetingId}.csv`)} disabled={!logs.length}><Download size={15} /> Save CSV</button>
      </div>
      <div className="message-status-summary">
        {['all', 'sent', 'delivered', 'read', 'pending', 'failed'].map(status => (
          <button key={status} className={`status-summary ${statusFilter === status ? 'active' : ''} ${status === 'failed' ? 'danger' : ''}`} onClick={() => setStatusFilter(status)}>
            <span>{status}</span><strong>{counts[status]}</strong>
          </button>
        ))}
      </div>
      <div className="message-status-toolbar">
        <span className="muted">{visibleLogs.length} record{visibleLogs.length === 1 ? '' : 's'}</span>
        <button className="text-button" onClick={refresh}><RefreshCw size={14} /> Refresh now</button>
      </div>
      <div className="message-status-table">
        <table>
          <thead><tr><th>Guest</th><th>Email</th><th>WhatsApp</th><th>Time</th></tr></thead>
          <tbody>
            {visibleLogs.length === 0 ? <tr><td colSpan={4} className="muted">No message statuses recorded yet.</td></tr> : visibleLogs.map((log, index) => (
              <tr key={`${log.guest}-${index}`}>
                <td><strong>{log.guest}</strong><small>{log.phone || log.email}</small></td>
                <td><span className={`badge ${log.email_status === 'SENT' ? 'green' : log.email_status === 'FAILED' ? 'red' : 'gold'}`} title={log.email_error}>{log.email_status}</span></td>
                <td><span className={`badge ${['SENT', 'DELIVERED', 'READ'].includes(log.whatsapp_status) ? 'green' : log.whatsapp_status === 'FAILED' ? 'red' : 'gold'}`} title={log.whatsapp_error}>{log.whatsapp_status}</span></td>
                <td>{log.sent_at ? new Date(log.sent_at).toLocaleString() : 'Pending'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ── Admin Panel ────────────────────────────────────────── */

function AdminPanel({ user, lang }) {
  const toast = useToast();
  const text = uiText(lang);
  const [tab, setTab] = useState('accounts');
  const [accounts, setAccounts] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [integrations, setIntegrations] = useState(null);
  const [waPhone, setWaPhone] = useState('');
  const [waMessage, setWaMessage] = useState('');
  const [waTesting, setWaTesting] = useState(false);
  const [loading, setLoading] = useState(true);

  /* ── System Logs state ── */
  const [logContent, setLogContent] = useState('');
  const [logLines, setLogLines] = useState(500);
  const [logSearch, setLogSearch] = useState('');
  const [logLoading, setLogLoading] = useState(false);
  const [logAutoRefresh, setLogAutoRefresh] = useState(false);
  const logEndRef = useRef(null);

  const refresh = () => {
    setLoading(true);
    Promise.all([
      api('/api/admin/accounts').then(setAccounts).catch(e => toast(e.message, 'error')),
      api('/api/admin/attendance').then(setAttendance).catch(() => {}),
      api('/api/admin/audit-logs').then(setAuditLogs).catch(() => {}),
      api('/api/admin/integrations').then(setIntegrations).catch(() => setIntegrations(null))
    ]).finally(() => setLoading(false));
  };
  useEffect(() => { refresh(); }, []);

  /* ── Fetch system logs ── */
  const fetchLogs = async () => {
    setLogLoading(true);
    try {
      const data = await api(`/api/admin/logs?lines=${logLines}`);
      setLogContent(data.logs || 'No log data available.');
      setTimeout(() => {
        if (logEndRef.current) logEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      toast(err.message, 'error');
      setLogContent('Failed to load logs.');
    } finally {
      setLogLoading(false);
    }
  };

  const downloadFullLogs = async () => {
    try {
      await downloadBlob('/api/admin/logs/download', 'application.log', localStorage.token);
      toast(lang === 'sw' ? 'Kumbukumbu zote zimepakuliwa.' : 'Full system logs downloaded.', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const downloadAttendance = () => {
    downloadCsv(attendance, [
      { key: 'meeting_title', label: 'Meeting' },
      { key: 'meeting_reference', label: 'Reference' },
      { key: 'guest_name', label: 'Participant' },
      { key: 'guest_phone', label: 'Phone' },
      { key: 'checked_in_at', label: 'Checked in' },
      { key: 'attended', label: 'Attended' }
    ], 'attendance-records.csv');
  };

  const downloadAudit = () => {
    downloadCsv(auditLogs, [
      { key: 'at', label: 'Time' },
      { key: 'email', label: 'User' },
      { key: 'action', label: 'Action' },
      { key: 'detail', label: 'Detail' }
    ], 'audit-log.csv');
  };

  const downloadAccounts = () => {
    downloadCsv(accounts, [
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'role', label: 'Role' },
      { key: 'status', label: 'Status' }
    ], 'staff-accounts.csv');
  };

  // Fetch logs when switching to the logs tab
  useEffect(() => {
    if (tab === 'logs') fetchLogs();
  }, [tab, logLines]);

  // Auto-refresh logs every 10 seconds
  useEffect(() => {
    if (!logAutoRefresh || tab !== 'logs') return;
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, [logAutoRefresh, tab, logLines]);

  const updateAccount = async (id, patch) => {
    try {
      await api(`/api/admin/accounts/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
      toast('Account updated.', 'success');
      refresh();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const deleteUser = async (id, name) => {
    if (!confirm(`Are you sure you want to delete user "${name}"? This action cannot be undone.`)) return;
    try {
      await api(`/api/admin/users/${id}`, { method: 'DELETE' });
      toast('User deleted.', 'success');
      refresh();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const testWhatsApp = async (e) => {
    e.preventDefault();
    if (!waPhone.trim()) { toast('Enter a WhatsApp number to test.', 'error'); return; }
    setWaTesting(true);
    try {
      const r = await api('/api/admin/integrations/whatsapp-test', {
        method: 'POST',
        body: JSON.stringify({ phone: waPhone.trim(), message: waMessage.trim() })
      });
      if (r.sent) toast(`WhatsApp test sent to ${r.normalized_to || waPhone}.`, 'success');
      else toast(r.detail || r.reason || 'WhatsApp test failed.', 'error');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setWaTesting(false);
    }
  };

  // Filter log lines by search term
  const filteredLogs = logSearch.trim()
    ? logContent.split('\n').filter(line => line.toLowerCase().includes(logSearch.toLowerCase())).join('\n')
    : logContent;

  const logLineCount = logContent ? logContent.split('\n').filter(l => l.trim()).length : 0;
  const errorCount = logContent ? logContent.split('\n').filter(l => /\bERROR\b/i.test(l)).length : 0;
  const warnCount = logContent ? logContent.split('\n').filter(l => /\bWARN\b/i.test(l)).length : 0;

  if (user?.role !== 'admin') {
    return <div className="empty">Administrator access required.</div>;
  }

  const tabs = lang === 'sw'
    ? [['accounts', 'Akaunti za watumishi'], ['attendance', 'Mahudhurio'], ['logs', 'Kumbukumbu za mfumo'], ['integrations', 'Miunganisho'], ['audit', 'Kumbukumbu ya ukaguzi']]
    : [['accounts', 'Staff accounts'], ['attendance', 'Attendance'], ['logs', 'System Logs'], ['integrations', 'Integrations'], ['audit', 'Audit log']];

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow green">{lang === 'sw' ? 'UTAWALA WA HALMASHAURI' : 'COUNCIL ADMINISTRATION'}</div>
          <h1>{lang === 'sw' ? 'Usimamizi wa mfumo' : 'System administration'}</h1>
          <p className="muted">{lang === 'sw' ? 'Simamia akaunti za watumishi, mahudhurio, miunganisho ya ujumbe na shughuli za ukaguzi.' : 'Manage staff accounts, attendance, messaging integrations, and audit activity.'}</p>
        </div>
      </div>

      <div className="admin-tabs">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" className={`admin-tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="empty"><Loader2 size={22} className="spinner" style={{ color: 'var(--green)' }} /></div>
      ) : tab === 'accounts' ? (
        <section className="panel">
          <div className="panel-head"><h2>Staff accounts</h2><button className="secondary" onClick={downloadAccounts}><Download size={15} /> Download CSV</button></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {accounts.map(a => (
                  <tr key={a.id}>
                    <td><strong>{a.name}</strong><small>{a.phone}</small></td>
                    <td>{a.email}</td>
                    <td>
                      <select value={a.role} onChange={e => updateAccount(a.id, { role: e.target.value })}>
                        <option value="organizer">Organizer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td><span className={`badge ${a.active ? 'green' : 'grey'}`}>{a.status}</span></td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button className="text-button" onClick={() => updateAccount(a.id, { active: !a.active })}>
                        {a.active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button className="text-button" style={{ color: 'var(--red, #e53e3e)' }} onClick={() => deleteUser(a.id, a.name)} title="Delete user">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : tab === 'attendance' ? (
        <section className="panel">
          <div className="panel-head"><h2>Attendance records</h2><div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><p className="muted">{attendance.length} check-ins recorded</p><button className="secondary" onClick={downloadAttendance}><Download size={15} /> Download CSV</button></div></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Meeting</th><th>Participant</th><th>Phone</th><th>Checked in</th><th>Status</th></tr></thead>
              <tbody>
                {attendance.length === 0
                  ? <tr><td colSpan={5} className="muted">No attendance records yet.</td></tr>
                  : attendance.map((row, i) => (
                    <tr key={i}>
                      <td><strong>{row.meeting_title || row.meeting_reference}</strong><small>{row.meeting_reference}</small></td>
                      <td>{row.guest_name || `Guest #${row.participant_id}`}</td>
                      <td>{row.guest_phone || '—'}</td>
                      <td>{row.checked_in_at ? new Date(row.checked_in_at).toLocaleString() : '—'}</td>
                      <td><span className={`badge ${row.attended ? 'green' : 'grey'}`}>{row.attended ? 'attended' : 'pending'}</span></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : tab === 'integrations' ? (
        <section className="panel">
          <div className="panel-head">
            <h2><MessageCircle size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />Messaging integrations</h2>
          </div>
          <div style={{ padding: '20px 24px' }}>
            {integrations ? (
              <div className="metric-grid" style={{ marginBottom: 20 }}>
                <div className="metric">
                  <div className="metric-icon"><MessageCircle size={18} /></div>
                  <div>
                    <span>WhatsApp</span>
                    <strong>{integrations.configured ? 'Configured' : 'Not configured'}</strong>
                  </div>
                </div>
                <div className="metric">
                  <div className="metric-icon"><ShieldCheck size={18} /></div>
                  <div>
                    <span>Enabled</span>
                    <strong>{integrations.enabled ? 'Yes' : 'No'}</strong>
                  </div>
                </div>
                <div className="metric">
                  <div className="metric-icon"><Send size={18} /></div>
                  <div>
                    <span>Template</span>
                    <strong>{integrations.template || 'hello_world'}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <p className="muted">Could not load integration status.</p>
            )}
            <p className="muted" style={{ marginBottom: 16 }}>
              Test WhatsApp delivery to a Meta sandbox recipient. Add your number in Meta → WhatsApp → API Setup first.
            </p>
            <form className="account-form" onSubmit={testWhatsApp} style={{ maxWidth: 480 }}>
              <label>Test phone number
                <input value={waPhone} onChange={e => setWaPhone(e.target.value)} placeholder="07******** or +2557********" required />
              </label>
              <label>Optional message
                <textarea value={waMessage} onChange={e => setWaMessage(e.target.value)} placeholder="BMC Meetings test message" />
              </label>
              <button className="primary" disabled={waTesting}>
                {waTesting ? <Loader2 size={16} className="spinner" /> : <><MessageCircle size={16} /> Send WhatsApp test</>}
              </button>
            </form>
            <p className="muted" style={{ marginTop: 16, fontSize: 12 }}>
              Guest import template: <a className="template-link" href="/api/templates/guest-import.xlsx" download="guest-list-template.xlsx">Download XLSX</a>
            </p>
          </div>
        </section>
      ) : tab === 'audit' ? (
        <section className="panel">
          <div className="panel-head"><h2>Audit log</h2><button className="secondary" onClick={downloadAudit}><Download size={15} /> Download CSV</button></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Detail</th></tr></thead>
              <tbody>
                {auditLogs.slice(0, 100).map(row => (
                  <tr key={row.id}>
                    <td>{new Date(row.at).toLocaleString()}</td>
                    <td>{row.email}</td>
                    <td><span className="badge blue">{row.action}</span></td>
                    <td>{row.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : tab === 'logs' ? (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2><Terminal size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />System Logs</h2>
              <p className="muted">Application log output from the backend server</p>
            </div>
          </div>
          <div className="log-controls">
            <div className="log-stats">
              <span className="log-stat">{logLineCount} lines</span>
              {errorCount > 0 && <span className="log-stat log-stat-error">{errorCount} errors</span>}
              {warnCount > 0 && <span className="log-stat log-stat-warn">{warnCount} warnings</span>}
            </div>
            <div className="log-actions">
              <div className="log-search-wrap">
                <Search size={14} />
                <input
                  type="text"
                  className="log-search"
                  placeholder="Filter logs..."
                  value={logSearch}
                  onChange={e => setLogSearch(e.target.value)}
                />
              </div>
              <select className="log-lines-select" value={logLines} onChange={e => setLogLines(Number(e.target.value))}>
                <option value={100}>Last 100 lines</option>
                <option value={250}>Last 250 lines</option>
                <option value={500}>Last 500 lines</option>
                <option value={1000}>Last 1000 lines</option>
                <option value={5000}>Last 5000 lines</option>
              </select>
              <button
                className={`log-btn ${logAutoRefresh ? 'active' : ''}`}
                onClick={() => setLogAutoRefresh(p => !p)}
                title={logAutoRefresh ? 'Stop auto-refresh' : 'Auto-refresh every 10s'}
              >
                <RefreshCw size={14} className={logAutoRefresh ? 'spinner-slow' : ''} />
                {logAutoRefresh ? 'Live' : 'Auto'}
              </button>
              <button className="log-btn" onClick={fetchLogs} disabled={logLoading} title="Refresh logs now">
                {logLoading ? <Loader2 size={14} className="spinner" /> : <RefreshCw size={14} />}
                Refresh
              </button>
              <button className="log-btn" onClick={downloadFullLogs} title="Download complete application log">
                <Download size={14} /> Download all
              </button>
            </div>
          </div>
          <div className="log-viewer">
            <pre className="log-content">
              {filteredLogs.split('\n').map((line, i) => {
                let cls = 'log-line';
                if (/\bERROR\b/i.test(line)) cls += ' log-error';
                else if (/\bWARN\b/i.test(line)) cls += ' log-warn';
                else if (/\bDEBUG\b/i.test(line)) cls += ' log-debug';
                return <div key={i} className={cls}><span className="log-line-num">{i + 1}</span>{line}</div>;
              })}
              <div ref={logEndRef} />
            </pre>
          </div>
        </section>
      ) : null}
    </>
  );
}

/* ── Account Settings ───────────────────────────────────── */

function Account({ lang, user, onBack, onUpdated, focusWhatsApp }) {
  const t = copy[lang];
  const text = uiText(lang);
  const whatsappSectionRef = useRef(null);
  const toast = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [currentEmail, setCurrentEmail] = useState(user?.email || '');
  const [emailCode, setEmailCode] = useState('');
  const [emailStage, setEmailStage] = useState('details');
  const [pendingEmail, setPendingEmail] = useState('');
  const [developmentOtp, setDevelopmentOtp] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);

  useEffect(() => {
    api('/api/me')
      .then(p => {
        setName(p.name || '');
        setPhone(p.phone || '');
        const freshEmail = p.email || user?.email || '';
        setEmail(freshEmail);
        setCurrentEmail(freshEmail);
        setEmailVerified(!!p.emailVerified);
        if (p.emailVerified) {
          setEmailStage('details');
          setEmailCode('');
          setPendingEmail('');
          setDevelopmentOtp('');
        }
      })
      .catch(err => toast(err.message, 'error'))
      .finally(() => setLoading(false));
    api('/api/auth/config').then(c => setWhatsappEnabled(!!c.whatsapp_enabled)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!focusWhatsApp) return;
    const timer = setTimeout(() => whatsappSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    return () => clearTimeout(timer);
  }, [focusWhatsApp]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const trimmedEmail = email.trim().toLowerCase();
      const isEmailChanged = trimmedEmail !== currentEmail.toLowerCase();

      // Email unchanged — save name/phone directly, no OTP needed.
      if (!isEmailChanged) {
        if (emailStage === 'verify') {
          setEmailStage('details');
          setEmailCode('');
          setPendingEmail('');
          setDevelopmentOtp('');
        }
        const r = await api('/api/me', { method: 'PUT', body: JSON.stringify({ name, phone }) });
        toast(`${t.saved}${r.phone ? ` Phone: ${r.phone}` : ''}`, 'success');
        return;
      }

      // Email changed — request OTP first (only once per new address).
      if (emailStage === 'details') {
        const r = await api('/api/me/email-change/request', { method: 'POST', body: JSON.stringify({ email: trimmedEmail }) });
        if (r.status === 'unchanged') {
          setCurrentEmail(trimmedEmail);
          const profile = await api('/api/me', { method: 'PUT', body: JSON.stringify({ name, phone }) });
          toast(`${t.saved}${profile.phone ? ` Phone: ${profile.phone}` : ''}`, 'success');
          return;
        }
        setPendingEmail(trimmedEmail);
        setDevelopmentOtp(r.development_email_otp || '');
        setEmailCode('');
        setEmailStage('verify');
        toast('Enter the verification code sent to your new email address.', 'info');
        return;
      }

      // Verify OTP, then save profile (server validates the code — one error toast via catch).
      if (emailStage === 'verify') {
        if (trimmedEmail !== pendingEmail) {
          setEmailStage('details');
          setEmailCode('');
          setPendingEmail('');
          setDevelopmentOtp('');
          toast('Email address changed. Save again to receive a new verification code.', 'info');
          return;
        }
        await api('/api/me/email-change/verify', { method: 'POST', body: JSON.stringify({ email: trimmedEmail, code: emailCode }) });
        setCurrentEmail(trimmedEmail);
        setEmail(trimmedEmail);
        setEmailStage('details');
        setEmailCode('');
        setPendingEmail('');
        setDevelopmentOtp('');
        onUpdated?.(trimmedEmail);
        const r = await api('/api/me', { method: 'PUT', body: JSON.stringify({ name, phone }) });
        toast(`${t.saved}${r.phone ? ` Phone: ${r.phone}` : ''}`, 'success');
      }
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setSavingPassword(true);
    try {
      await api('/api/me/password-change', {
        method: 'POST',
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
      });
      setCurrentPassword('');
      setNewPassword('');
      toast('Password updated successfully.', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <section className="panel account-panel">
      <button className="text-button" onClick={onBack}>
        <ChevronRight size={15} style={{ transform: 'rotate(180deg)' }} /> {t.dashboard}
      </button>
      <div className="page-head compact">
        <div>
          <div className="eyebrow green">{text.profile}</div>
          <h1>{t.account}</h1>
          <p className="muted">{text.updateProfile}</p>
        </div>
      </div>
      {loading
        ? <p className="muted"><Loader2 size={16} className="spinner" style={{ color: 'var(--green)' }} /> Loading profile…</p>
        : (
          <form className="account-form" onSubmit={save}>
            <label>{t.name || 'Full name'}<input value={name} onChange={e => setName(e.target.value)} required /></label>
            <label>{t.email}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={emailStage === 'verify'} style={{ flex: 1 }} />
                {emailVerified && <span className="badge green">{text.verified}</span>}
              </div>
            </label>
            {emailStage === 'verify' && (
              <label>
                {t.emailVerification}
                <OtpBoxes label={t.emailVerification} value={emailCode} onChange={setEmailCode} numeric />
                {developmentOtp && <small className="dev-otp">Local test OTP: <strong>{developmentOtp}</strong></small>}
                <small>Enter the code sent to <strong>{pendingEmail}</strong>. Your profile will save after verification.</small>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setEmail(currentEmail);
                    setEmailStage('details');
                    setEmailCode('');
                    setPendingEmail('');
                    setDevelopmentOtp('');
                  }}
                >
                  {text.cancelEmail}
                </button>
              </label>
            )}
            <label>{t.phone}
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="07******** or +2557********" />
              <small className="muted">Used for WhatsApp invitations{whatsappEnabled ? ' (OTP at registration enabled)' : ''}.</small>
            </label>
            <label>{text.role}<input value={user?.role || ''} disabled /></label>
            <button className="primary" disabled={saving}>
              {saving ? <Loader2 size={16} className="spinner" /> : <>{t.saveAccount}<ChevronRight size={16} /></>}
            </button>
          </form>
        )}
      {!loading && (
        <form className="account-form" onSubmit={changePassword} style={{ marginTop: 28 }}>
          <div className="eyebrow green">{text.security}</div>
          <h2 style={{ margin: '8px 0 16px', fontSize: 18 }}>{text.changePassword}</h2>
          <label>{text.currentPassword}<input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required autoComplete="current-password" /></label>
          <label>{text.newPassword}<input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={8} required autoComplete="new-password" /></label>
          <button className="secondary" disabled={savingPassword}>
            {savingPassword ? <Loader2 size={16} className="spinner" /> : text.updatePassword}
          </button>
        </form>
      )}
      {!loading && (
        <div ref={whatsappSectionRef} className="account-form" style={{ marginTop: 28 }}>
          <div className="eyebrow green">{text.whatsappMessaging}</div>
          <h2 style={{ margin: '8px 0 16px', fontSize: 18 }}>WhatsApp Business</h2>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
            <p style={{ margin: '0 0 10px', fontWeight: 600 }}>System default number</p>
            <p className="muted" style={{ margin: '0 0 16px', fontSize: 13 }}>Messages are sent using the WhatsApp Business number configured by the administrator.</p>
            <p style={{ margin: '0 0 16px', fontWeight: 600 }}>Personal WhatsApp Business number</p>
            <div style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 8, padding: 14, marginBottom: 10, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <MessageCircle size={18} style={{ color: '#2563eb', flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text)' }}>
                Personal WhatsApp Business numbers are not available yet. Meeting invitations will continue to use the system default number.
              </p>
            </div>
          </div>
        </div>
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
  const [document, setDocument] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) { setDocument(null); return; }
    if (file.type !== 'application/pdf') {
      toast('Only PDF files are accepted.', 'error');
      e.target.value = '';
      setDocument(null);
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast('File must be less than 3MB.', 'error');
      e.target.value = '';
      setDocument(null);
      return;
    }
    setDocument(file);
  };

  const submit = async () => {
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('status', status);
      if (reason) fd.append('reason', reason);
      fd.append('language', lang);
      if (document) fd.append('document', document);

      const r = await fetch('/api/rsvp/' + token, {
        method: 'POST',
        body: fd
      });
      const body = await r.json().catch(() => ({}));
      if (r.ok) {
        const responseLabel = { confirmed: 'Attendance confirmed', tentative: 'Marked as tentative', declined: 'Attendance declined' }[status] || 'Response recorded';
        setSubmitted(true);
        toast(`${responseLabel}. Thank you.`, 'success');
      } else {
        const errMsg = parseApiError(body, 'The response could not be saved. Please try again.');
        toast(errMsg, 'error');
      }
    } catch {
      toast('The service is unavailable. Check your connection and try again.', 'error');
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
            <>
              <div className="notice notice-amber" style={{ margin: '16px 0', padding: '14px 16px', background: '#fff8e1', borderLeft: '4px solid #F9A825', borderRadius: '8px' }}>
                <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: '13px', color: '#92400e', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  ⚠ {lang === 'en' ? 'Important Notice' : 'Taarifa Muhimu'}
                </p>
                <p style={{ margin: 0, fontSize: '14px', color: '#78350f', lineHeight: 1.6 }}>
                  {lang === 'en'
                    ? 'Please note that submitting this form does not replace formal procedures for reporting non-attendance. You are still required to follow your department\'s established protocols for leave, absence, or any other applicable administrative processes.'
                    : 'Tafadhali kumbuka kwamba kuwasilisha fomu hii hakuchukui nafasi ya taratibu rasmi za kuripoti kutokuwepo. Bado unahitajika kufuata itifaki za idara yako kwa likizo, kutokuwepo, au mchakato mwingine wowote wa kiutawala unaohusika.'}
                </p>
              </div>
              <label>{t.reason}<textarea value={reason} onChange={e => setReason(e.target.value)} required placeholder={lang === 'en' ? 'Please explain why you cannot attend...' : 'Tafadhali eleza kwa nini huwezi kuhudhuria...'} /></label>
              {/leave|sick|medical|maternity|annual/i.test(reason) && (
                <div className="notice notice-blue">
                  {lang === 'en'
                    ? 'If this is official leave, please also follow your department HR leave procedures.'
                    : 'Ikiwa hii ni likizo rasmi, tafadhali fuata taratibu za HR za idara yako.'}
                </div>
              )}
              <label style={{ marginTop: 12 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  {lang === 'en' ? 'Supporting document' : 'Nyaraka ya msaada'}
                  <span className="badge" style={{ background: '#e5e7eb', color: '#6b7280', fontSize: '11px', padding: '2px 8px', borderRadius: '999px' }}>
                    {lang === 'en' ? 'Optional' : 'Hiari'}
                  </span>
                </span>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  style={{ padding: '10px', border: '1px dashed #d1d5db', borderRadius: '8px', width: '100%', background: '#f9fafb', cursor: 'pointer' }}
                />
                <small className="muted" style={{ display: 'block', marginTop: 4 }}>
                  {lang === 'en'
                    ? 'PDF only, max 3MB (e.g. leave form, medical certificate)'
                    : 'PDF pekee, upeo wa 3MB (k.m. fomu ya likizo, cheti cha matibabu)'}
                </small>
              </label>
            </>
          )}
          <button className="primary full" disabled={!status || loading || submitted} onClick={submit} style={{ marginTop: 20 }}>
            {loading ? <Loader2 size={17} className="spinner" /> : <>{t.submit}<ChevronRight size={17} /></>}
          </button>
          {submitted && <p className="success">{t.responseSaved}</p>}
        </section>
      </main>
    </>
  );
}

function Attendance({ lang, setLang }) {
  const t = copy[lang] || copy.en;
  const text = uiText(lang);
  const token = new URLSearchParams(location.search).get('token');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('idle'); // idle, scanning, success
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  
  useEffect(() => {
    if (token) {
      fetch('/api/attendance/' + token)
        .then(async r => {
          const x = await r.json();
          if (!r.ok) throw Error(x.message || 'Invalid check-in link');
          return x;
        })
        .then(setData)
        .catch(e => setError(e.message));
    }
    return () => streamRef.current?.getTracks().forEach(t => t.stop());
  }, [token]);

  const submit = async payload => {
    try {
      setScanStatus('success');
      const r = await fetch('/api/attendance/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personal_token: token, qr_payload: payload })
      });
      const x = await r.json();
      if (!r.ok) throw Error(x.message || 'Check-in failed');
      setMessage(x.message);
      streamRef.current?.getTracks().forEach(t => t.stop());
      setScanning(false);
      setData({ ...data, attended: true, check_in_open: false });
    } catch (e) {
      setError(e.message);
      setScanStatus('idle');
    }
  };

  const start = async () => {
    setError('');
    setScanning(true);
    setScanStatus('scanning');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      const scan = () => {
        if (!streamRef.current || !videoRef.current) return;
        
        if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });
          
          if (code && code.data) {
            return submit(code.data);
          }
        }
        requestAnimationFrame(scan);
      };
      
      // Start the scan loop
      requestAnimationFrame(scan);
    } catch (e) {
      setScanning(false);
      setScanStatus('idle');
      setError('Camera access is required to scan the meeting attendance QR code. Please allow camera permissions.');
    }
  };

  const stopScanner = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    setScanning(false);
    setScanStatus('idle');
  };

  if (error && !data) {
    return (
      <>
        <Brand lang={lang} setLang={setLang} />
        <main className="auth-shell">
          <section className="auth-card">
            <div className="auth-kicker"><AlertCircle size={16} /> {text.checkinError}</div>
            <h2>{text.unableLoad}</h2>
            <p className="error">{error}</p>
          </section>
        </main>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <Brand lang={lang} setLang={setLang} />
        <main className="auth-shell">
          <section className="auth-card">
            <p className="muted"><Loader2 size={20} className="spinner" style={{ color: 'var(--green)' }} /> Loading check-in…</p>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <Brand lang={lang} setLang={setLang} />
      <main className="rsvp-shell">
        <section className="rsvp-card">
          <div className="eyebrow green">{text.checkin}</div>
          <h1>{data.meeting.title}</h1>
          <p className="rsvp-name">{text.welcome}, <strong>{data.participant}</strong></p>
          
          <div className="rsvp-event">
            <p>{data.meeting.purpose}</p>
            <div><CalendarDays size={17} />{new Date(data.meeting.start_at).toLocaleString()}</div>
            <div><MapPin size={17} />{data.meeting.location}</div>
          </div>
          
          <div className="attendance-feedback">
            {data.attended || message ? (
              <div className="success-banner">
                <CheckCircle2 size={24} style={{ color: 'var(--green)' }} />
                <div>
                  <strong>{message || text.attendanceRecorded}</strong>
                  <p>{text.checkedInto}</p>
                </div>
              </div>
            ) : !data.check_in_open ? (
              <div className="notice-banner">
                <Clock3 size={24} style={{ color: 'var(--gold)' }} />
                <div>
                  <strong>{text.checkinUnavailable}</strong>
                  <p>{data.message}</p>
                </div>
              </div>
            ) : (
              <div className="scanner-container">
                <div className="instruction-box">
                  <QrCode size={20} className="instruction-icon" />
                  <p><strong>{text.instructions}:</strong> {text.scannerInstruction}</p>
                </div>
                
                {scanning && (
                  <div className="video-wrapper">
                    <video ref={videoRef} className="scanner-video" muted playsInline />
                    <div className="scanner-overlay">
                      <div className="scan-frame"></div>
                    </div>
                  </div>
                )}
                
                {!scanning && (
                  <button className="primary full large-btn" onClick={start}>
                    <QrCode size={18} /> {text.openScanner}
                  </button>
                )}
                
                {scanning && (
                  <button className="secondary full" style={{ marginTop: 16 }} onClick={stopScanner}>
                    {text.stopScanner}
                  </button>
                )}
                
                {error && <p className="error" style={{ marginTop: 16 }}>{error}</p>}
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}

/* ── Root App Component ─────────────────────────────────── */

export default function App() {
  const [lang, setLang] = useState(localStorage.lang || 'en');
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [account, setAccount] = useState(false);
  const [adminView, setAdminView] = useState(false);
  const [focusWhatsApp, setFocusWhatsApp] = useState(false);
  const [showWhatsAppNotice, setShowWhatsAppNotice] = useState(false);
  const [messageStatus, setMessageStatus] = useState(null);
  const [view, setView] = useState('dashboard');
  const toast = useToast();

  // Restore session from stored token on page load.
  useEffect(() => {
    if (!localStorage.token) {
      setAuthChecked(true);
      return;
    }
    api('/api/me')
      .then(p => {
        setUser({ name: p.name, role: p.role, email: p.email, whatsappConnected: !!p.whatsappConnected });
        history.replaceState(null, '', '/');
      })
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setAuthChecked(true));
  }, []);

  if (location.pathname === '/rsvp.html') {
    return <Rsvp lang={lang} setLang={setLang} />;
  }
  if (location.pathname === '/attendance.html') {
    return <Attendance lang={lang} setLang={setLang} />;
  }

  if (!authChecked) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <p className="muted"><Loader2 size={20} className="spinner" style={{ color: 'var(--green)' }} /> Loading…</p>
        </section>
      </main>
    );
  }

  if (!localStorage.token && !user) {
    return <LoginOtp lang={lang} setLang={setLang} onLogin={u => { setUser(u); setView('dashboard'); setAccount(false); }} />;
  }

  const current = user || { name: 'Administrator', role: 'admin' };

  const handleLogout = async () => {
    const token = localStorage.token;
    localStorage.removeItem('token');
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
      }
    } catch { /* ignore */ }
    history.replaceState(null, '', '/');
    setAccount(false);
    setFocusWhatsApp(false);
    setMessageStatus(null);
    setView('dashboard');
    toast('You have been signed out.', 'info');
    setUser(null);
  };

  const openPersonalWhatsApp = () => {
    setAccount(true);
    setAdminView(false);
    setView('dashboard');
    setFocusWhatsApp(true);
    setShowWhatsAppNotice(true);
  };

  return (
    <>
      <OfflineBanner lang={lang} />
      {current && !current.whatsappConnected && !account && !adminView && !sessionStorage.getItem('wa_dismissed') && (
        <div style={{ background: 'linear-gradient(135deg, #1b5e20 0%, #25d366 100%)', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', fontSize: 14, color: '#fff' }}>
          <span>📱 Connect your WhatsApp Business number to send meeting invitations from your own number.</span>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={openPersonalWhatsApp} style={{ background: '#fff', color: '#1b5e20', border: 'none', borderRadius: 6, padding: '6px 14px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>{uiText(lang).useMyWhatsApp}</button>
            <button onClick={() => { sessionStorage.setItem('wa_dismissed', '1'); setUser(prev => ({ ...prev })); }} style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 6, padding: '6px 14px', fontWeight: 500, cursor: 'pointer', fontSize: 13 }}>Use default number</button>
          </div>
        </div>
      )}
      {showWhatsAppNotice && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="whatsapp-notice-title">
            <div className="modal-head">
              <div>
                <div className="eyebrow green">{uiText(lang).whatsappMessaging}</div>
                <h2 id="whatsapp-notice-title">{uiText(lang).whatsappComingTitle}</h2>
              </div>
              <button className="icon-button" onClick={() => setShowWhatsAppNotice(false)} aria-label={uiText(lang).close}><X /></button>
            </div>
            <p className="muted">{uiText(lang).whatsappComingMessage}</p>
            <div className="modal-actions">
              <button className="primary" onClick={() => setShowWhatsAppNotice(false)}>{uiText(lang).close}</button>
            </div>
          </section>
        </div>
      )}
      <Shell
      lang={lang} setLang={setLang} user={current}
      onLogout={handleLogout}
      view={adminView ? 'admin' : account ? 'account' : view}
      onNavigate={next => { setAccount(false); setFocusWhatsApp(false); setMessageStatus(null); setAdminView(false); setView(next); }}
      onAccount={() => { setAccount(true); setFocusWhatsApp(false); setAdminView(false); setView('dashboard'); }}
      onAdmin={() => { setAdminView(true); setAccount(false); setView('dashboard'); }}
    >
      {adminView
        ? <AdminPanel user={current} lang={lang} />
        : messageStatus
          ? <MessageStatusPage lang={lang} meetingId={messageStatus.meetingId} channel={messageStatus.channel} onBack={() => setMessageStatus(null)} />
        : account
          ? <Account lang={lang} user={current} focusWhatsApp={focusWhatsApp} onBack={() => { setAccount(false); setFocusWhatsApp(false); }} onUpdated={email => setUser(prev => ({ ...(prev || current), email }))} />
          : <Dashboard lang={lang} user={current} view={view} onOpenDeliveryLogs={(meetingId, channel) => setMessageStatus({ meetingId, channel })} />
      }
    </Shell>
    </>
  );
}
