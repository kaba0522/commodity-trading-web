import { useEffect, useMemo, useState } from 'react';
import { EmptyState, Field, FilterTag, Modal, Pagination } from '../../components/common/controls';
import { STATUS_CLS } from '../../data/constants';
import { ApiError } from '../../services/api';
import {
  categoriesApi,
  commoditiesApi,
  listingOwnersApi,
  listingsApi,
  qualitiesApi,
  type BackendCategory,
  type BackendCommodity,
  type BackendListingOwner,
  type BackendQuality,
  type BackendListingSide,
  type ListingCreateBody,
} from '../../services/backend';
import { LIVE_PAGE_SIZE, useAdmin } from '../../store/AdminContext';
import { inr } from '../../utils/format';

const GRID: React.CSSProperties = {
  columnGap: 14,
  gridTemplateColumns:
    '64px minmax(0,1.4fr) minmax(0,1.4fr) minmax(0,1.2fr) minmax(72px,.7fr) minmax(0,.8fr) minmax(105px,.7fr) minmax(100px,.9fr) minmax(0,1fr) 150px',
};

async function loadAllPages<T>(
  loadPage: (page: number) => Promise<{ data: T[]; meta?: { totalPages?: number } }>,
): Promise<T[]> {
  const firstPage = await loadPage(1);
  const totalPages = firstPage.meta?.totalPages ?? 1;
  const remaining = await Promise.all(
    Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) =>
      loadPage(index + 2).then((result) => result.data),
    ),
  );
  return [...firstPage.data, ...remaining.flat()];
}

