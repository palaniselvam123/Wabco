import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../utils/auth';

const API = '/api/security';

const AUDIT_TONE = {
  'login.success': 'b-grn',
  'login.failed': 'b-yel',
  'login.locked': 'b-red',
  'login.blocked': 'b-red',
  'logout': 'b-gray',
  'upload.success': 'b-blue',
  'upload.denied': 'b-red',
  'upload.rejected': 'b-red',
  'user.created': 'b-grn',
  'user.updated': 'b-blue',
  'user.deleted': 'b-red',
  'password.changed': 'b-grn',
  'password.change.failed': 'b-yel',
  'security.updated': 'b-org',
  'security.denied': 'b-red',
  'users.denied': 'b-red',
};

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

/** Labelled number input bound to a nested settings path. */
function NumField({ label, hint, value, onChange, min, max, suffix, disabled }) {
  return (
    <div className="sec-field">
      <label>{label}</label>
      <div className="sec-input-row">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
        />
        {suffix && <span className="sec-suffix">{suffix}</span>}
      </div>
      {hint && <div className="fg-hint">{hint}</div>}
    </div>
  );
}

function Toggle({ label, hint, checked, onChange, disabled }) {
  return (
    <label className={`sec-toggle${disabled ? ' is-disabled' : ''}`}>
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span>
        <strong>{label}</strong>
        {hint && <em>{hint}</em>}
      </span>
    </label>
  );
}

