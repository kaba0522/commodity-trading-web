import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { PAGES } from '../../data/constants';
import { useAdmin } from '../../store/AdminContext';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

const PATH_TO_SCREEN: Record<string, string> = {
  dash: 'dash', users: 'users', listings: 'listings', negotiations: 'negotiations',
  trades: 'trades', settings: 'settings', commodities: 'commodities', audit: 'audit', freight: 'freight', brokers: 'brokers',
};

const SIDEBAR_KEY = 'kkpk-sidebar-collapsed';
/** Below this width the sidebar auto-collapses (unless the user overrode it). */
const AUTO_COLLAPSE_PX = 1360;

function initialCollapsed(): boolean {
  try {
    const stored = localStorage.getItem(SIDEBAR_KEY);
    if (stored != null) return stored === '1';
  } catch {
    /* private mode — fall through to auto */
  }
  return typeof window !== 'undefined' && window.innerWidth < AUTO_COLLAPSE_PX;
}

/**
 * Desktop console shell: sidebar + header + per-route page head + outlet.
 * Owns the header primary action, scroll restoration and document title
 * so individual pages stay focused on their own content.
 */
export function AdminLayout() {
  const {
    toast, flash, previewFreightUpload, exportCsv, exportListingsWorkbook, trades, liveMode, openBrokerAdd,
  } = useAdmin();
  const location = useLocation();
  const freightFileInput = useRef<HTMLInputElement>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const seg = location.pathname.split('/')[1] || 'dash';
  const page = PAGES[PATH_TO_SCREEN[seg] ?? 'dash'] ?? PAGES.dash;

  useEffect(() => {
    if (seg !== 'users') setInviteModalOpen(false);
  }, [seg]);

  // Collapsible sidebar: auto-collapses on narrower screens until the user
  // picks a preference (persisted to localStorage).
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const userSet = useRef<boolean>(false);
  useEffect(() => {
    try {
      if (localStorage.getItem(SIDEBAR_KEY) != null) userSet.current = true;
    } catch {
      /* ignore */
    }
    const mq = window.matchMedia(`(max-width: ${AUTO_COLLAPSE_PX}px)`);
    const onChange = (e: MediaQueryListEvent) => {
      if (!userSet.current) setCollapsed(e.matches);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const toggleSidebar = () => {
    userSet.current = true;
    setCollapsed((c) => {
      try {
        localStorage.setItem(SIDEBAR_KEY, c ? '0' : '1');
      } catch {
        /* ignore */
      }
      return !c;
    });
  };

  // Scroll to top on every navigation (new "page" per route).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Keep the tab title in sync with the active section.
  useEffect(() => {
    document.title = `${page[0]} · KKPK Admin`;
  }, [page]);

  const handlePrimary = () => {
    if (seg === 'commodities') {
      document.getElementById('commodity-category-name')?.focus();
      return;
    }
    if (seg === 'brokers') {
      if (!liveMode) {
        flash('Connect to the live service before adding brokers.');
        return;
      }
      openBrokerAdd();
      return;
    }
    if (seg === 'freight') {
      if (!liveMode) {
        flash('Connect to the live service before uploading freight routes.');
        return;
      }
      freightFileInput.current?.click();
      return;
    }
    if (seg === 'trades') {
      exportCsv('trades', 'trades.csv', [
        ['Trade', 'Item', 'Seller', 'Buyer', 'Bags', 'Price', 'Broker'],
        ...trades.map((t) => [t.code, t.item, t.seller, t.buyer, String(t.bags), String(t.price), t.broker]),
      ]);
      return;
    }
    if (seg === 'listings') {
      void exportListingsWorkbook();
      return;
    }
    if (seg === 'users') {
      setInviteModalOpen(true);
      return;
    }
    flash('Action stub — wire in build');
  };

  return (
    <div className={`admin-grid${collapsed ? ' sidebar-collapsed' : ''}`}>
      <Sidebar collapsed={collapsed} />
      <div className="admin-main">
        <Header onToggleSidebar={toggleSidebar} sidebarCollapsed={collapsed} />
        <div className="content-pad">
          <div className="page-head">
            <div>
              <h1 style={{ fontSize: 23, marginBottom: 3 }}>{page[0]}</h1>
              <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>{page[1]}</p>
            </div>
            <button
              className="btn btn-primary"
              onClick={handlePrimary}
              style={{ height: 38, padding: '0 18px', fontSize: 13 }}
            >
              {page[2]}
            </button>
            {seg === 'freight' ? (
              <input
                ref={freightFileInput}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                hidden
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = '';
                  if (file) void previewFreightUpload(file);
                }}
              />
            ) : null}
          </div>
          {toast ? <div className="toast" role="status">{toast}</div> : null}
          <Outlet context={{
            inviteModalOpen,
            closeInviteModal: () => setInviteModalOpen(false),
          }} />
        </div>
      </div>
    </div>
  );
}
