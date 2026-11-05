import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  AuditEntry,
  Broker,
  FreightRoute,
  Invite,
  ListingRow,
  Negotiation,
  Trade,
  UserRecord,
} from '../types';
import { ApiError } from '../services/api';
import { authService, isValidPhone, normalizePhone } from '../services/authService';
import {
  brokersApi,
  categoriesApi,
  commoditiesApi,
  qualitiesApi,
  invitesApi,
  listingsApi,
  freightApi,
  settingsApi,
  toE164Indian,
  tosVersionsApi,
  userDirectoryApi,
  type BackendBroker,
  type BackendCategory,
  type BackendCommodity,
  type BackendQuality,
  type QualityBulkCreateResult,
  type BackendDirectoryUser,
  type BackendListing,
  type BackendListingStatus,
  type BackendFreightRoute,
  type FreightUploadPreview,
  type TosVersion,
} from '../services/backend';

interface AdminState {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  toast: string | null;
  flash: (msg: string) => void;

  users: UserRecord[];
  usersLoading: boolean;
  usersError: string | null;
  refreshUsers: () => Promise<void>;
  userFilter: string;
  setUserFilter: (f: string) => void;
  suspendUser: (id: number) => void;
  updateUser: (id: number, updates: Pick<UserRecord, 'firm' | 'owner' | 'modes' | 'paymentTerms'>) => boolean;

  invites: Invite[];
  revokeInvite: (id: number) => void;
  inviteePhone: string;
  setInviteePhone: (v: string) => void;
  inviteeFirm: string;
  setInviteeFirm: (v: string) => void;
  inviteBuyer: boolean;
  toggleInviteBuyer: () => void;
  inviteSeller: boolean;
  toggleInviteSeller: () => void;
  inviteError: string | null;
  sendInvite: () => Promise<boolean>;

  rows: ListingRow[];
  sideFilter: string;
  setSideFilter: (f: string) => void;
  catFilter: string;
  setCatFilter: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  editId: number | null;
  openEdit: (id: number) => void;
  closeEdit: () => void;
  editPrice: string;
  setEditPrice: (v: string) => void;
  editQuantity: string;
  setEditQuantity: (v: string) => void;
  editWeight: string;
  setEditWeight: (v: string) => void;
  editReason: string;
  setEditReason: (v: string) => void;
  editError: string | null;
  saveEdit: () => void;
  forceExpire: (id: number) => void;
  withdrawListing: (id: number) => void;
  /** SELL: pass a price to restore as Active; omit/null to restore as N/A. */
  restoreListing: (id: number, price?: number | null) => void;

  negotiations: Negotiation[];
  negoFilter: 'active' | 'done';
  setNegoFilter: (f: 'active' | 'done') => void;
  selectedNegoId: number;
  selectNego: (id: number) => void;
  nudgeMessage: string;
  setNudgeMessage: (v: string) => void;
  relayPrice: string;
  setRelayPrice: (v: string) => void;
  relaySide: 'as Seller' | 'as Buyer';
  setRelaySide: (v: 'as Seller' | 'as Buyer') => void;
  nudge: () => void;
  relay: () => void;

  trades: Trade[];
  exportCsv: (kind: 'trades' | 'listings' | 'generic', filename: string, rows: string[][]) => void;
  exportListingsWorkbook: () => Promise<void>;

  brokers: Broker[];
  brokersLoading: boolean;
  brokersError: string | null;
  brokerPage: number;
  brokerTotalPages: number;
  brokerTotal: number;
  setBrokerPage: (page: number) => void;
  brokerSearch: string;
  setBrokerSearch: (v: string) => void;
  brokerActiveFilter: 'all' | 'true' | 'false';
  setBrokerActiveFilter: (v: 'all' | 'true' | 'false') => void;
  refreshBrokers: (page?: number) => Promise<void>;
  /* broker add modal */
  brokerAddOpen: boolean;
  openBrokerAdd: () => void;
  closeBrokerAdd: () => void;
  brokerAddName: string;
  setBrokerAddName: (v: string) => void;
  brokerAddPhone: string;
  setBrokerAddPhone: (v: string) => void;
  brokerAddCommissionType: string;
  setBrokerAddCommissionType: (v: string) => void;
  brokerAddCommissionRate: string;
  setBrokerAddCommissionRate: (v: string) => void;
  brokerAddError: string | null;
  brokerAddSaving: boolean;
  submitBrokerAdd: () => Promise<void>;
  /* broker edit modal */
  brokerEditId: string | null;
  openBrokerEdit: (id: string) => void;
  closeBrokerEdit: () => void;
  brokerEditName: string;
  setBrokerEditName: (v: string) => void;
  brokerEditPhone: string;
  setBrokerEditPhone: (v: string) => void;
  brokerEditCommissionType: string;
  setBrokerEditCommissionType: (v: string) => void;
  brokerEditCommissionRate: string;
  setBrokerEditCommissionRate: (v: string) => void;
  brokerEditError: string | null;
  brokerEditSaving: boolean;
  submitBrokerEdit: () => Promise<void>;
  /* deactivate / reactivate */
  deactivateBroker: (id: string) => Promise<boolean>;
  reactivateBroker: (id: string) => Promise<void>;
  removeBroker: (name: string) => void;
  addBroker: () => void;
  categories: string[];
  addCategory: () => void;
  newCategory: string;
  setNewCategory: (v: string) => void;
  expiryTime: string;
  setExpiryTime: (v: string) => void;
  freightExpiryTime: string;
  setFreightExpiryTime: (v: string) => void;
  timezone: string;
  setTimezone: (v: string) => void;
  defaultPaymentTerms: string;
  setDefaultPaymentTerms: (v: string) => void;
  saveSettings: () => void;
  saveFreightExpiry: () => void;

  audit: AuditEntry[];
  auditAdmin: string;
  setAuditAdmin: (v: string) => void;
  auditAction: string;
  setAuditAction: (v: string) => void;
  auditQuery: string;
  setAuditQuery: (v: string) => void;

  freightRoutes: FreightRoute[];
  freightLoading: boolean;
  freightError: string | null;
  freightPage: number;
  freightTotal: number;
  freightTotalPages: number;
  setFreightPage: (page: number) => void;
  refreshFreight: (page?: number) => Promise<void>;
  freightSearch: string;
  setFreightSearch: (value: string) => void;
  freightUploadFile: File | null;
  freightUploadPreview: FreightUploadPreview | null;
  freightUploadLoading: boolean;
  freightUploadError: string | null;
  previewFreightUpload: (file: File) => Promise<void>;
  commitFreightUpload: () => Promise<void>;
  clearFreightUpload: () => void;
  freightStatusFilter: string;
  setFreightStatusFilter: (v: string) => void;
  publishPending: () => void;
  freightEditId: number | null;
  openFreightEdit: (id: number) => void;
  closeFreightEdit: () => void;
  freightEditLow: string;
  setFreightEditLow: (v: string) => void;
  freightEditHigh: string;
  setFreightEditHigh: (v: string) => void;
  freightEditCapacity: string;
  setFreightEditCapacity: (v: string) => void;
  freightEditError: string | null;
  saveFreightEdit: () => void;
  removeFreightRoute: (id: number) => void;
  newFreightOrigin: string;
  setNewFreightOrigin: (v: string) => void;
  newFreightDest: string;
  setNewFreightDest: (v: string) => void;
  newFreightLow: string;
  setNewFreightLow: (v: string) => void;
  newFreightHigh: string;
  setNewFreightHigh: (v: string) => void;
  newFreightCapacity: string;
  setNewFreightCapacity: (v: string) => void;
  newFreightError: string | null;
  setNewFreightError: (v: string | null) => void;
  addFreightRoute: () => Promise<boolean>;
  /* ----- live backend ----- */
  /** True when VITE_API_BASE_URL is set and routes hit the real backend. */
  liveMode: boolean;
  invitesLoading: boolean;
  invitesError: string | null;
  refreshInvites: () => Promise<void>;
  listingsLoading: boolean;
  listingsError: string | null;
  listingPage: number;
  setListingPage: (p: number) => void;
  listingTotal: number;
  listingTotalPages: number;
  refreshListings: (commodityId?: string) => Promise<void>;
  settingsLoading: boolean;
  settingsError: string | null;
  refreshLiveSettings: () => Promise<void>;
  liveCategories: BackendCategory[];
  categoryError: string | null;
  refreshCategories: () => Promise<void>;
  renameCategory: (name: string) => void;
  deleteCategory: (name: string) => void;
  liveCommodities: BackendCommodity[];
  commoditiesLoading: boolean;
  commodityError: string | null;
  refreshCommodities: (categoryId?: string) => Promise<void>;
  addCommodity: (categoryId: string, name: string) => Promise<void>;
  renameCommodity: (id: string, name: string, categoryId: string) => Promise<void>;
  deleteCommodity: (id: string, categoryId: string) => Promise<void>;
  liveQualities: BackendQuality[];
  qualitiesLoading: boolean;
  qualitiesError: string | null;
  refreshQualities: (categoryId: string) => Promise<void>;
  addQualities: (categoryId: string, names: string[]) => Promise<QualityBulkCreateResult>;
  renameQuality: (id: string, name: string, categoryId: string) => Promise<void>;
  deleteQuality: (id: string, categoryId: string) => Promise<void>;
  tosVersions: TosVersion[];
  tosVersionsLoading: boolean;
  tosVersionsError: string | null;
  refreshTosVersions: () => Promise<void>;
  publishTosVersion: (body: { effectiveDate: string; termsUrl: string; privacyUrl: string }) => Promise<void>;
}

