import { useEffect, useState } from 'react';
import { Pagination, usePagination } from '../../components/common/controls';
import { useAdmin } from '../../store/AdminContext';

function CardIcon({ name }: { name: 'categories' | 'commodities' | 'qualities' }) {
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
      {name === 'categories' ? (
        <>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </>
      ) : name === 'commodities' ? (
        <>
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <path d="m3.3 7 8.7 5 8.7-5" />
          <path d="M12 22V12" />
        </>
      ) : (
        <>
          <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
          <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
          <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
        </>
      )}
    </svg>
  );
}

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

  const selectedCategory = liveCategories.find((category) => category.id === categoryId);

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
    <div className={`commodity-board${liveMode ? '' : ' commodity-board-solo'}`}>
      {/* — categories — */}
      <section className="panel commodity-card" aria-labelledby="commodity-categories-title">
        <div className="commodity-card-head">
          <div className="commodity-card-heading">
            <span className="commodity-card-icon"><CardIcon name="categories" /></span>
            <div style={{ minWidth: 0 }}>
              <div className="commodity-card-title" id="commodity-categories-title">
                Categories <span className="tag tag-neutral">{categories.length}</span>
              </div>
              <p className="commodity-card-sub">Select a category to manage its items.</p>
            </div>
          </div>
        </div>

        <div className="commodity-card-body">
          {categoryError ? <div className="field-error" role="alert">{categoryError}</div> : null}
          <div className="commodity-card-list">
            {categoryPageItems.map((category) => {
              const meta = liveCategories.find((item) => item.name === category);
              const isActive = Boolean(meta) && meta?.id === categoryId;
              return (
                <div
                  key={category}
                  role={meta ? 'button' : undefined}
                  tabIndex={meta ? 0 : undefined}
                  aria-pressed={meta ? isActive : undefined}
                  className={`commodity-row${meta ? ' commodity-row-select' : ''}${isActive ? ' is-selected' : ''}`}
                  onClick={() => { if (meta) setCategoryId(meta.id); }}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if ((event.key === 'Enter' || event.key === ' ') && meta) {
                      event.preventDefault();
                      setCategoryId(meta.id);
                    }
                  }}
                >
                  <div className="commodity-row-name">
                    {category}
                    {liveMode && meta?.qualityCount === 0 ? (
                      <span className="tag tag-accent-2" title="Add at least one quality before users can create listings in this category">
                        No qualities
                      </span>
                    ) : null}
                  </div>
                  {isActive ? <span className="commodity-active-dot" aria-hidden="true" /> : null}
                  {liveMode ? (
                    <div className="commodity-row-actions">
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={(event) => { event.stopPropagation(); renameCategory(category); }}
                      >
                        Rename
                      </button>
                      <button
                        className="btn btn-danger-ghost btn-sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (window.confirm(`Delete category “${category}”? Fails if items still reference it.`)) {
                            deleteCategory(category);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
            {categoryPageItems.length === 0 ? (
              <div className="empty-note">No categories yet. Add one below to get started.</div>
            ) : null}
          </div>
          {categoryTotalPages > 1 ? (
            <Pagination page={categoryPage} totalPages={categoryTotalPages} total={categories.length} pageSize={10} onPageChange={setCategoryPage} />
          ) : null}
        </div>

        <div className="commodity-card-foot">
          <label className="commodity-add-label" htmlFor="commodity-category-name">Add category</label>
          <div className="commodity-add-row">
            <input
              id="commodity-category-name"
              className="input"
              placeholder="New category name"
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') addCategory(); }}
            />
            <button className="btn btn-primary" onClick={addCategory}>Add</button>
          </div>
        </div>
      </section>

      {liveMode ? (
        <>
          {/* — commodities — */}
          <section className="panel commodity-card" aria-labelledby="commodity-commodities-title">
            <div className="commodity-card-head">
              <div className="commodity-card-heading">
                <span className="commodity-card-icon"><CardIcon name="commodities" /></span>
                <div style={{ minWidth: 0 }}>
                  <div className="commodity-card-title" id="commodity-commodities-title">
                    Commodities <span className="tag tag-neutral">{commodityTotal}</span>
                  </div>
                  <p className="commodity-card-sub">
                    {selectedCategory ? `Products in ${selectedCategory.name}.` : 'Select a category to begin.'}
                  </p>
                </div>
              </div>
              {commoditiesLoading ? <span className="commodity-loading">Loading…</span> : null}
            </div>

            <div className="commodity-card-body">
              {commodityError ? <div className="field-error" role="alert">{commodityError}</div> : null}
              <div className="commodity-card-list">
                {commodityPageItems.map((commodity) => (
                  <div key={commodity.id} className="commodity-row">
                    <div className="commodity-row-name">{commodity.name}</div>
                    <div className="commodity-row-actions">
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          const next = window.prompt('Rename commodity:', commodity.name);
                          if (next?.trim() && next.trim() !== commodity.name) {
                            void renameCommodity(commodity.id, next, categoryId).catch((error: unknown) => {
                              flash(error instanceof Error ? error.message : 'Rename failed.');
                            });
                          }
                        }}
                      >
                        Rename
                      </button>
                      <button
                        className="btn btn-danger-ghost btn-sm"
                        onClick={() => {
                          if (window.confirm(`Delete commodity “${commodity.name}”?`)) {
                            void deleteCommodity(commodity.id, categoryId).catch((error: unknown) => {
                              flash(error instanceof Error ? error.message : 'Delete failed.');
                            });
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {liveCommodities.length === 0 && !commoditiesLoading ? (
                  <div className="empty-note">No commodities in this category yet.</div>
                ) : null}
              </div>
              {commodityTotalPages > 1 ? (
                <Pagination page={commodityPage} totalPages={commodityTotalPages} total={commodityTotal} pageSize={10} onPageChange={setCommodityPage} />
              ) : null}
            </div>

            <div className="commodity-card-foot">
              <label className="commodity-add-label" htmlFor="commodity-name">Add commodity</label>
              <div className="commodity-add-row">
                <input
                  id="commodity-name"
                  className="input"
                  placeholder="New commodity name"
                  value={newCommodity}
                  onChange={(event) => { setNewCommodity(event.target.value); setCommodityFormError(null); }}
                  onKeyDown={(event) => { if (event.key === 'Enter') void submitCommodity(); }}
                  disabled={!categoryId}
                />
                <button className="btn btn-primary" onClick={() => void submitCommodity()} disabled={!categoryId}>Add</button>
              </div>
              {commodityFormError ? <div className="field-error" role="alert">{commodityFormError}</div> : null}
            </div>
          </section>

          {/* — qualities — */}
          <section className="panel commodity-card" aria-labelledby="commodity-qualities-title">
            <div className="commodity-card-head">
              <div className="commodity-card-heading">
                <span className="commodity-card-icon"><CardIcon name="qualities" /></span>
                <div style={{ minWidth: 0 }}>
                  <div className="commodity-card-title" id="commodity-qualities-title">
                    Qualities <span className="tag tag-neutral">{liveQualities.length}</span>
                  </div>
                  <p className="commodity-card-sub">
                    {selectedCategory ? `Grades available for ${selectedCategory.name}.` : 'Select a category to begin.'}
                  </p>
                </div>
              </div>
              {qualitiesLoading ? <span className="commodity-loading">Loading…</span> : null}
            </div>

            <div className="commodity-card-body">
              {qualitiesError ? <div className="field-error" role="alert">{qualitiesError}</div> : null}
              <div className="commodity-card-list">
                {liveQualities.map((quality) => (
                  <div key={quality.id} className="commodity-row">
                    <div className="commodity-row-name">{quality.name}</div>
                    <div className="commodity-row-actions">
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          const next = window.prompt('Rename quality:', quality.name);
                          if (next?.trim() && next.trim() !== quality.name) {
                            void renameQuality(quality.id, next, categoryId).catch((error: unknown) => {
                              setQualityFormError(error instanceof Error ? error.message : 'Rename failed.');
                            });
                          }
                        }}
                      >
                        Rename
                      </button>
                      <button
                        className="btn btn-danger-ghost btn-sm"
                        onClick={() => {
                          if (window.confirm(`Delete quality “${quality.name}”? This fails if any listing uses it.`)) {
                            void deleteQuality(quality.id, categoryId).catch((error: unknown) => {
                              setQualityFormError(error instanceof Error ? error.message : 'Delete failed.');
                            });
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {liveQualities.length === 0 && !qualitiesLoading ? (
                  <div className="callout-info">
                    No qualities in this category. Users cannot create listings in it until an admin adds a quality.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="commodity-card-foot">
              <label className="commodity-add-label" htmlFor="commodity-quality-name">Add quality</label>
              <div className="commodity-add-row">
                <input
                  id="commodity-quality-name"
                  className="input"
                  placeholder="e.g. Sella"
                  value={newQuality}
                  onChange={(event) => { setNewQuality(event.target.value); setQualityFormError(null); }}
                  onKeyDown={(event) => { if (event.key === 'Enter') void submitQuality(); }}
                  disabled={!categoryId}
                />
                <button className="btn btn-primary" onClick={() => void submitQuality()} disabled={!categoryId || !newQuality.trim()}>Add</button>
              </div>
              {qualityFormError ? <div className="field-error" role="alert">{qualityFormError}</div> : null}
            </div>
          </section>
        </>
      ) : (
        <div className="callout-info" style={{ gridColumn: '1 / -1' }}>
          Connect to the live service to manage commodities and qualities. Category management is available in demo mode.
        </div>
      )}
    </div>
  );
}
