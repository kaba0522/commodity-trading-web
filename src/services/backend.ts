/**
 * Typed client for every backend route (D:\Tradding_backend\routes),
 * verified against the route/controller/service sources.
 *
 * Admin-only story: the backend enforces admin access server-side via
 * `requireRole(['admin'])` (middleware/auth.js). This module marks each
 * function with the roles the backend requires so the UI can:
 *  - call admin routes only for admin sessions (see RequireAdmin in App.tsx),
 *  - surface 403s honestly instead of inventing endpoints.
 *
 * Routes with NO backend endpoint remain unavailable rather than being
 * simulated (negotiations and trades).
 */
import { api, buildQuery } from './api';

/* ---------- shared ---------- */

/** Backend stores phones as +91XXXXXXXXXX (lib/validators.js). */
export function toE164Indian(digits10: string): string {
  return `+91${digits10}`;
}

/* ---------- auth (routes/auth.js — public) ---------- */

export interface BackendUser {
  id: string;
  phone: string;
  name: string | null;
  firmName: string | null;
  roles: string[];
  status: string;
  city: string | null;
  tosAcceptedVersion: number | null;
  tosAcceptedAt: string | null;
}

export interface VerifyOtpResult {
  accessToken: string;
  refreshToken: string;
  user: BackendUser;
}

export const authApi = {
  /** POST /auth/login { phone } — sends the OTP (dev backend: code is 1111). */
  login: (phoneE164: string) =>
    api.post<{ message: string }>('/auth/login', { phone: phoneE164 }),
  /** POST /auth/verify-otp { phone, otp } — note the field is `otp`. */
  verifyOtp: (phoneE164: string, otp: string) =>
    api.post<VerifyOtpResult>('/auth/verify-otp', { phone: phoneE164, otp }),
  /** POST /auth/logout { refreshToken } — revokes the token server-side. */
  logout: (refreshToken: string) =>
    api.post<{ message: string }>('/auth/logout', { refreshToken }),
};

/* ---------- invites (routes/invites.js — admin OR broker) ---------- */

export type RoleHint = 'buyer' | 'seller';

export interface BackendInvite {
  id: string;
  phone: string;
  roleHint: string;
  status: 'pending' | 'accepted' | 'revoked';
  invitedById: string | null;
  createdAt: string;
}

export interface InviteFilters {
  status?: string;
  phone?: string;
  roleHint?: string;
  page?: number;
  limit?: number;
}

export const invitesApi = {
  /** GET /invites?status=&phone=&roleHint=&page=&limit= */
  list: (f: InviteFilters = {}) =>
    api.getPage<BackendInvite[]>(`/invites${buildQuery({
      status: f.status, phone: f.phone, roleHint: f.roleHint,
      page: f.page, limit: f.limit,
    })}`),
  /** POST /invites { phone, roleHint: 'buyer'|'seller' } */
  send: (phoneE164: string, roleHint: RoleHint) =>
    api.post<BackendInvite>('/invites', { phone: phoneE164, roleHint }),
  /** PATCH /invites/:id/cancel */
  cancel: (id: string) =>
    api.patch<BackendInvite>(`/invites/${id}/cancel`, {}),
};

/* ---------- listings (routes/listings.js — authenticated + ToS gate) ---------- */

export type BackendListingSide = 'SELL' | 'BUY';
export type BackendListingStatus = 'active' | 'price_expired' | 'na' | 'withdrawn' | 'traded';

export interface BackendListingUser {
  id?: string;
  name: string | null;
  firmName: string | null;
  phone?: string;
  city?: string | null;
  roles?: string[];
}

export interface BackendListing {
  id: string;
  side: BackendListingSide;
  userId: string;
  categoryId: string;
  commodityId: string;
  qualityId: string | null;
  itemName: string;
  quality: string | null;
  quantityBags: number | null;
  weightKg: number | null;
  price: number | null;
  currency: string;
  status: BackendListingStatus;
  priceValidUntil: string | null;
  paymentTerms: number | null;
  createdAt: string;
  user?: BackendListingUser;
}

