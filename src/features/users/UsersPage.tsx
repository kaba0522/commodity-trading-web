import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  EmptyState,
  Field,
  FilterTag,
  Modal,
  Pagination,
  usePagination,
} from "../../components/common/controls";
import { STATUS_CLS } from "../../data/constants";
import { useAdmin } from "../../store/AdminContext";
import type { UserRecord } from "../../types";

const PAGE_SIZE = 10;

const FILTERS = [
  { key: "all", label: "All users" },
  { key: "Active", label: "Active" },
  { key: "Suspended", label: "Suspended" },
  { key: "Pending", label: "Pending" },
];

const GRID: React.CSSProperties = {
  gridTemplateColumns:
    "minmax(0,1.7fr) minmax(0,1fr) minmax(0,1.1fr) minmax(0,.95fr) minmax(0,1fr) minmax(0,.9fr) 118px",
};

export function UsersPage() {
  const admin = useAdmin();
  const { inviteModalOpen, closeInviteModal } = useOutletContext<{
    inviteModalOpen: boolean;
    closeInviteModal: () => void;
  }>();
  const {
    users,
    userFilter,
    setUserFilter,
    suspendUser,
    updateUser,
    usersLoading,
    usersError,
    refreshUsers,
    invites,
    refreshInvites,
    inviteePhone,
    setInviteePhone,
    inviteeFirm,
    setInviteeFirm,
    inviteBuyer,
    toggleInviteBuyer,
    inviteSeller,
    toggleInviteSeller,
    inviteError,
    sendInvite,
    searchQuery,
    liveMode,
  } = admin;
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [userToSuspend, setUserToSuspend] = useState<UserRecord | null>(null);

  // Live backend: users come from the directory and pending users from invites.
  useEffect(() => {
    if (!liveMode) return;
    void refreshUsers();
    void refreshInvites();
  }, [liveMode, refreshUsers, refreshInvites]);

  const roster = useMemo<UserRecord[]>(() => {
    const pending = invites.map<UserRecord>((invite, index) => {
      const role = /seller/i.test(invite.meta)
        ? "Seller"
        : /buyer/i.test(invite.meta)
          ? "Buyer"
          : null;
      const invited = invite.meta.replace(/^[^·]*·\s*/, "");
      return {
        id: -(index + 1),
        firm: invite.firm || "—",
        owner: "Invite pending",
        phone: invite.firm || "—",
        modes: role ? [role] : [],
        status: "Pending",
        invitedBy: "—",
        lastActive: invited || "—",
        paymentTerms: "—",
      };
    });
    return [...users, ...pending];
  }, [users, invites]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return roster
      .filter((u) => userFilter === "all" || u.status === userFilter)
      .filter(
        (u) =>
          !q ||
          u.firm.toLowerCase().includes(q) ||
          u.phone.replace(/\s/g, "").includes(q.replace(/\s/g, "")) ||
          u.owner.toLowerCase().includes(q),
      );
  }, [roster, userFilter, searchQuery]);

  // The roster is fetched whole, so pagination is client-side. The page
  // resets whenever the filter or search changes.
  const {
    page: currentPage,
    setPage: setUserPage,
    totalPages,
    pageItems: pageRows,
  } = usePagination(filtered, PAGE_SIZE, `${userFilter}|${searchQuery}`);

  const submitInvite = async () => {
    if (await sendInvite()) closeInviteModal();
  };

  const saveUserEdit = () => {
    if (!editingUser) return;
    if (!editingUser.firm.trim() || !editingUser.owner.trim()) {
      setEditError("Firm name and owner name are required.");
      return;
    }
    if (editingUser.modes.length === 0) {
      setEditError("Select at least one mode.");
      return;
    }
    if (
      updateUser(editingUser.id, {
        firm: editingUser.firm.trim(),
        owner: editingUser.owner.trim(),
        modes: editingUser.modes,
        paymentTerms: editingUser.paymentTerms.trim(),
      })
    ) {
      setEditingUser(null);
      setEditError(null);
    }
  };

  return (
    <div className="users-split">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {FILTERS.map((f) => (
            <FilterTag
              key={f.key}
              label={f.label}
              active={userFilter === f.key}
              onClick={() => setUserFilter(f.key)}
            />
          ))}
          <span
            className="text-muted"
            style={{ marginLeft: "auto", fontSize: 12 }}
          >
            {filtered.length} {filtered.length === 1 ? "user" : "users"}
            {totalPages > 1 ? ` · page ${currentPage} of ${totalPages}` : ""}
          </span>
        </div>
        {usersError ? (
          <div className="field-error" role="alert">
            {usersError}
          </div>
        ) : null}
        <div className="panel">
          <div className="table-scroll">
            <div className="grid-head" style={{ ...GRID, minWidth: 860 }}>
              <div>FIRM</div>
              <div>PHONE</div>
              <div>ROLE</div>
              <div>PAYMENT</div>
              <div>INVITED BY</div>
              {/* <div>LAST ACTIVITY</div> */}
              <div />
            </div>
            {usersLoading ? (
              <div
                className="text-muted"
                style={{ padding: "18px 16px", fontSize: 13 }}
              >
                Loading users…
              </div>
            ) : null}
            {pageRows.map((u) => (
              <div
                key={u.id}
                className="grid-row"
                style={{ ...GRID, minWidth: 860 }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      flexWrap: "wrap",
                    }}
                  >
                    <span>{u.firm}</span>
                    <span
                      className={`tag ${STATUS_CLS[u.status] ?? "tag-neutral"}`}
                      style={{ fontSize: 10, padding: "2px 8px" }}
                    >
                      {u.status}
                    </span>
                  </div>
                  <div
                    className="text-muted"
                    style={{ fontSize: 11.5, marginTop: 1 }}
                  >
                    {u.owner}
                  </div>
                </div>
                <div style={{ fontVariantNumeric: "tabular-nums" }}>
                  {u.phone}
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {u.modes.map((m) => (
                    <span
                      key={m}
                      className={`tag ${m === "Seller" ? "tag-accent" : "tag-accent-2"}`}
                      style={{ fontSize: 10, padding: "2px 8px" }}
                    >
                      {m}
                    </span>
                  ))}
                </div>
                <div
                  className="text-muted"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {u.paymentTerms || "—"}
                </div>
                <div className="text-muted">{u.invitedBy}</div>
                {/* <div className="text-muted">{u.lastActive}</div> */}
                <div
                  style={{
                    display: "flex",
                    gap: 5,
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setEditingUser(u);
                      setEditError(null);
                    }}
                    disabled={u.status === "Pending"}
                    title={
                      u.status === "Pending"
                        ? "Pending invites cannot be edited here."
                        : undefined
                    }
                    style={{ height: 28, padding: "0 10px", fontSize: 11.5 }}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => {
                      if (u.status === "Suspended") suspendUser(u.id);
                      else setUserToSuspend(u);
                    }}
                    style={{ height: 28, padding: "0 10px", fontSize: 11.5 }}
                  >
                    {u.status === "Suspended" ? "Restore" : "Suspend"}
                  </button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && !usersLoading ? (
              <EmptyState message="No users match these filters." />
            ) : null}
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

      {userToSuspend ? (
        <Modal
          title="Suspend user?"
          subtitle={`Confirm that you want to suspend ${userToSuspend.firm}.`}
          onClose={() => setUserToSuspend(null)}
          onSave={() => {
            suspendUser(userToSuspend.id);
            setUserToSuspend(null);
          }}
          saveLabel="Suspend user"
          saveClassName="btn btn-danger"
        >
          <div className="text-muted" style={{ fontSize: 13 }}>
            {liveMode
              ? "This status change applies only in this console and will not be saved to the backend."
              : "You can restore this user later."}
          </div>
        </Modal>
      ) : null}

      {editingUser ? (
        <Modal
          title="Edit user"
          subtitle="Update profile details. The mobile number cannot be changed."
          onClose={() => {
            setEditingUser(null);
            setEditError(null);
          }}
          onSave={saveUserEdit}
          saveLabel="Save changes"
        >
          <div className="form-2col">
            <Field label="Owner name" required>
              <input
                className="input"
                value={editingUser.owner}
                onChange={(event) =>
                  setEditingUser({ ...editingUser, owner: event.target.value })
                }
                maxLength={100}
                autoFocus
                required
              />
            </Field>
            <Field label="Firm name" required>
              <input
                className="input"
                value={editingUser.firm}
                onChange={(event) =>
                  setEditingUser({ ...editingUser, firm: event.target.value })
                }
                maxLength={100}
                required
              />
            </Field>
            <Field label="Mobile number">
              <input className="input" value={editingUser.phone} disabled />
            </Field>
            <Field label="Payment terms">
              <input
                className="input"
                value={
                  editingUser.paymentTerms === "—"
                    ? ""
                    : editingUser.paymentTerms
                }
                onChange={(event) =>
                  setEditingUser({
                    ...editingUser,
                    paymentTerms: event.target.value,
                  })
                }
                placeholder="e.g. 30 days"
                maxLength={50}
              />
            </Field>
          </div>
          <Field label="Modes" required>
            <div
              role="group"
              aria-label="Modes"
              aria-required="true"
              style={{ display: "flex", gap: 6 }}
            >
              {(["Buyer", "Seller"] as const).map((mode) => {
                const active = editingUser.modes.includes(mode);
                return (
                  <button
                    key={mode}
                    type="button"
                    className={`tag ${active ? (mode === "Seller" ? "tag-accent" : "tag-accent-2") : "tag-neutral"}`}
                    onClick={() =>
                      setEditingUser({
                        ...editingUser,
                        modes: active
                          ? editingUser.modes.filter((item) => item !== mode)
                          : [...editingUser.modes, mode],
                      })
                    }
                    aria-pressed={active}
                    style={{ cursor: "pointer", border: 0, font: "inherit" }}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
          </Field>
          {liveMode ? (
            <div className="text-muted" role="note" style={{ fontSize: 12 }}>
              The backend does not currently support editing user profiles.
              Changes will apply only in this console and will be lost on
              reload.
            </div>
          ) : null}
          {editError ? (
            <div className="field-error" role="alert">
              {editError}
            </div>
          ) : null}
        </Modal>
      ) : null}

      {inviteModalOpen ? (
        <Modal
          title="Invite a user"
          subtitle="Send an invite using the user's mobile number."
          onClose={closeInviteModal}
          onSave={() => {
            void submitInvite();
          }}
          saveLabel="Send invite"
        >
          <Field label="Mobile number" required>
            <div style={{ display: "flex", gap: 7 }}>
              <div
                className="input"
                style={{
                  width: 52,
                  flex: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                }}
              >
                +91
              </div>
              <input
                className="input"
                placeholder="98xxx xxxxx"
                value={inviteePhone}
                onChange={(event) =>
                  setInviteePhone(
                    event.target.value.replace(/\D/g, "").slice(0, 10),
                  )
                }
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
            <div
              role="group"
              aria-label="Modes"
              aria-required="true"
              style={{ display: "flex", gap: 6 }}
            >
              <button
                type="button"
                className={`tag ${inviteBuyer ? "tag-accent-2" : "tag-neutral"}`}
                onClick={toggleInviteBuyer}
                aria-pressed={inviteBuyer}
                style={{ cursor: "pointer", border: 0, font: "inherit" }}
              >
                Buyer
              </button>
              <button
                type="button"
                className={`tag ${inviteSeller ? "tag-accent" : "tag-neutral"}`}
                onClick={toggleInviteSeller}
                aria-pressed={inviteSeller}
                style={{ cursor: "pointer", border: 0, font: "inherit" }}
              >
                Seller
              </button>
            </div>
          </Field>
          {inviteError ? (
            <div className="field-error" role="alert">
              {inviteError}
            </div>
          ) : null}
        </Modal>
      ) : null}
    </div>
  );
}