const AdminContext = createContext<AdminState | null>(null);

export function useAdmin(): AdminState {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used inside AdminProvider');
  return ctx;
}

function downloadCsv(filename: string, rows: string[][]) {
  const esc = (c: string) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c);
  const csv = rows.map((r) => r.map(esc).join(',')).join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadListingsWorkbook(headers: string[], sellerRows: Array<Array<string | number>>, buyerRows: Array<Array<string | number>>) {
  const escapeXml = (value: string | number) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
  const worksheet = (name: string, rows: Array<Array<string | number>>) => {
    const sheetRows = [headers, ...rows].map((row) => (
      `<Row>${row.map((value) => {
        const type = typeof value === 'number' && Number.isFinite(value) ? 'Number' : 'String';
        return `<Cell><Data ss:Type="${type}">${escapeXml(value)}</Data></Cell>`;
      }).join('')}</Row>`
    )).join('');
    return `<Worksheet ss:Name="${escapeXml(name)}"><Table>${sheetRows}</Table></Worksheet>`;
  };
  const xml = `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40">${worksheet('Seller Listings', sellerRows)}${worksheet('Buyer Listings', buyerRows)}</Workbook>`;
  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'listings.xls';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export const LIVE_PAGE_SIZE = 20;
export const FREIGHT_PAGE_SIZE = 20;

const BACKEND_STATUS_LABEL: Record<BackendListingStatus, ListingRow['status']> = {
  active: 'Active',
  price_expired: 'Price expired',
  na: 'N/A',
  withdrawn: 'Withdrawn',
  traded: 'Traded',
};

const UI_STATUS_PARAM: Record<string, string> = {
  Active: 'active',
  'Price expired': 'price_expired',
  Traded: 'traded',
  Withdrawn: 'withdrawn',
  'N/A': 'na',
};

function mapBackendListing(b: BackendListing, index: number, categoryName: (id: string) => string): ListingRow {
  const valid = b.priceValidUntil ? new Date(b.priceValidUntil) : null;
  const adminExpired = b.status === 'price_expired' && b.priceValidUntil == null;
  return {
    id: index + 1,
    backendId: b.id,
    side: b.side,
    firm: b.user?.firmName || b.user?.name || '—',
    subEntity: b.user?.phone ?? '',
    item: b.itemName,
    quality: b.quality ?? '—',
    category: categoryName(b.categoryId),
    weight: b.weightKg != null ? `${b.weightKg}KG` : '—',
    quantityBags: b.quantityBags,
    price: b.price,
    status: BACKEND_STATUS_LABEL[b.status] ?? 'Active',
    validUntil: adminExpired
      ? 'expired by admin'
      : valid && !Number.isNaN(valid.getTime())
        ? `until ${valid.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' })}`
        : BACKEND_STATUS_LABEL[b.status] ?? '',
  };
}

function mapBackendFreight(b: BackendFreightRoute, index: number): FreightRoute {
  return {
    id: index + 1,
    backendId: b.id,
    origin: b.originName,
    dest: b.destinationName,
    low: b.priceLow,
    high: b.priceHigh,
    capacity: b.truckCapacity ?? '',
    status: b.status === 'price_expired' ? 'Price expired' : 'Published',
  };
}

function mapBackendBroker(b: BackendBroker): Broker {
  return {
    id: b.id,
    name: b.name,
    phone: b.phone,
    commissionType: b.commissionType,
    commissionRate: b.commissionRate,
    active: b.active,
    createdById: b.createdById,
    updatedById: b.updatedById,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
    createdBy: b.createdBy,
    updatedBy: b.updatedBy,
    tradeCount: b.tradeCount,
  };
}

function displayPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(-10);
  if (digits.length !== 10) return raw || '—';
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

/**
 * Names should never be phone numbers. A few accounts stored their mobile
 * number in the firm/name field, so treat phone-like values as missing.
 */
function cleanDisplayName(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return '';
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length >= 7 && /^\+?[\d\s()-]+$/.test(trimmed)) return '';
  return trimmed;
}

