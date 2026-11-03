/**
 * Static UI constants for the KKPK admin console.
 *
 * These are presentation config — nav structure, page headers, tag styling —
 * not data. All rows shown in the console come from the backend API or from
 * actions taken in the current session. Nothing here is fake data.
 */
import type { NavItem } from '../types';

export const NAV: NavItem[] = [
  { key: 'dash', label: 'Dashboard', badge: '' },
  { key: 'users', label: 'Users', badge: '' },
  { key: 'listings', label: 'Listings', badge: '' },
  { key: 'negotiations', label: 'Negotiations', badge: '' },
  { key: 'trades', label: 'Trades & brokerage', badge: '' },
  { key: 'brokers', label: 'Brokers', badge: '' },
  { key: 'settings', label: 'Settings', badge: '' },
  { key: 'audit', label: 'Audit log', badge: '' },
  { key: 'freight', label: 'Freight', badge: '' },
];

export const PAGES: Record<string, [title: string, subtitle: string, action: string]> = {
  dash: ['Dashboard', 'Live market overview', 'Export day sheet'],
  users: ['Users & access', 'Invite-only platform. A user can hold both modes.', 'Export user list'],
  listings: ['Listings oversight', 'Sell listings and buy requirements in one table', 'Export CSV'],
  negotiations: ['Negotiations', 'Live offer threads between buyers and sellers', 'Export thread'],
  trades: ['Trades & brokerage', 'Closed trades and what each broker earned', 'Log offline trade'],
  brokers: ['Brokers', 'Manage brokers and their commodity-level commission', 'Add broker'],
  settings: ['Settings', 'Platform-wide rules and taxonomy', 'Save changes'],
  audit: ['Audit log', 'Every admin action, attributable and reversible', 'Export log'],
  freight: ['Freight management', 'Origin → destination road-freight rates, per quintal', 'Upload freight sheet'],
};

/** Tag styling per listing/user/negotiation status label. */
export const STATUS_CLS: Record<string, string> = {
  Active: 'tag-accent',
  Traded: 'tag-accent-2',
  'Price expired': 'tag-neutral',
  Withdrawn: 'tag-neutral',
  Pending: 'tag-accent-2',
  Suspended: 'tag-neutral',
  'N/A': 'tag-neutral',
  Stalled: 'tag-neutral',
  'Near expiry': 'tag-accent-2',
  Completed: 'tag-accent',
};

export const TONE_COLOR: Record<string, string> = {
  warn: '#d98806',
  bad: '#d64545',
  info: 'var(--color-accent-600)',
};

/** Origin states offered when adding a freight route manually. */
export const FREIGHT_STATES = ['Punjab', 'Haryana', 'Rajasthan', 'J&K'];
