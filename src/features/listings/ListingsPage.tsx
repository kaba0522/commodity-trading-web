import { useEffect, useMemo, useState } from 'react';
import { EmptyState, Field, FilterTag, Modal, Pagination } from '../../components/common/controls';
import { STATUS_CLS } from '../../data/constants';
import { ApiError } from '../../services/api';
import { commoditiesApi, type BackendCommodity } from '../../services/backend';
import { LIVE_PAGE_SIZE, useAdmin } from '../../store/AdminContext';
import { inr } from '../../utils/format';

const GRID: React.CSSProperties = {
  gridTemplateColumns:
    '64px minmax(0,1.5fr) minmax(0,1.6fr) minmax(0,.9fr) minmax(0,.8fr) minmax(0,.7fr) minmax(0,.9fr) minmax(0,1fr) 150px',
};

export function ListingsPage() {
  const admin = useAdmin();
  const [commodityFilter, setCommodityFilter] = useState('');
  const [commodityOptions, setCommodityOptions] = useState<BackendCommodity[]>([]);
  const [commoditiesLoading, setCommoditiesLoading] = useState(false);
  const [commoditiesError, setCommoditiesError] = useState<string | null>(null);
  const {
    rows, sideFilter, setSideFilter, catFilter, setCatFilter, statusFilter, setStatusFilter,
    openEdit, forceExpire, editId, editPrice, setEditPrice, editWeight, setEditWeight,
    editReason, setEditReason, editError, closeEdit, saveEdit, searchQuery,
    liveMode, listingsLoading, listingsError, listingPage, setListingPage,
    listingTotal, listingTotalPages, refreshListings, categories,
  } = admin;

  useEffect(() => {
    if (!liveMode) return;
    let active = true;
    const loadCommodities = async () => {
      setCommoditiesLoading(true);
      setCommoditiesError(null);
      try {
        const firstPage = await commoditiesApi.list({ page: 1, limit: 100 });
        const remainingPages = await Promise.all(
          Array.from({ length: Math.max(0, (firstPage.meta?.totalPages ?? 1) - 1) }, (_, index) =>
            commoditiesApi.list({ page: index + 2, limit: 100 }).then((result) => result.data),
          ),
        );
        if (active) setCommodityOptions([...firstPage.data, ...remainingPages.flat()]);
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

  // Live backend: admin sessions read every user's rows via GET /listings
  // (side + status + categoryId + commodityId + itemName filters, 20/page). Debounced so
  // typing in global search doesn't fan out requests.
  useEffect(() => {
    if (!liveMode) return;
    const id = window.setTimeout(() => void refreshListings(commodityFilter || undefined), 350);
    return () => window.clearTimeout(id);
  }, [liveMode, refreshListings, commodityFilter]);

  // Any filter or search change starts a new result set at page 1.
  useEffect(() => {
    setListingPage(1);
  }, [sideFilter, catFilter, statusFilter, searchQuery, commodityFilter, setListingPage]);

  // Reset to page 1 immediately on filter clicks for instant feedback.
  const resetPage = () => setListingPage(1);
  const demoCommodities = useMemo(() => [...new Set(rows.map((row) => row.item))].sort(), [rows]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (sideFilter === 'all' || r.side === sideFilter) &&
        (catFilter === 'All categories' || r.category === catFilter) &&
        (statusFilter === 'All statuses' || r.status === statusFilter) &&
        (liveMode || !commodityFilter || r.item === commodityFilter) &&
        (!q || r.firm.toLowerCase().includes(q) || r.item.toLowerCase().includes(q) || r.category.toLowerCase().includes(q)),
    );
  }, [rows, sideFilter, catFilter, statusFilter, searchQuery, commodityFilter, liveMode]);

  const editRow = rows.find((r) => r.id === editId) ?? null;

  return (
    <>
      <div className="panel filter-bar">
        <div style={{ display: 'flex', gap: 5 }}>
          {([['all', 'Both sides'], ['SELL', 'Sell listings'], ['BUY', 'Buy requirements']] as const).map(([key, label]) => (
            <FilterTag key={key} label={label} active={sideFilter === key} onClick={() => { setSideFilter(key); resetPage(); }} />
          ))}
        </div>
        <div style={{ width: 1, height: 22, background: 'var(--color-neutral-300)' }} />
        <select className="input" value={catFilter} onChange={(e) => { setCatFilter(e.target.value); resetPage(); }} style={{ height: 34, width: 180, fontSize: 12.5 }}>
          {['All categories', ...categories].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          className="input"
          value={commodityFilter}
          onChange={(e) => { setCommodityFilter(e.target.value); resetPage(); }}
          style={{ height: 34, width: 180, fontSize: 12.5 }}
          aria-label="Filter by commodity"
          disabled={liveMode && commoditiesLoading}
        >
          <option value="">{commoditiesLoading ? 'Loading commodities…' : 'All commodities'}</option>
          {liveMode
            ? commodityOptions.map((commodity) => (
              <option key={commodity.id} value={commodity.id}>{commodity.name}</option>
            ))
            : demoCommodities.map((commodity) => (
              <option key={commodity} value={commodity}>{commodity}</option>
            ))}
        </select>
        <select className="input" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); resetPage(); }} style={{ height: 34, width: 170, fontSize: 12.5 }}>
          {['All statuses', 'Active', 'Price expired', 'Traded', 'Withdrawn', 'N/A'].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <div className="text-muted" style={{ marginLeft: 'auto', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          {liveMode
            ? `${listingTotal} rows · page ${listingPage} of ${Math.max(listingTotalPages, 1)}`
            : `${filtered.length} of ${rows.length} rows`}
        </div>
      </div>

      {listingsError ? <div className="field-error">{listingsError}</div> : null}
      {commoditiesError ? <div className="field-error">{commoditiesError}</div> : null}

      <div className="panel">
        <div className="table-scroll">
          <div className="grid-head" style={{ ...GRID, minWidth: 1100 }}>
            <div>SIDE</div><div>FIRM</div><div>COMODITY</div><div>QUALITY</div><div>CATEGORY</div><div>WEIGHT PER BAG</div><div>PRICE</div><div>STATUS · VALID</div><div>ACTION</div>
          </div>
          {filtered.map((r) => (
            <div key={r.id} className="grid-row" style={{ ...GRID, minWidth: 1100 }}>
              <div>
                <span className={`tag ${r.side === 'SELL' ? 'tag-accent' : 'tag-accent-2'}`} style={{ fontSize: 10, padding: '2px 8px' }}>{r.side}</span>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{r.firm}</div>
                <div className="text-muted" style={{ fontSize: 11 }}>{r.subEntity || '—'}</div>
              </div>
              <div style={{ fontWeight: 600 }}>{r.item}</div>
              <div className="text-muted">{r.quality}</div>
              <div className="text-muted">{r.category}</div>
              <div className="text-muted">{r.weight}</div>
              <div style={r.price == null
                ? { fontWeight: 600, color: '#d64545' }
                : { fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
              >
                {r.price == null ? 'N/A' : inr(r.price)}
              </div>
              <div>
                <span className={`tag ${STATUS_CLS[r.status] ?? 'tag-neutral'}`} style={{ fontSize: 10, padding: '2px 8px' }}>{r.status}</span>
                <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>{r.validUntil}</div>
              </div>
              <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => openEdit(r.id)} style={{ height: 28, padding: '0 10px', fontSize: 11.5 }}>Edit</button>
                {r.side === 'SELL' && r.status === 'Active' ? (
                  <button className="btn btn-secondary" onClick={() => forceExpire(r.id)} style={{ height: 28, padding: '0 10px', fontSize: 11.5 }}>Expire</button>
                ) : null}
              </div>
            </div>
          ))}
          {filtered.length === 0 && !listingsLoading ? <EmptyState message="No listings match these filters." /> : null}
          {listingsLoading ? <div className="text-muted" style={{ padding: '18px 16px', fontSize: 13 }}>Loading listings…</div> : null}
        </div>
      </div>
      <Pagination
        page={listingPage}
        totalPages={listingTotalPages}
        total={liveMode ? listingTotal : filtered.length}
        pageSize={LIVE_PAGE_SIZE}
        onPageChange={setListingPage}
        disabled={listingsLoading}
      />
      {editRow ? (
        <Modal
          title={`Edit on behalf of ${editRow.firm}`}
          subtitle={`${editRow.item} · this change is audited`}
          onClose={closeEdit}
          onSave={saveEdit}
          saveLabel="Save & log"
        >
          <div className="form-2col">
            <Field label="Price (₹)">
              <input className="input" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} inputMode="numeric" />
            </Field>
            <Field label={liveMode ? 'Weight (whole kg, e.g. 30KG)' : 'Weight'}>
              <input className="input" value={editWeight} onChange={(e) => setEditWeight(e.target.value)} />
            </Field>
          </div>
          <Field label="Reason for the edit">
            <input
              className="input"
              placeholder="e.g. Kunj Bihari called, wants ₹200 down"
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
            />
          </Field>
          {editError ? <div className="field-error">{editError}</div> : null}
          <div style={{ background: 'var(--color-accent-100)', borderRadius: 8, padding: '11px 14px', fontSize: 12, color: 'var(--color-accent-900)', lineHeight: 1.5 }}>
            Recorded as <strong>Kunj Bihari (admin)</strong> edited {editRow.item} — before{' '}
            {editRow.price == null ? 'N/A' : inr(editRow.price)}, after ₹{editPrice || '—'}.
          </div>
        </Modal>
      ) : null}
    </>
  );
}
