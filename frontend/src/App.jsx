import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle, Ban, Bell, CalendarDays, CheckCircle2, ChevronRight, Clock3, Download,
  FileUp, Loader2, LayoutDashboard, LogOut, MapPin, MessageCircle, Plus,
  QrCode, Send, Settings2, ShieldCheck, UserCog, Users, X
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
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
                <span className={`badge ${g.attended ? 'green' : 'grey'}`}>{g.attended ? 'attended' : 'not yet'}</span>
                <span className={`badge ${g.status === 'confirmed' ? 'green' : g.status === 'declined' ? 'grey' : 'gold'}`}>
                  {g.status}
                </span>
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

  const updateAccount = async (id, patch) => {
    try {
      await api(`/api/admin/accounts/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
      toast('Account updated.', 'success');
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

  if (user?.role !== 'admin') {
    return <div className="empty">Administrator access required.</div>;
  }

  const tabs = [
    ['accounts', 'Staff accounts'],
    ['attendance', 'Attendance'],
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
                    <td>
                      <button className="text-button" onClick={() => updateAccount(a.id, { active: !a.active })}>
                        {a.active ? 'Deactivate' : 'Activate'}
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
      ) : (
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
      )}
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
  const [submitted, setSubmitted] = useState(false);
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
            <label>{t.reason}<textarea value={reason} onChange={e => setReason(e.target.value)} required /></label>
          )}
          {status === 'declined' && /leave|sick|medical|maternity|annual/i.test(reason) && (
            <div className="notice notice-blue">
              {lang === 'en'
                ? 'If this is official leave, please also follow your department HR leave procedures.'
                : 'Ikiwa hii ni likizo rasmi, tafadhali fuata taratibu za HR za idara yako.'}
            </div>
          )}
          <button className="primary full" disabled={!status || loading || submitted} onClick={submit}>
            {loading ? <Loader2 size={17} className="spinner" /> : <>{t.submit}<ChevronRight size={17} /></>}
          </button>
          {submitted && <p className="success">{t.responseSaved}</p>}
        </section>
      </main>
    </>
  );
}

function Attendance({ lang, setLang }) {
  const token = new URLSearchParams(location.search).get('token');
  const [data, setData] = useState(null); const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [scanning, setScanning] = useState(false); const videoRef = useRef(null); const streamRef = useRef(null);
  useEffect(() => { if (token) fetch('/api/attendance/' + token).then(async r => { const x = await r.json(); if (!r.ok) throw Error(x.message || 'Invalid check-in link'); return x; }).then(setData).catch(e => setError(e.message)); return () => streamRef.current?.getTracks().forEach(t => t.stop()); }, [token]);
  const submit = async payload => { try { const r = await fetch('/api/attendance/sign-in',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({personal_token:token,qr_payload:payload})}); const x=await r.json(); if(!r.ok) throw Error(x.message || 'Check-in failed'); setMessage(x.message); streamRef.current?.getTracks().forEach(t=>t.stop()); setScanning(false); setData({...data,attended:true,check_in_open:false}); } catch(e){setError(e.message);} };
  const start = async () => { setError(''); setScanning(true); try { const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}}}); streamRef.current=stream; videoRef.current.srcObject=stream; await videoRef.current.play(); if ('BarcodeDetector' in window) { const detector=new BarcodeDetector({formats:['qr_code']}); const scan=async()=>{ if(!streamRef.current) return; const codes=await detector.detect(videoRef.current).catch(()=>[]); if(codes[0]?.rawValue) return submit(codes[0].rawValue); requestAnimationFrame(scan); }; scan(); } } catch(e){ setScanning(false); setError('Camera access is required to scan the meeting attendance QR code.'); } };
  if(error && !data) return <><Brand lang={lang} setLang={setLang}/><main className="auth-shell"><section className="auth-card"><p className="error">{error}</p></section></main></>;
  if(!data) return <><Brand lang={lang} setLang={setLang}/><main className="auth-shell"><section className="auth-card"><p className="muted">Loading check-in…</p></section></main></>;
  return <><Brand lang={lang} setLang={setLang}/><main className="rsvp-shell"><section className="rsvp-card"><div className="eyebrow green">ATTENDANCE CHECK-IN</div><h1>{data.meeting.title}</h1><p className="rsvp-name">Welcome, {data.participant}</p><div className="rsvp-event"><p>{data.meeting.purpose}</p><div><CalendarDays size={17}/>{new Date(data.meeting.start_at).toLocaleString()}</div><div><MapPin size={17}/>{data.meeting.location}</div></div>{data.attended||message?<p className="success"><CheckCircle2 size={16}/> {message || 'Attendance already recorded.'}</p>:!data.check_in_open?<p className="notice">{data.message}</p>:<><p className="muted">Use this personal link to scan the attendance QR displayed by the meeting creator.</p>{scanning&&<video ref={videoRef} className="scanner-video" muted playsInline/>}{!scanning&&<button className="primary full" onClick={start}><QrCode size={17}/> Open camera scanner</button>}{scanning&&!('BarcodeDetector' in window)&&<label>QR payload<textarea placeholder="Paste QR payload if automatic scanning is unavailable" onChange={e=>e.target.value&&submit(e.target.value)}/></label>}{scanning&&<button className="secondary full" onClick={()=>{streamRef.current?.getTracks().forEach(t=>t.stop());setScanning(false)}}>Stop scanner</button>}{error&&<p className="error">{error}</p>}</>}</section></main></>;
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
        setUser({ name: p.name, role: p.role, email: p.email });
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