export default function SecurityMaster({ onNavigate, onSettingsSaved, embedded = false }) {
  const [settings, setSettings] = useState(null);
  const [roles, setRoles] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState('');
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(API);
      setSettings(data.settings);
      setRoles(data.roles || []);
      setEvents(data.auditEvents || []);
      setDirty(false);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(''), 6000);
    return () => clearTimeout(t);
  }, [banner]);

  /** Immutably update one field inside a settings group. */
  const set = (group, key, value) => {
    setSettings((s) => ({ ...s, [group]: { ...s[group], [key]: value } }));
    setDirty(true);
  };

  const toggleUploadRole = (roleKey, on) => {
    setSettings((s) => {
      const current = s.upload.allowedRoles || [];
      const next = on
        ? [...new Set([...current, roleKey])]
        : current.filter((r) => r !== roleKey);
      // Administrators can never be removed, or nobody could load data again.
      if (!next.includes('admin')) next.unshift('admin');
      return { ...s, upload: { ...s.upload, allowedRoles: next } };
    });
    setDirty(true);
  };

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const data = await apiFetch(API, {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      setSettings(data.settings);
      setDirty(false);
      setBanner('Security settings saved and applied immediately.');
      onSettingsSaved?.(data.settings);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className={embedded ? 'admin-page' : 'pg'}>
        <div className="pg-head">
          <div>
            {!embedded && <div className="pg-title">Security Master</div>}
            <div className="pg-sub">Loading settings…</div>
          </div>
        </div>
        {error && <div className="error-banner">⚠ {error}</div>}
      </div>
    );
  }

  return (
    <div className={embedded ? 'admin-page' : 'pg'}>
      <div className="pg-head">
        <div>
          {!embedded && <div className="pg-title">Security Master</div>}
          <div className="pg-sub">
            Access control, password rules, session limits and the audit trail
          </div>
        </div>
        <div className="table-actions">
          {!embedded && (
            <button className="btn-sm btn-outline" onClick={() => onNavigate('dashboard')}>
              ← Dashboard
            </button>
          )}
          <button className="btn-sm btn-primary" onClick={save} disabled={!dirty || busy}>
            {busy ? 'Saving…' : dirty ? 'Save Changes' : 'Saved'}
          </button>
        </div>
      </div>

      {banner && <div className="upload-banner">✓ {banner}</div>}
      {error && <div className="error-banner">⚠ {error}</div>}
      {dirty && <div className="chart-hint">⚠ You have unsaved changes.</div>}

      <div className="sec-grid">
        {/* ── Upload permissions ───────────────────────── */}
        <section className="sec-card accent-org">
          <h2>📤 Data Upload Permissions</h2>
          <p className="sec-desc">
            Controls who may load DSR files. Enforced on the server, so it cannot
            be bypassed from the browser.
          </p>

          <div className="sec-field">
            <label>Roles allowed to upload</label>
            {roles.map((r) => (
              <Toggle
                key={r.key}
                label={r.label}
                hint={r.key === 'admin' ? 'Always permitted — cannot be removed' : undefined}
                checked={(settings.upload.allowedRoles || []).includes(r.key)}
                onChange={(on) => toggleUploadRole(r.key, on)}
                disabled={r.key === 'admin'}
              />
            ))}
          </div>

          <NumField
            label="Maximum file size"
            suffix="MB"
            min={1}
            max={200}
            value={settings.upload.maxFileSizeMb}
            onChange={(v) => set('upload', 'maxFileSizeMb', v)}
            hint="Files larger than this are rejected before parsing."
          />

          <div className="sec-field">
            <label>Allowed file types</label>
            <input
              value={(settings.upload.allowedExtensions || []).join(', ')}
              onChange={(e) =>
                set(
                  'upload',
                  'allowedExtensions',
                  e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                )
              }
            />
            <div className="fg-hint">Comma separated, e.g. .xlsx, .xls, .xlsb</div>
          </div>
        </section>

        {/* ── Password policy ──────────────────────────── */}
        <section className="sec-card accent-blue">
          <h2>🔑 Password Policy</h2>
          <p className="sec-desc">
            Applied whenever a password is created, reset or changed.
          </p>

          <NumField
            label="Minimum length"
            suffix="characters"
            min={8}
            max={64}
            value={settings.password.minLength}
            onChange={(v) => set('password', 'minLength', v)}
          />
          <Toggle
            label="Require an uppercase letter"
            checked={settings.password.requireUppercase}
            onChange={(v) => set('password', 'requireUppercase', v)}
          />
          <Toggle
            label="Require a number"
            checked={settings.password.requireNumber}
            onChange={(v) => set('password', 'requireNumber', v)}
          />
          <Toggle
            label="Require a symbol"
            checked={settings.password.requireSymbol}
            onChange={(v) => set('password', 'requireSymbol', v)}
          />
          <NumField
            label="Password expires after"
            suffix="days"
            min={0}
            max={365}
            value={settings.password.expiryDays}
            onChange={(v) => set('password', 'expiryDays', v)}
            hint="Set to 0 to never expire. Users are prompted to reset at sign-in."
          />
          <NumField
            label="Prevent reuse of last"
            suffix="passwords"
            min={0}
            max={10}
            value={settings.password.preventReuse}
            onChange={(v) => set('password', 'preventReuse', v)}
          />
        </section>

        {/* ── Session control ──────────────────────────── */}
        <section className="sec-card accent-teal">
          <h2>⏱️ Session Control</h2>
          <p className="sec-desc">
            Idle and absolute limits, enforced server-side on every request.
          </p>

          <NumField
            label="Sign out after inactivity"
            suffix="minutes"
            min={5}
            max={480}
            value={settings.session.idleTimeoutMinutes}
            onChange={(v) => set('session', 'idleTimeoutMinutes', v)}
            hint="Shared or unattended machines should use a shorter window."
          />
          <NumField
            label="Maximum session length"
            suffix="hours"
            min={1}
            max={168}
            value={settings.session.absoluteTimeoutHours}
            onChange={(v) => set('session', 'absoluteTimeoutHours', v)}
            hint="Users must sign in again after this, however active they are."
          />
        </section>

        {/* ── Brute-force protection ───────────────────── */}
        <section className="sec-card accent-red">
          <h2>🛡️ Sign-in Protection</h2>
          <p className="sec-desc">
            Locks an account after repeated failures to blunt password guessing.
          </p>

          <NumField
            label="Lock account after"
            suffix="failed attempts"
            min={3}
            max={20}
            value={settings.login.maxFailedAttempts}
            onChange={(v) => set('login', 'maxFailedAttempts', v)}
          />
          <NumField
            label="Lockout duration"
            suffix="minutes"
            min={1}
            max={1440}
            value={settings.login.lockoutMinutes}
            onChange={(v) => set('login', 'lockoutMinutes', v)}
            hint="An administrator can clear a lock early from the User Master."
          />
        </section>

        {/* ── Audit ────────────────────────────────────── */}
        <section className="sec-card accent-pur">
          <h2>📋 Audit Trail</h2>
          <p className="sec-desc">
            Records sign-ins, uploads, permission changes and denied attempts.
          </p>

          <Toggle
            label="Record security events"
            hint="Turning this off stops all new audit entries"
            checked={settings.audit.enabled}
            onChange={(v) => set('audit', 'enabled', v)}
          />
          <NumField
            label="Keep the most recent"
            suffix="events"
            min={50}
            max={5000}
            value={settings.audit.retainEvents}
            onChange={(v) => set('audit', 'retainEvents', v)}
          />
        </section>
      </div>

      {/* ── Audit log ──────────────────────────────────── */}
      <div className="table-card" style={{ marginTop: 20 }}>
        <div className="table-head">
          <h3>Recent Security Events</h3>
          <div className="table-actions">
            <span className="chart-badge">{events.length} shown</span>
            <button className="btn-sm btn-outline" onClick={load} disabled={busy}>
              ↻ Refresh
            </button>
          </div>
        </div>
        <div className="table-wrap" style={{ maxHeight: 420, overflowY: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Event</th>
                <th>User</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 28 }}>
                  No events recorded yet.
                </td></tr>
              )}
              {events.map((e, i) => (
                <tr key={`${e.at}-${i}`}>
                  <td className="mono" style={{ whiteSpace: 'nowrap' }}>{fmtDate(e.at)}</td>
                  <td>
                    <span className={`badge ${AUDIT_TONE[e.action] || 'b-gray'}`}>
                      {e.action}
                    </span>
                  </td>
                  <td className="mono">{e.actor}</td>
                  <td style={{ whiteSpace: 'normal' }}>{e.detail || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
