import { useEffect, useMemo, useState } from 'react';
import { EmptyState, Pagination, usePagination } from '../../components/common/controls';
import { auditLogsApi } from '../../services/backend';
import { ApiError } from '../../services/api';
import { useAdmin } from '../../store/AdminContext';
import type { BackendAuditEntry, BackendAuditFilterOptions } from '../../services/backend';

const LIVE_GRID: React.CSSProperties = {
  gridTemplateColumns: '155px minmax(140px,1fr) minmax(170px,1.2fr) minmax(180px,1.2fr) minmax(190px,1.3fr)',
};

const DEMO_GRID: React.CSSProperties = {
  gridTemplateColumns: '150px minmax(0,.9fr) minmax(0,1.1fr) minmax(0,1.4fr) minmax(0,1.5fr)',
};

function actionCls(action: string): string {
  if (action.endsWith('_CREATED')) return 'tag-accent';
  if (action.endsWith('_UPDATED')) return 'tag-accent-2';
  return 'tag-neutral';
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
}

const AUDIT_METADATA_FIELDS = new Set([
  'id', 'unit', 'createdAt', 'updatedAt', 'updatedById', 'priceValidUntil',
]);

const AUDIT_SUMMARY_PRIORITY = [
  'price', 'priceLow', 'weightKg', 'bags', 'status', 'message', 'phone',
  'time', 'priceExpiryTime', 'name', 'firmName', 'destinationName',
  'paymentTerms', 'roles', 'commissionRate', 'commissionType',
];

function snapshotRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function formatAuditValue(value: unknown, field: string): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'number' && ['price', 'priceLow', 'priceHigh'].includes(field)) {
    return `₹${value.toLocaleString('en-IN')}`;
  }
  if (field === 'bags') return `${value} bags`;
  if (field === 'status') {
    const statusLabels: Record<string, string> = {
      active: 'Active',
      suspended: 'Suspended',
      price_expired: 'Price expired',
      pending: 'Pending',
      traded: 'Traded',
      withdrawn: 'Withdrawn',
    };
    if (typeof value === 'string') return statusLabels[value] ?? value;
  }
  if (field === 'commissionType' && value === 'per_bag') return 'per bag';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function auditSummary(entry: BackendAuditEntry): { before: string; after: string } {
  const before = snapshotRecord(entry.before);
  const after = snapshotRecord(entry.after);
  if (!before && !after) {
    return { before: formatAuditValue(entry.before, ''), after: formatAuditValue(entry.after, '') };
  }
  const beforeValues = before ?? {};
  const afterValues = after ?? {};

  const fields = (entry.changedFields.length
    ? entry.changedFields
    : [...new Set([...Object.keys(beforeValues), ...Object.keys(afterValues)])])
    .filter((field) => !AUDIT_METADATA_FIELDS.has(field) && !field.endsWith('Id'))
    .filter((field) => JSON.stringify(beforeValues[field]) !== JSON.stringify(afterValues[field]));

  if (entry.entity.toLowerCase() === 'freightroute') {
    const changedRoute = fields.includes('originName') || fields.includes('destinationName');
    if (changedRoute) {
      const route = (values: Record<string, unknown>) => {
        const origin = formatAuditValue(values.originName, 'originName');
        const destination = formatAuditValue(values.destinationName, 'destinationName');
        return [origin, destination].filter((part) => part !== '—').join(' → ') || '—';
      };
      return { before: route(beforeValues), after: route(afterValues) };
    }
  }

  const field = AUDIT_SUMMARY_PRIORITY.find((candidate) => fields.includes(candidate)) ?? fields[0];
  if (!field) return { before: '—', after: '—' };
  return {
    before: formatAuditValue(beforeValues[field], field),
    after: formatAuditValue(afterValues[field], field),
  };
}

function AuditChangeSummary({ entry }: { entry: BackendAuditEntry }) {
  const summary = auditSummary(entry);
  return (
    <div style={{ fontVariantNumeric: 'tabular-nums' }}>
      <span className="text-muted" style={{ textDecoration: 'line-through' }}>{summary.before}</span>
      <span style={{ margin: '0 6px', color: 'var(--color-neutral-400)' }}>→</span>
      <span style={{ fontWeight: 600 }}>{summary.after}</span>
    </div>
  );
}

