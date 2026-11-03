import { useEffect, useMemo } from 'react';
import { EmptyState, Field, FilterTag, Pagination, usePagination } from '../../components/common/controls';
import { STATUS_CLS } from '../../data/constants';
import { useAdmin } from '../../store/AdminContext';
import type { UserRecord } from '../../types';

const PAGE_SIZE = 10;

const FILTERS = [
  { key: 'all', label: 'All users' },
  { key: 'Active', label: 'Active' },
  { key: 'Pending', label: 'Pending' },
  { key: 'Suspended', label: 'Suspended' },
];

const GRID: React.CSSProperties = {
  gridTemplateColumns:
    'minmax(0,1.7fr) minmax(0,1fr) minmax(0,1.1fr) minmax(0,.95fr) minmax(0,1fr) minmax(0,.9fr) 118px',
};

export function UsersPage() {
  const admin = useAdmin();
  const {
    users, userFilter, setUserFilter, suspendUser, editRoles,
    usersLoading, usersError, refreshUsers,
    invites, revokeInvite, inviteePhone, setInviteePhone, inviteeFirm, setInviteeFirm,
    inviteBuyer, toggleInviteBuyer, inviteSeller, toggleInviteSeller,
    invitePaymentTerms, setInvitePaymentTerms, inviteError, sendInvite, searchQuery,
    liveMode, invitesLoading, invitesError, refreshInvites,
  } = admin;

  // Live backend: the API has no dedicated user directory, so the roster is
  // derived from listing owners (GET /listings, admin sees every row) and
  // pending invites come from GET /invites.
  useEffect(() => {
    if (!liveMode) return;
    void refreshUsers();
    void refreshInvites();
  }, [liveMode, refreshUsers, refreshInvites]);

  // Pending invites are not accounts yet, but showing them as Pending rows
  // makes the status filter meaningful instead of always empty.
  const roster = useMemo<UserRecord[]>(() => {
    const pending = invites.map<UserRecord>((inv, i) => {
      const role = /seller/i.test(inv.meta) ? 'Seller' : /buyer/i.test(inv.meta) ? 'Buyer' : null;
      const invited = inv.meta.replace(/^[^·]*·\s*/, '');
      return {
        id: -(i + 1),
        firm: inv.firm || '—',
        owner: 'Invite pending',
        phone: inv.firm,
        modes: role ? [role] : [],
        status: 'Pending',
        invitedBy: '—',
        lastActive: invited || '—',
        paymentTerms: '—',
      };
    });
    return [...users, ...pending];
  }, [users, invites]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return roster
      .filter((u) => userFilter === 'all' || u.status === userFilter)
      .filter((u) => !q || u.firm.toLowerCase().includes(q) || u.phone.replace(/\s/g, '').includes(q.replace(/\s/g, '')) || u.owner.toLowerCase().includes(q));
  }, [roster, userFilter, searchQuery]);

  // The roster is fetched whole, so pagination is client-side. The page
  // resets whenever the filter or search changes.
  const {
    page: currentPage, setPage: setUserPage, totalPages, pageItems: pageRows,
  } = usePagination(filtered, PAGE_SIZE, `${userFilter}|${searchQuery}`);

  return (
    <div className="users-split">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {FILTERS.map((f) => (
            <FilterTag key={f.key} label={f.label} active={userFilter === f.key} onClick={() => setUserFilter(f.key)} />
          ))}
          <span className="text-muted" style={{ marginLeft: 'auto', fontSize: 12 }}>
            {filtered.length} {filtered.length === 1 ? 'user' : 'users'}
            {totalPages > 1 ? ` · page ${currentPage} of ${totalPages}` : ''}
          </span>
        </div>
        {usersError ? <div className="field-error" role="alert">{usersError}</div> : null}
        <div className="panel">
          <div className="table-scroll">
            <div className="grid-head" style={{ ...GRID, minWidth: 860 }}>
              <div>FIRM</div><div>PHONE</div><div>MODES</div><div>PAYMENT</div><div>INVITED BY</div><div>LAST ACTIVITY</div><div />
            </div>
            {usersLoading ? <div className="text-muted" style={{ padding: '18px 16px', fontSize: 13 }}>Loading users…</div> : null}
            {pageRows.map((u) => (
              <div key={u.id} className="grid-row" style={{ ...GRID, minWidth: 860 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                    <span>{u.firm}</span>
                    <span className={`tag ${STATUS_CLS[u.status] ?? 'tag-neutral'}`} style={{ fontSize: 10, padding: '2px 8px' }}>{u.status}</span>
                  </div>
                  <div className="text-muted" style={{ fontSize: 11.5, marginTop: 1 }}>{u.owner}</div>
                </div>
                <div style={{ fontVariantNumeric: 'tabular-nums' }}>{u.phone}</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {u.modes.map((m) => (
                    <span key={m} className={`tag ${m === 'Seller' ? 'tag-accent' : 'tag-accent-2'}`} style={{ fontSize: 10, padding: '2px 8px' }}>{m}</span>
                  ))}
                </div>
                <div className="text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>{u.paymentTerms || '—'}</div>
                <div className="text-muted">{u.invitedBy}</div>
                <div className="text-muted">{u.lastActive}</div>
                <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" onClick={editRoles} style={{ height: 28, padding: '0 10px', fontSize: 11.5 }}>Roles</button>
                  <button className="btn btn-secondary" onClick={() => suspendUser(u.id)} style={{ height: 28, padding: '0 10px', fontSize: 11.5 }}>
                    {u.status === 'Suspended' ? 'Restore' : 'Suspend'}
                  </button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && !usersLoading ? <EmptyState message="No users match these filters." /> : null}
          </div>
        </div>
        {totalPages > 1 ? (
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            total={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setUserPage}
            disabled={usersLoading}
          />
        ) : null}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="panel panel-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5 }}>Invite a user</div>
          <Field label="Mobile number">
            <div style={{ display: 'flex', gap: 7 }}>
              <div className="input" style={{ width: 52, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>+91</div>
              <input
                className="input"
                placeholder="98xxx xxxxx"
                value={inviteePhone}
                onChange={(e) => setInviteePhone(e.target.value)}
                inputMode="tel"
              />
            </div>
          </Field>
          <Field label="Firm name">
            <input
              className="input"
              placeholder="Firm name"
              value={inviteeFirm}
              onChange={(e) => setInviteeFirm(e.target.value)}
            />
          </Field>
          <div className="field" style={{ margin: 0 }}>
            <label>Modes</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                className={`tag ${inviteBuyer ? 'tag-accent-2' : 'tag-neutral'}`}
                onClick={toggleInviteBuyer}
                aria-pressed={inviteBuyer}
                style={{ cursor: 'pointer', border: 0, font: 'inherit' }}
              >
                Buyer
              </button>
              <button
                type="button"
                className={`tag ${inviteSeller ? 'tag-accent' : 'tag-neutral'}`}
                onClick={toggleInviteSeller}
                aria-pressed={inviteSeller}
                style={{ cursor: 'pointer', border: 0, font: 'inherit' }}
              >
                Seller
              </button>
            </div>
          </div>
          <Field label="Payment terms">
            <select className="input" value={invitePaymentTerms} onChange={(e) => setInvitePaymentTerms(e.target.value)}>
              <option value="8-10 days">8-10 days</option>
              <option value="10-15 days">10-15 days</option>
              <option value="15-20 days">15-20 days</option>
            </select>
          </Field>
          {inviteError ? <div className="field-error">{inviteError}</div> : null}
          <button className="btn btn-primary btn-block" onClick={sendInvite} style={{ height: 38, fontSize: 13 }}>Send invite</button>
        </div>

        <div className="panel">
            <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--color-neutral-200)', fontWeight: 700, fontSize: 14.5, display: 'flex', alignItems: 'center', gap: 8 }}>
            Pending invites
          </div>
          {invitesLoading ? <div className="text-muted" style={{ padding: '18px 16px', fontSize: 13 }}>Loading invites…</div> : null}
          {invitesError ? <div className="field-error" style={{ padding: '12px 16px 0' }}>{invitesError}</div> : null}
          {invites.map((i) => (
            <div key={i.id} style={{ padding: '11px 16px', borderBottom: '1px solid var(--color-neutral-200)', display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{i.firm}</div>
                <div className="text-muted" style={{ fontSize: 11.5 }}>{i.meta}</div>
              </div>
              <button className="btn btn-secondary" onClick={() => revokeInvite(i.id)} style={{ height: 28, padding: '0 10px', fontSize: 11.5, flex: 'none' }}>
                Revoke
              </button>
            </div>
          ))}
          {invites.length === 0 && !invitesLoading ? <EmptyState message="No pending invites." /> : null}
        </div>
      </div>
    </div>
  );
}
