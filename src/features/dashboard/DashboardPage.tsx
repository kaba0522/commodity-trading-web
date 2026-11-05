import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TONE_COLOR } from '../../data/constants';
import { useAdmin } from '../../store/AdminContext';
import { inr } from '../../utils/format';

interface QueueEntry {
  count: string;
  title: string;
  meta: string;
  action: string;
  target: string;
  tone: string;
}

export function DashboardPage() {
  const {
    liveMode,
    rows, listingsLoading, listingsError, refreshListings,
    invites, invitesLoading, invitesError, refreshInvites,
    negotiations, trades, freightRoutes, freightLoading, freightError, refreshFreight, audit,
  } = useAdmin();

  useEffect(() => {
    if (!liveMode) return;
    const id = window.setTimeout(() => {
      void refreshListings();
      void refreshInvites();
      void refreshFreight();
    }, 0);
    return () => window.clearTimeout(id);
  }, [liveMode, refreshListings, refreshInvites, refreshFreight]);

  const dataErrors = [listingsError, invitesError, freightError]
    .filter((error): error is string => Boolean(error));
  const live = negotiations.filter((n) => n.state !== 'Completed');
  const sellActive = rows.filter((r) => r.side === 'SELL' && r.status === 'Active');
  const buyActive = rows.filter((r) => r.side === 'BUY' && r.status === 'Active');
  const noPrice = rows.filter((r) => r.price == null && r.status === 'Active');
  const urgentNego = live.filter((n) => n.urgent);
  const pendingFreight = freightRoutes.filter((r) => r.status === 'Pending review');

  const metrics = [
    { label: 'Live sell listings', value: String(sellActive.length), delta: listingsLoading ? 'Loading…' : `${rows.length} rows loaded` },
    { label: 'Open buy requirements', value: String(buyActive.length), delta: `${buyActive.length} awaiting offers` },
    { label: 'Active negotiations', value: String(live.length), delta: urgentNego.length ? `${urgentNego.length} urgent` : 'none urgent' },
    { label: 'Trades closed', value: String(trades.length), delta: trades.length ? 'this session' : 'no trade feed yet' },
    { label: 'Pending invites', value: String(invites.length), delta: invitesLoading ? 'Loading…' : 'awaiting signup' },
  ];

  const queue: QueueEntry[] = [];
  if (invites.length > 0) {
    queue.push({
      count: String(invites.length), title: 'Pending invites',
      meta: `Oldest: ${invites[invites.length - 1]?.firm || invites[invites.length - 1]?.phone || '—'}`,
      action: 'Review', target: 'users', tone: 'info',
    });
  }
  if (urgentNego.length > 0) {
    queue.push({
      count: String(urgentNego.length), title: 'Negotiations need a nudge',
      meta: urgentNego.slice(0, 2).map((n) => n.item).join(' · '),
      action: 'Open', target: 'negotiations', tone: 'bad',
    });
  }
  if (noPrice.length > 0) {
    queue.push({
      count: String(noPrice.length), title: 'Listings without a price',
      meta: noPrice.slice(0, 2).map((r) => r.item).join(' · '),
      action: 'Fix', target: 'listings', tone: 'warn',
    });
  }
  if (pendingFreight.length > 0) {
    queue.push({
      count: String(pendingFreight.length), title: 'Freight routes awaiting review',
      meta: pendingFreight.slice(0, 2).map((r) => `${r.origin} → ${r.dest}`).join(' · '),
      action: 'Review', target: 'freight', tone: 'warn',
    });
  }

  return (
    <>
      <div className="metrics-grid">
        {metrics.map((m) => (
          <div key={m.label} className="panel" style={{ padding: '15px 16px' }}>
            <div className="text-muted" style={{ fontSize: 11.5 }}>{m.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, marginTop: 6, letterSpacing: '-.015em', fontVariantNumeric: 'tabular-nums' }}>
              {m.value}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--color-neutral-600)', marginTop: 3 }}>{m.delta}</div>
          </div>
        ))}
      </div>

      {dataErrors.length > 0 ? (
        <div className="field-error" role="alert">{dataErrors.join(' ')}</div>
      ) : null}

      <div className="panel">
        <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--color-neutral-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Needs attention</div>
          <div className="tag tag-accent-2">{queue.length} open</div>
        </div>
        {queue.length > 0 ? (
          <div className="queue-grid">
            {queue.map((q) => (
              <div key={q.title} style={{ padding: '16px 18px', borderRight: '1px solid var(--color-neutral-200)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 9, height: 9, borderRadius: 999, flex: 'none', background: TONE_COLOR[q.tone] }} />
                  <div style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{q.count}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35 }}>{q.title}</div>
                <div className="text-muted" style={{ fontSize: 11.5, lineHeight: 1.4 }}>{q.meta}</div>
                <Link
                  to={`/${q.target}`}
                  className="btn btn-secondary"
                  style={{ marginTop: 'auto', alignSelf: 'flex-start', height: 30, padding: '0 13px', fontSize: 12 }}
                >
                  {q.action}
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-muted" style={{ padding: '18px', fontSize: 13 }}>
            {listingsLoading || invitesLoading || freightLoading ? 'Loading live data…' : 'Nothing needs attention right now.'}
          </div>
        )}
      </div>

      <div className="dash-split">
        <div className="panel">
          <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--color-neutral-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Negotiations happening now</div>
            <Link to="/negotiations" style={{ fontSize: 12, color: 'var(--color-accent-700)', fontWeight: 600 }}>See all →</Link>
          </div>
          {live.map((n) => (
            <div key={n.id} style={{ padding: '13px 18px', borderBottom: '1px solid var(--color-neutral-200)', display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{n.item}</div>
                <div className="text-muted" style={{ fontSize: 11.5, marginTop: 2 }}>
                  {n.seller} → {n.buyer} · {n.bags} bags
                </div>
              </div>
              <div style={{ textAlign: 'right', flex: 'none' }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{inr(n.standing)}</div>
                <div style={{ fontSize: 11.5, marginTop: 2, fontWeight: 600, color: n.urgent ? '#d64545' : 'var(--color-neutral-600)' }}>
                  {n.expiry}
                </div>
              </div>
            </div>
          ))}
          {live.length === 0 ? (
            <div className="text-muted" style={{ padding: '18px', fontSize: 13 }}>
              No negotiations yet — threads started in this session appear here.
            </div>
          ) : null}
        </div>

        <div className="panel">
          <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--color-neutral-200)', fontWeight: 700, fontSize: 15 }}>
            Session activity
          </div>
          {audit.slice(0, 8).map((a, i) => (
            <div key={`${a.when}-${a.entity}-${i}`} style={{ padding: '10px 18px', borderBottom: '1px solid var(--color-neutral-200)', display: 'flex', gap: 12 }}>
              <div className="text-muted" style={{ fontSize: 11.5, width: 110, flex: 'none', fontVariantNumeric: 'tabular-nums' }}>{a.when}</div>
              <div style={{ fontSize: 12.5, lineHeight: 1.45 }}>
                <strong>{a.admin}</strong> · {a.action} — {a.entity}
              </div>
            </div>
          ))}
          {audit.length === 0 ? (
            <div className="text-muted" style={{ padding: '18px', fontSize: 13 }}>
              No admin actions this session yet. Actions you take are recorded here and on the Audit log page.
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