export interface BackendListingOwner {
  id: string;
  name: string | null;
  firmName: string | null;
  phone: string;
  roles: string[];
  city: string | null;
  status: 'active' | 'suspended' | 'deactivated';
  defaultPaymentTerms: number | null;
}

export interface ListingOwnerFilters {
  search?: string;
  role?: 'buyer' | 'seller' | 'broker' | 'admin';
  status?: BackendListingOwner['status'];
  page?: number;
  limit?: number;
}

export const listingOwnersApi = {
  /** GET /users — admin picker for creating listings on behalf of an owner. */
  list: (f: ListingOwnerFilters = {}) =>
    api.getPage<BackendListingOwner[]>(`/users${buildQuery({
      search: f.search, role: f.role, status: f.status,
      page: f.page, limit: f.limit,
    })}`),
};

export interface ListingFilters {
  side: BackendListingSide;
  status?: string;
  categoryId?: string;
  commodityId?: string;
  itemName?: string;
  page?: number;
  limit?: number;
}

interface ListingCreateBase {
  ownerUserId?: string;
  categoryId: string;
  commodityId: string;
  qualityId: string;
  quantityBags: number;
}

export type ListingCreateBody =
  | (ListingCreateBase & { side: 'BUY' })
  | (ListingCreateBase & {
  side: 'SELL';
  weightKg?: number | null;
  price?: number | null;
  photoUrls?: string[];
  videoUrls?: string[];
  moisture?: string;
  color?: string;
  size?: string;
  paymentTerms?: number;
  notes?: string;
});

export interface BulkConfirmListingRow {
  rowIndex: number;
  categoryId: string;
  commodityId: string;
  qualityId: string;
  quantityBags: number;
  weightKg?: number | null;
  price?: number | null;
  paymentTerms?: number | null;
  notes?: string | null;
  moisture?: string | null;
  color?: string | null;
  size?: string | null;
}

export interface BulkConfirmListingsResult {
  created: Array<{ rowIndex: number; listingId: string }>;
  updated: Array<{ rowIndex: number; listingId: string }>;
  failed: Array<{ rowIndex: number; reason: string }>;
}

export interface ListingUpdateBody {
  categoryId?: string;
  commodityId?: string;
  qualityId?: string;
  quantityBags?: number;
  weightKg?: number;
  price?: number;
  paymentTerms?: number;
  photoUrls?: string[];
  videoUrls?: string[];
  moisture?: string;
  color?: string;
  size?: string;
  notes?: string;
}

export const listingsApi = {
  /**
   * GET /listings?side=&status=&... — admin sessions see every user's rows
   * across both sides and all statuses (services/listing.service.js).
   */
  list: (f: ListingFilters) =>
    api.getPage<BackendListing[]>(`/listings${buildQuery({
      side: f.side, status: f.status, categoryId: f.categoryId,
      commodityId: f.commodityId, itemName: f.itemName,
      page: f.page, limit: f.limit,
    })}`),
  /** POST /listings — always submit the selected quality UUID, never its label. */
  create: (body: ListingCreateBody) =>
    api.post<BackendListing>('/listings', body),
  /** POST /listings/bulk-confirm — side and owner identify the bulk listing set. */
  bulkConfirm: (rows: BulkConfirmListingRow[], side: BackendListingSide, ownerUserId: string) =>
    api.post<BulkConfirmListingsResult>('/listings/bulk-confirm', { rows, side, ownerUserId }),
  /** GET /listings/:id */
  getById: (id: string) => api.get<BackendListing>(`/listings/${id}`),
  /** PATCH /listings/:id — admins may edit on behalf of the owner; edits are audited. */
  update: (id: string, patch: ListingUpdateBody) =>
    api.patch<BackendListing>(`/listings/${id}`, patch),
  /** PATCH /listings/:id/withdraw - owner-only. */
  withdraw: (id: string) =>
    api.patch<BackendListing>(`/listings/${id}/withdraw`, {}),
  /**
   * PATCH /listings/:id/restore - undo a withdrawal (admin/owner).
   * SELL: send { price } to restore as active, or omit it to restore as N/A.
   * BUY: omit the body (sending a price is rejected).
   */
  restore: (id: string, body?: { price: number }) =>
    api.patch<BackendListing>(`/listings/${id}/restore`, body),
  /** PATCH /listings/:id/force-expire — admin only. */
  forceExpire: (id: string) =>
    api.patch<BackendListing>(`/listings/${id}/force-expire`, {}),
};

