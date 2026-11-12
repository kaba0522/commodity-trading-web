import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Field, FilterTag } from '../../components/common/controls';
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
  type BackendListingSide,
  type BackendQuality,
  type BulkConfirmListingRow,
  type BulkConfirmListingsResult,
  type BulkNameSuggestion,
  type BulkUploadResult,
  type BulkUploadRow,
  type ListingCreateBody,
} from '../../services/backend';
import { useAdmin } from '../../store/AdminContext';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
/** Messages the preview emits for a taxonomy cell; cleared once the user picks a value. */
const TAXONOMY_ERROR_HINTS = ['not found', 'quality is required', 'can be matched only after'];

type Tab = 'add' | 'bulk';
type RowFilter = 'all' | 'ready' | 'review' | 'update';

interface RowTaxonomy {
  categoryId: string;
  commodityId: string;
  qualityId: string;
}

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

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isTaxonomyError(message: string) {
  const lower = message.toLowerCase();
  return TAXONOMY_ERROR_HINTS.some((hint) => lower.includes(hint));
}

function effectiveTaxonomy(row: BulkUploadRow, overrides: Record<number, RowTaxonomy>): RowTaxonomy {
  const override = overrides[row.rowIndex];
  if (override) return override;
  return {
    categoryId: row.resolved.categoryId ?? '',
    commodityId: row.resolved.commodityId ?? '',
    qualityId: row.resolved.qualityId ?? '',
  };
}

/**
 * A row can be confirmed once all three taxonomy ids are present and the only
 * remaining preview errors are the taxonomy ones the user just resolved.
 */
function isConfirmable(row: BulkUploadRow, overrides: Record<number, RowTaxonomy>) {
  const ids = effectiveTaxonomy(row, overrides);
  if (!ids.categoryId || !ids.commodityId || !ids.qualityId) return false;
  return row.errors.every(isTaxonomyError);
}

function rawValue(row: BulkUploadRow, key: string) {
  const value = row.raw[key];
  if (value === undefined || value === null || value === '') return '—';
  return String(value);
}

