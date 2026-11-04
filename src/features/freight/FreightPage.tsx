import { useEffect, useMemo, useState } from 'react';
import { EmptyState, Field, Modal, Pagination } from '../../components/common/controls';
import { FREIGHT_PAGE_SIZE, useAdmin } from '../../store/AdminContext';
import { freightPrice } from '../../utils/format';

const GRID: React.CSSProperties = {
  gridTemplateColumns:
    'minmax(0,1fr) minmax(0,1.2fr) minmax(0,.9fr) minmax(0,.9fr) minmax(0,.9fr) 150px',
};

export function FreightPage() {
  const admin = useAdmin();
  const {
    freightRoutes, freightLoading, freightError, freightPage, setFreightPage,
    freightTotal, freightTotalPages, refreshFreight, freightSearch, setFreightSearch,
    freightUploadPreview, freightUploadLoading, freightUploadError,
    commitFreightUpload, clearFreightUpload,
    freightStatusFilter, setFreightStatusFilter, publishPending,
    openFreightEdit, removeFreightRoute,
    freightEditId, freightEditLow, setFreightEditLow, freightEditHigh, setFreightEditHigh,
    freightEditCapacity, setFreightEditCapacity, freightEditError, closeFreightEdit, saveFreightEdit,
    newFreightOrigin, setNewFreightOrigin, newFreightDest, setNewFreightDest,
    newFreightLow, setNewFreightLow, newFreightHigh, setNewFreightHigh,
    newFreightCapacity, setNewFreightCapacity, newFreightError, setNewFreightError,
    addFreightRoute,
    searchQuery,
    liveMode,
  } = admin;

  const [addOpen, setAddOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);

  useEffect(() => {
    if (liveMode) void refreshFreight();
  }, [liveMode, refreshFreight]);

  useEffect(() => {
    setFreightPage(1);
  }, [freightSearch, freightStatusFilter, searchQuery, setFreightPage]);

  const openAdd = () => {
    setNewFreightError(null);
    setAddOpen(true);
  };

  const closeAdd = () => {
    if (addSaving) return;
    setAddOpen(false);
  };

  const submitAdd = async () => {
    setAddSaving(true);
    try {
      if (await addFreightRoute()) setAddOpen(false);
    } finally {
      setAddSaving(false);
    }
  };

  const pendingCount = freightRoutes.filter((r) => r.status === 'Pending review').length;

  const view = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const destinationQuery = freightSearch.trim().toLowerCase();
    return freightRoutes.filter(
      (r) =>
        (freightStatusFilter === 'All statuses' || r.status === freightStatusFilter) &&
        (liveMode || !destinationQuery || r.dest.toLowerCase().includes(destinationQuery)) &&
        (!q || r.dest.toLowerCase().includes(q) || r.origin.toLowerCase().includes(q)),
    );
  }, [freightRoutes, freightSearch, freightStatusFilter, searchQuery, liveMode]);

  const totalPages = liveMode
    ? Math.max(1, freightTotalPages)
    : Math.max(1, Math.ceil(view.length / FREIGHT_PAGE_SIZE));
  const visibleRoutes = liveMode
    ? view
    : view.slice((freightPage - 1) * FREIGHT_PAGE_SIZE, freightPage * FREIGHT_PAGE_SIZE);

  useEffect(() => {
    if (freightPage < 1 || freightPage > totalPages) setFreightPage(totalPages);
  }, [freightPage, setFreightPage, totalPages]);

  const editRow = freightRoutes.find((r) => r.id === freightEditId) ?? null;

  const confirmRemove = (id: number, label: string) => {
    if (window.confirm(`Remove route ${label}?`)) removeFreightRoute(id);
  };

  return (
    <>
      {pendingCount > 0 ? (
        <div className="callout-info" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <strong>{pendingCount} routes</strong> parsed from the latest upload are awaiting review before they go live.
          </div>
          <button className="btn btn-primary" onClick={publishPending} style={{ height: 34, padding: '0 16px', fontSize: 12.5 }}>
            Publish pending
          </button>
        </div>
      ) : null}

      <div className="panel filter-bar">
        <input
          className="input"
          type="search"
          placeholder="Search destination"
          aria-label="Search freight destinations"
          value={freightSearch}
          onChange={(event) => {
            setFreightSearch(event.target.value);
            setFreightPage(1);
          }}
          style={{ height: 34, width: 220, fontSize: 12.5 }}
        />
        <select
          className="input"
          value={freightStatusFilter}
          onChange={(e) => setFreightStatusFilter(e.target.value)}
          style={{ height: 34, width: 180, fontSize: 12.5 }}
        >
          <option>All statuses</option>
          <option>Published</option>
          {!liveMode ? <option>Pending review</option> : null}
          <option>Price expired</option>
        </select>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span className="text-muted" style={{ fontSize: 12 }}>
            Per quintal · same 2:00 AM expiry as commodity prices
          </span>
          <button
            className="btn btn-primary"
            onClick={openAdd}
            style={{ height: 34, padding: '0 16px', fontSize: 12.5, flex: 'none' }}
          >
            + Add route
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="table-scroll">
          <div className="grid-head" style={{ ...GRID, minWidth: 840 }}>
            <div>ORIGIN</div><div>DESTINATION</div><div>PRICE / QUINTAL</div><div>CAPACITY</div><div>STATUS</div><div />
          </div>
          {visibleRoutes.map((r) => (
            <div key={r.id} className="grid-row" style={{ ...GRID, minWidth: 840 }}>
              <div style={{ fontWeight: 600 }}>{r.origin}</div>
              <div>{r.dest}</div>
              <div style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{freightPrice(r.low, r.high)}</div>
              <div className="text-muted">{r.capacity || '—'}</div>
              <div>
                <span className={`tag ${r.status === 'Published' ? 'tag-accent' : 'tag-accent-2'}`} style={{ fontSize: 10, padding: '2px 8px' }}>
                  {r.status}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => openFreightEdit(r.id)} style={{ height: 28, padding: '0 10px', fontSize: 11.5 }}>Edit</button>
                <button className="btn btn-secondary" onClick={() => confirmRemove(r.id, `${r.origin} → ${r.dest}`)} style={{ height: 28, padding: '0 10px', fontSize: 11.5 }}>
                  Remove
                </button>
              </div>
            </div>
          ))}
          {freightLoading ? <div className="text-muted" style={{ padding: '18px 16px', fontSize: 13 }}>Loading freight routes…</div> : null}
          {freightError ? <div className="field-error" style={{ padding: '12px 16px' }}>{freightError}</div> : null}
          {view.length === 0 && !freightLoading && !freightError ? <EmptyState message="No freight routes match these filters." /> : null}
        </div>
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--color-neutral-200)' }}>
          <Pagination
            page={freightPage}
            totalPages={totalPages}
            total={liveMode ? freightTotal : view.length}
            pageSize={FREIGHT_PAGE_SIZE}
            onPageChange={setFreightPage}
            disabled={freightLoading}
          />
        </div>
      </div>

      {addOpen ? (
        <Modal
          title="Add transport route"
          subtitle="Published for every user"
          onClose={closeAdd}
          onSave={() => { void submitAdd(); }}
          saveLabel={addSaving ? 'Adding…' : 'Add route'}
          saveDisabled={addSaving}
        >
          <div className="form-3col">
            <Field label="Origin (state)" required>
              <input className="input" placeholder="e.g. Punjab" autoComplete="off" value={newFreightOrigin} onChange={(e) => setNewFreightOrigin(e.target.value)} required />
            </Field>
            <Field label="Destination" required>
              <input className="input" placeholder="e.g. Kandla Port" value={newFreightDest} onChange={(e) => setNewFreightDest(e.target.value)} />
            </Field>
            <Field label="Capacity">
              <input className="input" placeholder="e.g. 30-35 MT" value={newFreightCapacity} onChange={(e) => setNewFreightCapacity(e.target.value)} />
            </Field>
          </div>
          <div className="form-2col">
            <Field label="Price low (₹/quintal)" required>
              <input className="input" type="number" min="0" value={newFreightLow} onChange={(e) => setNewFreightLow(e.target.value)} />
            </Field>
            <Field label="Price high (leave blank for a single value)">
              <input className="input" type="number" min="0" value={newFreightHigh} onChange={(e) => setNewFreightHigh(e.target.value)} />
            </Field>
          </div>
          {newFreightError ? <div className="field-error">{newFreightError}</div> : null}
        </Modal>
      ) : null}

      {editRow ? (
        <Modal
          title="Edit route"
          subtitle={`${editRow.origin} → ${editRow.dest}`}
          onClose={closeFreightEdit}
          onSave={saveFreightEdit}
          saveLabel="Save"
        >
          <div className="form-2col">
            <Field label="Price low (₹)">
              <input className="input" type="number" min="0" value={freightEditLow} onChange={(e) => setFreightEditLow(e.target.value)} />
            </Field>
            <Field label="Price high (₹)">
              <input className="input" type="number" min="0" value={freightEditHigh} onChange={(e) => setFreightEditHigh(e.target.value)} />
            </Field>
          </div>
          <Field label="Truck capacity">
            <input className="input" value={freightEditCapacity} onChange={(e) => setFreightEditCapacity(e.target.value)} />
          </Field>
          {freightEditError ? <div className="field-error">{freightEditError}</div> : null}
        </Modal>
      ) : null}

      {freightUploadPreview ? (
        <Modal
          title="Review freight workbook"
          subtitle="This workbook will be applied in one step."
          onClose={clearFreightUpload}
          onSave={() => { void commitFreightUpload(); }}
          saveLabel={freightUploadLoading ? 'Importing…' : 'Import workbook'}
          saveDisabled={freightUploadLoading || !freightUploadPreview.summary.canCommit}
        >
          <div className="text-muted" style={{ fontSize: 13 }}>
            {freightUploadPreview.summary.totalRows} rows · {freightUploadPreview.summary.toCreate} new · {freightUploadPreview.summary.toUpdate} updates · {freightUploadPreview.summary.invalidRows} invalid
          </div>
          {freightUploadPreview.rows.filter((row) => !row.valid).map((row) => (
            <div key={row.rowNumber} className="field-error">
              Row {row.rowNumber}: {row.errors.join(', ')}
            </div>
          ))}
          {freightUploadError ? <div className="field-error">{freightUploadError}</div> : null}
          {freightUploadLoading ? <div className="text-muted">Checking workbook…</div> : null}
        </Modal>
      ) : freightUploadLoading || freightUploadError ? (
        <Modal
          title="Upload freight workbook"
          onClose={clearFreightUpload}
          onSave={clearFreightUpload}
          saveLabel="Close"
          saveDisabled={freightUploadLoading}
        >
          {freightUploadLoading ? <div className="text-muted">Checking workbook…</div> : null}
          {freightUploadError ? <div className="field-error">{freightUploadError}</div> : null}
        </Modal>
      ) : null}
    </>
  );
}
