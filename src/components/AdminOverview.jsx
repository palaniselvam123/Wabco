import { useEffect, useState } from 'react';
import { apiFetch } from '../utils/auth';

const ROLE_BADGE = { admin: 'b-org', manager: 'b-blue', viewer: 'b-gray' };

function fmtWhen(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

/** Landing view of the admin panel: who exists, what needs attention. */
export default function AdminOverview({ currentUser, onOpenTab }) {
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const u = await apiFetch('/api/users');
        if (!cancelled) setUsers(u.users || []);
      } catch {
        /* permission checked by the panel before rendering */
      }
      try {
        const s = await apiFetch('/api/security');
        if (!cancelled) setEvents((s.auditEvents || []).slice(0, 6));
      } catch {
        /* security tab may not be permitted for this role */
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const now = Date.now();
  const active = users.filter((u) => u.status === 'active');
  const locked = users.filter((u) => u.lockedUntil && new Date(u.lockedUntil) > now);
  const pendingReset = users.filter((u) => u.mustChangePassword);
  const disabled = users.filter((u) => u.status !== 'active');
  const byRole = (r) => users.filter((u) => u.role === r).length;

  if (loading) {
    return <div className="admin-empty">Loading administration summary…</div>;
  }

  return (
    <div className="admin-overview">
      <div className="admin-stat-grid">
        <button className="admin-stat" onClick={() => onOpenTab('users')}>
          <span className="admin-stat-label">Total Accounts</span>
          <span className="admin-stat-value">{users.length}</span>
          <span className="admin-stat-sub">{active.length} active</span>
        </button>
        <button className="admin-stat" onClick={() => onOpenTab('users')}>
          <span className="admin-stat-label">Administrators</span>
          <span className="admin-stat-value">{byRole('admin')}</span>
          <span className="admin-stat-sub">can upload data</span>
        </button>
        <button className="admin-stat" onClick={() => onOpenTab('users')}>
          <span className="admin-stat-label">Managers / Viewers</span>
          <span className="admin-stat-value">{byRole('manager') + byRole('viewer')}</span>
          <span className="admin-stat-sub">read-only roles</span>
        </button>
        <button
          className={`admin-stat${locked.length ? ' is-warn' : ''}`}
          onClick={() => onOpenTab('users')}
        >
          <span className="admin-stat-label">Locked Out</span>
          <span className="admin-stat-value">{locked.length}</span>
          <span className="admin-stat-sub">
            {locked.length ? 'needs unlocking' : 'none'}
          </span>
        </button>
      </div>

      {(locked.length > 0 || pendingReset.length > 0 || disabled.length > 0) && (
        <section className="admin-section">
          <h3>Needs Attention</h3>
          <div className="admin-attention">
            {locked.map((u) => (
              <div key={u.id} className="admin-attention-row">
                <span className="badge b-red">Locked</span>
                <strong className="mono">{u.username}</strong>
                <span>locked until {fmtWhen(u.lockedUntil)}</span>
              </div>
            ))}
            {pendingReset.map((u) => (
              <div key={u.id} className="admin-attention-row">
                <span className="badge b-yel">Must reset</span>
                <strong className="mono">{u.username}</strong>
                <span>will be asked to change password at next sign-in</span>
              </div>
            ))}
            {disabled.map((u) => (
              <div key={u.id} className="admin-attention-row">
                <span className="badge b-gray">Disabled</span>
                <strong className="mono">{u.username}</strong>
                <span>cannot sign in</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="admin-section">
        <h3>Accounts</h3>
        <div className="admin-user-list">
          {users.map((u) => (
            <div key={u.id} className="admin-user-row">
              <span className={`badge ${ROLE_BADGE[u.role] || 'b-gray'}`}>{u.role}</span>
              <strong className="mono">{u.username}</strong>
              <span className="admin-user-name">{u.fullName || '—'}</span>
              <span className="admin-user-seen">
                {u.lastLoginAt ? fmtWhen(u.lastLoginAt) : 'never signed in'}
              </span>
              {u.id === currentUser?.id && <span className="you-tag">you</span>}
            </div>
          ))}
        </div>
        <button className="btn-sm btn-primary" onClick={() => onOpenTab('users')}>
          Manage Users →
        </button>
      </section>

      {events.length > 0 && (
        <section className="admin-section">
          <h3>Recent Security Activity</h3>
          <div className="admin-event-list">
            {events.map((e, i) => (
              <div key={`${e.at}-${i}`} className="admin-event-row">
                <span className="admin-event-when">{fmtWhen(e.at)}</span>
                <span className="admin-event-action">{e.action}</span>
                <span className="admin-event-actor mono">{e.actor}</span>
              </div>
            ))}
          </div>
          <button className="btn-sm btn-outline" onClick={() => onOpenTab('security')}>
            Open Security Master →
          </button>
        </section>
      )}
    </div>
  );
}