function ownerLabel(owner: BackendListingOwner | null) {
  if (!owner) return 'No owner selected';
  return owner.firmName || owner.name || owner.phone;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="form-section-title">{children}</div>;
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function OwnerPicker({
  side,
  value,
  onChange,
  onSelect,
}: {
  side: BackendListingSide;
  value: string;
  onChange: (ownerUserId: string, owner: BackendListingOwner | null) => void;
  onSelect?: (owner: BackendListingOwner | null) => void;
}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [options, setOptions] = useState<BackendListingOwner[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const timer = window.setTimeout(() => {
      void listingOwnersApi
        .list({
          role: side === 'SELL' ? 'seller' : 'buyer',
          status: 'active',
          search: search.trim() || undefined,
          page,
          limit: 20,
        })
        .then(({ data, meta }) => {
          if (!active) return;
          setOptions(data);
          setTotalPages(meta?.totalPages ?? 1);
        })
        .catch((err: unknown) => {
          if (!active) return;
          setOptions([]);
          setError(errorMessage(err, 'Could not load users.'));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [side, search, page]);

  const clearSelection = () => {
    onChange('', null);
    onSelect?.(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input
        className="input"
        value={search}
        placeholder={`Search active ${side === 'SELL' ? 'sellers' : 'buyers'} by name, firm, or phone`}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
          clearSelection();
        }}
      />
      <select
        className="input"
        value={value}
        onChange={(event) => {
          const id = event.target.value;
          const owner = options.find((candidate) => candidate.id === id) ?? null;
          onChange(id, owner);
          onSelect?.(owner);
        }}
        disabled={loading}
      >
        <option value="">{loading ? 'Loading users…' : 'Choose an owner'}</option>
        {options.map((owner) => (
          <option key={owner.id} value={owner.id}>
            {owner.firmName || owner.name || owner.phone} · {owner.phone}
          </option>
        ))}
      </select>
      {error ? <div className="field-error" role="alert">{error}</div> : null}
      {totalPages > 1 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={loading || page <= 1}
            onClick={() => {
              setPage((current) => current - 1);
              clearSelection();
            }}
          >
            Previous
          </button>
          <span className="text-muted">Page {page} of {totalPages}</span>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={loading || page >= totalPages}
            onClick={() => {
              setPage((current) => current + 1);
              clearSelection();
            }}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function BulkListingsPage() {
  const admin = useAdmin();
  const { liveMode } = admin;

  const [tab, setTab] = useState<Tab>('add');

  /* ----- shared taxonomy (category -> commodity -> quality) ----- */
  const [categories, setCategories] = useState<BackendCategory[]>([]);
  const [commodities, setCommodities] = useState<BackendCommodity[]>([]);
  const [qualities, setQualities] = useState<BackendQuality[]>([]);
  const [taxonomyLoading, setTaxonomyLoading] = useState(false);
  const [taxonomyError, setTaxonomyError] = useState<string | null>(null);

  useEffect(() => {
    if (!liveMode) return;
    let active = true;
    setTaxonomyLoading(true);
    setTaxonomyError(null);
    void Promise.all([
      loadAllPages((page) => categoriesApi.list({ page, limit: 100 })),
      loadAllPages((page) => commoditiesApi.list({ page, limit: 100 })),
      loadAllPages((page) => qualitiesApi.list({ page, limit: 100 })),
    ])
      .then(([categoryRows, commodityRows, qualityRows]) => {
        if (!active) return;
        setCategories(categoryRows);
        setCommodities(commodityRows);
        setQualities(qualityRows);
      })
      .catch((error: unknown) => {
        if (active) setTaxonomyError(errorMessage(error, 'Could not load the commodity taxonomy.'));
      })
      .finally(() => {
        if (active) setTaxonomyLoading(false);
      });
    return () => {
      active = false;
    };
  }, [liveMode]);

  /* ----- add one listing ----- */
  const [addSide, setAddSide] = useState<BackendListingSide>('SELL');
  const [addOwnerId, setAddOwnerId] = useState('');
  const [addOwner, setAddOwner] = useState<BackendListingOwner | null>(null);
  const [addCategoryId, setAddCategoryId] = useState('');
  const [addCommodityId, setAddCommodityId] = useState('');
  const [addQualityId, setAddQualityId] = useState('');
  const [addQuantity, setAddQuantity] = useState('');
  const [addWeight, setAddWeight] = useState('');
  const [addPrice, setAddPrice] = useState('');
  const [addPaymentTerms, setAddPaymentTerms] = useState('');
  const [addNotes, setAddNotes] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const [addSaving, setAddSaving] = useState(false);

  const addCommodities = useMemo(
    () => commodities.filter((commodity) => commodity.categoryId === addCategoryId),
    [commodities, addCategoryId],
  );
  const addQualities = useMemo(
    () => qualities.filter((quality) => quality.commodityId === addCommodityId),
    [qualities, addCommodityId],
  );

  const resetAddForm = () => {
    setAddOwnerId('');
    setAddOwner(null);
    setAddCategoryId('');
    setAddCommodityId('');
    setAddQualityId('');
    setAddQuantity('');
    setAddWeight('');
    setAddPrice('');
    setAddPaymentTerms('');
    setAddNotes('');
    setAddError(null);
    setAddSuccess(null);
  };

  const changeAddSide = (next: BackendListingSide) => {
    setAddSide(next);
    setAddOwnerId('');
    setAddOwner(null);
    setAddCommodityId('');
    setAddQualityId('');
    setAddError(null);
    setAddSuccess(null);
  };

  const submitAdd = async () => {
    setAddError(null);
    setAddSuccess(null);
    if (!addOwnerId) {
      setAddError('Choose an active seller or buyer to own this listing.');
      return;
    }
    if (!addCategoryId || !addCommodityId || !addQualityId) {
      setAddError('Choose a category, commodity, and quality.');
      return;
    }
    const quantity = Number(addQuantity.trim());
    if (!Number.isInteger(quantity) || quantity <= 0) {
      setAddError('Quantity must be a positive whole number of bags.');
      return;
    }
    const base = {
      ownerUserId: addOwnerId,
      categoryId: addCategoryId,
      commodityId: addCommodityId,
      qualityId: addQualityId,
      quantityBags: quantity,
    };

    let body: ListingCreateBody;
    if (addSide === 'BUY') {
      body = { ...base, side: 'BUY' };
    } else {
      const sellBody: Extract<ListingCreateBody, { side: 'SELL' }> = { ...base, side: 'SELL' };
      if (addWeight.trim()) {
        const weight = Number(addWeight.trim());
        if (!Number.isInteger(weight) || weight <= 0) {
          setAddError('Weight per bag must be a positive whole number of kilograms.');
          return;
        }
        sellBody.weightKg = weight;
      }
      if (addPrice.trim()) {
        const price = Number(addPrice.trim());
        if (!Number.isFinite(price) || price < 0) {
          setAddError('Price must be zero or more, or leave it blank for open-to-offers.');
          return;
        }
        sellBody.price = price;
      }
      if (addPaymentTerms.trim()) {
        const terms = Number(addPaymentTerms.trim());
        if (!Number.isInteger(terms) || terms < 0) {
          setAddError('Payment terms must be a whole number of days (0 means immediate payment).');
          return;
        }
        sellBody.paymentTerms = terms;
      }
      if (addNotes.trim()) sellBody.notes = addNotes.trim();
      body = sellBody;
    }

    setAddSaving(true);
    try {
      await listingsApi.create(body);
      const createdFor = addOwner ? ownerLabel(addOwner) : 'the selected owner';
      admin.flash(`Created ${addSide} ${addSide === 'BUY' ? 'requirement' : 'listing'}.`);
      setAddSuccess(
        `Created a ${addSide === 'SELL' ? 'sell listing' : 'buy requirement'} for ${createdFor}.`,
      );
      setAddQuantity('');
      setAddWeight('');
      setAddPrice('');
      setAddPaymentTerms('');
      setAddNotes('');
      await admin.refreshListings();
    } catch (error: unknown) {
      setAddError(errorMessage(error, 'Could not create listing.'));
    } finally {
      setAddSaving(false);
    }
  };

  /* ----- bulk upload + preview + confirm ----- */
  const [bulkSide, setBulkSide] = useState<BackendListingSide>('SELL');
  const [bulkOwnerId, setBulkOwnerId] = useState('');
  const [bulkOwner, setBulkOwner] = useState<BackendListingOwner | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [preview, setPreview] = useState<BulkUploadResult | null>(null);
  const [overrides, setOverrides] = useState<Record<number, RowTaxonomy>>({});
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [rowFilter, setRowFilter] = useState<RowFilter>('all');
  const [rowSearch, setRowSearch] = useState('');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmResult, setConfirmResult] = useState<BulkConfirmListingsResult | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const clearBulk = () => {
    setUploadFile(null);
    setPreview(null);
    setOverrides({});
    setSelected(new Set());
    setRowFilter('all');
    setRowSearch('');
    setConfirmResult(null);
    setConfirmError(null);
    setUploadError(null);
    setDragActive(false);
    if (fileInput.current) fileInput.current.value = '';
  };

  const changeBulkSide = (next: BackendListingSide) => {
    setBulkSide(next);
    setBulkOwnerId('');
    setBulkOwner(null);
    setTemplateError(null);
    clearBulk();
  };

  const changeBulkOwner = (id: string, owner: BackendListingOwner | null) => {
    setBulkOwnerId(id);
    setBulkOwner(owner);
    // A preview belongs to the owner it was parsed for — changing the owner
    // invalidates it, but the chosen file stays so it can be re-uploaded.
    if (preview) {
      setPreview(null);
      setOverrides({});
      setSelected(new Set());
      setConfirmResult(null);
      setConfirmError(null);
    }
  };

  const downloadTemplate = async () => {
    setTemplateLoading(true);
    setTemplateError(null);
    try {
      const blob = await listingsApi.downloadTemplate(bulkSide);
      saveBlob(
        blob,
        bulkSide === 'BUY' ? 'requirement-bulk-template.xlsx' : 'listing-bulk-template.xlsx',
      );
      admin.flash('Template downloaded.');
    } catch (error: unknown) {
      setTemplateError(errorMessage(error, 'Could not download the template.'));
    } finally {
      setTemplateLoading(false);
    }
  };

  const pickFile = (file: File | null) => {
    setUploadError(null);
    setConfirmResult(null);
    setPreview(null);
    setOverrides({});
    setSelected(new Set());
    if (!file) {
      setUploadFile(null);
      return;
    }
    if (!/\.xlsx$/i.test(file.name)) {
      setUploadFile(null);
      setUploadError('Only .xlsx files are allowed.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadFile(null);
      setUploadError('This file is larger than the 5MB limit.');
      return;
    }
    setUploadFile(file);
  };

  const uploadWorkbook = async () => {
    if (!bulkOwnerId) {
      setUploadError(`Choose an active ${bulkSide === 'SELL' ? 'seller' : 'buyer'} to own this sheet.`);
      return;
    }
    if (!uploadFile) {
      setUploadError('Choose a filled-in .xlsx template first.');
      return;
    }
    setUploadLoading(true);
    setUploadError(null);
    setConfirmResult(null);
    setConfirmError(null);
    try {
      const result = await listingsApi.bulkUpload(uploadFile, bulkSide, bulkOwnerId);
      setPreview(result);
      setOverrides({});
      setSelected(new Set(result.rows.filter((row) => isConfirmable(row, {})).map((row) => row.rowIndex)));
      setRowFilter('all');
      setRowSearch('');
      admin.flash(`Parsed ${result.summary.totalRows} rows — ${result.summary.readyRows} ready.`);
    } catch (error: unknown) {
      setUploadError(errorMessage(error, 'Could not parse this workbook.'));
    } finally {
      setUploadLoading(false);
    }
  };

  const changeRowTaxonomy = (row: BulkUploadRow, patch: Partial<RowTaxonomy>) => {
    const current = effectiveTaxonomy(row, overrides);
    const nextOverrides = {
      ...overrides,
      [row.rowIndex]: { ...current, ...patch },
    };
    setOverrides(nextOverrides);
    setSelected((previous) => {
      const next = new Set(previous);
      if (isConfirmable(row, nextOverrides)) next.add(row.rowIndex);
      else next.delete(row.rowIndex);
      return next;
    });
  };

  const useCategorySuggestion = (row: BulkUploadRow, suggestion: BulkNameSuggestion) => {
    changeRowTaxonomy(row, { categoryId: suggestion.id, commodityId: '', qualityId: '' });
  };

  const useCommoditySuggestion = (row: BulkUploadRow, suggestion: BulkNameSuggestion) => {
    const commodity = commodities.find((candidate) => candidate.id === suggestion.id);
    changeRowTaxonomy(row, {
      categoryId: commodity?.categoryId ?? effectiveTaxonomy(row, overrides).categoryId,
      commodityId: suggestion.id,
      qualityId: '',
    });
  };

  const useQualitySuggestion = (row: BulkUploadRow, suggestion: BulkNameSuggestion) => {
    const quality = qualities.find((candidate) => candidate.id === suggestion.id);
    const current = effectiveTaxonomy(row, overrides);
    const commodityId = quality?.commodityId ?? current.commodityId;
    changeRowTaxonomy(row, {
      categoryId: quality?.commodity?.categoryId ?? current.categoryId,
      commodityId,
      qualityId: suggestion.id,
    });
  };

  const toggleRow = (row: BulkUploadRow) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(row.rowIndex)) next.delete(row.rowIndex);
      else next.add(row.rowIndex);
      return next;
    });
  };

  const confirmImport = async () => {
    if (!preview) return;
    if (selected.size === 0) {
      setConfirmError('Select at least one row to confirm.');
      return;
    }

    const rows: BulkConfirmListingRow[] = [];
    for (const row of preview.rows) {
      if (!selected.has(row.rowIndex) || !isConfirmable(row, overrides)) continue;
      const ids = effectiveTaxonomy(row, overrides);
      const quantityBags = row.resolved.quantityBags;
      if (!ids.categoryId || !ids.commodityId || !ids.qualityId || quantityBags == null) continue;
      const body: BulkConfirmListingRow = {
        rowIndex: row.rowIndex,
        categoryId: ids.categoryId,
        commodityId: ids.commodityId,
        qualityId: ids.qualityId,
        quantityBags,
      };
      if (preview.side === 'SELL') {
        body.weightKg = row.resolved.weightKg ?? null;
        body.price = row.resolved.price ?? null;
        body.paymentTerms = row.resolved.paymentTerms ?? null;
        body.notes = row.resolved.notes ?? null;
        body.moisture = row.resolved.moisture ?? null;
        body.color = row.resolved.color ?? null;
        body.size = row.resolved.size ?? null;
      }
      rows.push(body);
    }

    if (rows.length === 0) {
      setConfirmError('None of the selected rows has a complete category, commodity, quality, and quantity.');
      return;
    }

    setConfirmLoading(true);
    setConfirmError(null);
    try {
      const result = await listingsApi.bulkConfirm(rows, preview.side, preview.ownerUserId);
      setConfirmResult(result);
      admin.flash(
        `Bulk import: ${result.created.length} created · ${result.updated.length} updated · ${result.failed.length} failed.`,
      );
      await admin.refreshListings();
    } catch (error: unknown) {
      setConfirmError(errorMessage(error, 'Could not confirm these rows.'));
    } finally {
      setConfirmLoading(false);
    }
  };

  const readyCount = useMemo(
    () => (preview ? preview.rows.filter((row) => isConfirmable(row, overrides)).length : 0),
    [preview, overrides],
  );
  const updateCount = useMemo(
    () => (preview ? preview.rows.filter((row) => Boolean(row.willUpdateExisting)).length : 0),
    [preview],
  );
  const reviewCount = preview ? preview.summary.totalRows - readyCount : 0;

  const visibleRows = useMemo(() => {
    if (!preview) return [];
    const query = rowSearch.trim().toLowerCase();
    return preview.rows.filter((row) => {
      const confirmable = isConfirmable(row, overrides);
      if (rowFilter === 'ready' && !confirmable) return false;
      if (rowFilter === 'review' && confirmable) return false;
      if (rowFilter === 'update' && !row.willUpdateExisting) return false;
      if (!query) return true;
      return Object.values(row.raw).some((value) =>
        String(value ?? '').toLowerCase().includes(query),
      );
    });
  }, [preview, overrides, rowFilter, rowSearch]);

  const selectedCount = preview
    ? preview.rows.filter((row) => selected.has(row.rowIndex) && isConfirmable(row, overrides)).length
    : 0;

  const selectAllImportable = () => {
    if (!preview) return;
    setSelected(
      new Set(
        preview.rows
          .filter((row) => isConfirmable(row, overrides))
          .map((row) => row.rowIndex),
      ),
    );
  };

  useEffect(() => {
    if (preview) previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [preview]);

  useEffect(() => {
    if (confirmResult) resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [confirmResult]);

  const stageIndex = confirmResult ? 3 : preview ? 2 : uploadFile ? 1 : 0;
  const steps = ['Download template', 'Upload sheet', 'Review rows', 'Confirm import'];

  return (
    <>
      <div className="panel tools-tabs">
        <div
          className="tools-tablist"
          role="tablist"
          aria-label="Listing tools"
          onKeyDown={(event) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const next: Tab = event.key === 'ArrowLeft' || event.key === 'Home' ? 'add' : 'bulk';
            setTab(next);
            document.getElementById(next === 'add' ? 'tab-add' : 'tab-bulk')?.focus();
          }}
        >
          <button
            type="button"
            role="tab"
            id="tab-add"
            aria-selected={tab === 'add'}
            aria-controls="panel-add"
            tabIndex={tab === 'add' ? 0 : -1}
            className={`tools-tab${tab === 'add' ? ' tools-tab-active' : ''}`}
            onClick={() => setTab('add')}
          >
            <span className="tools-tab-icon"><PlusIcon /></span>
            <span className="tools-tab-body">
              <span className="tools-tab-title">Add listing</span>
              <span className="tools-tab-desc">Create one sell listing or buy requirement</span>
            </span>
          </button>
          <button
            type="button"
            role="tab"
            id="tab-bulk"
            aria-selected={tab === 'bulk'}
            aria-controls="panel-bulk"
            tabIndex={tab === 'bulk' ? 0 : -1}
            className={`tools-tab${tab === 'bulk' ? ' tools-tab-active' : ''}`}
            onClick={() => setTab('bulk')}
          >
            <span className="tools-tab-icon"><UploadIcon /></span>
            <span className="tools-tab-body">
              <span className="tools-tab-title">Bulk listing</span>
              <span className="tools-tab-desc">Import many rows from an Excel template</span>
            </span>
          </button>
        </div>
      </div>

      {!liveMode ? (
        <div className="callout-info">
          This screen talks to the live listings service. Connect the backend
          (<code>VITE_API_BASE_URL</code>) and sign in as an admin to use it.
        </div>
      ) : null}

      {taxonomyError ? <div className="field-error">{taxonomyError}</div> : null}

      {tab === 'add' ? (
        <div
          className="panel panel-pad"
          id="panel-add"
          role="tabpanel"
          aria-labelledby="tab-add"
          style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
        >
          <SectionTitle>Ownership</SectionTitle>
          <div className="form-2col">
            <Field label="Listing side" required>
              <select
                className="input"
                value={addSide}
                onChange={(event) => changeAddSide(event.target.value as BackendListingSide)}
              >
                <option value="SELL">SELL · seller offers stock</option>
                <option value="BUY">BUY · buyer requirement</option>
              </select>
            </Field>
            <Field label={`Active ${addSide === 'SELL' ? 'seller' : 'buyer'}`} required>
              <OwnerPicker
                key={addSide}
                side={addSide}
                value={addOwnerId}
                onChange={(id) => {
                  setAddOwnerId(id);
                  setAddSuccess(null);
                }}
                onSelect={setAddOwner}
              />
            </Field>
          </div>
          {addSide === 'SELL' && addOwner ? (
            <div className="text-muted" style={{ fontSize: 11.5, marginTop: -8 }}>
              Seller default payment terms:{' '}
              {addOwner.defaultPaymentTerms == null
                ? 'not set — enter terms below'
                : `${addOwner.defaultPaymentTerms} days`}.
            </div>
          ) : null}

          <SectionTitle>Commodity</SectionTitle>
          <div className="form-3col">
            <Field label="Category" required>
              <select
                className="input"
                value={addCategoryId}
                disabled={taxonomyLoading}
                onChange={(event) => {
                  setAddCategoryId(event.target.value);
                  setAddCommodityId('');
                  setAddQualityId('');
                }}
              >
                <option value="">{taxonomyLoading ? 'Loading categories…' : 'Choose a category'}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Commodity" required>
              <select
                className="input"
                value={addCommodityId}
                disabled={!addCategoryId || addCommodities.length === 0}
                onChange={(event) => {
                  setAddCommodityId(event.target.value);
                  setAddQualityId('');
                }}
              >
                <option value="">Choose a commodity</option>
                {addCommodities.map((commodity) => (
                  <option key={commodity.id} value={commodity.id}>{commodity.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Quality" required>
              <select
                className="input"
                value={addQualityId}
                disabled={!addCommodityId || addQualities.length === 0}
                onChange={(event) => setAddQualityId(event.target.value)}
              >
                <option value="">{addCommodityId ? 'Choose a quality' : 'Choose a commodity first'}</option>
                {addQualities.map((quality) => (
                  <option key={quality.id} value={quality.id}>{quality.name}</option>
                ))}
              </select>
            </Field>
          </div>

          <SectionTitle>Listing details</SectionTitle>
          <div className="form-2col">
            <Field label="Quantity (bags)" required>
              <input
                className="input"
                value={addQuantity}
                onChange={(event) => setAddQuantity(event.target.value)}
                inputMode="numeric"
              />
            </Field>
            {addSide === 'SELL' ? (
              <Field label="Weight per bag (kg)">
                <input
                  className="input"
                  value={addWeight}
                  onChange={(event) => setAddWeight(event.target.value)}
                  inputMode="numeric"
                />
              </Field>
            ) : (
              <div />
            )}
          </div>

          {addSide === 'SELL' ? (
            <>
              <div className="form-2col">
                <Field label="Price (₹)">
                  <input
                    className="input"
                    value={addPrice}
                    onChange={(event) => setAddPrice(event.target.value)}
                    inputMode="decimal"
                    placeholder="Blank = open to offers"
                  />
                </Field>
                <Field label="Payment terms (days)">
                  <input
                    className="input"
                    value={addPaymentTerms}
                    onChange={(event) => setAddPaymentTerms(event.target.value)}
                    inputMode="numeric"
                    placeholder="Blank = use the seller's profile default"
                  />
                </Field>
              </div>
              <Field label="Notes">
                <input
                  className="input"
                  value={addNotes}
                  onChange={(event) => setAddNotes(event.target.value)}
                />
              </Field>
            </>
          ) : null}

          {addSuccess ? (
            <div className="callout-info" role="status" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ flex: 1 }}>{addSuccess}</span>
              <Link
                to="/listings"
                className="btn btn-secondary"
                style={{ height: 30, padding: '0 12px', fontSize: 12 }}
              >
                View listings
              </Link>
            </div>
          ) : null}
          {addError ? <div className="field-error" role="alert">{addError}</div> : null}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              className="btn btn-secondary"
              onClick={resetAddForm}
              disabled={addSaving}
              style={{ height: 36, padding: '0 16px', fontSize: 13 }}
            >
              Reset
            </button>
            <button
              className="btn btn-primary"
              onClick={() => { void submitAdd(); }}
              disabled={addSaving || !liveMode}
              style={{ height: 36, padding: '0 18px', fontSize: 13 }}
            >
              {addSaving ? 'Creating…' : `Create ${addSide === 'SELL' ? 'listing' : 'requirement'}`}
            </button>
          </div>
        </div>
      ) : (
        <div
          id="panel-bulk"
          role="tabpanel"
          aria-labelledby="tab-bulk"
          style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          <div className="step-row" aria-label="Bulk upload progress">
            {steps.map((step, index) => (
              <div
                key={step}
                className={`step${index === stageIndex ? ' step-active' : index < stageIndex ? ' step-done' : ''}`}
                aria-current={index === stageIndex ? 'step' : undefined}
              >
                <span className="step-num">{index < stageIndex ? '✓' : index + 1}</span>
                {step}
              </div>
            ))}
          </div>

          <div className="panel panel-pad" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="form-2col">
              <Field label="Sheet side" required>
                <select
                  className="input"
                  value={bulkSide}
                  onChange={(event) => changeBulkSide(event.target.value as BackendListingSide)}
                >
                  <option value="SELL">SELL · listing template (11 columns)</option>
                  <option value="BUY">BUY · requirement template (4 columns)</option>
                </select>
              </Field>
              <Field label={`Active ${bulkSide === 'SELL' ? 'seller' : 'buyer'}`} required>
                <OwnerPicker
                  key={bulkSide}
                  side={bulkSide}
                  value={bulkOwnerId}
                  onChange={changeBulkOwner}
                  onSelect={setBulkOwner}
                />
              </Field>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <SectionTitle>1 · Get the template</SectionTitle>
              <div>
                <button
                  className="btn btn-secondary"
                  onClick={() => { void downloadTemplate(); }}
                  disabled={templateLoading || !liveMode}
                  style={{ height: 36, padding: '0 16px', fontSize: 13 }}
                >
                  {templateLoading
                    ? 'Downloading…'
                    : `Download ${bulkSide === 'BUY' ? 'requirement' : 'listing'} template (.xlsx)`}
                </button>
              </div>
              {templateError ? <div className="field-error" role="alert">{templateError}</div> : null}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <SectionTitle>2 · Upload the filled sheet</SectionTitle>
              <input
                ref={fileInput}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                hidden
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0] ?? null;
                  event.currentTarget.value = '';
                  pickFile(file);
                }}
              />
              <div
                className={`dropzone${dragActive ? ' dropzone-active' : ''}`}
                role="button"
                tabIndex={0}
                aria-label="Choose or drop an .xlsx template"
                onClick={() => fileInput.current?.click()}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    fileInput.current?.click();
                  }
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragActive(false);
                  pickFile(event.dataTransfer.files?.[0] ?? null);
                }}
              >
                {uploadFile ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <span className="tag tag-accent" style={{ fontSize: 10, padding: '2px 8px' }}>.xlsx</span>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{uploadFile.name}</span>
                    <span className="text-muted" style={{ fontSize: 12 }}>{formatFileSize(uploadFile.size)}</span>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={(event) => {
                        event.stopPropagation();
                        pickFile(null);
                      }}
                      style={{ height: 26, padding: '0 10px', fontSize: 11.5 }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="dropzone-title">Drag &amp; drop the filled-in template here</div>
                    <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>
                      or click to browse · .xlsx only · 5MB max
                    </div>
                  </>
                )}
              </div>

              {uploadError ? <div className="field-error" role="alert">{uploadError}</div> : null}

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span className="text-muted" style={{ fontSize: 12 }}>
                  {!bulkOwnerId
                    ? 'Choose the owner above before uploading.'
                    : uploadFile
                      ? `Ready to parse for ${ownerLabel(bulkOwner)}.`
                      : 'Choose the filled-in .xlsx file to continue.'}
                </span>
                <button
                  className="btn btn-primary"
                  onClick={() => { void uploadWorkbook(); }}
                  disabled={uploadLoading || !uploadFile || !bulkOwnerId || !liveMode}
                  style={{ height: 36, padding: '0 16px', fontSize: 13, marginLeft: 'auto' }}
                >
                  {uploadLoading ? 'Parsing…' : 'Upload & preview'}
                </button>
              </div>
            </div>
          </div>

          {confirmError ? <div className="field-error" role="alert">{confirmError}</div> : null}

          {confirmResult ? (
            <div
              ref={resultRef}
              className="panel panel-pad"
              style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 700 }}>Import complete</div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Link
                    to="/listings"
                    className="btn btn-secondary"
                    style={{ height: 34, padding: '0 14px', fontSize: 12.5 }}
                  >
                    View listings
                  </Link>
                  <button
                    className="btn btn-primary"
                    onClick={clearBulk}
                    style={{ height: 34, padding: '0 14px', fontSize: 12.5 }}
                  >
                    Import another file
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className="tag tag-accent" style={{ fontSize: 11, padding: '3px 10px' }}>
                  {confirmResult.created.length} created
                </span>
                <span className="tag tag-accent-2" style={{ fontSize: 11, padding: '3px 10px' }}>
                  {confirmResult.updated.length} updated
                </span>
                <span className="tag tag-neutral" style={{ fontSize: 11, padding: '3px 10px' }}>
                  {confirmResult.failed.length} failed
                </span>
              </div>
              {confirmResult.failed.length > 0 ? (
                <ul className="field-error" style={{ margin: 0, paddingLeft: 18 }}>
                  {confirmResult.failed.map((failure) => (
                    <li key={failure.rowIndex}>Row {failure.rowIndex}: {failure.reason}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {preview ? (
            <div className="panel" ref={previewRef} style={{ scrollMarginTop: 16 }}>
              <div style={{
                padding: '12px 16px', borderBottom: '1px solid var(--color-neutral-200)',
                display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>
                    Review · {preview.side === 'SELL' ? 'sell listings' : 'buy requirements'}
                  </div>
                  <div className="text-muted" style={{ fontSize: 12 }}>
                    {ownerLabel(bulkOwner)}
                    {uploadFile ? ` · ${uploadFile.name}` : ''}
                  </div>
                </div>
                <span className="tag tag-neutral" style={{ fontSize: 10, padding: '2px 8px' }}>
                  {preview.summary.totalRows} rows
                </span>
                <span className="tag tag-accent" style={{ fontSize: 10, padding: '2px 8px' }}>
                  {readyCount} importable
                </span>
                <span className="tag tag-accent-2" style={{ fontSize: 10, padding: '2px 8px' }}>
                  {reviewCount} need review
                </span>
                <button
                  className="btn btn-secondary"
                  onClick={clearBulk}
                  disabled={confirmLoading}
                  style={{ height: 30, padding: '0 12px', fontSize: 12, marginLeft: 'auto' }}
                >
                  Change file
                </button>
              </div>

              <div style={{
                padding: '10px 16px', borderBottom: '1px solid var(--color-neutral-200)',
                display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
              }}>
                <input
                  className="input"
                  type="search"
                  value={rowSearch}
                  onChange={(event) => setRowSearch(event.target.value)}
                  placeholder="Search rows by item, category, or quality"
                  aria-label="Search preview rows"
                  style={{ height: 32, width: 260, fontSize: 12.5 }}
                />
                <FilterTag label="All" active={rowFilter === 'all'} onClick={() => setRowFilter('all')} />
                <FilterTag label="Importable" active={rowFilter === 'ready'} onClick={() => setRowFilter('ready')} />
                <FilterTag label="Needs review" active={rowFilter === 'review'} onClick={() => setRowFilter('review')} />
                <FilterTag
                  label={`Will update${updateCount ? ` (${updateCount})` : ''}`}
                  active={rowFilter === 'update'}
                  onClick={() => setRowFilter('update')}
                />
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={selectAllImportable}
                    disabled={readyCount === 0}
                    style={{ height: 30, padding: '0 12px', fontSize: 12 }}
                  >
                    Select all importable
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setSelected(new Set())}
                    disabled={selectedCount === 0}
                    style={{ height: 30, padding: '0 12px', fontSize: 12 }}
                  >
                    Clear selection
                  </button>
                </div>
              </div>

              <div style={{ maxHeight: 520, overflowY: 'auto' }}>
                {visibleRows.length === 0 ? (
                  <div className="text-muted" style={{ padding: '22px 16px', fontSize: 13 }}>
                    {preview.rows.length === 0
                      ? 'This workbook has no data rows.'
                      : 'No rows match this filter.'}
                  </div>
                ) : null}
                {visibleRows.map((row) => {
                  const ids = effectiveTaxonomy(row, overrides);
                  const confirmable = isConfirmable(row, overrides);
                  const needsResolution =
                    row.resolved.categoryMatch !== 'exact' ||
                    row.resolved.commodityMatch !== 'exact' ||
                    row.resolved.qualityMatch !== 'exact';
                  const rowCommodities = commodities.filter((commodity) => commodity.categoryId === ids.categoryId);
                  const rowQualities = qualities.filter((quality) => quality.commodityId === ids.commodityId);
                  const blockingErrors = row.errors.filter(
                    (message) => !(confirmable && isTaxonomyError(message)),
                  );
                  const hasFieldError = blockingErrors.some((message) => !isTaxonomyError(message));
                  const itemLabel = row.resolved.itemName
                    ?? (rawValue(row, 'commodity') === '—' ? 'Commodity not matched' : rawValue(row, 'commodity'));
                  const qualityLabel = row.resolved.quality
                    ?? (rawValue(row, 'quality') === '—' ? 'Quality not matched' : rawValue(row, 'quality'));
                  return (
                    <div
                      key={row.rowIndex}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--color-neutral-200)',
                        display: 'flex',
                        gap: 12,
                        alignItems: 'flex-start',
                        background: selected.has(row.rowIndex) ? 'var(--color-accent-2-100)' : undefined,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(row.rowIndex)}
                        disabled={!confirmable}
                        onChange={() => toggleRow(row)}
                        aria-label={`Include row ${row.rowIndex}`}
                        title={
                          confirmable
                            ? 'Include this row in the import'
                            : 'Resolve the row errors before including it'
                        }
                        style={{ marginTop: 3 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: 13 }}>Row {row.rowIndex}</strong>
                          <span className={`tag ${confirmable ? 'tag-accent' : 'tag-neutral'}`} style={{ fontSize: 10, padding: '2px 8px' }}>
                            {confirmable ? (row.ready ? 'Ready' : 'Resolved manually') : 'Needs review'}
                          </span>
                          {row.willUpdateExisting ? (
                            <span className="tag tag-accent-2" style={{ fontSize: 10, padding: '2px 8px' }}>
                              Will update existing
                            </span>
                          ) : null}
                        </div>

                        <div style={{ fontSize: 13, marginTop: 3, fontWeight: 600 }}>
                          {itemLabel}
                          {qualityLabel ? <span className="text-muted" style={{ fontWeight: 400 }}> · {qualityLabel}</span> : null}
                        </div>
                        <div className="text-muted" style={{ fontSize: 11.5, marginTop: 1 }}>
                          Sheet: {rawValue(row, 'category')} · {rawValue(row, 'commodity')} · {rawValue(row, 'quality')}
                          {' · '}{rawValue(row, 'quantityBags')} bags
                          {preview.side === 'SELL' ? (
                            <>
                              {' · '}{rawValue(row, 'weightKg')} kg
                              {' · '}₹{rawValue(row, 'price')}
                            </>
                          ) : null}
                        </div>

                        {preview.side === 'SELL' ? (
                          <div className="text-muted" style={{ fontSize: 11.5, marginTop: 1 }}>
                            Payment terms: {row.resolved.paymentTerms ?? '—'}
                            {row.resolved.paymentTermsSource
                              ? ` · ${row.resolved.paymentTermsSource.replace('_', ' ')}`
                              : ''}
                          </div>
                        ) : null}

                        {needsResolution ? (
                          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ fontSize: 11.5, fontWeight: 600 }}>
                              Match these cells to the live taxonomy
                            </div>
                            <div className="form-3col">
                              <Field label="Category">
                                <select
                                  className="input"
                                  value={ids.categoryId}
                                  onChange={(event) =>
                                    changeRowTaxonomy(row, {
                                      categoryId: event.target.value,
                                      commodityId: '',
                                      qualityId: '',
                                    })
                                  }
                                >
                                  <option value="">Choose a category</option>
                                  {categories.map((category) => (
                                    <option key={category.id} value={category.id}>{category.name}</option>
                                  ))}
                                </select>
                              </Field>
                              <Field label="Commodity">
                                <select
                                  className="input"
                                  value={ids.commodityId}
                                  disabled={!ids.categoryId || rowCommodities.length === 0}
                                  onChange={(event) =>
                                    changeRowTaxonomy(row, {
                                      commodityId: event.target.value,
                                      qualityId: '',
                                    })
                                  }
                                >
                                  <option value="">Choose a commodity</option>
                                  {rowCommodities.map((commodity) => (
                                    <option key={commodity.id} value={commodity.id}>{commodity.name}</option>
                                  ))}
                                </select>
                              </Field>
                              <Field label="Quality">
                                <select
                                  className="input"
                                  value={ids.qualityId}
                                  disabled={!ids.commodityId || rowQualities.length === 0}
                                  onChange={(event) =>
                                    changeRowTaxonomy(row, { qualityId: event.target.value })
                                  }
                                >
                                  <option value="">Choose a quality</option>
                                  {rowQualities.map((quality) => (
                                    <option key={quality.id} value={quality.id}>{quality.name}</option>
                                  ))}
                                </select>
                              </Field>
                            </div>
                            {row.resolved.categorySuggestion ? (
                              <div className="text-muted" style={{ fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <span>
                                  Category suggestion: <strong>{row.resolved.categorySuggestion.name}</strong>
                                  {' '}({Math.round(row.resolved.categorySuggestion.similarity * 100)}% match)
                                </span>
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  onClick={() => useCategorySuggestion(row, row.resolved.categorySuggestion!)}
                                  style={{ height: 24, padding: '0 8px', fontSize: 11 }}
                                >
                                  Use
                                </button>
                              </div>
                            ) : null}
                            {row.resolved.commoditySuggestion ? (
                              <div className="text-muted" style={{ fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <span>
                                  Commodity suggestion: <strong>{row.resolved.commoditySuggestion.name}</strong>
                                  {' '}({Math.round(row.resolved.commoditySuggestion.similarity * 100)}% match)
                                </span>
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  onClick={() => useCommoditySuggestion(row, row.resolved.commoditySuggestion!)}
                                  style={{ height: 24, padding: '0 8px', fontSize: 11 }}
                                >
                                  Use
                                </button>
                              </div>
                            ) : null}
                            {row.resolved.qualitySuggestion ? (
                              <div className="text-muted" style={{ fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <span>
                                  Quality suggestion: <strong>{row.resolved.qualitySuggestion.name}</strong>
                                  {' '}({Math.round(row.resolved.qualitySuggestion.similarity * 100)}% match)
                                </span>
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  onClick={() => useQualitySuggestion(row, row.resolved.qualitySuggestion!)}
                                  style={{ height: 24, padding: '0 8px', fontSize: 11 }}
                                >
                                  Use
                                </button>
                              </div>
                            ) : null}
                          </div>
                        ) : null}

                        {blockingErrors.length > 0 ? (
                          <>
                            <ul className="field-error" style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                              {blockingErrors.map((message) => (
                                <li key={message}>{message}</li>
                              ))}
                            </ul>
                            {hasFieldError ? (
                              <div className="text-muted" style={{ fontSize: 11.5, marginTop: 2 }}>
                                These values come from the workbook. Correct them in Excel and upload the file again.
                              </div>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{
                padding: '12px 16px', borderTop: '1px solid var(--color-neutral-200)',
                display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              }}>
                <span className="text-muted" style={{ fontSize: 12 }}>
                  {selectedCount} of {readyCount} importable rows selected.
                  {' '}Rows that already exist with the same category, commodity, weight, and quality are updated.
                </span>
                <button
                  className="btn btn-primary"
                  onClick={() => { void confirmImport(); }}
                  disabled={confirmLoading || selectedCount === 0 || Boolean(confirmResult)}
                  style={{ height: 36, padding: '0 18px', fontSize: 13, marginLeft: 'auto' }}
                >
                  {confirmLoading ? 'Importing…' : `Confirm ${selectedCount} row${selectedCount === 1 ? '' : 's'}`}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}
