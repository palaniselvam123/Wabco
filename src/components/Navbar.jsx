import ZFLogo from './ZFLogo';

export default function Navbar({ page, onNavigate, onLogout }) {
  const navDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <nav id="navbar">
      <div className="nav-logo">
        <div className="nav-logo-icon">
          <ZFLogo size={23} color="#1F5FAE" title="ZF India" />
        </div>
        ZF <em>India</em>
      </div>
      <div className="nav-sep" />
      <div className="nav-links">
        <button
          className={`nav-link${page === 'dashboard' ? ' active' : ''}`}
          onClick={() => onNavigate('dashboard')}
        >
          📊 Dashboard
        </button>
        <button
          className={`nav-link${page === 'details' ? ' active' : ''}`}
          onClick={() => onNavigate('details')}
        >
          🚚 Active Shipments
        </button>
        <button
          className={`nav-link${page === 'delivered' ? ' active' : ''}`}
          onClick={() => onNavigate('delivered')}
        >
          ✅ Delivered
        </button>
      </div>
      <div className="nav-right">
        <div className="nav-date">{navDate}</div>
        <div className="nav-user">
          <div className="nav-avatar">A</div>
          Administrator
        </div>
        <button className="btn-logout" onClick={onLogout}>
          Sign Out
        </button>
      </div>
    </nav>
  );
}
