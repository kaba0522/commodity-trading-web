import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../store/AdminContext';
import { useAuth } from '../../store/AuthContext';
import { Sidebar } from './Sidebar';

function initialsOf(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 2);
  const s = parts.map((w) => w[0]).join('').toUpperCase();
  return s || 'A';
}

export function Header({
  onToggleSidebar,
  sidebarCollapsed = false,
}: {
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
}) {
  const { searchQuery, setSearchQuery, expiryTime } = useAdmin();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [drawerOpen]);

  const handleLogout = () => {
    void logout();
    navigate('/login', { replace: true });
  };
  const indiaDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
  const [expiryHour, expiryMinute] = expiryTime.split(':').map(Number);
  const expiryLabel = Number.isInteger(expiryHour) && Number.isInteger(expiryMinute)
    ? new Date(Date.UTC(2020, 0, 1, expiryHour, expiryMinute)).toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'UTC',
    })
    : expiryTime;

  return (
    <>
      <div className="header-bar">
        {onToggleSidebar ? (
          <button
            className="btn btn-secondary header-collapse-btn"
            onClick={onToggleSidebar}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!sidebarCollapsed}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{ height: 36, padding: '0 10px', fontSize: 15, flex: 'none' }}
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ transform: sidebarCollapsed ? 'rotate(180deg)' : 'none' }}
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
              <polyline points="13 8 11 12 13 16" />
            </svg>
          </button>
        ) : null}
        <button
          className="btn btn-secondary btn-hamburger"
          onClick={() => setDrawerOpen(true)}
          style={{ height: 36, padding: '0 12px', fontSize: 16, flex: 'none' }}
          aria-label="Open navigation"
          aria-expanded={drawerOpen}
        >
          ☰
        </button>
        <input
          className="input header-search"
          placeholder="Search firm, phone, item, trade ID…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search"
        />
        <div className="header-right">
          <div className="header-meta" style={{ textAlign: 'right', lineHeight: 1.3 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {indiaDate}
            </div>
            <div className="text-muted" style={{ fontSize: 11.5 }}>
              Prices expire daily at{' '}
              <strong style={{ color: 'var(--color-accent-700)', fontVariantNumeric: 'tabular-nums' }}>
                {expiryLabel} IST
              </strong>
            </div>
          </div>
          <div className="header-user">
            <div style={{
              width: 32, height: 32, borderRadius: 999, background: 'var(--color-accent-700)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, flex: 'none',
            }}
            >
              {initialsOf(user?.name ?? 'Admin')}
            </div>
            <div className="header-user-text">
              <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>{user?.name ?? 'Admin'}</div>
              <div className="text-muted" style={{ fontSize: 11 }}>{user?.role ?? 'Admin'}</div>
            </div>
            <button
              className="btn btn-secondary"
              onClick={handleLogout}
              style={{ height: 30, padding: '0 12px', fontSize: 12, marginLeft: 4 }}
              title="Sign out"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
      {drawerOpen ? (
        <div
          className="sidebar-drawer"
          onClick={() => setDrawerOpen(false)}
          role="presentation"
        >
          <div
            className="sidebar-drawer-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
