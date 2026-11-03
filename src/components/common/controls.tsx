import React from 'react';

export function FilterTag({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <div
      className={`tag ${active ? 'tag-accent' : 'tag-neutral'}`}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick();
      }}
    >
      {label}
    </div>
  );
}

export function Field({
  label,
  children,
  error,
  required = false,
}: {
  label: string;
  children: React.ReactNode;
  error?: string | null;
  required?: boolean;
}) {
  return (
    <div className="field" style={{ margin: 0 }}>
      <label>
        {label}
        {required ? <span className="field-required" aria-hidden="true"> *</span> : null}
      </label>
      {children}
      {error ? <div className="field-error">{error}</div> : null}
    </div>
  );
}

export function Modal({
  title,
  subtitle,
  onClose,
  onSave,
  saveLabel,
  saveDisabled = false,
  saveClassName = 'btn btn-primary',
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  onSave: () => void;
  saveLabel: string;
  saveDisabled?: boolean;
  saveClassName?: string;
  children: React.ReactNode;
}) {
  useEscape(onClose);
  return (
    <div className="dialog-backdrop" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="dialog-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-neutral-200)' }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>
          {subtitle ? (
            <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>{subtitle}</div>
          ) : null}
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
        <div style={{
          padding: '14px 20px', borderTop: '1px solid var(--color-neutral-200)',
          display: 'flex', gap: 8, justifyContent: 'flex-end',
        }}
        >
          <button className="btn btn-secondary" onClick={onClose} style={{ height: 36, padding: '0 16px', fontSize: 13 }}>
            Cancel
          </button>
          <button className={saveClassName} onClick={onSave} disabled={saveDisabled} style={{ height: 36, padding: '0 18px', fontSize: 13 }}>
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function useEscape(onClose: () => void) {
  React.useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-muted" style={{ padding: '18px 16px', fontSize: 13 }}>
      {message}
    </div>
  );
}

/**
 * Client-side pagination for a whole in-memory list. Server-paginated pages
 * (listings, freight) drive <Pagination> directly from their own page state.
 */
export function usePagination<T>(items: T[], pageSize = 10, resetKey?: unknown) {
  const [page, setPage] = React.useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  // Clamp instead of trusting stored page when the list shrinks.
  const current = Math.min(Math.max(page, 1), totalPages);
  const pageItems = React.useMemo(
    () => items.slice((current - 1) * pageSize, current * pageSize),
    [items, current, pageSize],
  );

  React.useEffect(() => {
    setPage(1);
  }, [resetKey]);

  return { page: current, setPage, totalPages, pageItems, total: items.length, pageSize };
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  total,
  pageSize = 10,
  disabled = false,
  style,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  total?: number;
  pageSize?: number;
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  if (totalPages <= 1) return null;
  const from = total != null ? (page - 1) * pageSize + 1 : null;
  const to = total != null ? Math.min(page * pageSize, total) : null;
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', ...style }}>
      {total != null && from != null && to != null ? (
        <span className="text-muted" style={{ fontSize: 12, marginRight: 'auto' }}>
          Showing {from}–{to} of {total}
        </span>
      ) : null}
      <button
        className="btn btn-secondary"
        disabled={disabled || page <= 1}
        onClick={() => onPageChange(page - 1)}
        style={{ height: 32, padding: '0 14px', fontSize: 12.5 }}
      >
        ← Prev
      </button>
      <span className="text-muted" style={{ fontSize: 12 }}>Page {page} of {totalPages}</span>
      <button
        className="btn btn-secondary"
        disabled={disabled || page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        style={{ height: 32, padding: '0 14px', fontSize: 12.5 }}
      >
        Next →
      </button>
    </div>
  );
}
