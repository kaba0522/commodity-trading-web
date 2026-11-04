import { useEffect, useState } from 'react';
import { Field, Pagination, usePagination } from '../../components/common/controls';
import { useAdmin } from '../../store/AdminContext';

export function SettingsPage() {
  const admin = useAdmin();
  const {
    expiryTime, setExpiryTime, freightExpiryTime, setFreightExpiryTime, timezone,
    defaultPaymentTerms, setDefaultPaymentTerms, saveSettings,
    saveFreightExpiry,
    flash,
    liveMode, settingsLoading, settingsError,
    tosVersions, tosVersionsLoading, tosVersionsError, refreshTosVersions, publishTosVersion,
  } = admin;

  const [tosForm, setTosForm] = useState({ effectiveDate: '', termsUrl: '', privacyUrl: '' });
  const [tosError, setTosError] = useState<string | null>(null);

  const {
    page: tosPage, setPage: setTosPage, totalPages: tosTotalPages, pageItems: tosPageItems,
  } = usePagination(tosVersions, 5, 'tos');

  // Live backend: price_expiry_time and ToS versions (admin-only).
  useEffect(() => {
    if (!liveMode) return;
    void refreshTosVersions();
  }, [liveMode, refreshTosVersions]);

  const submitTos = async () => {
    if (!tosForm.effectiveDate || !tosForm.termsUrl.trim() || !tosForm.privacyUrl.trim()) {
      setTosError('Effective date, terms URL and privacy URL are all required.');
      return;
    }
    setTosError(null);
    try {
      await publishTosVersion({
        effectiveDate: new Date(tosForm.effectiveDate).toISOString(),
        termsUrl: tosForm.termsUrl.trim(),
        privacyUrl: tosForm.privacyUrl.trim(),
      });
      setTosForm({ effectiveDate: '', termsUrl: '', privacyUrl: '' });
    } catch (e) {
      setTosError(e instanceof Error ? e.message : 'Publish failed.');
    }
  };

  const savePaymentTerms = () => {
    try {
      localStorage.setItem('kkpk-default-payment-terms', defaultPaymentTerms);
      flash('Payment terms saved in this browser');
    } catch {
      flash('Could not save payment terms in this browser');
    }
  };

  return (
    <div className="settings-split">
      {settingsError ? <div className="field-error" style={{ gridColumn: '1 / -1' }}>{settingsError}</div> : null}
      <div className="panel panel-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
            Price expiry {settingsLoading ? <span className="text-muted" style={{ fontWeight: 400, fontSize: 12 }}>· loading…</span> : null}
          </div>
          <div className="form-2col">
            <Field label="Expires daily at">
              <input className="input" type="time" value={expiryTime} onChange={(e) => setExpiryTime(e.target.value)} />
            </Field>
            <Field label="Timezone">
              <input
                className="input"
                value={liveMode ? 'Asia/Kolkata' : timezone}
                onChange={(e) => admin.setTimezone(e.target.value)}
                disabled={liveMode}
              />
            </Field>
          </div>
          <p className="text-muted" style={{ fontSize: 11.5, margin: 0 }}>
            All sell listings and buy requirements clear at this time. Sellers are pushed a reminder 30 minutes before.
          </p>
          <button className="btn btn-primary" onClick={saveSettings} style={{ height: 38, padding: '0 18px', fontSize: 13, alignSelf: 'flex-start' }}>
            {liveMode ? 'Save price expiry' : 'Save settings'}
          </button>
      </div>

      {liveMode ? (
        <div className="panel panel-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
              Freight price expiry {settingsLoading ? <span className="text-muted" style={{ fontWeight: 400, fontSize: 12 }}>· loading…</span> : null}
            </div>
            <Field label="Routes expire daily at">
              <input
                className="input"
                type="time"
                value={freightExpiryTime}
                onChange={(e) => setFreightExpiryTime(e.target.value)}
              />
            </Field>
            <p className="text-muted" style={{ fontSize: 11.5, margin: 0 }}>
              This cutoff applies independently to freight route prices. An unset value defaults to 02:00 Asia/Kolkata.
            </p>
            <button className="btn btn-primary" onClick={saveFreightExpiry} style={{ height: 38, padding: '0 18px', fontSize: 13, alignSelf: 'flex-start' }}>
              Save freight expiry
            </button>
        </div>
      ) : null}

      <div className="panel panel-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Payment terms defaults</div>
          <Field label="Default text shown on every listing">
            <input className="input" value={defaultPaymentTerms} onChange={(e) => setDefaultPaymentTerms(e.target.value)} style={{ minHeight: 44 }} />
          </Field>
          <p className="text-muted" style={{ fontSize: 11.5, margin: 0 }}>Sellers can override this per listing.</p>
          <p className="text-muted" style={{ fontSize: 11.5, margin: 0 }}>Saved in this browser only; this setting is not synced to the backend.</p>
          <button className="btn btn-primary" onClick={savePaymentTerms} style={{ height: 38, padding: '0 18px', fontSize: 13, alignSelf: 'flex-start' }}>
            Save payment terms
          </button>
      </div>

      {liveMode ? (
        <div className="panel panel-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14, gridColumn: '1 / -1' }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              Terms versions {tosVersionsLoading ? <span className="text-muted" style={{ fontWeight: 400, fontSize: 12 }}>· loading…</span> : null}
            </div>
            <p className="text-muted" style={{ fontSize: 11.5, margin: 0 }}>
              Publishing a version forces every user to re-accept on next login (admin-only).
            </p>
            {tosVersionsError ? <div className="field-error">{tosVersionsError}</div> : null}
            {tosPageItems.map((v) => (
              <div key={v.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '9px 12px', background: 'var(--color-neutral-100)', borderRadius: 8, fontSize: 12.5 }}>
                <span style={{ fontWeight: 700 }}>v{v.version}</span>
                <span className="text-muted">effective {new Date(v.effectiveDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
            ))}
            {tosTotalPages > 1 ? (
              <Pagination
                page={tosPage}
                totalPages={tosTotalPages}
                total={tosVersions.length}
                pageSize={5}
                onPageChange={setTosPage}
              />
            ) : null}
            <div className="form-3col">
              <Field label="Effective date" required>
                <input className="input" type="date" value={tosForm.effectiveDate} onChange={(e) => setTosForm({ ...tosForm, effectiveDate: e.target.value })} />
              </Field>
              <Field label="Terms URL" required>
                <input className="input" placeholder="https://…" value={tosForm.termsUrl} onChange={(e) => setTosForm({ ...tosForm, termsUrl: e.target.value })} />
              </Field>
              <Field label="Privacy URL" required>
                <input className="input" placeholder="https://…" value={tosForm.privacyUrl} onChange={(e) => setTosForm({ ...tosForm, privacyUrl: e.target.value })} />
              </Field>
            </div>
            {tosError ? <div className="field-error">{tosError}</div> : null}
            <div>
              <button className="btn btn-primary" onClick={() => void submitTos()} style={{ height: 34, padding: '0 14px', fontSize: 13 }}>
                Publish version
              </button>
            </div>
        </div>
      ) : null}
    </div>
  );
}
