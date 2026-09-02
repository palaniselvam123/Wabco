import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import UserMaster from './UserMaster';
import SecurityMaster from './SecurityMaster';
import AdminOverview from './AdminOverview';

const TABS = [
  { key: 'overview', label: 'Overview', icon: '🛠️', perm: 'manage_users' },
  { key: 'users', label: 'User Master', icon: '👥', perm: 'manage_users' },
  { key: 'security', label: 'Security Master', icon: '🔒', perm: 'manage_security' },
];

/**
 * Slide-over administration panel. The admin screens live here rather than in
 * the main navigation so operational work on the dashboard is never lost when
 * an administrator dips into settings.
 */
export default function AdminPanel({ open, onClose, currentUser, policy, initialTab = 'overview' }) {
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const perms = currentUser?.permissions || [];
  const visible = TABS.filter((t) => perms.includes(t.perm));

  return createPortal(
    <div
      className="admin-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <aside
        className="admin-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Administration"
      >
        <header className="admin-panel-head">
          <div className="admin-panel-title">
            <span className="admin-panel-icon">⚙️</span>
            <div>
              <strong>Administration</strong>
              <em>Signed in as {currentUser?.fullName || currentUser?.username}</em>
            </div>
          </div>
          <button className="admin-panel-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <nav className="admin-tabs">
          {visible.map((t) => (
            <button
              key={t.key}
              className={`admin-tab${tab === t.key ? ' active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </nav>

        <div className="admin-panel-body">
          {tab === 'overview' && (
            <AdminOverview currentUser={currentUser} onOpenTab={setTab} />
          )}
          {tab === 'users' && (
            <UserMaster currentUser={currentUser} policy={policy} embedded />
          )}
          {tab === 'security' && <SecurityMaster embedded />}
        </div>
      </aside>
    </div>,
    document.body
  );
}
