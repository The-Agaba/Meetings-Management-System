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

/* ── Layout Shell ───────────────────────────────────────── */

function Shell({ lang, setLang, user, onLogout, children, onAccount, onAdmin, view, onNavigate }) {
  const t = copy[lang];
  return (
    <>
      <Brand lang={lang} setLang={setLang} />
      <div className="app-shell">
        <aside className="sidebar" aria-label="Main navigation">
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
          {user?.role === 'admin' && (
            <button
              className={`side-link ${view === 'admin' ? 'active' : ''}`}
              onClick={() => onAdmin()}
            >
              <UserCog size={17} />Administration
            </button>
          )}
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
      <nav className="mobile-nav" aria-label="Mobile navigation">
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
            <span>Admin</span>
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

function MeetingModal({ t, meeting, onClose, onSaved }) {
  const toast = useToast();
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
    if (!isEdit && start <= new Date()) { toast('Meeting start must be in the future.', 'error'); return; }
    if (end <= start) { toast('Meeting end must be after the start time.', 'error'); return; }
    setLoading(true);
    try {
      const payload = { ...form, start_at: start.toISOString(), end_at: end.toISOString() };
      if (isEdit) {
        await api(`/api/meetings/${meeting.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast('Meeting updated successfully.', 'success');
        const datesChanged = originalStart !== start.toISOString() || originalEnd !== end.toISOString();
        onSaved({ notifyReschedule: datesChanged && meeting.status === 'published' });
      } else {
        await api('/api/meetings', { method: 'POST', body: JSON.stringify(payload) });
        toast('Meeting created successfully.', 'success');
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
            <div className="eyebrow green">{isEdit ? 'EDIT RECORD' : 'NEW RECORD'}</div>
            <h2>{isEdit ? 'Edit meeting' : t.create}</h2>
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
            <button type="button" className="secondary" onClick={onClose}>Cancel</button>
            <button className="primary" disabled={loading}>
              {loading ? <Loader2 size={16} className="spinner" /> : <>{isEdit ? 'Save changes' : t.save}<ChevronRight size={16} /></>}
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
      <h3><QrCode size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />Session Attendance QR</h3>
      {qr ? (
        <div className="qr-display">
          <QRCodeSVG value={qr.payload} size={220} level="H" includeMargin />
          <p className="qr-expiry">
            {secondsLeft > 0
              ? <><strong>{secondsLeft}s</strong> remaining — display on screen for participants</>
              : <>Refreshing QR...</>
            }
          </p>
          {secondsLeft > 0 && (
            <button className="secondary" onClick={() => generate(false)} disabled={loading}>
              {loading ? <Loader2 size={15} className="spinner" /> : <RefreshCw size={15} />} Refresh QR
            </button>
          )}
          <p className="qr-hint" style={{ marginTop: 12 }}>
            Participants scan this with their Personal Sign-In Link page to record attendance.
          </p>
        </div>
      ) : (
        <button className="secondary" onClick={() => generate(false)} disabled={loading}>
          {loading ? <Loader2 size={15} className="spinner" /> : <QrCode size={15} />}
          Generate Session QR Code
        </button>
      )}
    </div>
  );
}

/* ── CSV Import Section ─────────────────────────────────── */

function CsvImport({ meetingId, onDone }) {
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
        <Download size={14} /> Download XLSX template
      </a>
      <form className="csv-import" onSubmit={upload}>
      <FileUp size={18} style={{ color: 'var(--green)', flexShrink: 0 }} />
      <input
        type="file"
        accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={e => setFile(e.target.files[0])}
      />
      <button className="secondary" type="submit" disabled={!file || loading}>
        {loading ? <Loader2 size={14} className="spinner" /> : 'Import CSV / XLSX'}
      </button>
    </form>
    </div>
  );
}

/* ── Meeting Detail Modal ───────────────────────────────── */

function DetailModal({ meetingId, t, onClose }) {
  const toast = useToast();
  const [m, setM] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [guestForm, setGuestForm] = useState({ name: '', phone: '', email: '', organization: '', role_title: '' });
  const [sendLoading, setSendLoading] = useState(false);
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
        <button className="secondary" onClick={onClose}>Close</button>
      </section>
    </div>
  );
  if (!m) return (
    <div className="modal-backdrop">
      <section className="modal"><p className="muted">Loading meeting details…</p></section>
    </div>
  );

  const readOnly = new Date(m.end_at) <= new Date();
  const isCancelled = m.status === 'cancelled';
  const canManage = !!m.can_manage && !readOnly && !isCancelled;

  if (editing) {
    return (
      <MeetingModal
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
      await api(`/api/meetings/${meetingId}/guests`, { method: 'POST', body: JSON.stringify(guestForm) });
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
              <div className="eyebrow green">SCHEDULE CHANGE</div>
              <h2>Notify guests of reschedule</h2>
            </div>
            <button className="icon-button" onClick={() => setShowNotify(false)}><X /></button>
          </div>
          <p className="muted">Send an updated schedule notice to all guests by email and WhatsApp.</p>
          <label>Note to guests (optional)
            <textarea value={notifyNote} onChange={e => setNotifyNote(e.target.value)} placeholder="e.g. Venue unchanged, only the time has moved." />
          </label>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setShowNotify(false)}>Skip for now</button>
            <button className="primary" onClick={notifyReschedule} disabled={actionLoading}>
              {actionLoading ? <Loader2 size={16} className="spinner" /> : <Bell size={16} />}
              Send reschedule notice
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
              <div className="eyebrow green">CANCELLATION</div>
              <h2>Cancel this meeting</h2>
            </div>
            <button className="icon-button" onClick={() => setShowCancel(false)}><X /></button>
          </div>
          <p className="muted">All invited guests will receive a cancellation notice.</p>
          <label>Reason for cancellation
            <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} required placeholder="e.g. Postponed due to official travel" />
          </label>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setShowCancel(false)}>Keep meeting</button>
            <button className="primary" style={{ background: '#a32d2d' }} onClick={cancelMeeting} disabled={actionLoading}>
              {actionLoading ? <Loader2 size={16} className="spinner" /> : <Ban size={16} />}
              Confirm cancellation
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
          <span><CalendarDays size={16} />{new Date(m.start_at).toLocaleString()} – {new Date(m.end_at).toLocaleTimeString()}</span>
          <span><MapPin size={16} />{m.location || 'Council venue'}</span>
          <span className={`badge ${isCancelled ? 'red' : m.status === 'published' ? 'green' : 'gold'}`}>{m.status}</span>
        </div>

        {m.purpose && <p className="muted" style={{ marginBottom: 16 }}>{m.purpose}</p>}
        {isCancelled && (
          <div className="notice-cancel">
            <strong>Meeting cancelled</strong>
            {m.cancellation_reason ? ` — ${m.cancellation_reason}` : ''}
          </div>
        )}
        {readOnly && !isCancelled && <div className="notice">This meeting has ended. The record is available for viewing only.</div>}
        {!canManage && !readOnly && !isCancelled && (
          <div className="notice notice-blue">You are viewing this meeting in read-only mode. Only the organiser can edit guests or send notices.</div>
        )}

        {m.attendance && (
          <div className="detail-stats" style={{ marginTop: 0, marginBottom: 16 }}>
            <Metric label="Invited" value={m.attendance.invited || 0} />
            <Metric label="Attended" value={m.attendance.attended || 0} />
            <Metric label="Absent" value={m.attendance.not_attended || 0} />
            <Metric label="Rate" value={`${m.attendance.percentage || 0}%`} />
          </div>
        )}

        <div className="detail-stats">
          <Metric label="Confirmed" value={m.counts?.confirmed || 0} />
          <Metric label="Declined" value={m.counts?.declined || 0} />
          <Metric label="Tentative" value={m.counts?.tentative || 0} />
          <Metric label="No response" value={m.counts?.no_response || 0} />
        </div>

        <div className="modal-actions report-actions">
          <button className="secondary" onClick={() => downloadReport('csv')}>
            <Download size={16} />CSV report
          </button>
          <button className="secondary" onClick={() => downloadReport('pdf')}>
            <Download size={16} />PDF report
          </button>
          {canManage && (
            <button className="secondary" onClick={() => setEditing(true)}>
              <Settings2 size={16} /> Edit meeting
            </button>
          )}
          {canManage && m.status === 'published' && (
            <button className="secondary" onClick={() => setShowNotify(true)}>
              <Bell size={16} /> Notify reschedule
            </button>
          )}
          {canManage && (
            <button className="secondary" onClick={() => setShowCancel(true)} style={{ color: '#a32d2d' }}>
              <Ban size={16} /> Cancel meeting
            </button>
          )}
          {canManage && (
            <button className="primary" onClick={sendInvites} disabled={sendLoading}>
              {sendLoading ? <Loader2 size={16} className="spinner" /> : <Send size={16} />}
              {t.send}
            </button>
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
                  <small>
                    {[g.organization || g.role_title, g.phone, g.email].filter(Boolean).join(' · ') || 'Participant'}
                  </small>
                </span>
                <span className={`badge ${g.attended ? 'green' : 'grey'}`}>
                  {g.attended ? 'Checked in' : m.past ? 'Absent' : 'Not checked in'}
                </span>
                <span className={`badge ${g.status === 'confirmed' ? 'green' : g.status === 'declined' ? 'grey' : 'gold'}`}>
                  {g.status === 'no_response' ? 'No RSVP' : g.status.charAt(0).toUpperCase() + g.status.slice(1)}
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
              </div>
            ))}
          </div>
        )}

        {/* Add guest manually */}
        {canManage && (
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
        {canManage && (
          <div style={{ marginTop: 14 }}>
            <p className="section-label">Or import from file</p>
            <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
              Download the XLSX template, fill in guests, then upload CSV or XLSX.
            </p>
            <CsvImport meetingId={meetingId} onDone={refresh} />
          </div>
        )}

        {/* QR Code — only for upcoming meetings */}
        {canManage && <QrSection meetingId={meetingId} t={t} />}
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

      {show && <MeetingModal lang={lang} t={t} onClose={() => setShow(false)} onSaved={() => { setShow(false); refresh(); }} />}
      {selected && <DetailModal meetingId={selected} t={t} onClose={() => setSelected(null)} />}
    </>
  );
}

/* ── Admin Panel ────────────────────────────────────────── */

function AdminPanel({ user }) {
  const toast = useToast();
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

  const tabs = [
    ['accounts', 'Staff accounts'],
    ['attendance', 'Attendance'],
    ['logs', 'System Logs'],
    ['integrations', 'Integrations'],
    ['audit', 'Audit log']
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow green">COUNCIL ADMINISTRATION</div>
          <h1>System administration</h1>
          <p className="muted">Manage staff accounts, attendance, messaging integrations, and audit activity.</p>
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
          <div className="panel-head"><h2>Staff accounts</h2></div>
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
          <div className="panel-head"><h2>Attendance records</h2><p className="muted">{attendance.length} check-ins recorded</p></div>
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
                <input value={waPhone} onChange={e => setWaPhone(e.target.value)} placeholder="0757219157" required />
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
          <div className="panel-head"><h2>Audit log</h2></div>
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

function Account({ lang, user, onBack, onUpdated }) {
  const t = copy[lang];
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
            <label>{t.email}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={emailStage === 'verify'} style={{ flex: 1 }} />
                {emailVerified && <span className="badge green">Verified</span>}
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
                  Cancel email change
                </button>
              </label>
            )}
            <label>{t.phone}
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="0757219157" />
              <small className="muted">Used for WhatsApp invitations{whatsappEnabled ? ' (OTP at registration enabled)' : ''}.</small>
            </label>
            <label>Role<input value={user?.role || ''} disabled /></label>
            <button className="primary" disabled={saving}>
              {saving ? <Loader2 size={16} className="spinner" /> : <>{t.saveAccount}<ChevronRight size={16} /></>}
            </button>
          </form>
        )}
      {!loading && (
        <form className="account-form" onSubmit={changePassword} style={{ marginTop: 28 }}>
          <div className="eyebrow green">SECURITY</div>
          <h2 style={{ margin: '8px 0 16px', fontSize: 18 }}>Change password</h2>
          <label>Current password<input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required autoComplete="current-password" /></label>
          <label>New password<input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={8} required autoComplete="new-password" /></label>
          <button className="secondary" disabled={savingPassword}>
            {savingPassword ? <Loader2 size={16} className="spinner" /> : 'Update password'}
          </button>
        </form>
      )}
      {!loading && (
        <div className="account-form" style={{ marginTop: 28 }}>
          <div className="eyebrow green">WHATSAPP MESSAGING</div>
          <h2 style={{ margin: '8px 0 16px', fontSize: 18 }}>WhatsApp Business</h2>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
            <p style={{ margin: '0 0 10px', fontWeight: 600 }}>System default number</p>
            <p className="muted" style={{ margin: '0 0 16px', fontSize: 13 }}>Messages will be sent using the system default WhatsApp Business number configured by the administrator.</p>
            <p style={{ margin: '0 0 16px', fontWeight: 600 }}>My WhatsApp Business number</p>
            <div style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 8, padding: 14, marginBottom: 10 }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text)' }}>
                <strong>🚀 Coming Soon</strong> — Connecting your own WhatsApp Business number is an advanced feature that will be available in a future update.
              </p>
            </div>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>For now, all WhatsApp invitations are sent from the system default number.</p>
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
            <div className="auth-kicker"><AlertCircle size={16} /> CHECK-IN ERROR</div>
            <h2>Unable to load</h2>
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
          <div className="eyebrow green">ATTENDANCE CHECK-IN</div>
          <h1>{data.meeting.title}</h1>
          <p className="rsvp-name">Welcome, <strong>{data.participant}</strong></p>
          
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
                  <strong>{message || 'Attendance already recorded.'}</strong>
                  <p>You have successfully checked into this meeting.</p>
                </div>
              </div>
            ) : !data.check_in_open ? (
              <div className="notice-banner">
                <Clock3 size={24} style={{ color: 'var(--gold)' }} />
                <div>
                  <strong>Check-in is not available</strong>
                  <p>{data.message}</p>
                </div>
              </div>
            ) : (
              <div className="scanner-container">
                <div className="instruction-box">
                  <QrCode size={20} className="instruction-icon" />
                  <p><strong>Instructions:</strong> Use your camera to scan the session attendance QR code displayed by the meeting organiser.</p>
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
                    <QrCode size={18} /> Open camera scanner
                  </button>
                )}
                
                {scanning && (
                  <button className="secondary full" style={{ marginTop: 16 }} onClick={stopScanner}>
                    Stop scanner
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
    setView('dashboard');
    toast('You have been signed out.', 'info');
    setUser(null);
  };

  return (
    <>
      <OfflineBanner />
      {current && !current.whatsappConnected && !account && !adminView && !sessionStorage.getItem('wa_dismissed') && (
        <div style={{ background: 'linear-gradient(135deg, #1b5e20 0%, #25d366 100%)', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', fontSize: 14, color: '#fff' }}>
          <span>📱 Connect your WhatsApp Business number to send meeting invitations from your own number.</span>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={() => { setAccount(true); setAdminView(false); }} style={{ background: '#fff', color: '#1b5e20', border: 'none', borderRadius: 6, padding: '6px 14px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Connect WhatsApp</button>
            <button onClick={() => { sessionStorage.setItem('wa_dismissed', '1'); setUser(prev => ({ ...prev })); }} style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 6, padding: '6px 14px', fontWeight: 500, cursor: 'pointer', fontSize: 13 }}>Use default number</button>
          </div>
        </div>
      )}
      <Shell
      lang={lang} setLang={setLang} user={current}
      onLogout={handleLogout}
      view={adminView ? 'admin' : account ? 'account' : view}
      onNavigate={next => { setAccount(false); setAdminView(false); setView(next); }}
      onAccount={() => { setAccount(true); setAdminView(false); setView('dashboard'); }}
      onAdmin={() => { setAdminView(true); setAccount(false); setView('dashboard'); }}
    >
      {adminView
        ? <AdminPanel user={current} />
        : account
          ? <Account lang={lang} user={current} onBack={() => setAccount(false)} onUpdated={email => setUser(prev => ({ ...(prev || current), email }))} />
          : <Dashboard lang={lang} user={current} view={view} />
      }
    </Shell>
    </>
  );
}
