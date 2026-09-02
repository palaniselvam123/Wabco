import { useEffect, useRef, useState } from 'react';
import ZFLogo from './ZFLogo';

const ROLE_LABEL = {
  admin: 'Administrator',
  manager: 'Manager',
  viewer: 'Viewer',
};

/**
 * Top bar: identity and account actions only. All page navigation lives in
 * the left sidebar, so nothing is duplicated between the two.
 */
export default function Navbar({ onLogout, user, onChangePassword }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const navDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const initial = (user?.fullName || user?.username || '?').charAt(0).toUpperCase();

  return (
    <nav id="navbar">
      <div className="nav-logo">
        <div className="nav-logo-icon">
          <ZFLogo size={23} color="#1F5FAE" title="ZF India" />
        </div>
        ZF <em>India</em>
      </div>

      <div className="nav-right">
        <div className="nav-date">{navDate}</div>
        <div className="nav-user-wrap" ref={menuRef}>
          <button
            className="nav-user"
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <div className="nav-avatar">{initial}</div>
            <span className="nav-user-text">
              <strong>{user?.fullName || user?.username}</strong>
              <em>{ROLE_LABEL[user?.role] || user?.role}</em>
            </span>
            <span className="nav-caret">▾</span>
          </button>
          {menuOpen && (
            <div className="nav-menu" role="menu">
              <div className="nav-menu-head">
                <strong>{user?.fullName || user?.username}</strong>
                <span>{user?.email || user?.username}</span>
              </div>
              <button
                className="nav-menu-item"
                onClick={() => { setMenuOpen(false); onChangePassword(); }}
              >
                🔑 Change password
              </button>
              <div className="nav-menu-sep" />
              <button className="nav-menu-item danger" onClick={onLogout}>
                ⎋ Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