function mapDirectoryUser(u: BackendDirectoryUser, index: number): UserRecord {
  const last = u.lastListingAt ? new Date(u.lastListingAt) : null;
  const validLast = last && !Number.isNaN(last.getTime());
  const modes = [...new Set(
    u.roles
      .filter((role): role is string => typeof role === 'string' && role.trim().length > 0)
      .map((role) => role.charAt(0).toUpperCase() + role.slice(1)),
  )];
  return {
    id: index + 1,
    backendId: u.id,
    firm: cleanDisplayName(u.firmName) || '—',
    owner: cleanDisplayName(u.name) || '—',
    phone: displayPhone(u.phone),
    modes,
    status: 'Active',
    invitedBy: '—',
    lastActive: validLast
      ? `Listed ${last.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`
      : '—',
    paymentTerms: u.paymentTerms != null ? `${u.paymentTerms} days` : '—',
  };
}

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState('all');
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteePhone, setInviteePhone] = useState('');
  const [inviteeFirm, setInviteeFirm] = useState('');
  const [inviteBuyer, setInviteBuyer] = useState(true);
  const [inviteSeller, setInviteSeller] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [rows, setRows] = useState<ListingRow[]>([]);
  const [sideFilter, setSideFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('All categories');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [editId, setEditId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [negoFilter, setNegoFilter] = useState<'active' | 'done'>('active');
  const [selectedNegoId, setSelectedNegoId] = useState(0);
  const [nudgeMessage, setNudgeMessage] = useState('');
  const [relayPrice, setRelayPrice] = useState('');
  const [relaySide, setRelaySide] = useState<'as Seller' | 'as Buyer'>('as Seller');

  // No trades endpoint on the backend yet — closed trades are recorded here
  // once the trade flow exists. Starts empty; never seeded.
  const [trades] = useState<Trade[]>([]);

  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [brokersLoading, setBrokersLoading] = useState(false);
  const [brokersError, setBrokersError] = useState<string | null>(null);
  const [brokerPage, setBrokerPage] = useState(1);
  const [brokerTotalPages, setBrokerTotalPages] = useState(0);
  const [brokerTotal, setBrokerTotal] = useState(0);
  const [brokerSearch, setBrokerSearch] = useState('');
  const [brokerActiveFilter, setBrokerActiveFilter] = useState<'all' | 'true' | 'false'>('all');
  /* broker add form state */
  const [brokerAddOpen, setBrokerAddOpen] = useState(false);
  const [brokerAddName, setBrokerAddName] = useState('');
  const [brokerAddPhone, setBrokerAddPhone] = useState('');
  const [brokerAddCommissionType, setBrokerAddCommissionType] = useState('');
  const [brokerAddCommissionRate, setBrokerAddCommissionRate] = useState('');
  const [brokerAddError, setBrokerAddError] = useState<string | null>(null);
  const [brokerAddSaving, setBrokerAddSaving] = useState(false);
  /* broker edit form state */
  const [brokerEditId, setBrokerEditId] = useState<string | null>(null);
  const [brokerEditName, setBrokerEditName] = useState('');
  const [brokerEditPhone, setBrokerEditPhone] = useState('');
  const [brokerEditCommissionType, setBrokerEditCommissionType] = useState('');
  const [brokerEditCommissionRate, setBrokerEditCommissionRate] = useState('');
  const [brokerEditError, setBrokerEditError] = useState<string | null>(null);
  const [brokerEditSaving, setBrokerEditSaving] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [expiryTime, setExpiryTime] = useState('02:00');
  const [freightExpiryTime, setFreightExpiryTime] = useState('02:00');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState(() => {
    try {
      return localStorage.getItem('kkpk-default-payment-terms') ?? '10-15 days';
    } catch {
      return '10-15 days';
    }
  });

  // Session-local fallback for demo mode; live audit entries come from /audit-logs.
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [auditAdmin, setAuditAdmin] = useState('All admins');
  const [auditAction, setAuditAction] = useState('All actions');
  const [auditQuery, setAuditQuery] = useState('');

  const [freightRoutes, setFreightRoutes] = useState<FreightRoute[]>([]);
  const [freightLoading, setFreightLoading] = useState(false);
  const [freightError, setFreightError] = useState<string | null>(null);
  const [freightPage, setFreightPage] = useState(1);
  const [freightTotal, setFreightTotal] = useState(0);
  const [freightTotalPages, setFreightTotalPages] = useState(0);
  const [freightUploadFile, setFreightUploadFile] = useState<File | null>(null);
  const [freightUploadPreview, setFreightUploadPreview] = useState<FreightUploadPreview | null>(null);
  const [freightUploadLoading, setFreightUploadLoading] = useState(false);
  const [freightUploadError, setFreightUploadError] = useState<string | null>(null);
  const [freightSearch, setFreightSearch] = useState('');
  const [freightStatusFilter, setFreightStatusFilter] = useState('All statuses');
  const [freightEditId, setFreightEditId] = useState<number | null>(null);
  const [freightEditLow, setFreightEditLow] = useState('');
  const [freightEditHigh, setFreightEditHigh] = useState('');
  const [freightEditCapacity, setFreightEditCapacity] = useState('');
  const [freightEditError, setFreightEditError] = useState<string | null>(null);
  const [newFreightOrigin, setNewFreightOrigin] = useState('');
  const [newFreightDest, setNewFreightDest] = useState('');
  const [newFreightLow, setNewFreightLow] = useState('');
  const [newFreightHigh, setNewFreightHigh] = useState('');
  const [newFreightCapacity, setNewFreightCapacity] = useState('');
  const [newFreightError, setNewFreightError] = useState<string | null>(null);

  /* ----- live backend state (used only when VITE_API_BASE_URL is set) ----- */
  const [liveMode] = useState(() => !authService.isDemoMode());
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [invitesError, setInvitesError] = useState<string | null>(null);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingsError, setListingsError] = useState<string | null>(null);
  const [listingPage, setListingPage] = useState(1);
  const [listingTotal, setListingTotal] = useState(0);
  const [listingTotalPages, setListingTotalPages] = useState(0);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [liveCategories, setLiveCategories] = useState<BackendCategory[]>([]);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [liveCommodities, setLiveCommodities] = useState<BackendCommodity[]>([]);
  const [commoditiesLoading, setCommoditiesLoading] = useState(false);
  const [commodityError, setCommodityError] = useState<string | null>(null);
  const [liveQualities, setLiveQualities] = useState<BackendQuality[]>([]);
  const [qualitiesLoading, setQualitiesLoading] = useState(false);
  const [qualitiesError, setQualitiesError] = useState<string | null>(null);
  const [tosVersions, setTosVersions] = useState<TosVersion[]>([]);
  const [tosVersionsLoading, setTosVersionsLoading] = useState(false);
  const [tosVersionsError, setTosVersionsError] = useState<string | null>(null);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  const logAudit = useCallback((entry: Omit<AuditEntry, 'when'>) => {
    const when = new Date().toLocaleString('en-IN', {
      day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit',
    });
    setAudit((prev) => [{ ...entry, when }, ...prev]);
  }, []);

  /* ================= live backend integration =================
     All routes below are verified against D:\Tradding_backend\routes.
     Admin-only enforcement happens server-side (requireRole(['admin']));
     the UI additionally gates on the session's roles (see RequireAdmin)
     and surfaces backend 403s honestly. Endpoints the backend does not
     expose (dedicated user-directory/suspend, negotiations, trades) intentionally
     keep local state, starting empty — the
     console never shows invented rows. The user roster is assembled from
     real listing owners instead (see refreshUsers below). */
  const liveCategoriesRef = useRef<BackendCategory[]>([]);

  const liveErr = (e: unknown, fallback: string) =>
    e instanceof ApiError ? e.message : fallback;

  const ensureCategories = useCallback(async (): Promise<BackendCategory[]> => {
    if (liveCategoriesRef.current.length) return liveCategoriesRef.current;
    const all: BackendCategory[] = [];
    let page = 1;
    let totalPages = 1;
    do {
      const { data, meta } = await categoriesApi.list({ page, limit: 100 });
      all.push(...data);
      totalPages = meta?.totalPages ?? 1;
      page += 1;
    } while (page <= totalPages);
    liveCategoriesRef.current = all;
    setLiveCategories(all);
    setCategories(all.map((c) => c.name));
    return all;
  }, []);

  const refreshCategories = useCallback(async () => {
    if (!liveMode) return;
    setCategoryError(null);
    try {
      liveCategoriesRef.current = [];
      await ensureCategories();
    } catch (e) {
      setCategoryError(liveErr(e, 'Could not load categories.'));
      throw e;
    }
  }, [liveMode, ensureCategories]);

  const refreshInvites = useCallback(async () => {
    if (!liveMode) return;
    setInvitesLoading(true);
    setInvitesError(null);
    try {
      const { data } = await invitesApi.list({ status: 'pending', limit: 100 });
      setInvites(data.map((inv, i) => ({
        id: i + 1,
        backendId: inv.id,
        // The invite endpoint only stores the phone and role hint; there is
        // no firm name to show until the invitee completes signup.
        firm: '',
        phone: displayPhone(inv.phone),
        meta: `${inv.roleHint} · invited ${new Date(inv.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`,
      })));
    } catch (e) {
      setInvites([]);
      setInvitesError(liveErr(e, 'Could not load invites.'));
    } finally {
      setInvitesLoading(false);
    }
  }, [liveMode]);

  const refreshUsers = useCallback(async () => {
    if (!liveMode) return;
    setUsersLoading(true);
    setUsersError(null);
    try {
      // No admin user-directory route exists, so the roster is the
      // de-duplicated set of listing owners the admin listing feed returns.
      const directory = await userDirectoryApi.list();
      setUsers(directory.map(mapDirectoryUser));
    } catch (e) {
      setUsers([]);
      setUsersError(liveErr(e, 'Could not load users.'));
    } finally {
      setUsersLoading(false);
    }
  }, [liveMode]);

  const refreshListings = useCallback(async (commodityId?: string) => {
    if (!liveMode) return;
    setListingsLoading(true);
    setListingsError(null);
    try {
      const cats = await ensureCategories();
      const nameOf = (id: string) => cats.find((c) => c.id === id)?.name ?? '—';
      const catId = cats.find((c) => c.name === catFilter)?.id;
      const statusParam = statusFilter === 'All statuses'
        ? 'active,price_expired,na,withdrawn,traded'
        : (UI_STATUS_PARAM[statusFilter] ?? 'active');
      const query = {
        status: statusParam,
        categoryId: catId,
        commodityId,
        itemName: searchQuery.trim() || undefined,
      };
      const sides = sideFilter === 'all' ? ['SELL', 'BUY'] as const : [sideFilter as 'SELL' | 'BUY'];

      // One side at a time: the backend already paginates exactly as the table
      // displays it.
      if (sides.length === 1) {
        const { data, meta } = await listingsApi.list({
          side: sides[0],
          ...query,
          page: listingPage,
          limit: LIVE_PAGE_SIZE,
        });
        const total = meta?.total ?? data.length;
        const pages = meta?.totalPages ?? (total ? Math.ceil(total / LIVE_PAGE_SIZE) : 0);
        // Deleting/withdrawing the last row on a page can leave the stored
        // page past the end — clamp so the table never looks stuck on blank.
        if (pages > 0 && listingPage > pages) setListingPage(pages);
        setRows(data.map((b, i) => mapBackendListing(b, i, nameOf)));
        setListingTotal(total);
        setListingTotalPages(pages);
        return;
      }

      // GET /listings requires a single `side`, so "Both sides" is a merged
      // view. Read each side's total first, then fetch only the 20-row window
      // that belongs on the current page (a page can straddle both sides).
      const [sellTotal, buyTotal] = await Promise.all(sides.map(async (side) => {
        const { meta } = await listingsApi.list({ side, ...query, page: 1, limit: 1 });
        return meta?.total ?? 0;
      }));
      const total = sellTotal + buyTotal;
      const pages = total ? Math.ceil(total / LIVE_PAGE_SIZE) : 0;
      const page = pages ? Math.min(Math.max(listingPage, 1), pages) : 1;
      if (page !== listingPage) setListingPage(page);

      if (!total) {
        setRows([]);
        setListingTotal(0);
        setListingTotalPages(0);
        return;
      }

      const start = (page - 1) * LIVE_PAGE_SIZE;
      const end = start + LIVE_PAGE_SIZE;
      const sideTotals = [sellTotal, buyTotal];
      // SELL rows occupy the first block of the merged list, BUY rows the next.
      const slices = await Promise.all(sides.map(async (side, index) => {
        const base = index === 0 ? 0 : sideTotals[0];
        const localStart = Math.max(0, start - base);
        const localEnd = Math.min(sideTotals[index], end - base);
        if (localEnd <= localStart) return [] as BackendListing[];

        const firstPage = Math.floor(localStart / LIVE_PAGE_SIZE) + 1;
        const lastPage = Math.floor((localEnd - 1) / LIVE_PAGE_SIZE) + 1;
        const pageResults = await Promise.all(
          Array.from({ length: lastPage - firstPage + 1 }, (_, i) =>
            listingsApi.list({
              side,
              ...query,
              page: firstPage + i,
              limit: LIVE_PAGE_SIZE,
            }).then((r) => r.data),
          ),
        );
        const rows = pageResults.flat();
        const offset = localStart - (firstPage - 1) * LIVE_PAGE_SIZE;
        return rows.slice(offset, offset + (localEnd - localStart));
      }));
      const combined = slices.flat();

      setRows(combined.map((b, i) => mapBackendListing(b, i, nameOf)));
      setListingTotal(total);
      setListingTotalPages(pages);
    } catch (e) {
      setRows([]);
      setListingTotal(0);
      setListingTotalPages(0);
      setListingsError(liveErr(e, 'Could not load listings.'));
    } finally {
      setListingsLoading(false);
    }
  }, [liveMode, sideFilter, statusFilter, catFilter, listingPage, searchQuery, ensureCategories]);

  const refreshFreight = useCallback(async (requestedPage = freightPage) => {
    if (!liveMode) return;
    const page = Number.isFinite(requestedPage) ? Math.max(1, Math.floor(requestedPage)) : 1;
    setFreightLoading(true);
    setFreightError(null);
    try {
      const { data, meta } = await freightApi.list({
        destination: freightSearch.trim() || undefined,
        page,
        limit: FREIGHT_PAGE_SIZE,
      });
      setFreightRoutes(data.map(mapBackendFreight));
      const total = meta?.total ?? data.length;
      setFreightTotal(total);
      setFreightTotalPages(meta?.totalPages ?? Math.ceil(total / FREIGHT_PAGE_SIZE));
      if (meta?.totalPages && page > meta.totalPages) setFreightPage(meta.totalPages);
    } catch (e) {
      setFreightRoutes([]);
      setFreightTotal(0);
      setFreightTotalPages(0);
      setFreightError(liveErr(e, 'Could not load freight routes.'));
    } finally {
      setFreightLoading(false);
    }
  }, [liveMode, freightSearch, freightPage]);

  const refreshLiveSettings = useCallback(async () => {
    if (!liveMode) return;
    setSettingsLoading(true);
    setSettingsError(null);
    try {
      const readExpiryTime = async (key: string) => {
        try {
          const setting = await settingsApi.getByKey(key);
          const time = (setting.value as { time?: unknown } | null)?.time;
          return typeof time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : '02:00';
        } catch (e) {
          // A missing row means this cutoff has not been configured yet.
          if (e instanceof ApiError && e.status === 404) return '02:00';
          throw e;
        }
      };
      const [priceTime, freightTime] = await Promise.all([
        readExpiryTime('price_expiry_time'),
        readExpiryTime('freight_expiry_time'),
      ]);
      setExpiryTime(priceTime);
      setFreightExpiryTime(freightTime);
      await ensureCategories();
    } catch (e) {
      setSettingsError(liveErr(e, 'Could not load settings.'));
    } finally {
      setSettingsLoading(false);
    }
  }, [liveMode, ensureCategories]);

  useEffect(() => {
    if (liveMode) void refreshLiveSettings();
  }, [liveMode, refreshLiveSettings]);

  const refreshCommodities = useCallback(async (categoryId?: string) => {
    if (!liveMode) return;
    setCommoditiesLoading(true);
    setCommodityError(null);
    setLiveCommodities([]);
    try {
      const { data } = await commoditiesApi.list({ categoryId, limit: 100 });
      setLiveCommodities(data);
    } catch (e) {
      setCommodityError(liveErr(e, 'Could not load items.'));
    } finally {
      setCommoditiesLoading(false);
    }
  }, [liveMode]);

  const refreshQualities = useCallback(async (categoryId: string) => {
    if (!liveMode) return;
    setQualitiesLoading(true);
    setQualitiesError(null);
    setLiveQualities([]);
    try {
      const { data } = await qualitiesApi.list({ categoryId, limit: 100 });
      setLiveQualities(data);
    } catch (e) {
      setLiveQualities([]);
      setQualitiesError(liveErr(e, 'Could not load qualities.'));
    } finally {
      setQualitiesLoading(false);
    }
  }, [liveMode]);

  const addQualities = useCallback(async (categoryId: string, names: string[]) => {
    const result = await qualitiesApi.createMany(categoryId, names);
    await Promise.all([refreshQualities(categoryId), refreshCategories()]);
    flash(`Added ${result.created.length} quality entries; skipped ${result.skipped.length} existing`);
    return result;
  }, [refreshQualities, refreshCategories, flash]);

  const renameQuality = useCallback(async (id: string, name: string, categoryId: string) => {
    await qualitiesApi.rename(id, name.trim());
    await Promise.all([refreshQualities(categoryId), refreshCategories()]);
    flash('Quality renamed');
  }, [refreshQualities, refreshCategories, flash]);

  const deleteQuality = useCallback(async (id: string, categoryId: string) => {
    await qualitiesApi.remove(id);
    await Promise.all([refreshQualities(categoryId), refreshCategories()]);
    flash('Quality deleted');
  }, [refreshQualities, refreshCategories, flash]);

  const addCommodity = useCallback(async (categoryId: string, name: string) => {
    await commoditiesApi.create(categoryId, name.trim());
    await refreshCommodities(categoryId);
    flash('Item added');
  }, [refreshCommodities, flash]);

  const renameCommodity = useCallback(async (id: string, name: string, categoryId: string) => {
    await commoditiesApi.update(id, { name: name.trim() });
    await refreshCommodities(categoryId);
    flash('Item renamed');
  }, [refreshCommodities, flash]);

  const deleteCommodity = useCallback(async (id: string, categoryId: string) => {
    await commoditiesApi.remove(id);
    await refreshCommodities(categoryId);
    flash('Item deleted');
  }, [refreshCommodities, flash]);

  const refreshTosVersions = useCallback(async () => {
    if (!liveMode) return;
    setTosVersionsLoading(true);
    setTosVersionsError(null);
    try {
      const { data } = await tosVersionsApi.list(1, 20);
      setTosVersions(data);
    } catch (e) {
      setTosVersionsError(liveErr(e, 'Could not load terms versions.'));
    } finally {
      setTosVersionsLoading(false);
    }
  }, [liveMode]);

  const publishTosVersion = useCallback(async (body: { effectiveDate: string; termsUrl: string; privacyUrl: string }) => {
    await tosVersionsApi.publish(body);
    await refreshTosVersions();
    flash('Terms version published — users will re-accept on next login');
  }, [refreshTosVersions, flash]);

  const suspendUser = useCallback((id: number) => {
    setUsers((prev) => {
      const target = prev.find((u) => u.id === id);
      if (target) {
        logAudit({
          admin: 'Kunj Bihari', action: 'User access', entity: target.firm,
          before: target.status, after: target.status === 'Suspended' ? 'Active' : 'Suspended',
        });
      }
      return prev.map((u) => (u.id === id
        ? { ...u, status: u.status === 'Suspended' ? 'Active' : 'Suspended' }
        : u));
    });
    flash(liveMode
      ? 'Changed locally only — this change is not saved yet'
      : 'Access updated — logged to the audit trail');
  }, [flash, logAudit, liveMode]);

  const updateUser = useCallback((
    id: number,
    updates: Pick<UserRecord, 'firm' | 'owner' | 'modes' | 'paymentTerms'>,
  ) => {
    const target = users.find((user) => user.id === id);
    if (!target) {
      flash('This user is stale — reload the list before editing.');
      return false;
    }

    setUsers((prev) => prev.map((user) => (user.id === id ? { ...user, ...updates } : user)));
    logAudit({
      admin: 'Kunj Bihari',
      action: 'User profile',
      entity: target.firm,
      before: `${target.firm} · ${target.owner} · ${target.modes.join(', ')} · ${target.paymentTerms}`,
      after: `${updates.firm} · ${updates.owner} · ${updates.modes.join(', ')} · ${updates.paymentTerms}`,
    });
    flash(liveMode
      ? 'User updated locally only — profile changes are not saved to the backend'
      : 'User profile updated — logged to the audit trail');
    return true;
  }, [users, logAudit, flash, liveMode]);

  const revokeInvite = useCallback((id: number) => {
    if (liveMode) {
      const target = invites.find((i) => i.id === id);
      if (!target?.backendId) {
        flash('This invite is stale — reload the list.');
        return;
      }
      void (async () => {
        try {
          await invitesApi.cancel(target.backendId as string);
          await refreshInvites();
          flash('Invite revoked');
        } catch (e) {
          flash(liveErr(e, 'Revoke failed.'));
        }
      })();
      return;
    }
    setInvites((prev) => prev.filter((i) => i.id !== id));
    flash('Invite revoked');
  }, [flash, liveMode, invites, refreshInvites]);

  const sendInvite = useCallback(async () => {
    const digits = normalizePhone(inviteePhone);
    if (!/^[6-9]\d{9}$/.test(digits)) {
      setInviteError('Enter a valid 10-digit mobile number.');
      return false;
    }
    if (!inviteeFirm.trim()) {
      setInviteError('Enter the firm name.');
      return false;
    }
    if (!inviteBuyer && !inviteSeller) {
      setInviteError('Pick at least one mode (Buyer or Seller).');
      return false;
    }
    setInviteError(null);
    if (liveMode) {
      // The form requires a firm name, although the invite endpoint stores
      // only the phone and role hint.
      const roleHint = !inviteBuyer && inviteSeller ? 'seller' : 'buyer';
      try {
        await invitesApi.send(toE164Indian(digits), roleHint);
        await refreshInvites();
        setInviteePhone('');
        setInviteeFirm('');
        flash('Invite sent — they can sign in with OTP straight away');
        return true;
      } catch (e) {
        setInviteError(liveErr(e, 'Send failed.'));
        return false;
      }
    }
    const modes: string[] = [];
    if (inviteBuyer) modes.push('Buyer');
    if (inviteSeller) modes.push('Seller');
    setInvites((prev) => [
      {
        id: Math.max(0, ...prev.map((i) => i.id)) + 1,
        firm: inviteeFirm.trim(),
        phone: `+91 ${digits}`,
        meta: `+91 ${digits} · sent just now by Kunj Bihari`,
      },
      ...prev,
    ]);
    logAudit({
      admin: 'Kunj Bihari', action: 'Invite sent', entity: inviteeFirm.trim(),
      before: '—', after: `+91 ${digits} · ${modes.join(', ')}`,
    });
    setInviteePhone('');
    setInviteeFirm('');
    flash('Invite sent — they can sign in with OTP straight away');
    return true;
  }, [inviteePhone, inviteeFirm, inviteBuyer, inviteSeller, flash, logAudit, liveMode, refreshInvites]);

  const openEdit = useCallback((id: number) => {
    const r = rows.find((x) => x.id === id);
    setEditId(id);
    setEditPrice(r && r.price != null ? String(r.price) : '');
    setEditQuantity(r?.quantityBags == null ? '' : String(r.quantityBags));
    setEditWeight(r && r.weight !== '—' ? r.weight : '');
    setEditReason('');
    setEditError(null);
  }, [rows]);

  const closeEdit = useCallback(() => {
    setEditId(null);
    setEditError(null);
  }, []);

  const saveEdit = useCallback(async () => {
    if (editId == null) return;
    if (liveMode) {
      const target = rows.find((r) => r.id === editId);
      if (!target?.backendId) {
        setEditError('This row is stale — reload the list.');
        return;
      }
      const patch: { price?: number; weightKg?: number; quantityBags?: number } = {};
      if (editQuantity.trim()) {
        const quantity = Number(editQuantity.trim());
        if (!Number.isInteger(quantity) || quantity <= 0) {
          setEditError('Quantity must be a positive whole number of bags.');
          return;
        }
        patch.quantityBags = quantity;
      }
      if (target.side === 'BUY') {
        const quantity = Number(editQuantity.trim());
        if (!Number.isInteger(quantity) || quantity <= 0) {
          setEditError('Quantity must be a positive whole number of bags.');
          return;
        }
        patch.quantityBags = quantity;
      } else {
        if (editPrice.trim()) {
          const price = Number(editPrice.trim());
          if (!Number.isFinite(price) || price <= 0) {
            setEditError('Enter a positive price — price cannot be cleared.');
            return;
          }
          patch.price = price;
        }
        if (editWeight.trim()) {
          const kg = Number(editWeight.replace(/[^0-9]/g, ''));
          if (!Number.isInteger(kg) || kg <= 0) {
            setEditError('Weight must be a positive whole-kg number (e.g. 30KG).');
            return;
          }
          patch.weightKg = kg;
        }
        if (!Object.keys(patch).length) {
          setEditError('Change at least one field before saving.');
          return;
        }
      }
      try {
        setEditError(null);
        await listingsApi.update(target.backendId, patch);
        setEditId(null);
        setEditReason('');
        flash('Changes saved and added to the audit log');
        await refreshListings();
      } catch (e) {
        setEditError(liveErr(e, 'Save failed.'));
      }
      return;
    }
    if (editPrice !== '' && !/^\d+(\.\d+)?$/.test(editPrice.trim())) {
      setEditError('Price must be a number (or leave blank for N/A).');
      return;
    }
    if (!editWeight.trim()) {
      setEditError('Weight is required (e.g. 30KG).');
      return;
    }
    if (!editReason.trim()) {
      setEditError('Add a reason — it is written to the audit log.');
      return;
    }
    const quantity = editQuantity.trim() ? Number(editQuantity.trim()) : undefined;
    if (quantity !== undefined && (!Number.isInteger(quantity) || quantity <= 0)) {
      setEditError('Quantity must be a positive whole number of bags.');
      return;
    }
    const before = rows.find((r) => r.id === editId);
    setEditError(null);
    setRows((prev) => prev.map((r) => (r.id === editId
      ? {
        ...r,
        price: editPrice.trim() === '' ? null : Number(editPrice),
        weight: editWeight.trim(),
        ...(quantity !== undefined ? { quantityBags: quantity } : {}),
      }
      : r)));
    if (before) {
      logAudit({
        admin: 'Kunj Bihari', action: 'Edit on behalf',
        entity: `${before.side === 'BUY' ? 'Requirement' : 'Listing'} · ${before.item}`,
        before: before.price == null ? 'N/A' : `₹${before.price.toLocaleString('en-IN')}`,
        after: editPrice.trim() === '' ? 'N/A' : `₹${Number(editPrice).toLocaleString('en-IN')}`,
      });
    }
    setEditId(null);
    setEditReason('');
    flash('Saved on behalf of the user — entry written to the audit log');
  }, [editId, editPrice, editQuantity, editWeight, editReason, rows, flash, logAudit, liveMode, refreshListings]);

  const forceExpire = useCallback((id: number) => {
    if (liveMode) {
      const target = rows.find((r) => r.id === id);
      if (!target?.backendId || target.side !== 'SELL' || target.status !== 'Active') {
        flash('This row is stale — reload the list.');
        return;
      }
      const backendId = target.backendId;
      void (async () => {
        try {
          await listingsApi.forceExpire(backendId);
          await refreshListings();
          setRows((prev) => prev.map((row) => (row.backendId === backendId
            ? { ...row, status: 'Price expired' as const, validUntil: 'expired by admin' }
            : row)));
          flash('Price expired — expired by admin');
        } catch (e) {
          flash(liveErr(e, 'Could not expire listing.'));
        }
      })();
      return;
    }
    setRows((prev) => {
      const target = prev.find((r) => r.id === id);
      if (target) {
        logAudit({
          admin: 'Kunj Bihari', action: 'Force expire',
          entity: `${target.side === 'BUY' ? 'Requirement' : 'Listing'} · ${target.item}`,
          before: target.status, after: 'Price expired',
        });
      }
      return prev.map((r) => (r.id === id ? { ...r, status: 'Price expired' as const, validUntil: 'expired by admin' } : r));
    });
    flash('Price expired — expired by admin');
  }, [flash, logAudit, liveMode, rows, refreshListings]);

  const withdrawListing = useCallback((id: number) => {
    if (liveMode) {
      const target = rows.find((r) => r.id === id);
      if (
        !target?.backendId ||
        target.status === 'Withdrawn' ||
        target.status === 'Traded' ||
        target.status === 'N/A'
      ) {
        flash('This row is stale — reload the list.');
        return;
      }
      const backendId = target.backendId;
      void (async () => {
        try {
          await listingsApi.withdraw(backendId);
          await refreshListings();
          setRows((prev) => prev.map((row) => (row.backendId === backendId
            ? { ...row, status: 'Withdrawn' as const, validUntil: 'withdrawn by admin' }
            : row)));
          flash('Listing withdrawn');
        } catch (e) {
          flash(liveErr(e, 'Could not withdraw listing.'));
        }
      })();
      return;
    }
    setRows((prev) => {
      const target = prev.find((r) => r.id === id);
      if (target) {
        logAudit({
          admin: 'Kunj Bihari', action: 'Withdraw listing',
          entity: `${target.side === 'BUY' ? 'Requirement' : 'Listing'} · ${target.item}`,
          before: target.status, after: 'Withdrawn',
        });
      }
      return prev.map((r) => (r.id === id ? { ...r, status: 'Withdrawn' as const, validUntil: 'withdrawn by admin' } : r));
    });
    flash('Listing withdrawn');
  }, [flash, logAudit, liveMode, rows, refreshListings]);

  const restoreListing = useCallback((id: number, price?: number | null) => {
    if (price != null && (!Number.isFinite(price) || price < 0)) {
      flash('Price must be a number of ₹0 or more.');
      return;
    }
    if (liveMode) {
      const target = rows.find((r) => r.id === id);
      if (!target?.backendId || target.status !== 'Withdrawn') {
        flash('This row is stale — reload the list.');
        return;
      }
      const backendId = target.backendId;
      // A price is only valid for SELL listings. Omitting it restores a SELL
      // listing as N/A; BUY requirements always restore as Active.
      const body = target.side === 'SELL' && price != null ? { price } : undefined;
      void (async () => {
        try {
          const restored = await listingsApi.restore(backendId, body);
          await refreshListings();
          flash(restored.status === 'active'
            ? 'Listing restored — visible to buyers'
            : 'Listing restored as N/A — add a price to make it active');
        } catch (e) {
          flash(liveErr(e, 'Could not restore listing.'));
        }
      })();
      return;
    }
    const target = rows.find((r) => r.id === id);
    const nextStatus: ListingRow['status'] =
      target?.side === 'BUY' || (price != null && price > 0) ? 'Active' : 'N/A';
    setRows((prev) => {
      const row = prev.find((r) => r.id === id);
      if (row) {
        logAudit({
          admin: 'Kunj Bihari', action: 'Restore listing',
          entity: `${row.side === 'BUY' ? 'Requirement' : 'Listing'} · ${row.item}`,
          before: row.status, after: nextStatus,
        });
      }
      return prev.map((r) => (r.id === id
        ? {
            ...r,
            status: nextStatus,
            price: nextStatus === 'Active' ? (price ?? r.price) : null,
            validUntil: nextStatus === 'Active' ? 'restored by admin' : 'N/A — add a price',
          }
        : r));
    });
    flash(nextStatus === 'Active'
      ? 'Listing restored — visible to buyers'
      : 'Listing restored as N/A — add a price to make it active');
  }, [flash, logAudit, liveMode, rows, refreshListings]);

  const selectNego = useCallback((id: number) => setSelectedNegoId(id), []);

  const nudge = useCallback(() => {
    if (!nudgeMessage.trim()) {
      flash('Type a message first — it is attributed to Kunj Bihari (admin)');
      return;
    }
    const active = negotiations.find((n) => n.id === selectedNegoId);
    setNegotiations((prev) => prev.map((n) => (n.id === selectedNegoId
      ? { ...n, thread: [...n.thread, { who: 'Kunj Bihari (admin)', side: 'admin' as const, price: nudgeMessage.trim(), time: 'just now · admin nudge' }] }
      : n)));
    if (active) {
      logAudit({
        admin: 'Kunj Bihari', action: 'Negotiation nudge',
        entity: `NEG-${active.id} · ${active.seller}`, before: 'no message', after: 'messaged party',
      });
    }
    setNudgeMessage('');
    flash('Message sent, attributed to Kunj Bihari (admin)');
  }, [nudgeMessage, negotiations, selectedNegoId, flash, logAudit]);

  const relay = useCallback(() => {
    if (!relayPrice.trim() || Number.isNaN(Number(relayPrice.replace(/[,₹\s]/g, '')))) {
      flash('Enter a numeric ₹ price to relay');
      return;
    }
    const amount = Number(relayPrice.replace(/[,₹\s]/g, ''));
    setNegotiations((prev) => prev.map((n) => {
      if (n.id !== selectedNegoId) return n;
      const relayedSide = relaySide === 'as Seller' ? 'seller' : 'buyer';
      const party = relaySide === 'as Seller' ? n.seller : n.buyer;
      return {
        ...n,
        standing: amount,
        thread: [...n.thread, {
          who: `${party} (via Kunj Bihari, admin)`,
          side: relayedSide as 'seller' | 'buyer',
          price: `₹${amount.toLocaleString('en-IN')}`,
          time: 'just now · relayed by admin',
        }],
      };
    }));
    setRelayPrice('');
    flash('Offer relayed on their behalf — both parties see the admin tag');
  }, [relayPrice, relaySide, selectedNegoId, flash]);

  const exportCsv = useCallback((kind: 'trades' | 'listings' | 'generic', filename: string, csvRows: string[][]) => {
    downloadCsv(filename, csvRows);
    flash(kind === 'trades' ? 'Trades CSV downloaded' : 'CSV export downloaded');
  }, [flash]);

  const exportListingsWorkbook = useCallback(async () => {
    try {
      const headers = [
        'Firm', 'Phone', 'Commodity', 'Category', 'Quality', 'Quantity (bags)',
        'Weight (kg)', 'Price', 'Currency', 'Status', 'Price valid until',
        'Payment terms', 'Created at',
      ];
      let sellerRows: Array<Array<string | number>> = [];
      let buyerRows: Array<Array<string | number>> = [];

      if (liveMode) {
        const categories = await ensureCategories();
        const categoryName = (id: string) => categories.find((category) => category.id === id)?.name ?? '—';
        const fetchAllListings = async (side: 'SELL' | 'BUY') => {
          const firstPage = await listingsApi.list({
            side,
            status: 'active,price_expired,na,withdrawn,traded',
            page: 1,
            limit: 100,
          });
          const totalPages = firstPage.meta?.totalPages ?? 1;
          const remainingPages = await Promise.all(
            Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) =>
              listingsApi.list({
                side,
                status: 'active,price_expired,na,withdrawn,traded',
                page: index + 2,
                limit: 100,
              }).then((result) => result.data),
            ),
          );
          return [...firstPage.data, ...remainingPages.flat()];
        };
        const [sellers, buyers] = await Promise.all([
          fetchAllListings('SELL'),
          fetchAllListings('BUY'),
        ]);
        const toSheetRows = (listings: BackendListing[]) => listings.map((listing) => [
          listing.user?.firmName || listing.user?.name || '—',
          listing.user?.phone ?? '',
          listing.itemName,
          categoryName(listing.categoryId),
          listing.quality ?? '',
          listing.quantityBags ?? '',
          listing.weightKg ?? '',
          listing.price ?? '',
          listing.currency,
          BACKEND_STATUS_LABEL[listing.status] ?? listing.status,
          listing.priceValidUntil ?? '',
          listing.paymentTerms ?? '',
          listing.createdAt,
        ]);
        sellerRows = toSheetRows(sellers);
        buyerRows = toSheetRows(buyers);
      } else {
        const toSheetRows = (side: ListingRow['side']) => rows
          .filter((row) => row.side === side)
          .map((row) => [
            row.firm, row.subEntity, row.item, row.category, '',
            '', row.weight, row.price ?? '', '', row.status, row.validUntil, '', '',
          ]);
        sellerRows = toSheetRows('SELL');
        buyerRows = toSheetRows('BUY');
      }

      downloadListingsWorkbook(headers, sellerRows, buyerRows);
      flash('Seller and buyer listings workbook downloaded');
    } catch (error) {
      flash(error instanceof Error ? error.message : 'Could not export listings.');
    }
  }, [liveMode, ensureCategories, rows, flash]);

  const refreshBrokers = useCallback(async (requestedPage = brokerPage) => {
    if (!liveMode) return;
    setBrokersLoading(true);
    setBrokersError(null);
    try {
      const { data, meta } = await brokersApi.list({
        search: brokerSearch.trim() || undefined,
        active: brokerActiveFilter === 'all' ? undefined : brokerActiveFilter === 'true',
        page: requestedPage,
        limit: 20,
      });
      setBrokers(data.map(mapBackendBroker));
      setBrokerTotalPages(meta?.totalPages ?? 0);
      setBrokerTotal(meta?.total ?? 0);
    } catch (e) {
      setBrokers([]);
      setBrokerTotalPages(0);
      setBrokerTotal(0);
      setBrokersError(liveErr(e, 'Could not load brokers.'));
    } finally {
      setBrokersLoading(false);
    }
  }, [liveMode, brokerSearch, brokerActiveFilter, brokerPage]);

  const openBrokerAdd = useCallback(() => {
    setBrokerAddError(null);
    setBrokerAddOpen(true);
  }, []);

  const closeBrokerAdd = useCallback(() => {
    if (brokerAddSaving) return;
    setBrokerAddOpen(false);
  }, [brokerAddSaving]);

  const submitBrokerAdd = useCallback(async () => {
    setBrokerAddError(null);
    if (!isValidPhone(brokerAddPhone)) {
      setBrokerAddError('Enter a valid 10-digit mobile number.');
      return;
    }
    const hasType = brokerAddCommissionType.trim() !== '';
    const hasRate = brokerAddCommissionRate.trim() !== '';
    if (hasType !== hasRate) {
      setBrokerAddError('commissionType and commissionRate must be provided together');
      return;
    }
    setBrokerAddSaving(true);
    try {
      const created = await brokersApi.create({
        name: brokerAddName.trim(),
        phone: brokerAddPhone.trim(),
        commissionType: hasType ? (brokerAddCommissionType as Broker['commissionType']) : null,
        commissionRate: hasRate ? Number(brokerAddCommissionRate) : null,
      });
      setBrokerAddOpen(false);
      setBrokerAddName('');
      setBrokerAddPhone('');
      flash(`Broker "${created.name}" added`);
      if (brokerPage === 1) {
        await refreshBrokers(1);
      } else {
        setBrokerPage(1);
      }
    } catch (e) {
      setBrokerAddError(liveErr(e, 'Add failed.'));
    } finally {
      setBrokerAddSaving(false);
    }
  }, [brokerAddName, brokerAddPhone, brokerAddCommissionType, brokerAddCommissionRate, brokerPage, flash, refreshBrokers]);

  const openBrokerEdit = useCallback((id: string) => {
    const b = brokers.find((x) => x.id === id);
    setBrokerEditId(id);
    setBrokerEditName(b?.name ?? '');
    setBrokerEditPhone(b ? normalizePhone(b.phone) : '');
    setBrokerEditCommissionType(b?.commissionType ?? '');
    setBrokerEditCommissionRate(b?.commissionRate != null ? String(b.commissionRate) : '');
    setBrokerEditError(null);
  }, [brokers]);

  const closeBrokerEdit = useCallback(() => {
    if (brokerEditSaving) return;
    setBrokerEditId(null);
    setBrokerEditError(null);
  }, [brokerEditSaving]);

  const submitBrokerEdit = useCallback(async () => {
    if (!brokerEditId) return;
    setBrokerEditError(null);
    if (brokerEditPhone.trim() && !isValidPhone(brokerEditPhone)) {
      setBrokerEditError('Enter a valid 10-digit mobile number.');
      return;
    }
    const hasType = brokerEditCommissionType.trim() !== '';
    const hasRate = brokerEditCommissionRate.trim() !== '';
    if (hasType !== hasRate) {
      setBrokerEditError('commissionType and commissionRate must be provided together');
      return;
    }
    setBrokerEditSaving(true);
    try {
      const patch: Parameters<typeof brokersApi.update>[1] = {};
      if (brokerEditName.trim()) patch.name = brokerEditName.trim();
      if (brokerEditPhone.trim()) patch.phone = normalizePhone(brokerEditPhone);
      if (hasType) {
        patch.commissionType = brokerEditCommissionType as Broker['commissionType'];
        patch.commissionRate = Number(brokerEditCommissionRate);
      } else if (!hasType && !hasRate) {
        // Both blank = clear the commission
        patch.commissionType = null;
        patch.commissionRate = null;
      }
      await brokersApi.update(brokerEditId, patch);
      setBrokerEditId(null);
      flash('Broker updated');
      await refreshBrokers();
    } catch (e) {
      setBrokerEditError(liveErr(e, 'Update failed.'));
    } finally {
      setBrokerEditSaving(false);
    }
  }, [brokerEditId, brokerEditName, brokerEditPhone, brokerEditCommissionType, brokerEditCommissionRate, flash, refreshBrokers]);

  const deactivateBroker = useCallback(async (id: string) => {
    try {
      await brokersApi.deactivate(id);
      flash('Broker deactivated');
      await refreshBrokers();
      return true;
    } catch (e) {
      flash(liveErr(e, 'Deactivate failed.'));
      return false;
    }
  }, [flash, refreshBrokers]);

  const reactivateBroker = useCallback(async (id: string) => {
    try {
      await brokersApi.reactivate(id);
      flash('Broker reactivated');
      await refreshBrokers();
    } catch (e) {
      flash(liveErr(e, 'Reactivate failed.'));
    }
  }, [flash, refreshBrokers]);

  // Legacy stub callbacks (kept for backward compatibility with any existing references)
  const removeBroker = useCallback((name: string) => {
    setBrokers((prev) => prev.filter((b) => b.name !== name));
    flash(`Broker ${name} removed`);
  }, [flash]);

  const addBroker = useCallback(() => {
    flash('Use the Brokers page to add a broker.');
  }, [flash]);

  const addCategory = useCallback(() => {
    const v = newCategory.trim();
    if (!v) {
      flash('Type a category name first');
      return;
    }
    if (liveMode) {
      // POST /commodity-categories { name } — requireRole(['admin']).
      if (liveCategoriesRef.current.some((c) => c.name.toLowerCase() === v.toLowerCase())) {
        flash('That category already exists');
        return;
      }
      setCategoryError(null);
      void (async () => {
        try {
          await categoriesApi.create(v);
          await refreshCategories();
          setNewCategory('');
          flash(`Category “${v}” added`);
        } catch (e) {
          setCategoryError(liveErr(e, 'Add failed.'));
        }
      })();
      return;
    }
    if (categories.some((c) => c.toLowerCase() === v.toLowerCase())) {
      flash('That category already exists');
      return;
    }
    setCategories((prev) => [...prev, v]);
    setNewCategory('');
    flash(`Category “${v}” added`);
  }, [newCategory, categories, flash, liveMode, refreshCategories]);

  const renameCategory = useCallback((name: string) => {
    // PATCH /commodity-categories/:id { name } — admin only.
    const found = liveCategoriesRef.current.find((c) => c.name === name);
    if (!found) {
      flash('Reload categories before trying again.');
      return;
    }
    const next = window.prompt('Rename category:', name);
    if (!next || !next.trim() || next.trim() === name) return;
    setCategoryError(null);
    void (async () => {
      try {
        await categoriesApi.rename(found.id, next.trim());
        await refreshCategories();
        flash('Category renamed');
      } catch (e) {
        setCategoryError(liveErr(e, 'Rename failed.'));
      }
    })();
  }, [flash, refreshCategories]);

  const deleteCategory = useCallback((name: string) => {
    // DELETE /commodity-categories/:id — admin only; 409 when still referenced.
    const found = liveCategoriesRef.current.find((c) => c.name === name);
    if (!found) {
      flash('Reload categories before trying again.');
      return;
    }
    void (async () => {
      try {
        await categoriesApi.remove(found.id);
        await refreshCategories();
        flash('Category deleted');
      } catch (e) {
        flash(liveErr(e, 'Delete failed.'));
      }
    })();
  }, [flash, refreshCategories]);

  const saveSettings = useCallback(() => {
    if (liveMode) {
      // PATCH /settings/price_expiry_time { value: { time: "HH:mm" } } —
      // requireRole(['admin']). Timezone is a fixed backend constant
      // (Asia/Kolkata), not a stored setting.
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(expiryTime)) {
        flash('Expiry time must be HH:mm (24-hour).');
        return;
      }
      void (async () => {
        try {
          await settingsApi.update('price_expiry_time', { time: expiryTime });
          flash('Price expiry saved');
        } catch (e) {
          flash(liveErr(e, 'Save failed.'));
        }
      })();
      return;
    }
    flash('Settings saved — expiry settings updated');
  }, [flash, liveMode, expiryTime]);

  const saveFreightExpiry = useCallback(() => {
    if (!liveMode) return;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(freightExpiryTime)) {
      flash('Freight expiry time must be HH:mm (24-hour).');
      return;
    }
    void (async () => {
      try {
        await settingsApi.update('freight_expiry_time', { time: freightExpiryTime });
        flash('Freight expiry saved');
      } catch (e) {
        flash(liveErr(e, 'Freight expiry save failed.'));
      }
    })();
  }, [flash, freightExpiryTime, liveMode]);

  const publishPending = useCallback(() => {
    if (liveMode) return;
    setFreightRoutes((prev) => prev.map((r) => (r.status === 'Pending review' ? { ...r, status: 'Published' as const } : r)));
    flash('Published pending freight routes');
  }, [flash, liveMode]);

  const openFreightEdit = useCallback((id: number) => {
    const r = freightRoutes.find((x) => x.id === id);
    setFreightEditId(id);
    setFreightEditLow(r?.low == null ? '' : String(r.low));
    setFreightEditHigh(r?.high == null ? '' : String(r.high));
    setFreightEditCapacity(r ? r.capacity : '');
    setFreightEditError(null);
  }, [freightRoutes]);

  const closeFreightEdit = useCallback(() => {
    setFreightEditId(null);
    setFreightEditError(null);
  }, []);

  const saveFreightEdit = useCallback(() => {
    if (freightEditId == null) return;
    const low = Number(freightEditLow);
    const high = freightEditHigh.trim() === '' ? low : Number(freightEditHigh);
    if (!Number.isFinite(low) || low <= 0) {
      setFreightEditError('Price low must be a positive number.');
      return;
    }
    if (!Number.isFinite(high) || high < low) {
      setFreightEditError('Price high must be a number ≥ price low.');
      return;
    }
    const target = freightRoutes.find((r) => r.id === freightEditId);
    if (liveMode) {
      const backendId = target?.backendId;
      if (!backendId) {
        setFreightEditError('This route is stale — reload the list.');
        return;
      }
      setFreightEditError(null);
      void (async () => {
        try {
          await freightApi.update(backendId, {
            priceLow: low,
            priceHigh: high,
            truckCapacity: freightEditCapacity.trim() || null,
          });
          setFreightEditId(null);
          flash('Route saved');
          await refreshFreight();
        } catch (e) {
          setFreightEditError(liveErr(e, 'Route update failed.'));
        }
      })();
      return;
    }
    setFreightEditError(null);
    setFreightRoutes((prev) => prev.map((r) => (r.id === freightEditId
      ? { ...r, low, high, capacity: freightEditCapacity.trim() }
      : r)));
    setFreightEditId(null);
    flash('Route updated');
  }, [freightEditId, freightEditLow, freightEditHigh, freightEditCapacity, freightRoutes, liveMode, flash, refreshFreight]);

  const removeFreightRoute = useCallback((id: number) => {
    if (liveMode) {
      const backendId = freightRoutes.find((r) => r.id === id)?.backendId;
      if (!backendId) {
        flash('This route is stale — reload the list.');
        return;
      }
      void (async () => {
        try {
          await freightApi.remove(backendId);
          flash('Route removed');
          await refreshFreight();
        } catch (e) {
          flash(liveErr(e, 'Route removal failed.'));
        }
      })();
      return;
    }
    setFreightRoutes((prev) => prev.filter((r) => r.id !== id));
    flash('Route removed');
  }, [flash, liveMode, freightRoutes, refreshFreight]);

  const clearFreightUpload = useCallback(() => {
    setFreightUploadFile(null);
    setFreightUploadPreview(null);
    setFreightUploadError(null);
  }, []);

  const previewFreightUpload = useCallback(async (file: File) => {
    if (!liveMode) {
      setFreightUploadError('Configure VITE_API_BASE_URL and sign in to upload routes.');
      return;
    }
    setFreightUploadFile(file);
    setFreightUploadPreview(null);
    setFreightUploadError(null);
    setFreightUploadLoading(true);
    try {
      setFreightUploadPreview(await freightApi.previewUpload(file));
    } catch (e) {
      setFreightUploadError(liveErr(e, 'Could not preview the freight workbook.'));
    } finally {
      setFreightUploadLoading(false);
    }
  }, [liveMode]);

  const commitFreightUpload = useCallback(async () => {
    if (!freightUploadFile || !freightUploadPreview?.summary.canCommit || !liveMode) return;
    setFreightUploadError(null);
    setFreightUploadLoading(true);
    try {
      const result = await freightApi.commitUpload(freightUploadFile);
      clearFreightUpload();
      flash(`Workbook imported: ${result.created} created, ${result.updated} updated`);
      await refreshFreight();
    } catch (e) {
      setFreightUploadError(liveErr(e, 'Could not import the freight workbook.'));
    } finally {
      setFreightUploadLoading(false);
    }
  }, [freightUploadFile, freightUploadPreview, liveMode, clearFreightUpload, flash, refreshFreight]);

  const addFreightRoute = useCallback(async (): Promise<boolean> => {
    if (!newFreightOrigin.trim()) {
      setNewFreightError('Add an origin state first.');
      return false;
    }
    if (!newFreightDest.trim() || !newFreightLow.trim()) {
      setNewFreightError('Add a destination and price first.');
      return false;
    }
    const low = Number(newFreightLow);
    const high = newFreightHigh.trim() === '' ? low : Number(newFreightHigh);
    if (!Number.isFinite(low) || low <= 0) {
      setNewFreightError('Price low must be a positive number.');
      return false;
    }
    if (!Number.isFinite(high) || high < low) {
      setNewFreightError('Price high must be ≥ price low.');
      return false;
    }
    setNewFreightError(null);
    if (liveMode) {
      try {
        await freightApi.create({
          originName: newFreightOrigin.trim(),
          destinationName: newFreightDest.trim(),
          priceLow: low,
          priceHigh: high,
          unit: 'per_quintal',
          truckCapacity: newFreightCapacity.trim() || null,
        });
        setNewFreightOrigin('');
        setNewFreightDest('');
        setNewFreightLow('');
        setNewFreightHigh('');
        setNewFreightCapacity('');
        setFreightPage(1);
        flash('Route added');
        await refreshFreight(1);
        return true;
      } catch (e) {
        setNewFreightError(liveErr(e, 'Route creation failed.'));
        return false;
      }
    }
    setFreightRoutes((prev) => [
      {
        id: Math.max(0, ...prev.map((r) => r.id)) + 1,
        origin: newFreightOrigin.trim(),
        dest: newFreightDest.trim(),
        low, high,
        capacity: newFreightCapacity.trim() || '30-35 MT',
        status: 'Published',
      },
      ...prev,
    ]);
    setFreightPage(1);
    setNewFreightOrigin('');
    setNewFreightDest('');
    setNewFreightLow('');
    setNewFreightHigh('');
    setNewFreightCapacity('');
    flash('Route added and published');
    return true;
  }, [newFreightDest, newFreightLow, newFreightHigh, newFreightCapacity, newFreightOrigin, liveMode, flash, refreshFreight]);

  const value = useMemo<AdminState>(() => ({
    searchQuery, setSearchQuery, toast, flash,
    users, userFilter, setUserFilter, suspendUser, updateUser,
    usersLoading, usersError, refreshUsers,
    invites, revokeInvite,
    inviteePhone, setInviteePhone, inviteeFirm, setInviteeFirm,
    inviteBuyer, toggleInviteBuyer: () => {
      setInviteBuyer(true);
      setInviteSeller(false);
    },
    inviteSeller, toggleInviteSeller: () => {
      setInviteBuyer(false);
      setInviteSeller(true);
    },
    inviteError, sendInvite,
    rows, sideFilter, setSideFilter, catFilter, setCatFilter, statusFilter, setStatusFilter,
    editId, openEdit, closeEdit, editPrice, setEditPrice, editQuantity, setEditQuantity, editWeight, setEditWeight,
    editReason, setEditReason, editError, saveEdit, forceExpire, withdrawListing, restoreListing,
    negotiations, negoFilter, setNegoFilter, selectedNegoId, selectNego,
    nudgeMessage, setNudgeMessage, relayPrice, setRelayPrice, relaySide, setRelaySide,
    nudge, relay,
    trades, exportCsv, exportListingsWorkbook,
    brokers, brokersLoading, brokersError,
    brokerPage, setBrokerPage, brokerTotalPages, brokerTotal,
    brokerSearch, setBrokerSearch, brokerActiveFilter, setBrokerActiveFilter,
    refreshBrokers,
    brokerAddOpen, openBrokerAdd, closeBrokerAdd,
    brokerAddName, setBrokerAddName, brokerAddPhone, setBrokerAddPhone,
    brokerAddCommissionType, setBrokerAddCommissionType,
    brokerAddCommissionRate, setBrokerAddCommissionRate,
    brokerAddError, brokerAddSaving, submitBrokerAdd,
    brokerEditId, openBrokerEdit, closeBrokerEdit,
    brokerEditName, setBrokerEditName, brokerEditPhone, setBrokerEditPhone,
    brokerEditCommissionType, setBrokerEditCommissionType,
    brokerEditCommissionRate, setBrokerEditCommissionRate,
    brokerEditError, brokerEditSaving, submitBrokerEdit,
    deactivateBroker, reactivateBroker,
    removeBroker, addBroker,
    categories, addCategory, newCategory, setNewCategory,
    expiryTime, setExpiryTime, freightExpiryTime, setFreightExpiryTime, timezone, setTimezone,
    defaultPaymentTerms, setDefaultPaymentTerms, saveSettings, saveFreightExpiry,
    audit, auditAdmin, setAuditAdmin, auditAction, setAuditAction, auditQuery, setAuditQuery,
    freightRoutes, freightSearch, setFreightSearch,
    freightLoading, freightError, freightPage, setFreightPage, freightTotal, freightTotalPages, refreshFreight,
    freightUploadFile, freightUploadPreview, freightUploadLoading, freightUploadError,
    previewFreightUpload, commitFreightUpload, clearFreightUpload,
    freightStatusFilter, setFreightStatusFilter, publishPending,
    freightEditId, openFreightEdit, closeFreightEdit,
    freightEditLow, setFreightEditLow, freightEditHigh, setFreightEditHigh,
    freightEditCapacity, setFreightEditCapacity, freightEditError, saveFreightEdit,
    removeFreightRoute,
    newFreightOrigin, setNewFreightOrigin, newFreightDest, setNewFreightDest,
    newFreightLow, setNewFreightLow, newFreightHigh, setNewFreightHigh,
    newFreightCapacity, setNewFreightCapacity, newFreightError, setNewFreightError, addFreightRoute,
    liveMode,
    invitesLoading, invitesError, refreshInvites,
    listingsLoading, listingsError, listingPage, setListingPage,
    listingTotal, listingTotalPages, refreshListings,
    settingsLoading, settingsError, refreshLiveSettings,
    liveCategories, categoryError, refreshCategories, renameCategory, deleteCategory,
    liveCommodities, commoditiesLoading, commodityError, refreshCommodities,
    addCommodity, renameCommodity, deleteCommodity,
    liveQualities, qualitiesLoading, qualitiesError, refreshQualities, addQualities,
    renameQuality, deleteQuality,
    tosVersions, tosVersionsLoading, tosVersionsError, refreshTosVersions, publishTosVersion,
  }), [
    searchQuery, toast, flash,
    users, userFilter, suspendUser, updateUser, invites, revokeInvite,
    usersLoading, usersError, refreshUsers,
    inviteePhone, inviteeFirm, inviteBuyer, inviteSeller, inviteError, sendInvite,
    rows, sideFilter, catFilter, statusFilter, editId, openEdit, closeEdit,
    editPrice, editQuantity, editWeight, editReason, editError, saveEdit, forceExpire, withdrawListing, restoreListing,
    negotiations, negoFilter, selectedNegoId, selectNego,
    nudgeMessage, relayPrice, relaySide, nudge, relay, trades, exportCsv, exportListingsWorkbook,
    brokers, brokersLoading, brokersError,
    brokerPage, brokerTotalPages, brokerTotal,
    brokerSearch, brokerActiveFilter, refreshBrokers,
    brokerAddOpen, openBrokerAdd, closeBrokerAdd,
    brokerAddName, brokerAddPhone, brokerAddCommissionType, brokerAddCommissionRate,
    brokerAddError, brokerAddSaving, submitBrokerAdd,
    brokerEditId, openBrokerEdit, closeBrokerEdit,
    brokerEditName, brokerEditPhone, brokerEditCommissionType, brokerEditCommissionRate,
    brokerEditError, brokerEditSaving, submitBrokerEdit,
    deactivateBroker, reactivateBroker,
    removeBroker, addBroker, categories, addCategory, newCategory,
    expiryTime, freightExpiryTime, timezone, defaultPaymentTerms, saveSettings, saveFreightExpiry,
    audit, auditAdmin, auditAction, auditQuery,
    freightRoutes, freightLoading, freightError, freightPage, freightTotal, freightTotalPages, refreshFreight,
    freightUploadFile, freightUploadPreview, freightUploadLoading, freightUploadError,
    previewFreightUpload, commitFreightUpload, clearFreightUpload,
    freightSearch, freightStatusFilter, publishPending,
    freightEditId, openFreightEdit, closeFreightEdit,
    freightEditLow, freightEditHigh, freightEditCapacity, freightEditError, saveFreightEdit,
    removeFreightRoute, newFreightOrigin, newFreightDest, newFreightLow, newFreightHigh,
    newFreightCapacity, newFreightError, setNewFreightError, addFreightRoute,
    liveMode,
    invitesLoading, invitesError, refreshInvites,
    listingsLoading, listingsError, listingPage, setListingPage,
    listingTotal, listingTotalPages, refreshListings,
    settingsLoading, settingsError, refreshLiveSettings,
    liveCategories, categoryError, refreshCategories, renameCategory, deleteCategory,
    liveCommodities, commoditiesLoading, commodityError, refreshCommodities,
    addCommodity, renameCommodity, deleteCommodity,
    liveQualities, qualitiesLoading, qualitiesError, refreshQualities, addQualities,
    renameQuality, deleteQuality,
    tosVersions, tosVersionsLoading, tosVersionsError, refreshTosVersions, publishTosVersion,
  ]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}
