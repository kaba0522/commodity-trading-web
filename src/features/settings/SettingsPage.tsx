import { useEffect, useState } from 'react';
import { Field, Pagination, usePagination } from '../../components/common/controls';
import { useAdmin } from '../../store/AdminContext';

export function SettingsPage() {
  const admin = useAdmin();
  const {
    categories, newCategory, setNewCategory, addCategory,
    expiryTime, setExpiryTime, freightExpiryTime, setFreightExpiryTime, timezone,
    defaultPaymentTerms, setDefaultPaymentTerms, saveSettings,
    saveFreightExpiry,
    liveMode, settingsLoading, settingsError, refreshLiveSettings,
    liveCategories, categoryError, renameCategory, deleteCategory,
    liveCommodities, commoditiesLoading, commodityError, refreshCommodities,
    addCommodity, renameCommodity, deleteCommodity,
    liveQualities, qualitiesLoading, qualitiesError, refreshQualities,
    addQualities, renameQuality, deleteQuality,
    tosVersions, tosVersionsLoading, tosVersionsError, refreshTosVersions, publishTosVersion,
  } = admin;

  const [itemsCatId, setItemsCatId] = useState('');
  const [newItem, setNewItem] = useState('');
  const [itemError, setItemError] = useState<string | null>(null);
  const [newQualities, setNewQualities] = useState('');
  const [qualityFormError, setQualityFormError] = useState<string | null>(null);
  const [tosForm, setTosForm] = useState({ effectiveDate: '', termsUrl: '', privacyUrl: '' });
  const [tosError, setTosError] = useState<string | null>(null);

  const {
    page: catPage, setPage: setCatPage, totalPages: catTotalPages, pageItems: catPageItems,
  } = usePagination(categories, 10, 'categories');
  const {
    page: itemPage, setPage: setItemPage, totalPages: itemTotalPages, pageItems: itemPageItems, total: itemTotal,
  } = usePagination(liveCommodities, 10, itemsCatId);
  const {
    page: tosPage, setPage: setTosPage, totalPages: tosTotalPages, pageItems: tosPageItems,
  } = usePagination(tosVersions, 5, 'tos');

  // Live backend: price_expiry_time (PATCH admin-only), taxonomy
  // (writes admin-only), ToS versions (publish/list admin-only).
  useEffect(() => {
    if (!liveMode) return;
    void refreshLiveSettings();
    void refreshTosVersions();
  }, [liveMode, refreshLiveSettings, refreshTosVersions]);

  useEffect(() => {
    if (!liveMode) return;
    if (!itemsCatId && liveCategories.length) setItemsCatId(liveCategories[0].id);
  }, [liveMode, liveCategories, itemsCatId]);

  useEffect(() => {
    if (liveMode && itemsCatId) void refreshCommodities(itemsCatId);
  }, [liveMode, itemsCatId, refreshCommodities]);

  useEffect(() => {
    if (liveMode && itemsCatId) void refreshQualities(itemsCatId);
  }, [liveMode, itemsCatId, refreshQualities]);

  const submitItem = async () => {
    if (!itemsCatId || !newItem.trim()) {
      setItemError('Pick a category and type an item name.');
      return;
    }
    setItemError(null);
    try {
      await addCommodity(itemsCatId, newItem);
      setNewItem('');
    } catch (e) {
      setItemError(e instanceof Error ? e.message : 'Add failed.');
    }
  };

  const submitQualities = async () => {
    if (!itemsCatId) {
      setQualityFormError('Pick a category first.');
      return;
    }
    const name = newQualities.trim();
    if (!name) {
      setQualityFormError('Enter a quality name.');
      return;
    }
    setQualityFormError(null);
    try {
      const result = await addQualities(itemsCatId, [name]);
      setNewQualities('');
      if (result.skipped.length) {
        admin.flash(`Created ${result.created.length}; already existed and skipped: ${result.skipped.join(', ')}`);
      }
    } catch (error) {
      setQualityFormError(error instanceof Error ? error.message : 'Could not add qualities.');
    }
  };

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

  return (
    <div className="settings-split">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {settingsError ? <div className="field-error">{settingsError}</div> : null}
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
          {!liveMode ? <p className="text-muted" style={{ fontSize: 11.5, margin: 0 }}>Payment terms are preview-only and are not saved to the backend.</p> : null}
        </div>

        {liveMode ? (
          <div className="panel panel-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
            <Field label="Effective date" required>
              <input className="input" type="date" value={tosForm.effectiveDate} onChange={(e) => setTosForm({ ...tosForm, effectiveDate: e.target.value })} />
            </Field>
            <Field label="Terms URL" required>
              <input className="input" placeholder="https://…" value={tosForm.termsUrl} onChange={(e) => setTosForm({ ...tosForm, termsUrl: e.target.value })} />
            </Field>
            <Field label="Privacy URL" required>
              <input className="input" placeholder="https://…" value={tosForm.privacyUrl} onChange={(e) => setTosForm({ ...tosForm, privacyUrl: e.target.value })} />
            </Field>
            {tosError ? <div className="field-error">{tosError}</div> : null}
            <div>
              <button className="btn btn-secondary" onClick={() => void submitTos()} style={{ height: 34, padding: '0 14px', fontSize: 13 }}>
                Publish version
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="panel panel-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
            Commodity taxonomy
          </div>
          <p className="text-muted" style={{ fontSize: 11.5, margin: 0 }}>
            Categories and items available across the platform. Editing here keeps the product
            commodity-agnostic without a code release.
            {liveMode ? ' Writes go to the admin-only taxonomy routes.' : null}
          </p>
          {categoryError ? <div className="field-error">{categoryError}</div> : null}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {catPageItems.map((c) => (
              <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: 'var(--color-neutral-100)', borderRadius: 8 }}>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{c}</div>
                {liveMode ? (
                  <>
                    {liveCategories.find((category) => category.name === c)?.qualityCount === 0 ? (
                      <span className="tag tag-accent-2" title="Add at least one quality before users can create listings in this category" style={{ fontSize: 10 }}>
                        No qualities
                      </span>
                    ) : null}
                    <button className="btn btn-secondary" onClick={() => renameCategory(c)} style={{ height: 28, padding: '0 10px', fontSize: 11.5 }}>
                      Rename
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => { if (window.confirm(`Delete category “${c}”? Fails if items still reference it.`)) deleteCategory(c); }}
                      style={{ height: 28, padding: '0 10px', fontSize: 11.5 }}
                    >
                      Delete
                    </button>
                  </>
                ) : null}
              </div>
            ))}
          </div>
          {catTotalPages > 1 ? (
            <Pagination
              page={catPage}
              totalPages={catTotalPages}
              total={categories.length}
              pageSize={10}
              onPageChange={setCatPage}
            />
          ) : null}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              className="input"
              placeholder="New category name"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addCategory(); }}
              style={{ height: 34, maxWidth: 220, fontSize: 13 }}
            />
            <button className="btn btn-primary" onClick={addCategory} style={{ height: 34, padding: '0 14px', fontSize: 13 }}>
              Add category
            </button>
          </div>
        </div>

        {liveMode ? (
          <div className="panel panel-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              Items {commoditiesLoading ? <span className="text-muted" style={{ fontWeight: 400, fontSize: 12 }}>· loading…</span> : null}
            </div>
            <Field label="Category" required>
              <select className="input" value={itemsCatId} onChange={(e) => setItemsCatId(e.target.value)}>
                {liveCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            {commodityError ? <div className="field-error">{commodityError}</div> : null}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {itemPageItems.map((m) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: 'var(--color-neutral-100)', borderRadius: 8 }}>
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{m.name}</div>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      const next = window.prompt('Rename item:', m.name);
                      if (next && next.trim() && next.trim() !== m.name) {
                        void renameCommodity(m.id, next, itemsCatId).catch((e: unknown) => {
                          admin.flash(e instanceof Error ? e.message : 'Rename failed.');
                        });
                      }
                    }}
                    style={{ height: 28, padding: '0 10px', fontSize: 11.5 }}
                  >
                    Rename
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      if (window.confirm(`Delete item “${m.name}”?`)) {
                        void deleteCommodity(m.id, itemsCatId).catch((e: unknown) => {
                          admin.flash(e instanceof Error ? e.message : 'Delete failed.');
                        });
                      }
                    }}
                    style={{ height: 28, padding: '0 10px', fontSize: 11.5 }}
                  >
                    Delete
                  </button>
                </div>
              ))}
              {liveCommodities.length === 0 && !commoditiesLoading ? (
                <div className="text-muted" style={{ fontSize: 12.5 }}>No items in this category yet.</div>
              ) : null}
            </div>
            {itemTotalPages > 1 ? (
              <Pagination
                page={itemPage}
                totalPages={itemTotalPages}
                total={itemTotal}
                pageSize={10}
                onPageChange={setItemPage}
              />
            ) : null}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                className="input"
                placeholder="New item name"
                value={newItem}
                onChange={(e) => { setNewItem(e.target.value); setItemError(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') void submitItem(); }}
                style={{ height: 34, maxWidth: 220, fontSize: 13 }}
              />
              <button className="btn btn-primary" onClick={() => void submitItem()} style={{ height: 34, padding: '0 14px', fontSize: 13 }}>
                Add item
              </button>
            </div>
            {itemError ? <div className="field-error">{itemError}</div> : null}
          </div>
        ) : null}

        {liveMode ? (
          <div className="panel panel-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              Qualities {qualitiesLoading ? <span className="text-muted" style={{ fontWeight: 400, fontSize: 12 }}>· loading…</span> : null}
            </div>
            <Field label="Category" required>
              <select className="input" value={itemsCatId} onChange={(event) => setItemsCatId(event.target.value)} disabled={!liveCategories.length}>
                {liveCategories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </Field>
            {qualitiesError ? <div className="field-error" role="alert">{qualitiesError}</div> : null}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {liveQualities.map((quality) => (
                <div key={quality.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: 'var(--color-neutral-100)', borderRadius: 8 }}>
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{quality.name}</div>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      const next = window.prompt('Rename quality:', quality.name);
                      if (next?.trim() && next.trim() !== quality.name) {
                        void renameQuality(quality.id, next, itemsCatId).catch((error: unknown) => {
                          setQualityFormError(error instanceof Error ? error.message : 'Rename failed.');
                        });
                      }
                    }}
                    style={{ height: 28, padding: '0 10px', fontSize: 11.5 }}
                  >
                    Rename
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      if (window.confirm(`Delete quality “${quality.name}”? This fails if any listing uses it.`)) {
                        void deleteQuality(quality.id, itemsCatId).catch((error: unknown) => {
                          setQualityFormError(error instanceof Error ? error.message : 'Delete failed.');
                        });
                      }
                    }}
                    style={{ height: 28, padding: '0 10px', fontSize: 11.5 }}
                  >
                    Delete
                  </button>
                </div>
              ))}
              {liveQualities.length === 0 && !qualitiesLoading ? (
                <div className="callout-info">
                  No qualities in this category. Users cannot create listings in it until an admin adds a quality.
                </div>
              ) : null}
            </div>
            <Field label="Add quality" required>
              <input
                className="input"
                type="text"
                placeholder="e.g. Sella"
                value={newQualities}
                onChange={(event) => {
                  setNewQualities(event.target.value);
                  setQualityFormError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void submitQualities();
                }}
                disabled={!itemsCatId}
              />
            </Field>
            <button className="btn btn-primary" onClick={() => void submitQualities()} disabled={!itemsCatId || !newQualities.trim()}>
              Add quality
            </button>
            {qualityFormError ? <div className="field-error" role="alert">{qualityFormError}</div> : null}
          </div>
        ) : null}

        <div style={{ background: 'var(--color-bg)', border: '1px dashed var(--color-neutral-400)', borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Per-supplier parse templates</div>
            <span className="tag tag-neutral" style={{ fontSize: 10, padding: '2px 8px' }}>PHASE 2</span>
          </div>
          <p className="text-muted" style={{ fontSize: 12, lineHeight: 1.5, margin: 0 }}>
            When a supplier&apos;s price sheet has a stable layout, the parser can learn it once and reuse it.
            No templates saved yet.
          </p>
        </div>

        <div className="callout-info">
          <span className="tag tag-accent-2" style={{ fontSize: 10, padding: '2px 8px', marginRight: 8 }}>FOR DISCUSSION</span>
          Admin tiering — full-access owner vs. limited-access staff — is out of MVP scope. Today every admin
          has identical rights, and the audit log is what keeps them accountable.
        </div>
      </div>
    </div>
  );
}
