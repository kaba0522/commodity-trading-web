import { useEffect, useState } from 'react';
import { Field, Pagination, usePagination } from '../../components/common/controls';
import { useAdmin } from '../../store/AdminContext';

function SettingsIcon({ name }: { name: 'clock' | 'truck' | 'card' | 'document' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === 'clock' ? (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3.5 2" />
        </>
      ) : name === 'truck' ? (
        <>
          <path d="M14 18V6a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h2" />
          <path d="M14 9h4l4 4v4a1 1 0 0 1-1 1h-2" />
          <circle cx="7.5" cy="18.5" r="2.5" />
          <circle cx="17.5" cy="18.5" r="2.5" />
        </>
      ) : name === 'card' ? (
        <>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
        </>
      ) : (
        <>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M16 13H8" />
          <path d="M16 17H8" />
        </>
      )}
    </svg>
  );
}

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
    <div className={`settings-board${liveMode ? '' : ' settings-board--two'}`}>
      {settingsError ? <div className="field-error settings-board-error" role="alert">{settingsError}</div> : null}

      {/* — commodity price expiry — */}
      <section className="panel settings-card" aria-labelledby="settings-price-title">
        <div className="settings-card-head">
          <span className="settings-card-icon"><SettingsIcon name="clock" /></span>
          <div style={{ minWidth: 0 }}>
            <div className="settings-card-title" id="settings-price-title">
              Price expiry {settingsLoading ? <span className="settings-loading">Loading…</span> : null}
            </div>
            <p className="settings-card-sub">Daily cutoff for sell listings and buy requirements.</p>
          </div>
        </div>
        <div className="settings-card-body">
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
          <p className="settings-hint">
            All listings clear at this time. Sellers are pushed a reminder 30 minutes before.
            {liveMode ? ' Timezone is fixed in live mode.' : ''}
          </p>
        </div>
        <div className="settings-card-foot">
          <span className="settings-foot-note">Applies platform-wide</span>
          <button className="btn btn-primary" onClick={saveSettings} disabled={settingsLoading}>
            {liveMode ? 'Save price expiry' : 'Save settings'}
          </button>
        </div>
      </section>

      {/* — freight price expiry (live only) — */}
      {liveMode ? (
        <section className="panel settings-card" aria-labelledby="settings-freight-title">
          <div className="settings-card-head">
            <span className="settings-card-icon"><SettingsIcon name="truck" /></span>
            <div style={{ minWidth: 0 }}>
              <div className="settings-card-title" id="settings-freight-title">
                Freight expiry {settingsLoading ? <span className="settings-loading">Loading…</span> : null}
              </div>
              <p className="settings-card-sub">Daily cutoff for road-freight route prices.</p>
            </div>
          </div>
          <div className="settings-card-body">
            <Field label="Routes expire daily at">
              <input
                className="input"
                type="time"
                value={freightExpiryTime}
                onChange={(e) => setFreightExpiryTime(e.target.value)}
              />
            </Field>
            <p className="settings-hint">
              Independent from commodity prices. An unset value defaults to 02:00 Asia/Kolkata.
            </p>
          </div>
          <div className="settings-card-foot">
            <span className="settings-foot-note">Freight only</span>
            <button className="btn btn-primary" onClick={saveFreightExpiry} disabled={settingsLoading}>
              Save freight expiry
            </button>
          </div>
        </section>
      ) : null}

      {/* — payment terms defaults — */}
      <section className="panel settings-card" aria-labelledby="settings-terms-title">
        <div className="settings-card-head">
          <span className="settings-card-icon"><SettingsIcon name="card" /></span>
          <div style={{ minWidth: 0 }}>
            <div className="settings-card-title" id="settings-terms-title">Payment terms defaults</div>
            <p className="settings-card-sub">Default text shown on every listing.</p>
          </div>
        </div>
        <div className="settings-card-body">
          <Field label="Default text shown on every listing">
            <input
              className="input"
              value={defaultPaymentTerms}
              onChange={(e) => setDefaultPaymentTerms(e.target.value)}
              style={{ minHeight: 40 }}
            />
          </Field>
          <p className="settings-hint">
            Sellers can override this per listing. Saved in this browser only — not synced to the backend.
          </p>
        </div>
        <div className="settings-card-foot">
          <span className="settings-foot-note">Browser only</span>
          <button className="btn btn-primary" onClick={savePaymentTerms}>Save payment terms</button>
        </div>
      </section>

      {/* — terms & privacy versions (live only) — */}
      {liveMode ? (
        <section className="panel settings-card settings-card-wide" aria-labelledby="settings-tos-title">
          <div className="settings-card-head">
            <span className="settings-card-icon"><SettingsIcon name="document" /></span>
            <div style={{ minWidth: 0 }}>
              <div className="settings-card-title" id="settings-tos-title">
                Terms &amp; privacy versions {tosVersionsLoading ? <span className="settings-loading">Loading…</span> : null}
              </div>
              <p className="settings-card-sub">Publishing a version forces every user to re-accept on next login.</p>
            </div>
            <span className="tag tag-neutral settings-head-tag">Admin only</span>
          </div>

          <div className="settings-card-body">
            {tosVersionsError ? <div className="field-error" role="alert">{tosVersionsError}</div> : null}
            <div className="settings-legal-grid">
              <div className="settings-version-list">
                <div className="settings-section-label">Published versions</div>
                {tosPageItems.map((v) => (
                  <div key={v.id} className="settings-version-row">
                    <span className="settings-version-badge">v{v.version}</span>
                    <div className="settings-version-meta">
                      <div className="settings-version-date">
                        Effective {new Date(v.effectiveDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                      <div className="settings-version-links">
                        {v.termsUrl ? <a href={v.termsUrl} target="_blank" rel="noreferrer">Terms ↗</a> : null}
                        {v.privacyUrl ? <a href={v.privacyUrl} target="_blank" rel="noreferrer">Privacy ↗</a> : null}
                      </div>
                    </div>
                  </div>
                ))}
                {tosVersions.length === 0 && !tosVersionsLoading ? (
                  <div className="empty-note">No terms versions published yet.</div>
                ) : null}
                {tosTotalPages > 1 ? (
                  <Pagination
                    page={tosPage}
                    totalPages={tosTotalPages}
                    total={tosVersions.length}
                    pageSize={5}
                    onPageChange={setTosPage}
                  />
                ) : null}
              </div>

              <div className="settings-publish">
                <div className="settings-section-label">Publish a new version</div>
                <div className="settings-publish-fields">
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
                {tosError ? <div className="field-error" role="alert">{tosError}</div> : null}
                <button className="btn btn-primary settings-publish-btn" onClick={() => void submitTos()}>
                  Publish version
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