export function ListingsPage() {
  const admin = useAdmin();
  const [commodityFilter, setCommodityFilter] = useState('');
  const [commodityOptions, setCommodityOptions] = useState<BackendCommodity[]>([]);
  const [commoditiesLoading, setCommoditiesLoading] = useState(false);
  const [commoditiesError, setCommoditiesError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createSide, setCreateSide] = useState<BackendListingSide>('SELL');
  const [createCategories, setCreateCategories] = useState<BackendCategory[]>([]);
  const [createCategoriesLoading, setCreateCategoriesLoading] = useState(false);
  const [createCategoryId, setCreateCategoryId] = useState('');
  const [createCommodities, setCreateCommodities] = useState<BackendCommodity[]>([]);
  const [createQualities, setCreateQualities] = useState<BackendQuality[]>([]);
  const [createTaxonomyLoading, setCreateTaxonomyLoading] = useState(false);
  const [createCommodityId, setCreateCommodityId] = useState('');
  const [createQualityId, setCreateQualityId] = useState('');
  const [createQuantity, setCreateQuantity] = useState('');
  const [createWeight, setCreateWeight] = useState('');
  const [createPrice, setCreatePrice] = useState('');
  const [createPaymentTerms, setCreatePaymentTerms] = useState('');
  const [createNotes, setCreateNotes] = useState('');
  const [ownerSearch, setOwnerSearch] = useState('');
  const [ownerPage, setOwnerPage] = useState(1);
  const [ownerTotalPages, setOwnerTotalPages] = useState(1);
  const [ownerOptions, setOwnerOptions] = useState<BackendListingOwner[]>([]);
  const [ownerUserId, setOwnerUserId] = useState('');
  const [ownersLoading, setOwnersLoading] = useState(false);
  const [ownerError, setOwnerError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSaving, setCreateSaving] = useState(false);
  const {
    rows, sideFilter, setSideFilter, catFilter, setCatFilter, statusFilter, setStatusFilter,
    openEdit, forceExpire, editId, editPrice, setEditPrice, editQuantity, setEditQuantity,
    editWeight, setEditWeight,
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

  useEffect(() => {
    if (!createOpen || !liveMode) return;
    let active = true;
    setCreateCategoriesLoading(true);
    void loadAllPages((page) => categoriesApi.list({ page, limit: 100 }))
      .then((result) => {
        if (!active) return;
        setCreateCategories(result);
        setCreateCategoryId(result[0]?.id ?? '');
      })
      .catch((error: unknown) => {
        if (active) setCreateError(error instanceof ApiError ? error.message : 'Could not load categories.');
      })
      .finally(() => {
        if (active) setCreateCategoriesLoading(false);
      });
    return () => { active = false; };
  }, [createOpen, liveMode]);

  useEffect(() => {
    if (!createOpen || !liveMode || !createCategoryId) {
      setCreateCommodities([]);
      setCreateQualities([]);
      setCreateCommodityId('');
      setCreateQualityId('');
      setCreateTaxonomyLoading(false);
      return;
    }
    let active = true;
    setCreateCommodities([]);
    setCreateQualities([]);
    setCreateCommodityId('');
    setCreateQualityId('');
    setCreateTaxonomyLoading(true);
    void Promise.all([
      loadAllPages((page) => commoditiesApi.list({ categoryId: createCategoryId, page, limit: 100 })),
      loadAllPages((page) => qualitiesApi.list({ categoryId: createCategoryId, page, limit: 100 })),
    ])
      .then(([commodities, qualities]) => {
        if (!active) return;
        setCreateCommodities(commodities);
        setCreateQualities(qualities);
        setCreateCommodityId(commodities[0]?.id ?? '');
        setCreateQualityId(qualities[0]?.id ?? '');
      })
      .catch((error: unknown) => {
        if (active) setCreateError(error instanceof ApiError ? error.message : 'Could not load category options.');
      })
      .finally(() => {
        if (active) setCreateTaxonomyLoading(false);
      });
    return () => { active = false; };
  }, [createOpen, liveMode, createCategoryId]);

  useEffect(() => {
    if (!createOpen || !liveMode) {
      setOwnersLoading(false);
      return;
    }
    let active = true;
    setOwnersLoading(true);
    setOwnerOptions([]);
    setOwnerError(null);
    const timer = window.setTimeout(() => {
      void listingOwnersApi.list({
        role: createSide === 'SELL' ? 'seller' : 'buyer',
        status: 'active',
        search: ownerSearch.trim() || undefined,
        page: ownerPage,
        limit: 20,
      })
        .then(({ data, meta }) => {
          if (!active) return;
          setOwnerOptions(data);
          setOwnerTotalPages(meta?.totalPages ?? 1);
        })
        .catch((error: unknown) => {
          if (active) {
            setOwnerOptions([]);
            setOwnerError(error instanceof ApiError ? error.message : 'Could not load listing owners.');
          }
        })
        .finally(() => {
          if (active) setOwnersLoading(false);
        });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [createOpen, liveMode, createSide, ownerSearch, ownerPage]);

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
  const selectedOwner = ownerOptions.find((owner) => owner.id === ownerUserId) ?? null;

  const openCreate = () => {
    setCreateSide('SELL');
    setCreateCategoryId('');
    setCreateCommodityId('');
    setCreateQualityId('');
    setCreateQuantity('');
    setCreateWeight('');
    setCreatePrice('');
    setCreatePaymentTerms('');
    setCreateNotes('');
    setOwnerSearch('');
    setOwnerPage(1);
    setOwnerOptions([]);
    setOwnerUserId('');
    setOwnerError(null);
    setCreateError(null);
    setCreateOpen(true);
  };

  const closeCreate = () => {
    setCreateOpen(false);
    setCreateError(null);
  };

  const submitCreate = async () => {
    const quantity = Number(createQuantity.trim());
    if (!ownerUserId) {
      setCreateError('Choose an active seller or buyer to own this listing.');
      return;
    }
    if (!createCategoryId || !createCommodityId || !createQualityId) {
      setCreateError('Choose a category, commodity, and quality.');
      return;
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      setCreateError('Quantity must be a positive whole number of bags.');
      return;
    }
    const listingFields = {
      ownerUserId,
      categoryId: createCategoryId,
      commodityId: createCommodityId,
      qualityId: createQualityId,
      quantityBags: quantity,
    };
    let body: ListingCreateBody;
    if (createSide === 'SELL') {
      const sellBody: Extract<ListingCreateBody, { side: 'SELL' }> = {
        ...listingFields,
        side: 'SELL',
      };
      if (createWeight.trim()) {
        const weight = Number(createWeight.trim());
        if (!Number.isInteger(weight) || weight <= 0) {
          setCreateError('Weight per bag must be a positive whole number of kilograms.');
          return;
        }
        sellBody.weightKg = weight;
      }
      if (createPrice.trim()) {
        const price = Number(createPrice.trim());
        if (!Number.isFinite(price) || price <= 0) {
          setCreateError('Price must be a positive amount, or leave it blank for open-to-offers.');
          return;
        }
        sellBody.price = price;
      }
      if (createPaymentTerms.trim()) {
        const terms = Number(createPaymentTerms.trim());
        if (!Number.isInteger(terms) || terms < 0) {
          setCreateError('Payment terms must be a whole number of days (0 means immediate payment).');
          return;
        }
        sellBody.paymentTerms = terms;
      } else if (selectedOwner?.defaultPaymentTerms == null) {
        setCreateError('Enter payment terms because this seller has no default payment terms.');
        return;
      }
      if (createNotes.trim()) sellBody.notes = createNotes.trim();
      body = sellBody;
    } else {
      body = { ...listingFields, side: 'BUY' };
    }

    setCreateSaving(true);
    setCreateError(null);
    try {
      await listingsApi.create(body);
      closeCreate();
      admin.flash(`Created ${createSide} ${createSide === 'BUY' ? 'requirement' : 'listing'} for ${selectedOwner?.firmName || selectedOwner?.name || 'the selected user'}`);
      await refreshListings(commodityFilter || undefined);
    } catch (error: unknown) {
      setCreateError(error instanceof ApiError ? error.message : 'Could not create listing.');
    } finally {
      setCreateSaving(false);
    }
  };

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
          {/* {liveMode ? (
            // <button className="btn btn-primary" onClick={openCreate} style={{ height: 34, padding: '0 14px', fontSize: 12.5 }}>
            //   Create listing
            // </button>
          ) : null} */}
          {liveMode
            ? `${listingTotal} rows · page ${listingPage} of ${Math.max(listingTotalPages, 1)}`
            : `${filtered.length} of ${rows.length} rows`}
        </div>
      </div>

      {listingsError ? <div className="field-error">{listingsError}</div> : null}
      {commoditiesError ? <div className="field-error">{commoditiesError}</div> : null}

      <div className="panel">
        <div className="table-scroll">
          <div className="grid-head" style={{ ...GRID, minWidth: 1200 }}>
            <div>SIDE</div><div>FIRM</div><div>CATEGORY</div><div>COMMODITY</div><div>BAGS</div><div>QUALITY</div><div>WEIGHT PER BAG</div><div>PRICE</div><div>STATUS · VALID</div><div style={{ justifySelf: 'end' }}>ACTION</div>
          </div>
          {filtered.map((r) => (
            <div key={r.id} className="grid-row" style={{ ...GRID, minWidth: 1200 }}>
              <div>
                <span className={`tag ${r.side === 'SELL' ? 'tag-accent' : 'tag-accent-2'}`} style={{ fontSize: 10, padding: '2px 8px' }}>{r.side}</span>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{r.firm}</div>
                <div className="text-muted" style={{ fontSize: 11 }}>{r.subEntity || '—'}</div>
              </div>
              <div className="text-muted">{r.category}</div>
              <div style={{ fontWeight: 600 }}>{r.item}</div>
              <div className="text-muted">{r.quantityBags == null ? '—' : r.quantityBags.toLocaleString('en-IN')}</div>
              <div className="text-muted">{r.quality}</div>
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
                <button className="btn btn-primary" onClick={() => openEdit(r.id)} style={{ height: 28, padding: '0 10px', fontSize: 11.5 }}>Edit</button>
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
          subtitle={`${editRow.item} · changes are audited automatically`}
          onClose={closeEdit}
          onSave={saveEdit}
          saveLabel="Save changes"
        >
          {editRow.side === 'BUY' ? (
            <Field label="Quantity (bags)" required>
              <input className="input" value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)} inputMode="numeric" />
            </Field>
          ) : (
            <>
              <div className="form-2col">
                <Field label="Price (₹)">
                  <input className="input" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} inputMode="decimal" placeholder="Blank = leave unchanged" />
                </Field>
                <Field label="Quantity (bags)">
                  <input className="input" value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)} inputMode="numeric" />
                </Field>
              </div>
              <Field label="Weight per bag (whole kg)">
                <input className="input" value={editWeight} onChange={(e) => setEditWeight(e.target.value)} />
              </Field>
            </>
          )}
          {!liveMode ? (
            <Field label="Reason for the edit">
              <input
                className="input"
                placeholder="Reason for the change"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
              />
            </Field>
          ) : null}
          {editError ? <div className="field-error">{editError}</div> : null}
          <div style={{ background: 'var(--color-accent-100)', borderRadius: 8, padding: '11px 14px', fontSize: 12, color: 'var(--color-accent-900)', lineHeight: 1.5 }}>
            {liveMode
              ? 'The backend records this change in the audit log.'
              : <>Recorded as <strong>Kunj Bihari (admin)</strong> edited {editRow.item} — before {editRow.price == null ? 'N/A' : inr(editRow.price)}, after ₹{editPrice || '—'}.</>}
          </div>
        </Modal>
      ) : null}
      {createOpen ? (
        <Modal
          title={createSide === 'SELL' ? 'Create a sell listing' : 'Create a buy requirement'}
          subtitle="The selected seller or buyer will own this listing. Admin-created changes are audited."
          onClose={closeCreate}
          onSave={submitCreate}
          saveLabel={createSaving ? 'Creating…' : 'Create listing'}
          saveDisabled={createSaving}
        >
          <Field label="Listing side" required>
            <select
              className="input"
              value={createSide}
              onChange={(event) => {
                setCreateSide(event.target.value as BackendListingSide);
                setOwnerUserId('');
                setOwnerOptions([]);
                setOwnerPage(1);
                setOwnerError(null);
              }}
            >
              <option value="SELL">SELL · seller offers stock</option>
              <option value="BUY">BUY · buyer requirement</option>
            </select>
          </Field>
          <Field label={`Active ${createSide === 'SELL' ? 'seller' : 'buyer'}`} required>
            <input
              className="input"
              value={ownerSearch}
              placeholder="Search by name, firm, or phone"
              onChange={(event) => {
                setOwnerSearch(event.target.value);
                setOwnerPage(1);
                setOwnerUserId('');
              }}
            />
            <select className="input" value={ownerUserId} onChange={(event) => setOwnerUserId(event.target.value)} disabled={ownersLoading}>
              <option value="">{ownersLoading ? 'Loading users…' : 'Choose an owner'}</option>
              {ownerOptions.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.firmName || owner.name || owner.phone} · {owner.phone}
                </option>
              ))}
            </select>
            {ownerError ? <div className="field-error" role="alert">{ownerError}</div> : null}
            {ownerTotalPages > 1 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={ownersLoading || ownerPage <= 1}
                  onClick={() => { setOwnerPage((page) => page - 1); setOwnerUserId(''); }}
                >
                  Previous
                </button>
                <span className="text-muted">Page {ownerPage} of {ownerTotalPages}</span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={ownersLoading || ownerPage >= ownerTotalPages}
                  onClick={() => { setOwnerPage((page) => page + 1); setOwnerUserId(''); }}
                >
                  Next
                </button>
              </div>
            ) : null}
            {selectedOwner && createSide === 'SELL' ? (
              <div className="text-muted" style={{ fontSize: 11.5 }}>
                Seller default payment terms: {selectedOwner.defaultPaymentTerms == null ? 'not set' : `${selectedOwner.defaultPaymentTerms} days`}.
              </div>
            ) : null}
          </Field>
          <div className="form-2col">
            <Field label="Category" required>
              <select
                className="input"
                value={createCategoryId}
                disabled={createCategoriesLoading || createCategories.length === 0}
                onChange={(event) => {
                  setCreateCategoryId(event.target.value);
                  setCreateCommodityId('');
                  setCreateQualityId('');
                }}
              >
                <option value="">{createCategoriesLoading ? 'Loading categories…' : 'Choose a category'}</option>
                {createCategories.map((category) => (
                  <option key={category.id} value={category.id} disabled={category.qualityCount === 0}>
                    {category.name}{category.qualityCount === 0 ? ' · no qualities' : ''}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Commodity" required>
              <select
                className="input"
                value={createCommodityId}
                disabled={createTaxonomyLoading || !createCommodities.length}
                onChange={(event) => setCreateCommodityId(event.target.value)}
              >
                <option value="">{createTaxonomyLoading ? 'Loading…' : 'Choose a commodity'}</option>
                {createCommodities.map((commodity) => (
                  <option key={commodity.id} value={commodity.id}>{commodity.name}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="form-2col">
            <Field label="Quality" required>
              <select
                className="input"
                value={createQualityId}
                disabled={createTaxonomyLoading || !createQualities.length}
                onChange={(event) => setCreateQualityId(event.target.value)}
              >
                <option value="">{createTaxonomyLoading ? 'Loading…' : 'Choose a quality'}</option>
                {createQualities.map((quality) => (
                  <option key={quality.id} value={quality.id}>{quality.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Quantity (bags)" required>
              <input className="input" value={createQuantity} onChange={(event) => setCreateQuantity(event.target.value)} inputMode="numeric" />
            </Field>
          </div>
          {createSide === 'SELL' ? (
            <>
              <div className="form-2col">
                <Field label="Weight per bag (kg)">
                  <input className="input" value={createWeight} onChange={(event) => setCreateWeight(event.target.value)} inputMode="numeric" />
                </Field>
                <Field label="Price (₹)">
                  <input className="input" value={createPrice} onChange={(event) => setCreatePrice(event.target.value)} inputMode="decimal" placeholder="Blank = open to offers" />
                </Field>
              </div>
              <div className="form-2col">
                <Field label="Payment terms (days)" required={selectedOwner?.defaultPaymentTerms == null}>
                  <input className="input" value={createPaymentTerms} onChange={(event) => setCreatePaymentTerms(event.target.value)} inputMode="numeric" placeholder={selectedOwner?.defaultPaymentTerms == null ? 'Required: seller has no default' : 'Blank = use seller default'} />
                </Field>
                <Field label="Notes">
                  <input className="input" value={createNotes} onChange={(event) => setCreateNotes(event.target.value)} />
                </Field>
              </div>
            </>
          ) : null}
          {createError ? <div className="field-error" role="alert">{createError}</div> : null}
        </Modal>
      ) : null}
    </>
  );
}
