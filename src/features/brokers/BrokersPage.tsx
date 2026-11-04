import { useEffect, useMemo, useRef, useState } from 'react';
import { EmptyState, Field, Modal, Pagination } from '../../components/common/controls';
import { ApiError } from '../../services/api';
import { brokersApi, commoditiesApi, type BackendBroker, type BackendCommodity } from '../../services/backend';
import { useAdmin } from '../../store/AdminContext';
import type { Broker } from '../../types';

function commissionDisplay(b: Broker): string {
  if (!b.commissionType || b.commissionRate == null) return '—';
  if (b.commissionType === 'percent') return `${b.commissionRate}% of trade`;
  if (b.commissionType === 'per_bag') return `₹${b.commissionRate} per bag`;
  return `₹${b.commissionRate} flat`;
}

function formatPhone(phone: string): string {
  // +91XXXXXXXXXX → +91 XXXXX XXXXX
  if (/^\+91\d{10}$/.test(phone)) {
    return `+91 ${phone.slice(3, 8)} ${phone.slice(8)}`;
  }
  return phone;
}

export function BrokersPage() {
  const admin = useAdmin();
  const {
    brokers, brokersLoading, brokersError,
    brokerPage, setBrokerPage, brokerTotalPages, brokerTotal,
    brokerSearch, setBrokerSearch, brokerActiveFilter,
    refreshBrokers,
    brokerAddOpen, closeBrokerAdd,
    brokerAddName, setBrokerAddName, brokerAddPhone, setBrokerAddPhone,
    brokerAddError, brokerAddSaving, submitBrokerAdd,
    brokerEditId, openBrokerEdit, closeBrokerEdit,
    brokerEditName, setBrokerEditName, brokerEditPhone, setBrokerEditPhone,
    brokerEditCommissionType, setBrokerEditCommissionType,
    brokerEditCommissionRate, setBrokerEditCommissionRate,
    brokerEditError, brokerEditSaving, submitBrokerEdit,
    deactivateBroker, reactivateBroker,
    liveMode,
    searchQuery,
  } = admin;
  const [selectedBrokerId, setSelectedBrokerId] = useState<string | null>(null);
  const [brokerToDeactivate, setBrokerToDeactivate] = useState<Broker | null>(null);
  const [deactivatingBroker, setDeactivatingBroker] = useState(false);
  const [brokerDetail, setBrokerDetail] = useState<BackendBroker | null>(null);
  const [brokerDetailLoading, setBrokerDetailLoading] = useState(false);
  const [brokerDetailError, setBrokerDetailError] = useState<string | null>(null);
  const [commodities, setCommodities] = useState<BackendCommodity[]>([]);
  const [commoditiesLoading, setCommoditiesLoading] = useState(false);
  const [commoditiesError, setCommoditiesError] = useState<string | null>(null);
  const [selectedCommodityId, setSelectedCommodityId] = useState('');
  const [selectedCommissionType, setSelectedCommissionType] = useState('percent');
  const addBrokerPanel = useRef<HTMLDivElement>(null);
  const addBrokerPhone = useRef<HTMLInputElement>(null);

  // Debounce the top-level searchQuery into brokerSearch so users can type
  // without hammering the API on every keystroke.
  const [localSearch, setLocalSearch] = useState(brokerSearch);

  useEffect(() => {
    setLocalSearch(brokerSearch);
  }, [brokerSearch]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (localSearch !== brokerSearch) {
        setBrokerSearch(localSearch);
        setBrokerPage(1);
      }
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [localSearch, brokerSearch, setBrokerSearch, setBrokerPage]);

  // Sync the global header search bar into the broker search as well.
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    const nextSearch = searchQuery.trim();
    if (q !== localSearch.toLowerCase()) {
      setLocalSearch(nextSearch);
    }
    // Only trigger when the global query changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  useEffect(() => {
    if (liveMode) void refreshBrokers();
  }, [liveMode, brokerPage, brokerSearch, brokerActiveFilter, refreshBrokers]);

  useEffect(() => {
    if (!brokerAddOpen) return;
    addBrokerPanel.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    addBrokerPhone.current?.focus({ preventScroll: true });
    closeBrokerAdd();
  }, [brokerAddOpen, closeBrokerAdd]);

  useEffect(() => {
    if (!liveMode) return;
    let active = true;
    const loadCommodities = async () => {
      setCommoditiesLoading(true);
      setCommoditiesError(null);
      try {
        const firstPage = await commoditiesApi.list({ page: 1, limit: 100 });
        const pages = await Promise.all(
          Array.from({ length: Math.max(0, (firstPage.meta?.totalPages ?? 1) - 1) }, (_, index) =>
            commoditiesApi.list({ page: index + 2, limit: 100 }).then((result) => result.data),
          ),
        );
        if (active) setCommodities([...firstPage.data, ...pages.flat()]);
      } catch (error: unknown) {
        if (active) {
          setCommoditiesError(error instanceof ApiError ? error.message : 'Could not load commodities.');
        }
      } finally {
        if (active) setCommoditiesLoading(false);
      }
    };
    void loadCommodities();
    return () => { active = false; };
  }, [liveMode]);

  // Client-side filter for demo / non-live mode
  const view = useMemo(() => {
    if (liveMode) return brokers;
    const q = localSearch.trim().toLowerCase();
    return brokers.filter(
      (b) =>
        (brokerActiveFilter === 'all' || String(b.active) === brokerActiveFilter) &&
        (!q || b.name.toLowerCase().includes(q) || b.phone.includes(q)),
    );
  }, [brokers, liveMode, localSearch, brokerActiveFilter]);

  const selectedBroker = useMemo(
    () => view.find((b) => b.id === selectedBrokerId) ?? view[0] ?? null,
    [view, selectedBrokerId],
  );
  const editRow = useMemo(
    () => brokers.find((broker) => broker.id === brokerEditId) ?? null,
    [brokers, brokerEditId],
  );

  useEffect(() => {
    if (!selectedBroker) {
      setBrokerDetail(null);
      setBrokerDetailError(null);
      return;
    }

    let active = true;
    setBrokerDetailLoading(true);
    setBrokerDetailError(null);
    void brokersApi.getById(selectedBroker.id)
      .then((detail) => {
        if (active) setBrokerDetail(detail);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setBrokerDetail(null);
        setBrokerDetailError(error instanceof ApiError ? error.message : 'Could not load broker details.');
      })
      .finally(() => {
        if (active) setBrokerDetailLoading(false);
      });

    return () => { active = false; };
  }, [selectedBroker?.id]);

  const confirmDeactivate = (b: Broker) => {
    setBrokerToDeactivate(b);
  };

  const handleDeactivate = async () => {
    if (!brokerToDeactivate || deactivatingBroker) return;
    setDeactivatingBroker(true);
    try {
      if (await deactivateBroker(brokerToDeactivate.id)) setBrokerToDeactivate(null);
    } finally {
      setDeactivatingBroker(false);
    }
  };

  const confirmReactivate = (b: Broker) => {
    void reactivateBroker(b.id);
  };

  return (
    <>
      {!liveMode ? (
        <div className="callout-info">
          Connect to a live backend (configure <strong>VITE_API_BASE_URL</strong>) to manage brokers — the broker directory is stored server-side and requires an admin session.
        </div>
      ) : null}

      <div className="broker-layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="panel">
            {liveMode && brokerTotal > 0 ? (
              <div className="text-muted" style={{ padding: '10px 14px', fontSize: 11.5, borderBottom: '1px solid var(--color-neutral-200)' }}>
                {brokerTotal} broker{brokerTotal !== 1 ? 's' : ''}
              </div>
            ) : null}
            {brokersLoading ? (
              <div className="text-muted" style={{ padding: '18px 16px', fontSize: 13 }}>Loading brokers…</div>
            ) : null}
            {brokersError ? (
              <div className="field-error" style={{ padding: '12px 16px' }}>{brokersError}</div>
            ) : null}
            {view.map((b) => (
              <button
                key={b.id}
                type="button"
                className={`broker-select-row${selectedBroker?.id === b.id ? ' selected' : ''}`}
                onClick={() => setSelectedBrokerId(b.id)}
                aria-pressed={selectedBroker?.id === b.id}
              >
                <span style={{ display: 'block', minWidth: 0 }}>
                  <span style={{ display: 'block', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</span>
                  <span className="text-muted" style={{ display: 'block', fontSize: 11.5, marginTop: 2 }}>
                    {formatPhone(b.phone)} · {commissionDisplay(b) === '—' ? 'No commission set' : commissionDisplay(b)}
                  </span>
                </span>
                <span className={`tag ${b.active ? 'tag-accent' : 'tag-neutral'}`} style={{ fontSize: 10, padding: '2px 8px' }}>
                  {b.active ? 'Active' : 'Inactive'}
                </span>
              </button>
            ))}
            {view.length === 0 && !brokersLoading && !brokersError ? (
              <EmptyState
                message={
                  liveMode
                    ? 'No brokers found. Add your first broker below.'
                    : 'No brokers yet — connect a live backend to load the broker directory.'
                }
              />
            ) : null}
            {brokerTotalPages > 1 ? (
              <div style={{ padding: '10px 12px', borderTop: '1px solid var(--color-neutral-200)' }}>
                <Pagination
                  page={brokerPage}
                  totalPages={brokerTotalPages}
                  total={brokerTotal}
                  pageSize={20}
                  onPageChange={setBrokerPage}
                  disabled={brokersLoading}
                />
              </div>
            ) : null}
          </div>

          <div className="panel" ref={addBrokerPanel} style={{ padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Add a broker</div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void submitBrokerAdd();
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
            >
              <Field label="Phone number" required>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span className="input" aria-hidden="true" style={{ width: 44, flex: 'none', display: 'grid', placeItems: 'center', padding: 0 }}>+91</span>
                  <input
                    ref={addBrokerPhone}
                    className="input"
                    placeholder="98xxx xxxxx"
                    value={brokerAddPhone}
                    onChange={(event) => {
                      const digits = event.target.value.replace(/\D/g, '');
                      setBrokerAddPhone(digits.replace(/^91(?=\d{10}$)/, '').slice(0, 10));
                    }}
                    inputMode="tel"
                    autoComplete="tel-national"
                    aria-label="Broker phone number"
                    minLength={10}
                    maxLength={10}
                    pattern="[6-9][0-9]{9}"
                    title="Enter a valid 10-digit mobile number."
                    required
                    disabled={!liveMode || brokerAddSaving}
                  />
                </div>
              </Field>
              <Field label="Name" required>
                <input
                  className="input"
                  placeholder="e.g. Ratan"
                  value={brokerAddName}
                  onChange={(event) => setBrokerAddName(event.target.value)}
                  maxLength={100}
                  required
                  disabled={!liveMode || brokerAddSaving}
                />
              </Field>
              {brokerAddError ? <div className="field-error" role="alert">{brokerAddError}</div> : null}
              <button className="btn btn-primary btn-block" type="submit" disabled={!liveMode || brokerAddSaving}>
                {brokerAddSaving ? 'Adding…' : 'Add broker'}
              </button>
            </form>
          </div>
        </div>

        {selectedBroker ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="panel" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <h2 style={{ fontSize: 18, marginBottom: 3 }}>{selectedBroker.name}</h2>
                  <div className="text-muted" style={{ fontSize: 13 }}>{formatPhone(selectedBroker.phone)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span className={`tag ${selectedBroker.active ? 'tag-accent' : 'tag-neutral'}`}>
                    {selectedBroker.active ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    className="btn btn-secondary"
                    onClick={() => openBrokerEdit(selectedBroker.id)}
                    style={{ height: 30, padding: '0 12px', fontSize: 11.5 }}
                  >
                    Edit
                  </button>
                  {selectedBroker.active ? (
                    <button
                      className="btn btn-secondary"
                      onClick={() => confirmDeactivate(selectedBroker)}
                      style={{ height: 30, padding: '0 12px', fontSize: 11.5 }}
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      className="btn btn-secondary"
                      onClick={() => confirmReactivate(selectedBroker)}
                      style={{ height: 30, padding: '0 12px', fontSize: 11.5 }}
                    >
                      Reactivate
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="panel" style={{ padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Commodity commissions</div>
              <p className="text-muted" style={{ fontSize: 11.5, lineHeight: 1.5, marginBottom: 14 }}>
                Set a commission rate per commodity — either a percentage of trade value or a fixed amount per bag.
              </p>
              {selectedBroker.commissionType && selectedBroker.commissionRate != null ? (
                <div style={{ padding: 12, borderRadius: 8, background: 'var(--color-surface)', marginBottom: 14 }}>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>Broker default commission</div>
                  <div className="text-muted" style={{ fontSize: 11.5, marginTop: 3 }}>{commissionDisplay(selectedBroker)}</div>
                  <div className="text-muted" style={{ fontSize: 11, marginTop: 5 }}>
                    This is a broker-wide default, not a commodity-specific rate.
                  </div>
                </div>
              ) : null}
              {brokerDetailError ? <div className="field-error" role="alert">{brokerDetailError}</div> : null}
              {commoditiesError ? <div className="field-error" role="alert">{commoditiesError}</div> : null}
              {brokerDetailLoading ? <div className="text-muted" style={{ fontSize: 12 }}>Loading broker details…</div> : null}
              {brokerDetail && !brokerDetailLoading ? (
                <div className="text-muted" style={{ fontSize: 12, marginBottom: 14 }}>
                  Trades attributed: {brokerDetail.tradeCount ?? 0}
                </div>
              ) : null}
              <div style={{ borderTop: '1px solid var(--color-neutral-200)', paddingTop: 14 }}>
                <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 10 }}>Add commission</div>
                <div className="broker-commission-form">
                  <Field label="Commodity">
                    <select
                      className="input"
                      value={selectedCommodityId}
                      onChange={(event) => setSelectedCommodityId(event.target.value)}
                      disabled={commoditiesLoading || !!commoditiesError || commodities.length === 0}
                      aria-label="Commodity"
                    >
                      <option value="">
                        {commoditiesLoading ? 'Loading commodities…' : 'Select commodity'}
                      </option>
                      {commodities.map((commodity) => (
                        <option key={commodity.id} value={commodity.id}>
                          {commodity.category?.name
                            ? `${commodity.name} (${commodity.category.name})`
                            : commodity.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Type">
                    <select
                      className="input"
                      value={selectedCommissionType}
                      onChange={(event) => setSelectedCommissionType(event.target.value)}
                      aria-label="Commission type"
                    >
                      <option value="percent">% of value</option>
                      <option value="fixed">₹ / bag</option>
                    </select>
                  </Field>
                  <Field label="Value">
                    <input className="input"  placeholder="e.g. 0.25 or 15" aria-label="Commission value" />
                  </Field>
                  <button className="btn btn-primary" type="button" >Add</button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="panel">
            <EmptyState message="Select a broker to view their details and commission." />
          </div>
        )}
      </div>

      {editRow ? (
        <Modal
          title="Edit broker"
          subtitle={editRow.name}
          onClose={closeBrokerEdit}
          onSave={() => { void submitBrokerEdit(); }}
          saveLabel={brokerEditSaving ? 'Saving…' : 'Save changes'}
          saveDisabled={brokerEditSaving}
        >
          <div className="form-2col">
            <Field label="Name">
              <input
                className="input"
                value={brokerEditName}
                onChange={(event) => setBrokerEditName(event.target.value)}
                maxLength={100}
                disabled={brokerEditSaving}
              />
            </Field>
            <Field label="Mobile number">
              <input
                className="input"
                value={brokerEditPhone}
                onChange={(event) => setBrokerEditPhone(event.target.value.replace(/\D/g, '').slice(0, 10))}
                inputMode="tel"
                minLength={10}
                maxLength={10}
                pattern="[6-9][0-9]{9}"
                title="Enter a valid 10-digit mobile number."
                disabled={brokerEditSaving}
              />
            </Field>
          </div>
          <CommissionFields
            commissionType={brokerEditCommissionType}
            setCommissionType={setBrokerEditCommissionType}
            commissionRate={brokerEditCommissionRate}
            setCommissionRate={setBrokerEditCommissionRate}
            disabled={brokerEditSaving}
          />
          {brokerEditError ? <div className="field-error" role="alert">{brokerEditError}</div> : null}
        </Modal>
      ) : null}
      {brokerToDeactivate ? (
        <Modal
          title="Deactivate this broker?"
          subtitle="Please confirm this account change."
          onClose={() => {
            if (!deactivatingBroker) setBrokerToDeactivate(null);
          }}
          onSave={() => { void handleDeactivate(); }}
          saveLabel={deactivatingBroker ? 'Deactivating…' : 'Yes, deactivate'}
          saveDisabled={deactivatingBroker}
          saveClassName="btn btn-danger"
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12, padding: '4px 8px 8px' }}>
            <div
              aria-hidden="true"
              style={{
                width: 58, height: 58, borderRadius: '50%', display: 'grid', placeItems: 'center',
                background: 'color-mix(in srgb, #d64545 12%, transparent)', color: '#d64545',
                fontSize: 28, fontWeight: 700,
              }}
            >
              !
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.6 }}>
              <strong>{brokerToDeactivate.name}</strong> will no longer appear in the active broker list.
              <div className="text-muted" style={{ fontSize: 12.5, marginTop: 6 }}>
                Past trades will keep their broker attribution.
              </div>
            </div>
          </div>
        </Modal>
      ) : null}
    </>
  );
}

function CommissionFields({
  commissionType,
  setCommissionType,
  commissionRate,
  setCommissionRate,
  disabled,
}: {
  commissionType: string;
  setCommissionType: (value: string) => void;
  commissionRate: string;
  setCommissionRate: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="form-2col">
      <Field label="Commission type">
        <select
          className="input"
          value={commissionType}
          onChange={(event) => setCommissionType(event.target.value)}
          disabled={disabled}
          style={{ height: 38 }}
        >
          <option value="">No commission</option>
          <option value="percent">Percent of trade value</option>
          <option value="per_bag">Per bag</option>
          <option value="flat">Flat</option>
        </select>
      </Field>
      <Field label={commissionType === 'percent' ? 'Rate (%)' : 'Rate (₹)'}>
        <input
          className="input"
          type="number"
          min="0"
          max={commissionType === 'percent' ? 100 : undefined}
          step="0.01"
          value={commissionRate}
          onChange={(event) => setCommissionRate(event.target.value)}
          disabled={disabled || !commissionType}
        />
      </Field>
      <div className="text-muted" style={{ gridColumn: '1 / -1', fontSize: 11.5 }}>
        The API stores one broker-wide commission, not individual commodity rates.
      </div>
    </div>
  );
}
