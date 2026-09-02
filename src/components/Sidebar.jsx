import { useEffect, useState } from 'react';

const STORE_KEY = 'zf.sidebar.collapsed';

const OPERATIONS = [
  { key: 'dashboard', icon: '📊', label: 'Dashboard' },
  { key: 'details', icon: '🚚', label: 'Active Shipments', count: 'active' },
  { key: 'delivered', icon: '✅', label: 'Delivered', count: 'delivered' },
];

const ADMINISTRATION = [
  { key: 'admin', icon: '🛠️', label: 'Overview', perm: 'manage_users' },
  { key: 'users', icon: '👥', label: 'User Master', perm: 'manage_users' },
  { key: 'security', icon: '🔒', label: 'Security Master', perm: 'manage_security' },
];

function readCollapsed() {
  try {
    return sessionStorage.getItem(STORE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Primary navigation. Lives on the left so the wide shipment tables get the
 * full width of the main column, and so administration sits alongside the
 * operational pages rather than hidden behind a menu.
 */
export default function Sidebar({ page, onNavigate, user, activeCount = 0, deliveredCount = 0 }) {
  const [collapsed, setCollapsed] = useState(readCollapsed);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORE_KEY, collapsed ? '1' : '0');
    } catch {
      /* private browsing — the preference just won't persist */
    }
  }, [collapsed]);

  const perms = user?.permissions || [];
  const adminItems = ADMINISTRATION.filter((i) => perms.includes(i.perm));
  const counts = { active: activeCount, delivered: deliveredCount };

  const renderItem = (item) => {
    const isActive = page === item.key;
    const count = item.count ? counts[item.count] : null;
    return (
      <button
        key={item.key}
        className={`side-link${isActive ? ' active' : ''}`}
        onClick={() => onNavigate(item.key)}
        title={collapsed ? item.label : undefined}
        aria-current={isActive ? 'page' : undefined}
      >
        <span className="side-icon">{item.icon}</span>
        {!collapsed && (
          <>
            <span className="side-label">{item.label}</span>
            {count != null && <span className="side-count">{count}</span>}
          </>
        )}
      </button>
    );
  };

  return (
    <aside className={`sidebar${collapsed ? ' is-collapsed' : ''}`}>
      <nav className="side-nav">
        <div className="side-group">
          {!collapsed && <span className="side-group-label">Operations</span>}
          {OPERATIONS.map(renderItem)}
        </div>

        {adminItems.length > 0 && (
          <div className="side-group">
            {!collapsed && <span className="side-group-label">Administration</span>}
            {adminItems.map(renderItem)}
          </div>
        )}
      </nav>

      <button
        className="side-collapse"
        onClick={() => setCollapsed((c) => !c)}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <span>{collapsed ? '»' : '«'}</span>
        {!collapsed && 'Collapse'}
      </button>
    </aside>
  );
}