/* ---------- listing activity directory (derived from listing owners) ---------- */

export interface BackendDirectoryUser {
  id: string;
  name: string | null;
  firmName: string | null;
  phone: string;
  roles: string[];
  /** Newest listing/requirement this user created (ISO string), if any. */
  lastListingAt: string | null;
  /** Payment terms (days) copied onto their most recent listing. */
  paymentTerms: number | null;
}

const DIRECTORY_PAGE_SIZE = 100;
// Admin sessions see every row regardless of status (services/listing.service.js).
const DIRECTORY_STATUSES = 'active,price_expired,na,withdrawn,traded';

/**
 * Preserves listing activity data for the users screen. Listing creation
 * uses listingOwnersApi instead, which includes active users with no listings.
 */
export const userDirectoryApi = {
  list: async (): Promise<BackendDirectoryUser[]> => {
    const byId = new Map<string, BackendDirectoryUser>();

    for (const side of ['SELL', 'BUY'] as const) {
      let page = 1;
      let totalPages = 1;
      do {
        const { data, meta } = await listingsApi.list({
          side,
          status: DIRECTORY_STATUSES,
          page,
          limit: DIRECTORY_PAGE_SIZE,
        });

        for (const listing of data) {
          const owner = listing.user;
          const id = listing.userId;
          if (!owner || !id) continue;

          const latestAt = listing.createdAt || null;
          const terms = typeof listing.paymentTerms === 'number' ? listing.paymentTerms : null;
          const existing = byId.get(id);

          if (!existing) {
            byId.set(id, {
              id,
              name: owner.name,
              firmName: owner.firmName,
              phone: owner.phone ?? '',
              roles: owner.roles ?? [],
              lastListingAt: latestAt,
              paymentTerms: terms,
            });
            continue;
          }

          if (latestAt && (!existing.lastListingAt || latestAt > existing.lastListingAt)) {
            existing.lastListingAt = latestAt;
            if (terms != null) existing.paymentTerms = terms;
          } else if (existing.paymentTerms == null && terms != null) {
            existing.paymentTerms = terms;
          }
          if (!existing.name && owner.name) existing.name = owner.name;
          if (!existing.firmName && owner.firmName) existing.firmName = owner.firmName;
          if (!existing.phone && owner.phone) existing.phone = owner.phone;
          if (!existing.roles.length && owner.roles?.length) existing.roles = owner.roles;
        }

        totalPages = meta?.totalPages ?? 1;
        page += 1;
      } while (page <= totalPages);
    }

    return [...byId.values()].sort((a, b) => {
      const an = (a.firmName || a.name || a.phone).toLowerCase();
      const bn = (b.firmName || b.name || b.phone).toLowerCase();
      return an.localeCompare(bn) || a.id.localeCompare(b.id);
    });
  },
};

/* ---------- freight (routes/freight.js — authenticated; writes: admin) ---------- */

export interface BackendFreightRoute {
  id: string;
  originName: string;
  destinationName: string;
  priceLow: number | null;
  priceHigh: number | null;
  unit: string;
  truckCapacity: string | null;
  priceValidUntil: string | null;
  status: 'active' | 'price_expired';
  updatedAt: string;
}

