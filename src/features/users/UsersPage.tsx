import { useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { EmptyState, Field, FilterTag, Modal, Pagination, usePagination } from '../../components/common/controls';
import { STATUS_CLS } from '../../data/constants';
import { useAdmin } from '../../store/AdminContext';
import type { UserRecord } from '../../types';

const PAGE_SIZE = 10;

const FILTERS = [
  { key: 'all', label: 'All users' },
  { key: 'Active', label: 'Active' },
  { key: 'Suspended', label: 'Suspended' },
  { key: 'Pending', label: 'Pending' },
];

const GRID: React.CSSProperties = {
  gridTemplateColumns:
    'minmax(0,1.7fr) minmax(0,1fr) minmax(0,1.1fr) minmax(0,.95fr) minmax(0,1fr) minmax(0,.9fr) 118px',
};

export function UsersPage() {
  const admin = useAdmin();
  const { inviteModalOpen, closeInviteModal } = useOutletContext<{
    inviteModalOpen: boolean;
    closeInviteModal: () => void;
  }>();
  const {
    users, userFilter, setUserFilter, suspendUser, editRoles,
    usersLoading, usersError, refreshUsers,
    invites, refreshInvites,
    inviteePhone, setInviteePhone, inviteeFirm, setInviteeFirm,
    inviteBuyer, toggleInviteBuyer, inviteSeller, toggleInviteSeller,
    inviteError, sendInvite, searchQuery, liveMode,
  } = admin;

  // Live backend: users come from the directory and pending users from invites.
  useEffect(() => {
    if (!liveMode) return;
    void refreshUsers();
    void refreshInvites();
  }, [liveMode, refreshUsers, refreshInvites]);

  const roster = useMemo<UserRecord[]>(() => {
    const pending = invites.map<UserRecord>((invite, index) => {
      const role = /seller/i.test(invite.meta) ? 'Seller' : /buyer/i.test(invite.meta) ? 'Buyer' : null;
      const invited = invite.meta.replace(/^[^·]*·\s*/, '');
      return {
        id: -(index + 1),
        firm: invite.firm || '—',
        owner: 'Invite pending',
        phone: invite.firm || '—',
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

  const submitInvite = async () => {
    if (await sendInvite()) closeInviteModal();
  };

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

      {inviteModalOpen ? (
        <Modal
          title="Invite a user"
          subtitle="Send an invite using the user's mobile number."
          onClose={closeInviteModal}
          onSave={() => { void submitInvite(); }}
          saveLabel="Send invite"
        >
          <Field label="Mobile number" required>
            <div style={{ display: 'flex', gap: 7 }}>
              <div className="input" style={{ width: 52, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>+91</div>
              <input
                className="input"
                placeholder="98xxx xxxxx"
                value={inviteePhone}
                onChange={(event) => setInviteePhone(event.target.value.replace(/\D/g, '').slice(0, 10))}
                type="tel"
                inputMode="numeric"
                pattern="[6-9][0-9]{9}"
                minLength={10}
                maxLength={10}
                title="Enter a valid 10-digit mobile number."
                autoFocus
                required
              />
            </div>
          </Field>
          <Field label="Firm name" required>
            <input
              className="input"
              placeholder="Firm name"
              value={inviteeFirm}
              onChange={(event) => setInviteeFirm(event.target.value)}
              required
            />
          </Field>
          <Field label="Modes" required>
            <div role="group" aria-label="Modes" aria-required="true" style={{ display: 'flex', gap: 6 }}>
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
          </Field>
          {inviteError ? <div className="field-error" role="alert">{inviteError}</div> : null}
        </Modal>
      ) : null}
    </div>
  );
}