export function AuditPage() {
  const { liveMode } = useAdmin();
  return liveMode ? <LiveAuditPage /> : <DemoAuditPage />;
}

function LiveAuditPage() {
  const [filterOptions, setFilterOptions] = useState<BackendAuditFilterOptions | null>(null);
  const [filtersError, setFiltersError] = useState<string | null>(null);
  const [entries, setEntries] = useState<BackendAuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [actorUserId, setActorUserId] = useState('');
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    let active = true;
    void auditLogsApi.filters()
      .then((data) => {
        if (active) setFilterOptions(data);
      })
      .catch((error: unknown) => {
        if (active) setFiltersError(error instanceof ApiError ? error.message : 'Could not load audit filters.');
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setListError(null);
    void auditLogsApi.list({
      actorUserId: actorUserId || undefined,
      action: action || undefined,
      entity: entity || undefined,
      q: debouncedSearch || undefined,
      page,
      limit: 20,
    }).then(async ({ data, meta }) => {
      if (!active) return;
      const entriesWithSnapshots = await Promise.all(data.map(async (entry) => {
        if (!entry.changedFields.length || (entry.before !== undefined && entry.after !== undefined)) return entry;
        return auditLogsApi.getById(entry.id);
      }));
      if (!active) return;
      setEntries(entriesWithSnapshots);
      setTotal(meta?.total ?? 0);
      setTotalPages(meta?.totalPages ?? 0);
    }).catch((error: unknown) => {
      if (!active) return;
      setEntries([]);
      setTotal(0);
      setTotalPages(0);
      setListError(error instanceof ApiError ? error.message : 'Could not load audit entries.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [actorUserId, action, entity, debouncedSearch, page]);

  const resetPage = <T,>(setter: (value: T) => void, value: T) => {
    setter(value);
    setPage(1);
  };

  return (
    <>
      <div className="panel filter-bar">
        <select
          className="input"
          value={actorUserId}
          onChange={(event) => resetPage(setActorUserId, event.target.value)}
          style={{ height: 34, width: 190, fontSize: 12.5 }}
          aria-label="Filter by admin"
        >
          <option value="">All admins</option>
          {(filterOptions?.actors ?? []).map((actor) => (
            <option key={actor.id} value={actor.id}>{actor.name || actor.phone}</option>
          ))}
        </select>
        <select
          className="input"
          value={action}
          onChange={(event) => resetPage(setAction, event.target.value)}
          style={{ height: 34, width: 210, fontSize: 12.5 }}
          aria-label="Filter by action"
        >
          <option value="">All actions</option>
          {(filterOptions?.actions ?? []).map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <select
          className="input"
          value={entity}
          onChange={(event) => resetPage(setEntity, event.target.value)}
          style={{ height: 34, width: 160, fontSize: 12.5 }}
          aria-label="Filter by entity"
        >
          <option value="">All entities</option>
          {(filterOptions?.entities ?? []).map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <input
          className="input"
          placeholder="Entity or firm"
          value={search}
          onChange={(event) => resetPage(setSearch, event.target.value)}
          style={{ height: 34, width: 200, fontSize: 12.5 }}
          aria-label="Search entity or firm"
        />
        <div className="text-muted" style={{ marginLeft: 'auto', fontSize: 12 }}>
          {total} entr{total === 1 ? 'y' : 'ies'}
        </div>
      </div>

      {filtersError ? <div className="field-error" role="alert">{filtersError}</div> : null}
      {listError ? <div className="field-error" role="alert">{listError}</div> : null}

      <div className="panel">
        <div className="table-scroll">
          <div className="grid-head" style={{ ...LIVE_GRID, minWidth: 1050 }}>
            <div>WHEN</div><div>ADMIN</div><div>ACTION</div><div>ENTITY</div><div>BEFORE → AFTER</div>
          </div>
          {loading ? <div className="text-muted" style={{ padding: '18px 16px', fontSize: 13 }}>Loading audit entries…</div> : null}
          {entries.map((entry) => (
            <div key={entry.id} className="grid-row" style={{ ...LIVE_GRID, minWidth: 1050 }}>
              <div className="text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatDate(entry.createdAt)}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.actor?.name || 'Unknown admin'}</div>
                <div className="text-muted" style={{ fontSize: 11 }}>{entry.actor?.phone ?? entry.actorUserId}</div>
              </div>
              <div><span className={`tag ${actionCls(entry.action)}`} style={{ fontSize: 10, padding: '2px 8px' }}>{entry.action}</span></div>
              <div style={{ minWidth: 0 }}>
                <div>{entry.entity}</div>
                {/* <div className="text-muted" style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis' }} title={entry.entityId}>{entry.entityId}</div> */}
              </div>
              <div style={{ fontSize: 12 }}><AuditChangeSummary entry={entry} /></div>
            </div>
          ))}
          {!loading && !listError && entries.length === 0 ? <EmptyState message="No audit entries match these filters." /> : null}
        </div>
        {totalPages > 1 ? (
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--color-neutral-200)' }}>
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={20}
              onPageChange={setPage}
              disabled={loading}
            />
          </div>
        ) : null}
      </div>

    </>
  );
}

function DemoAuditPage() {
  const { audit, auditAdmin, setAuditAdmin, auditAction, setAuditAction, auditQuery, setAuditQuery } = useAdmin();

  const filtered = useMemo(() => {
    const q = auditQuery.trim().toLowerCase();
    return audit.filter(
      (entry) =>
        (auditAdmin === 'All admins' || entry.admin === auditAdmin) &&
        (auditAction === 'All actions' || entry.action === auditAction) &&
        (!q || entry.entity.toLowerCase().includes(q) || entry.admin.toLowerCase().includes(q)),
    );
  }, [audit, auditAdmin, auditAction, auditQuery]);

  const admins = useMemo(() => ['All admins', ...Array.from(new Set(audit.map((entry) => entry.admin)))], [audit]);
  const actions = useMemo(() => ['All actions', ...Array.from(new Set(audit.map((entry) => entry.action)))], [audit]);
  const { page, setPage, totalPages, pageItems } = usePagination(
    filtered, 10, `${auditAdmin}|${auditAction}|${auditQuery}`,
  );

  return (
    <>
      <div className="panel filter-bar">
        <select className="input" value={auditAdmin} onChange={(event) => setAuditAdmin(event.target.value)} style={{ height: 34, width: 180, fontSize: 12.5 }}>
          {admins.map((name) => <option key={name}>{name}</option>)}
        </select>
        <select className="input" value={auditAction} onChange={(event) => setAuditAction(event.target.value)} style={{ height: 34, width: 200, fontSize: 12.5 }}>
          {actions.map((value) => <option key={value}>{value}</option>)}
        </select>
        <input
          className="input"
          placeholder="Entity or admin"
          value={auditQuery}
          onChange={(event) => setAuditQuery(event.target.value)}
          style={{ height: 34, width: 200, fontSize: 12.5 }}
        />
        <div className="text-muted" style={{ marginLeft: 'auto', fontSize: 12 }}>Session entries · {filtered.length} entries</div>
      </div>
      <div className="panel">
        <div className="table-scroll">
          <div className="grid-head" style={{ ...DEMO_GRID, minWidth: 860 }}>
            <div>WHEN</div><div>ADMIN</div><div>ACTION</div><div>ENTITY</div><div>BEFORE → AFTER</div>
          </div>
          {pageItems.map((entry, index) => (
            <div key={`${entry.when}-${entry.entity}-${index}`} className="grid-row" style={{ ...DEMO_GRID, minWidth: 860 }}>
              <div className="text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>{entry.when}</div>
              <div style={{ fontWeight: 600 }}>{entry.admin}</div>
              <div><span className={`tag ${actionCls(entry.action)}`} style={{ fontSize: 10, padding: '2px 8px' }}>{entry.action}</span></div>
              <div>{entry.entity}</div>
              <div style={{ fontVariantNumeric: 'tabular-nums' }}>
                <span className="text-muted" style={{ textDecoration: 'line-through' }}>{entry.before}</span>
                <span style={{ margin: '0 6px', color: 'var(--color-neutral-400)' }}>→</span>
                <span style={{ fontWeight: 600 }}>{entry.after}</span>
              </div>
            </div>
          ))}
          {filtered.length === 0 ? <EmptyState message="No session audit entries match these filters." /> : null}
        </div>
        {totalPages > 1 ? (
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--color-neutral-200)' }}>
            <Pagination page={page} totalPages={totalPages} total={filtered.length} pageSize={10} onPageChange={setPage} />
          </div>
        ) : null}
      </div>
    </>
  );
}