export interface FreightFilters {
  origin?: string;
  destination?: string;
  page?: number;
  limit?: number;
}

export interface FreightUploadPreview {
  summary: {
    totalRows: number;
    toCreate: number;
    toUpdate: number;
    invalidRows: number;
    canCommit: boolean;
  };
  rows: Array<{
    rowNumber: number;
    valid: boolean;
    errors: string[];
    action: 'create' | 'update' | null;
  }>;
}

export const freightApi = {
  /** GET /freight?origin=&destination=&page=&limit= */
  list: (f: FreightFilters = {}) =>
    api.getPage<BackendFreightRoute[]>(`/freight${buildQuery({
      origin: f.origin,
      destination: f.destination,
      page: f.page,
      limit: f.limit,
    })}`),
  /** POST /freight — admin only. */
  create: (body: {
    originName: string;
    destinationName: string;
    priceLow: number;
    priceHigh: number;
    unit: string;
    truckCapacity: string | null;
  }) => api.post<BackendFreightRoute>('/freight', body),
  /** PATCH /freight/:id — admin only. */
  update: (id: string, body: {
    priceLow?: number;
    priceHigh?: number;
    truckCapacity?: string | null;
  }) => api.patch<BackendFreightRoute>(`/freight/${id}`, body),
  /** DELETE /freight/:id — admin only, 204. */
  remove: (id: string) => api.del(`/freight/${id}`),
  /** POST /freight/upload/preview — admin only; multipart field `file`. */
  previewUpload: (file: File) => {
    const body = new FormData();
    body.append('file', file);
    return api.postForm<FreightUploadPreview>('/freight/upload/preview', body);
  },
  /** POST /freight/upload/commit — admin only; multipart field `file`. */
  commitUpload: (file: File) => {
    const body = new FormData();
    body.append('file', file);
    return api.postForm<{ created: number; updated: number; totalRows: number }>('/freight/upload/commit', body);
  },
};

/* ---------- settings (routes/settings.js — read: authed, PATCH: admin) ---------- */

export interface BackendSetting {
  key: string;
  value: unknown;
  updatedBy: string | null;
  updatedAt: string;
}

export interface SettingFilters {
  key?: string;
  page?: number;
  limit?: number;
}

export const settingsApi = {
  /** GET /settings?key=&page=&limit= — any authenticated user. */
  list: (f: SettingFilters = {}) =>
    api.getPage<BackendSetting[]>(`/settings${buildQuery({
      key: f.key, page: f.page, limit: f.limit,
    })}`),
  /** GET /settings/:key */
  getByKey: (key: string) => api.get<BackendSetting>(`/settings/${encodeURIComponent(key)}`),
  /** PATCH /settings/:key { value } — upsert, requireRole(['admin']). */
  update: (key: string, value: unknown) =>
    api.patch<BackendSetting>(`/settings/${encodeURIComponent(key)}`, { value }),
};

/* ---------- commodity categories (authenticated + ToS; writes: admin) ---------- */

export interface BackendCategory {
  id: string;
  name: string;
  qualityCount?: number;
  createdAt?: string;
}

export interface CategoryFilters {
  name?: string;
  page?: number;
  limit?: number;
}

export const categoriesApi = {
  /** GET /commodity-categories?name=&page=&limit= */
  list: (f: CategoryFilters = {}) =>
    api.getPage<BackendCategory[]>(`/commodity-categories${buildQuery({
      name: f.name, page: f.page, limit: f.limit ?? 100,
    })}`),
  /** POST /commodity-categories { name } — admin only. */
  create: (name: string) =>
    api.post<BackendCategory>('/commodity-categories', { name }),
  /** PATCH /commodity-categories/:id { name } — admin only. */
  rename: (id: string, name: string) =>
    api.patch<BackendCategory>(`/commodity-categories/${id}`, { name }),
  /** DELETE /commodity-categories/:id — admin only, 204. 409 if referenced. */
  remove: (id: string) => api.del(`/commodity-categories/${id}`),
};

