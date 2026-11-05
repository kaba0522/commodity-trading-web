/** Shared domain types for the KKPK admin console. */

export type ScreenKey =
  | 'dash'
  | 'users'
  | 'listings'
  | 'negotiations'
  | 'trades'
  | 'settings'
  | 'commodities'
  | 'audit'
  | 'freight'
  | 'brokers';

export interface NavItem {
  key: ScreenKey;
  label: string;
  badge: string;
}

export interface UserRecord {
  id: number;
  /** Backend user id when loaded live (derived from listing owners). */
  backendId?: string;
  firm: string;
  owner: string;
  phone: string;
  modes: string[];
  status: 'Active' | 'Pending' | 'Suspended';
  invitedBy: string;
  lastActive: string;
  paymentTerms: string;
}

export interface Invite {
  id: number;
  /** Firm name captured when the invite was created (blank for live invites). */
  firm: string;
  /** Invitee mobile number, formatted for display. */
  phone?: string;
  meta: string;
  /** Backend UUID when loaded live (invites API). Local rows omit it. */
  backendId?: string;
}

export type ListingSide = 'SELL' | 'BUY';

export interface ListingRow {
  id: number;
  side: ListingSide;
  firm: string;
  subEntity: string;
  item: string;
  quality: string;
  category: string;
  weight: string;
  quantityBags?: number | null;
  price: number | null;
  status: 'Active' | 'Traded' | 'Price expired' | 'Withdrawn' | 'N/A';
  validUntil: string;
  /** Backend UUID when loaded live (listings API). Local rows omit it. */
  backendId?: string;
}

export interface NegoMessage {
  who: string;
  side: 'buyer' | 'seller' | 'admin';
  price: string;
  time: string;
}

export interface Negotiation {
  id: number;
  item: string;
  seller: string;
  buyer: string;
  bags: number;
  standing: number;
  state: 'Active' | 'Stalled' | 'Near expiry' | 'Completed';
  expiry: string;
  urgent: boolean;
  thread: NegoMessage[];
}

export interface Trade {
  code: string;
  item: string;
  seller: string;
  buyer: string;
  bags: number;
  price: number;
  broker: string;
}

/** A broker record from GET /api/v1/brokers. */
export interface BrokerUser {
  id: string;
  name: string;
  phone: string;
}

export type CommissionType = 'percent' | 'per_bag' | 'flat';

export interface Broker {
  id: string;
  name: string;
  phone: string;
  commissionType: CommissionType | null;
  commissionRate: number | null;
  active: boolean;
  createdById: string;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: BrokerUser;
  updatedBy: BrokerUser | null;
  /** Included only on GET /:id */
  tradeCount?: number;
}

export interface FreightRoute {
  id: number;
  /** Backend UUID when loaded live (freight API). */
  backendId?: string;
  origin: string;
  dest: string;
  low: number | null;
  high: number | null;
  capacity: string;
  status: 'Published' | 'Pending review' | 'Price expired';
}

export interface AuditEntry {
  when: string;
  admin: string;
  action: string;
  entity: string;
  before: string;
  after: string;
}

export interface QueueItem {
  count: string;
  title: string;
  meta: string;
  action: string;
  target: ScreenKey;
  tone: 'info' | 'warn' | 'bad';
}

export interface ActivityItem {
  time: string;
  text: string;
}
