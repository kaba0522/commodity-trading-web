import { Suspense, lazy } from 'react';
import {
  Navigate,
  Outlet,
  createBrowserRouter,
  useLocation,
} from 'react-router-dom';
import { ConsoleShell } from '../components/layout/ConsoleShell';
import { LoginPage } from '../features/auth/LoginPage';
import { ForbiddenPage } from '../features/auth/TosAcceptPage';
import { useAuth } from '../store/AuthContext';
import { NotFoundPage, PageLoader, RouteErrorPage } from './fallbacks';

/**
 * Production-grade route table (single tree, data router):
 * - public /login (authed users bounce to their destination)
 * - admin-only console with per-page code splitting (React.lazy)
 * - route-level error boundary + real 404 page
 * - deep-linkable clean URLs (BrowserRouter semantics)
 */

const DashboardPage = lazy(() =>
  import('../features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const UsersPage = lazy(() =>
  import('../features/users/UsersPage').then((m) => ({ default: m.UsersPage })),
);
const ListingsPage = lazy(() =>
  import('../features/listings/ListingsPage').then((m) => ({ default: m.ListingsPage })),
);
const NegotiationsPage = lazy(() =>
  import('../features/negotiations/NegotiationsPage').then((m) => ({ default: m.NegotiationsPage })),
);
const TradesPage = lazy(() =>
  import('../features/trades/TradesPage').then((m) => ({ default: m.TradesPage })),
);
const SettingsPage = lazy(() =>
  import('../features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const CommoditySetupPage = lazy(() =>
  import('../features/commodities/CommoditySetupPage').then((m) => ({ default: m.CommoditySetupPage })),
);
const AuditPage = lazy(() =>
  import('../features/audit/AuditPage').then((m) => ({ default: m.AuditPage })),
);
const FreightPage = lazy(() =>
  import('../features/freight/FreightPage').then((m) => ({ default: m.FreightPage })),
);
const BrokersPage = lazy(() =>
  import('../features/brokers/BrokersPage').then((m) => ({ default: m.BrokersPage })),
);

function page(element: React.ReactNode) {
  return <Suspense fallback={<PageLoader />}>{element}</Suspense>;
}

/**
 * Admin-only gate. The backend enforces this server-side on every admin
 * route (requireRole(['admin']) -> 403); this mirrors it in the UI so a
 * signed-in broker/seller/buyer never sees the console. Demo sessions
 * always carry the admin role.
 */
function RequireAdmin() {
  const { user, isAdmin, isLive, sessionExpired } = useAuth();
  const location = useLocation();
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search, expired: sessionExpired }}
      />
    );
  }
  if (isLive && !isAdmin) return <ForbiddenPage />;
  return <Outlet />;
}

export const router = createBrowserRouter(
  [
    { path: '/login', element: <LoginPage /> },
    {
      element: <RequireAdmin />,
      errorElement: <RouteErrorPage />,
      children: [
        {
          element: <ConsoleShell />,
          children: [
            { index: true, element: <Navigate to="/dash" replace /> },
            { path: 'dash', element: page(<DashboardPage />) },
            { path: 'users', element: page(<UsersPage />) },
            { path: 'listings', element: page(<ListingsPage />) },
            { path: 'negotiations', element: page(<NegotiationsPage />) },
            { path: 'trades', element: page(<TradesPage />) },
            { path: 'settings', element: page(<SettingsPage />) },
            { path: 'commodities', element: page(<CommoditySetupPage />) },
            { path: 'audit', element: page(<AuditPage />) },
            { path: 'freight', element: page(<FreightPage />) },
            { path: 'brokers', element: page(<BrokersPage />) },
            { path: '*', element: <NotFoundPage /> },
          ],
        },
      ],
    },
  ],
  {
    // Serve the app from a sub-path by building with --base=/subpath/.
    basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/',
  },
);