/* ---------- commodities (authenticated + ToS; writes: admin) ---------- */

export interface BackendCommodity {
  id: string;
  categoryId: string;
  name: string;
  createdAt?: string;
  category?: { name: string };
}

export interface CommodityFilters {
  categoryId?: string;
  name?: string;
  page?: number;
  limit?: number;
}

export const commoditiesApi = {
  /** GET /commodities?categoryId=&name=&page=&limit= */
  list: (f: CommodityFilters = {}) =>
    api.getPage<BackendCommodity[]>(`/commodities${buildQuery({
      categoryId: f.categoryId, name: f.name, page: f.page, limit: f.limit ?? 100,
    })}`),
  /** POST /commodities { categoryId, name } — admin only. */
  create: (categoryId: string, name: string) =>
    api.post<BackendCommodity>('/commodities', { categoryId, name }),
  /** PATCH /commodities/:id { name?, categoryId? } — admin only. */
  update: (id: string, patch: { name?: string; categoryId?: string }) =>
    api.patch<BackendCommodity>(`/commodities/${id}`, patch),
  /** DELETE /commodities/:id — admin only, 204. */
  remove: (id: string) => api.del(`/commodities/${id}`),
};

/* ---------- qualities (routes/qualities.js — authenticated; writes: admin) ---------- */

export interface BackendQuality {
  id: string;
  categoryId: string;
  name: string;
  createdAt: string;
  category?: { name: string };
}

export interface QualityBulkCreateResult {
  created: BackendQuality[];
  skipped: string[];
}

export interface QualityFilters {
  categoryId?: string;
  name?: string;
  page?: number;
  limit?: number;
}

export const qualitiesApi = {
  /** GET /qualities?categoryId=&name=&page=&limit= */
  list: (f: QualityFilters = {}) =>
    api.getPage<BackendQuality[]>(`/qualities${buildQuery({
      categoryId: f.categoryId, name: f.name, page: f.page, limit: f.limit ?? 20,
    })}`),
  /** POST /qualities { categoryId, name } — admin only. */
  create: (categoryId: string, name: string) =>
    api.post<BackendQuality>('/qualities', { categoryId, name }),
  /** POST /qualities { categoryId, names } — admin only, idempotent bulk create. */
  createMany: (categoryId: string, names: string[]) =>
    api.post<QualityBulkCreateResult>('/qualities', { categoryId, names }),
  /** PATCH /qualities/:id { name } — admin only. */
  rename: (id: string, name: string) =>
    api.patch<BackendQuality>(`/qualities/${id}`, { name }),
  /** DELETE /qualities/:id — admin only, 204. */
  remove: (id: string) => api.del(`/qualities/${id}`),
};

/* ---------- ToS (routes/tos.js — authenticated; gate for listings writes) ---------- */

export interface TosStatus {
  needsAcceptance: boolean;
  currentVersion: {
    version: number;
    termsUrl: string | null;
    privacyUrl: string | null;
    effectiveDate: string;
  };
  acceptedVersion: number | null;
  acceptedAt: string | null;
}

export const tosApi = {
  /** GET /tos/status */
  status: () => api.get<TosStatus>('/tos/status'),
  /** POST /tos/accept { version } */
  accept: (version: number) => api.post<TosStatus>('/tos/accept', { version }),
};

/* ---------- brokers (routes/brokers.js — admin only) ---------- */

export interface BackendBrokerUser {
  id: string;
  name: string;
  phone: string;
}

export type BackendCommissionType = 'percent' | 'per_bag' | 'flat';

export interface BackendBroker {
  id: string;
  name: string;
  phone: string;
  commissionType: BackendCommissionType | null;
  commissionRate: number | null;
  active: boolean;
  createdById: string;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: BackendBrokerUser;
  updatedBy: BackendBrokerUser | null;
  /** Only included on GET /:id */
  tradeCount?: number;
}

