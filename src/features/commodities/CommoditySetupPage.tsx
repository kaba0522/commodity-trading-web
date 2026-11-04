import { useEffect, useState } from 'react';
import { Field, Pagination, usePagination } from '../../components/common/controls';
import { useAdmin } from '../../store/AdminContext';

export function CommoditySetupPage() {
  const {
    categories, newCategory, setNewCategory, addCategory,
    liveMode, liveCategories, categoryError, refreshCategories, renameCategory, deleteCategory,
    liveCommodities, commoditiesLoading, commodityError, refreshCommodities,
    addCommodity, renameCommodity, deleteCommodity,
    liveQualities, qualitiesLoading, qualitiesError, refreshQualities,
    addQualities, renameQuality, deleteQuality, flash,
  } = useAdmin();

  const [categoryId, setCategoryId] = useState('');
  const [newCommodity, setNewCommodity] = useState('');
  const [commodityFormError, setCommodityFormError] = useState<string | null>(null);
  const [newQuality, setNewQuality] = useState('');
  const [qualityFormError, setQualityFormError] = useState<string | null>(null);

  const {
    page: categoryPage, setPage: setCategoryPage,
    totalPages: categoryTotalPages, pageItems: categoryPageItems,
  } = usePagination(categories, 10, 'commodity-categories');
  const {
    page: commodityPage, setPage: setCommodityPage,
    totalPages: commodityTotalPages, pageItems: commodityPageItems, total: commodityTotal,
  } = usePagination(liveCommodities, 10, categoryId);

  useEffect(() => {
    if (!liveMode) return;
    void refreshCategories().catch((error: unknown) => {
      flash(error instanceof Error ? error.message : 'Could not load categories.');
    });
  }, [liveMode, refreshCategories, flash]);

  useEffect(() => {
    if (!liveMode) return;
    if (categoryId && liveCategories.some((category) => category.id === categoryId)) return;
    setCategoryId(liveCategories[0]?.id ?? '');
  }, [liveMode, liveCategories, categoryId]);

  useEffect(() => {
    if (!liveMode || !categoryId) return;
    void refreshCommodities(categoryId);
    void refreshQualities(categoryId);
  }, [liveMode, categoryId, refreshCommodities, refreshQualities]);

  const submitCommodity = async () => {
    if (!categoryId || !newCommodity.trim()) {
      setCommodityFormError('Pick a category and enter a commodity name.');
      return;
    }
    setCommodityFormError(null);
    try {
      await addCommodity(categoryId, newCommodity.trim());
      setNewCommodity('');
    } catch (error) {
      setCommodityFormError(error instanceof Error ? error.message : 'Could not add commodity.');
    }
  };

  const submitQuality = async () => {
    if (!categoryId) {
      setQualityFormError('Pick a category first.');
      return;
    }
    const name = newQuality.trim();
    if (!name) {
      setQualityFormError('Enter a quality name.');
      return;
    }
    setQualityFormError(null);
    try {
      const result = await addQualities(categoryId, [name]);
      setNewQuality('');
      if (result.skipped.length) {
        flash(`Created ${result.created.length}; already existed and skipped: ${result.skipped.join(', ')}`);
      }
    } catch (error) {
      setQualityFormError(error instanceof Error ? error.message : 'Could not add quality.');
    }
  };

  return (
    <div className="settings-split">
      <div className="panel panel-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Categories</div>
        <p className="text-muted" style={{ fontSize: 11.5, margin: 0 }}>
          Organize the commodities and qualities available across the platform.
          {liveMode ? ' Changes are saved to the live service.' : ' Categories are session-only in demo mode.'}
        </p>
        {categoryError ? <div className="field-error" role="alert">{categoryError}</div> : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {categoryPageItems.map((category) => (
            <div key={category} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: 'var(--color-neutral-100)', borderRadius: 8 }}>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{category}</div>
              {liveMode ? (
                <>
                  {liveCategories.find((item) => item.name === category)?.qualityCount === 0 ? (
                    <span className="tag tag-accent-2" title="Add at least one quality before users can create listings in this category" style={{ fontSize: 10 }}>
                      No qualities
                    </span>
                  ) : null}
                  <button className="btn btn-secondary" onClick={() => renameCategory(category)} style={{ height: 28, padding: '0 10px', fontSize: 11.5 }}>
                    Rename
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => {
                      if (window.confirm(`Delete category “${category}”? Fails if items still reference it.`)) {
                        deleteCategory(category);
                      }
                    }}
                    style={{ height: 28, padding: '0 10px', fontSize: 11.5 }}
                  >
                    Delete
                  </button>
                </>
              ) : null}
            </div>
          ))}
          {categoryPageItems.length === 0 ? <div className="text-muted" style={{ fontSize: 12.5 }}>No categories yet.</div> : null}
        </div>
        {categoryTotalPages > 1 ? (
          <Pagination page={categoryPage} totalPages={categoryTotalPages} total={categories.length} pageSize={10} onPageChange={setCategoryPage} />
        ) : null}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            id="commodity-category-name"
            className="input"
            placeholder="New category name"
            value={newCategory}
            onChange={(event) => setNewCategory(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') addCategory(); }}
            style={{ height: 34, maxWidth: 220, fontSize: 13 }}
          />
          <button className="btn btn-primary" onClick={addCategory} style={{ height: 34, padding: '0 14px', fontSize: 13 }}>
            Add category
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {liveMode ? (
          <>
            <div className="panel panel-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>
                Commodities {commoditiesLoading ? <span className="text-muted" style={{ fontWeight: 400, fontSize: 12 }}>· loading…</span> : null}
              </div>
              <Field label="Category" required>
                <select className="input" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} disabled={!liveCategories.length}>
                  {liveCategories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </Field>
              {commodityError ? <div className="field-error" role="alert">{commodityError}</div> : null}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {commodityPageItems.map((commodity) => (
                  <div key={commodity.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: 'var(--color-neutral-100)', borderRadius: 8 }}>
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{commodity.name}</div>
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        const next = window.prompt('Rename commodity:', commodity.name);
                        if (next?.trim() && next.trim() !== commodity.name) {
                          void renameCommodity(commodity.id, next, categoryId).catch((error: unknown) => {
                            flash(error instanceof Error ? error.message : 'Rename failed.');
                          });
                        }
                      }}
                      style={{ height: 28, padding: '0 10px', fontSize: 11.5 }}
                    >
                      Rename
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => {
                        if (window.confirm(`Delete commodity “${commodity.name}”?`)) {
                          void deleteCommodity(commodity.id, categoryId).catch((error: unknown) => {
                            flash(error instanceof Error ? error.message : 'Delete failed.');
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
                  <div className="text-muted" style={{ fontSize: 12.5 }}>No commodities in this category yet.</div>
                ) : null}
              </div>
              {commodityTotalPages > 1 ? (
                <Pagination page={commodityPage} totalPages={commodityTotalPages} total={commodityTotal} pageSize={10} onPageChange={setCommodityPage} />
              ) : null}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  className="input"
                  placeholder="New commodity name"
                  value={newCommodity}
                  onChange={(event) => { setNewCommodity(event.target.value); setCommodityFormError(null); }}
                  onKeyDown={(event) => { if (event.key === 'Enter') void submitCommodity(); }}
                  style={{ height: 34, maxWidth: 220, fontSize: 13 }}
                  disabled={!categoryId}
                />
                <button className="btn btn-primary" onClick={() => void submitCommodity()} disabled={!categoryId} style={{ height: 34, padding: '0 14px', fontSize: 13 }}>
                  Add commodity
                </button>
              </div>
              {commodityFormError ? <div className="field-error" role="alert">{commodityFormError}</div> : null}
            </div>

            <div className="panel panel-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>
                Qualities {qualitiesLoading ? <span className="text-muted" style={{ fontWeight: 400, fontSize: 12 }}>· loading…</span> : null}
              </div>
              <Field label="Category" required>
                <select className="input" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} disabled={!liveCategories.length}>
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
                          void renameQuality(quality.id, next, categoryId).catch((error: unknown) => {
                            setQualityFormError(error instanceof Error ? error.message : 'Rename failed.');
                          });
                        }
                      }}
                      style={{ height: 28, padding: '0 10px', fontSize: 11.5 }}
                    >
                      Rename
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => {
                        if (window.confirm(`Delete quality “${quality.name}”? This fails if any listing uses it.`)) {
                          void deleteQuality(quality.id, categoryId).catch((error: unknown) => {
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
                  placeholder="e.g. Sella"
                  value={newQuality}
                  onChange={(event) => { setNewQuality(event.target.value); setQualityFormError(null); }}
                  onKeyDown={(event) => { if (event.key === 'Enter') void submitQuality(); }}
                  disabled={!categoryId}
                />
              </Field>
              <button className="btn btn-primary" onClick={() => void submitQuality()} disabled={!categoryId || !newQuality.trim()}>
                Add quality
              </button>
              {qualityFormError ? <div className="field-error" role="alert">{qualityFormError}</div> : null}
            </div>
          </>
        ) : (
          <div className="callout-info">
            Connect to the live service to manage commodities and qualities. Category management is available in demo mode.
          </div>
        )}
      </div>
    </div>
  );
}
