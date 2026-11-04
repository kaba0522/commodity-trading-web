import { TosAcceptPage } from '../../features/auth/TosAcceptPage';
import { useAuth } from '../../store/AuthContext';
import { AdminLayout } from './AdminLayout';

/**
 * Picks the console surface: ToS gate or the desktop layout.
 * Keeps that cross-cutting concern out of the route table.
 */
export function ConsoleShell() {
  const { isLive, tosStatus } = useAuth();

  // Live backend + ToS not accepted -> block the whole panel (the API would
  // 403 every listings/category-management call with TOS_ACCEPTANCE_REQUIRED anyway).
  if (isLive && tosStatus?.needsAcceptance) {
    return (
      <div className="admin-shell">
        <TosAcceptPage />
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <AdminLayout />
    </div>
  );
}