export interface BrokerListFilters {
  search?: string;
  active?: boolean;
  page?: number;
  limit?: number;
}

export interface BrokerCreateBody {
  name: string;
  phone: string;
  commissionType?: BackendCommissionType | null;
  commissionRate?: number | null;
}

export interface BrokerPatchBody {
  name?: string;
  phone?: string;
  commissionType?: BackendCommissionType | null;
  commissionRate?: number | null;
}

export const brokersApi = {
  /** GET /brokers?search=&active=&page=&limit= — admin only. */
  list: (f: BrokerListFilters = {}) =>
    api.getPage<BackendBroker[]>(`/brokers${buildQuery({
      search: f.search,
      active: f.active !== undefined ? String(f.active) : undefined,
      page: f.page,
      limit: f.limit,
    })}`),
  /** GET /brokers/:id — admin only; includes tradeCount. */
  getById: (id: string) => api.get<BackendBroker>(`/brokers/${id}`),
  /** POST /brokers — admin only. */
  create: (body: BrokerCreateBody) => api.post<BackendBroker>('/brokers', body),
  /** PATCH /brokers/:id — admin only. */
  update: (id: string, body: BrokerPatchBody) => api.patch<BackendBroker>(`/brokers/${id}`, body),
  /** DELETE /brokers/:id — soft delete (sets active = false). Returns updated broker (200). */
  deactivate: (id: string) => api.delTyped<BackendBroker>(`/brokers/${id}`),
  /** PATCH /brokers/:id/reactivate — sets active = true. */
  reactivate: (id: string) => api.patch<BackendBroker>(`/brokers/${id}/reactivate`, {}),
};

/* ---------- audit logs (routes/audit-logs.js — admin, read-only) ---------- */

export interface BackendAuditActor {
  id: string;
  name: string | null;
  phone: string;
  firmName: string | null;
}

export interface BackendAuditEntry {
  id: string;
  actorUserId: string;
  action: string;
  entity: string;
  entityId: string;
  createdAt: string;
  actor: BackendAuditActor;
  changedFields: string[];
  before?: unknown;
  after?: unknown;
}

export interface BackendAuditFilters {
  actorUserId?: string;
  action?: string;
  entity?: string;
  entityId?: string;
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface BackendAuditFilterOptions {
  actions: string[];
  entities: string[];
  actors: BackendAuditActor[];
}

export const auditLogsApi = {
  /** GET /audit-logs — newest first; list rows omit before/after snapshots. */
  list: (filters: BackendAuditFilters = {}) =>
    api.getPage<BackendAuditEntry[]>(`/audit-logs${buildQuery({
      actorUserId: filters.actorUserId,
      action: filters.action,
      entity: filters.entity,
      entityId: filters.entityId,
      q: filters.q,
      from: filters.from,
      to: filters.to,
      page: filters.page,
      limit: filters.limit,
    })}`),
  /** GET /audit-logs/filters — values present in the audit log. */
  filters: () => api.get<BackendAuditFilterOptions>('/audit-logs/filters'),
  /** GET /audit-logs/:id — includes full before/after snapshots. */
  getById: (id: string) => api.get<BackendAuditEntry>(`/audit-logs/${encodeURIComponent(id)}`),
};

export interface TosVersion {
  id: string;
  version: number;
  effectiveDate: string;
  termsUrl: string | null;
  privacyUrl: string | null;
}

export const tosVersionsApi = {
  /** GET /tos-versions — admin only. */
  list: (page = 1, limit = 20) =>
    api.getPage<TosVersion[]>(`/tos-versions${buildQuery({ page, limit })}`),
  /** POST /tos-versions { effectiveDate, termsUrl, privacyUrl } — admin only. */
  publish: (body: { effectiveDate: string; termsUrl: string; privacyUrl: string }) =>
    api.post<TosVersion>('/tos-versions', body),
};
