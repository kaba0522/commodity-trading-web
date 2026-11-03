import { NavLink } from 'react-router-dom';
import { NAV } from '../../data/constants';
import { useAdmin } from '../../store/AdminContext';
import type { ScreenKey } from '../../types';

function Icon({ d, extra }: { d: string; extra?: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <g dangerouslySetInnerHTML={{ __html: d }} />
      {extra}
    </svg>
  );
}

const ICONS: Record<ScreenKey, React.ReactNode> = {
  dash: (
    <Icon d='<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>' />
  ),
  users: (
    <Icon d='<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' />
  ),
  listings: (
    <Icon d='<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>' />
  ),
  negotiations: (
    <Icon d='<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' />
  ),
  trades: (
    <Icon d='<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>' />
  ),
  settings: (
    <Icon d='<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>' />
  ),
  audit: (
    <Icon d='<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>' />
  ),
  freight: (
    <Icon d='<rect x="1" y="3" width="15" height="13" rx="1"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>' />
  ),
  brokers: (
    <Icon d='<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/><line x1="18" y1="2" x2="22" y2="6"/><line x1="22" y1="2" x2="18" y2="6"/>' />
  ),
};

export function Sidebar({
  onNavigate,
  className,
  collapsed = false,
}: {
  onNavigate?: () => void;
  className?: string;
  collapsed?: boolean;
}) {
  const { freightRoutes } = useAdmin();
  const pending = freightRoutes.filter((r) => r.status === 'Pending review').length;
  const base = className ?? 'sidebar-desktop';

  return (
    <aside className={`${base} sidebar${collapsed ? ' sidebar-collapsed' : ''}`}>
      <div className="side-brand">
        <div className="side-logo" aria-hidden="true">
          K
        </div>
        <div className="side-brand-text">
          <div className="side-eyebrow">KKPK PLATFORM</div>
          <div className="side-title">Admin console</div>
        </div>
      </div>
      <nav className="side-nav" aria-label="Admin sections">
        {NAV.map((n) => {
          const badge = n.key === 'freight' && pending > 0 ? String(pending) : n.badge;
          const showBadge = n.key === 'freight' ? pending > 0 : Boolean(n.badge);
          return (
            <NavLink
              key={n.key}
              to={`/${n.key}`}
              onClick={onNavigate}
              title={collapsed ? n.label : undefined}
              aria-label={n.label}
              className={({ isActive }) => `side-link${isActive ? ' active' : ''}`}
            >
              <span className="side-icon">{ICONS[n.key]}</span>
              <span className="side-label">{n.label}</span>
              {showBadge ? <span className="side-badge">{badge}</span> : null}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
