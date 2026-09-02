import { useCallback, useEffect, useState } from 'react';
import { apiFetch, passwordIssues } from '../utils/auth';

const API = '/api/users';

const ROLE_BADGE = {
  admin: 'b-org',
  manager: 'b-blue',
  viewer: 'b-gray',
};

const BLANK = {
  id: null,
  username: '',
  fullName: '',
  email: '',
  role: 'viewer',
  password: '',
  mustChangePassword: true,
};

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function UserMaster({ currentUser, policy }) {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState('');
  const [error, setError] = useState('');

  const [form, setForm] = useState(null); // null | {...BLANK} for add/edit
  const [resetFor, setResetFor] = useState(null); // user being password-reset
  const [resetPw, setResetPw] = useState('');
  const [resetForce, setResetForce] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(API);
      setUsers(data.users || []);
      setRoles(data.roles || []);
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

  const isNew = form && !form.id;
  const pwIssues = form ? passwordIssues(form.password, policy) : [];
  const canSave =
    form &&
    form.username.trim().length >= 3 &&
    (!isNew || (form.password && pwIssues.length === 0));

  const save = async (e) => {
    e.preventDefault();
    if (!canSave || busy) return;
    setBusy(true);
    setError('');
    try {
      if (isNew) {
        await apiFetch(API, {
          method: 'POST',
          body: JSON.stringify({
            username: form.username.trim().toLowerCase(),
            fullName: form.fullName,
            email: form.email,
            role: form.role,
            password: form.password,
            mustChangePassword: form.mustChangePassword,
          }),
        });
        setBanner(
          form.mustChangePassword
            ? `User "${form.username}" created. They must set a new password at first sign-in.`
            : `User "${form.username}" created. They can sign in with the password you set.`
        );
      } else {
        await apiFetch(API, {
          method: 'PUT',
          body: JSON.stringify({
            id: form.id,
            fullName: form.fullName,
            email: form.email,
            role: form.role,
            mustChangePassword: form.mustChangePassword,
          }),
        });
        setBanner(`User "${form.username}" updated.`);
      }
      setForm(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const patch = async (id, payload, message) => {
    setBusy(true);
    setError('');
    try {
      await apiFetch(API, { method: 'PUT', body: JSON.stringify({ id, ...payload }) });
      setBanner(message);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const doReset = async (e) => {
    e.preventDefault();
    if (passwordIssues(resetPw, policy).length || busy) return;
    await patch(
      resetFor.id,
      { newPassword: resetPw, mustChangePassword: resetForce },
      resetForce
        ? `Password reset for "${resetFor.username}". They must change it at next sign-in.`
        : `Password reset for "${resetFor.username}". They can sign in with it as-is.`
    );
    setResetFor(null);
    setResetPw('');
  };

  const doDelete = async () => {
    setBusy(true);
    setError('');
    try {
      await apiFetch(API, {
        method: 'DELETE',
        body: JSON.stringify({ id: confirmDelete.id }),
      });
      setBanner(`User "${confirmDelete.username}" deleted.`);
      setConfirmDelete(null);
      await load();
    } catch (err) {
      setError(err.message);
      setConfirmDelete(null);
    } finally {
      setBusy(false);
    }
  };

  const lockedNow = (u) => u.lockedUntil && new Date(u.lockedUntil) > new Date();

  return (
    <div className="pg">
      <div className="pg-head">
        <div>
          <div className="pg-title">User Master</div>
          <div className="pg-sub">
            Manage who can sign in and what each person is allowed to do
          </div>
        </div>
        <div className="table-actions">
          <button
            className="btn-sm btn-primary"
            onClick={() => setForm({ ...BLANK })}
          >
            + Add User
          </button>
        </div>
      </div>

      {banner && <div className="upload-banner">✓ {banner}</div>}
      {error && <div className="error-banner">⚠ {error}</div>}

      <div className="table-card">
        <div className="table-head">
          <h3>Accounts ({users.length})</h3>
          <div className="table-actions">
            <span className="chart-badge">
              {users.filter((u) => u.status === 'active').length} active
            </span>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last Sign-in</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 28 }}>Loading users…</td></tr>
              )}
              {!loading && users.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 28 }}>No users yet.</td></tr>
              )}
              {!loading && users.map((u) => (
                <tr key={u.id}>
                  <td className="mono">
                    {u.username}
                    {u.id === currentUser?.id && <span className="you-tag">you</span>}
                  </td>
                  <td>{u.fullName || '—'}</td>
                  <td>{u.email || '—'}</td>
                  <td>
                    <span className={`badge ${ROLE_BADGE[u.role] || 'b-gray'}`}>
                      {roles.find((r) => r.key === u.role)?.label || u.role}
                    </span>
                  </td>
                  <td>
                    {lockedNow(u) ? (
                      <span className="badge b-red">Locked</span>
                    ) : u.status === 'active' ? (
                      <span className="badge b-grn">Active</span>
                    ) : (
                      <span className="badge b-gray">Disabled</span>
                    )}
                    {u.mustChangePassword && (
                      <span className="badge b-yel" style={{ marginLeft: 6 }}>
                        Must reset
                      </span>
                    )}
                  </td>
                  <td>{fmtDate(u.lastLoginAt)}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button
                      className="btn-mini"
                      onClick={() => setForm({
                        id: u.id,
                        username: u.username,
                        fullName: u.fullName || '',
                        email: u.email || '',
                        role: u.role,
                        password: '',
                        mustChangePassword: !!u.mustChangePassword,
                      })}
                    >
                      Edit
                    </button>
                    <button className="btn-mini" onClick={() => { setResetFor(u); setResetPw(''); setResetForce(true); }}>
                      Reset password
                    </button>
                    {lockedNow(u) && (
                      <button
                        className="btn-mini"
                        onClick={() => patch(u.id, { unlock: true }, `"${u.username}" unlocked.`)}
                      >
                        Unlock
                      </button>
                    )}
                    <button
                      className="btn-mini"
                      onClick={() => patch(
                        u.id,
                        { status: u.status === 'active' ? 'disabled' : 'active' },
                        `"${u.username}" ${u.status === 'active' ? 'disabled' : 'enabled'}.`
                      )}
                      disabled={u.id === currentUser?.id}
                    >
                      {u.status === 'active' ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      className="btn-mini danger"
                      onClick={() => setConfirmDelete(u)}
                      disabled={u.id === currentUser?.id}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="role-legend">
        <strong>What each role can do</strong>
        <div className="role-legend-grid">
          <div><span className="badge b-org">Administrator</span> View, export, <b>upload data</b>, manage users and security settings</div>
          <div><span className="badge b-blue">Manager</span> View and export data — cannot upload or manage users</div>
          <div><span className="badge b-gray">Viewer</span> View only — cannot export, upload, or manage anything</div>
        </div>
      </div>

      {/* ── Add / edit user ─────────────────────────────── */}
      {form && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setForm(null)}>
          <form className="modal-card" onSubmit={save}>
            <h3>{isNew ? 'Add User' : `Edit ${form.username}`}</h3>

            <div className="fg">
              <label>Username</label>
              <input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="e.g. priya.k"
                disabled={!isNew || busy}
                autoFocus={isNew}
              />
              {isNew && <div className="fg-hint">Lowercase letters, numbers, dot, dash or underscore. Cannot be changed later.</div>}
            </div>

            <div className="fg">
              <label>Full Name</label>
              <input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                disabled={busy}
              />
            </div>

            <div className="fg">
              <label>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                disabled={busy}
              />
            </div>

            <div className="fg">
              <label>Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                disabled={busy}
              >
                {roles.map((r) => (
                  <option key={r.key} value={r.key}>{r.label}</option>
                ))}
              </select>
              {form.role === 'admin' && (
                <div className="fg-hint warn">
                  Administrators can upload data and manage all users and security settings.
                </div>
              )}
            </div>

            <label className="pw-toggle">
              <input
                type="checkbox"
                checked={form.mustChangePassword}
                onChange={(e) => setForm({ ...form, mustChangePassword: e.target.checked })}
                disabled={busy}
              />
              <span>
                <strong>Change password at next login</strong>
                <em>
                  {form.mustChangePassword
                    ? 'They must set their own password before using the dashboard'
                    : 'They can keep using their current password'}
                </em>
              </span>
            </label>

            {isNew && (
              <div className="fg">
                <label>Temporary Password</label>
                <input
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Share this with the user securely"
                  disabled={busy}
                />
                {policy && form.password && pwIssues.length > 0 && (
                  <div className="fg-hint warn">Needs: {pwIssues.join(', ')}</div>
                )}
                <div className="fg-hint">
                  {form.mustChangePassword
                    ? 'The user will be required to change this at first sign-in.'
                    : 'The user will sign in with this password and keep it.'}
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button type="button" className="btn-sm btn-outline" onClick={() => setForm(null)} disabled={busy}>
                Cancel
              </button>
              <button type="submit" className="btn-sm btn-primary" disabled={!canSave || busy}>
                {busy ? 'Saving…' : isNew ? 'Create User' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Reset password ──────────────────────────────── */}
      {resetFor && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setResetFor(null)}>
          <form className="modal-card" onSubmit={doReset}>
            <h3>Reset password for {resetFor.username}</h3>
            <div className="fg">
              <label>New Temporary Password</label>
              <input
                type="text"
                value={resetPw}
                onChange={(e) => setResetPw(e.target.value)}
                autoFocus
                disabled={busy}
              />
              {resetPw && passwordIssues(resetPw, policy).length > 0 && (
                <div className="fg-hint warn">
                  Needs: {passwordIssues(resetPw, policy).join(', ')}
                </div>
              )}
              <div className="fg-hint">
                All of this user's active sessions will be signed out immediately.
              </div>
            </div>
            <label className="pw-toggle">
              <input
                type="checkbox"
                checked={resetForce}
                onChange={(e) => setResetForce(e.target.checked)}
                disabled={busy}
              />
              <span>
                <strong>Change password at next login</strong>
                <em>
                  {resetForce
                    ? 'They must replace this password when they sign in'
                    : 'They can keep using the password you set here'}
                </em>
              </span>
            </label>
            <div className="modal-actions">
              <button type="button" className="btn-sm btn-outline" onClick={() => setResetFor(null)} disabled={busy}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn-sm btn-primary"
                disabled={busy || !resetPw || passwordIssues(resetPw, policy).length > 0}
              >
                {busy ? 'Resetting…' : 'Reset Password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Delete confirmation ─────────────────────────── */}
      {confirmDelete && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setConfirmDelete(null)}>
          <div className="modal-card">
            <h3>Delete {confirmDelete.username}?</h3>
            <p className="modal-text">
              This permanently removes the account and signs out any active session.
              This cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn-sm btn-outline" onClick={() => setConfirmDelete(null)} disabled={busy}>
                Cancel
              </button>
              <button className="btn-sm btn-danger" onClick={doDelete} disabled={busy}>
                {busy ? 'Deleting…' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
