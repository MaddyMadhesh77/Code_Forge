import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatedPage } from '../components/shared/AnimatedPage';
import { Card } from '../components/ui/Card';
import {
  bulkDeleteProblems,
  createProblem,
  deleteProblem,
  getProblemsList,
  updateProblem,
} from '../services/api';
import type { Difficulty, ProblemListItem, ProblemListResponse } from '../types';
import styles from './Problems.module.css';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const emptyForm = {
  title: '',
  statement: '',
  difficulty: 'MEDIUM' as Difficulty,
  tags: '',
  template: '',
};

export function Problems() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [difficulty, setDifficulty] = useState<Difficulty | ''>((searchParams.get('difficulty') as Difficulty) ?? '');
  const [tags, setTags] = useState(searchParams.getAll('tags'));
  const [author, setAuthor] = useState(searchParams.get('author') ?? '');
  const [sort, setSort] = useState(searchParams.get('sort') ?? 'updated_desc');
  const [page, setPage] = useState(Number(searchParams.get('page') ?? 1));
  const [pageSize, setPageSize] = useState(Number(searchParams.get('pageSize') ?? 10));
  const [filtersOpen, setFiltersOpen] = useState(true);

  const [data, setData] = useState<ProblemListResponse>({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingItem, setEditingItem] = useState<ProblemListItem | null>(null);
  const [formState, setFormState] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (debouncedSearch) next.set('q', debouncedSearch);
    if (difficulty) next.set('difficulty', difficulty);
    if (author) next.set('author', author);
    if (sort) next.set('sort', sort);
    if (page !== 1) next.set('page', String(page));
    if (pageSize !== 10) next.set('pageSize', String(pageSize));
    tags.forEach((tag) => next.append('tags', tag));
    setSearchParams(next, { replace: true });
  }, [debouncedSearch, difficulty, author, sort, page, pageSize, tags, setSearchParams]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    getProblemsList({
      q: debouncedSearch,
      difficulty,
      author,
      tags,
      page,
      pageSize,
      sort,
    })
      .then((response) => {
        if (!mounted) return;
        setData(response);
        setSelected((prev) => prev.filter((id) => response.items.some((item) => item.id === id)));
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err?.message ?? 'Unable to load problems');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [debouncedSearch, difficulty, author, tags, page, pageSize, sort]);

  const totalPages = Math.max(1, Math.ceil(data.total / pageSize));

  const selectedAll = useMemo(() => {
    return data.items.length > 0 && data.items.every((item) => selected.includes(item.id));
  }, [data.items, selected]);

  const toggleSelectAll = () => {
    if (selectedAll) {
      setSelected([]);
    } else {
      setSelected(data.items.map((item) => item.id));
    }
  };

  const openCreate = () => {
    setModalMode('create');
    setEditingItem(null);
    setFormState({ ...emptyForm });
    setModalOpen(true);
  };

  const openEdit = (item: ProblemListItem) => {
    setModalMode('edit');
    setEditingItem(item);
    setFormState({
      title: item.title,
      statement: '',
      difficulty: item.difficulty,
      tags: item.tags.join(', '),
      template: '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formState.title.trim()) return;
    setSaving(true);
    const payload = {
      title: formState.title.trim(),
      statement: formState.statement.trim(),
      difficulty: formState.difficulty,
      tags: formState.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      template: formState.template.trim(),
    };

    try {
      if (modalMode === 'create') {
        await createProblem(payload);
        setSearch('');
        setDebouncedSearch('');
        setPage(1);
      } else if (editingItem) {
        await updateProblem(editingItem.id, payload);
        setPage(1);
      }
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: ProblemListItem) => {
    if (!window.confirm(`Delete ${item.title}?`)) return;
    await deleteProblem(item.id);
    setSelected((prev) => prev.filter((id) => id !== item.id));
    setPage(1);
  };

  const handleBulkDelete = async () => {
    if (selected.length === 0) return;
    if (!window.confirm(`Delete ${selected.length} problems?`)) return;
    await bulkDeleteProblems(selected);
    setSelected([]);
    setPage(1);
  };

  const updateTagsInput = (value: string) => {
    setTags(
      value
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    );
  };

  return (
    <AnimatedPage>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1>Problems</h1>
            <p className={styles.subtitle}>Browse, edit, and manage the problem bank.</p>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.actionButton} type="button" onClick={openCreate}>New Problem</button>
            <button className={styles.secondaryButton} type="button">Import</button>
            <button className={styles.ghostButton} type="button" onClick={handleBulkDelete} disabled={selected.length === 0}>
              Delete selected
            </button>
          </div>
        </div>

        <div className={styles.searchRow}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search problems"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className={styles.filterToggle} type="button" onClick={() => setFiltersOpen((prev) => !prev)}>
            {filtersOpen ? 'Hide filters' : 'Show filters'}
          </button>
        </div>

        {filtersOpen && (
          <Card className={styles.filtersCard}>
            <div className={styles.filtersGrid}>
              <div className={styles.filterField}>
                <label>Difficulty</label>
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty | '')}>
                  <option value="">All</option>
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
              </div>
              <div className={styles.filterField}>
                <label>Tags</label>
                <input
                  type="text"
                  value={tags.join(', ')}
                  placeholder="arrays, graphs"
                  onChange={(e) => updateTagsInput(e.target.value)}
                />
              </div>
              <div className={styles.filterField}>
                <label>Author</label>
                <input
                  type="text"
                  value={author}
                  placeholder="Author name"
                  onChange={(e) => setAuthor(e.target.value)}
                />
              </div>
              <div className={styles.filterField}>
                <label>Sort</label>
                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="updated_desc">Last updated</option>
                  <option value="updated_asc">Oldest updated</option>
                  <option value="title_asc">Title (A-Z)</option>
                  <option value="title_desc">Title (Z-A)</option>
                </select>
              </div>
            </div>
          </Card>
        )}

        {selected.length > 0 && (
          <div className={styles.bulkBar}>
            <span>{selected.length} selected</span>
            <button type="button" onClick={handleBulkDelete}>Delete</button>
          </div>
        )}

        <Card className={styles.tableCard}>
          {error && <div className={styles.errorBanner}>{error}</div>}
          <div className={styles.tableHeader}>
            <div className={styles.tableCell}>
              <input type="checkbox" checked={selectedAll} onChange={toggleSelectAll} />
            </div>
            <div className={styles.tableCell}>Title</div>
            <div className={styles.tableCell}>Difficulty</div>
            <div className={styles.tableCell}>Tags</div>
            <div className={styles.tableCell}>Author</div>
            <div className={styles.tableCell}>Last updated</div>
            <div className={styles.tableCell}>Actions</div>
          </div>

          {loading ? (
            <div className={styles.tableSkeleton} />
          ) : data.items.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No problems found.</p>
              <button type="button" onClick={openCreate}>Create your first problem</button>
            </div>
          ) : (
            data.items.map((item) => (
              <div className={styles.tableRow} key={item.id}>
                <div className={styles.tableCell}>
                  <input
                    type="checkbox"
                    checked={selected.includes(item.id)}
                    onChange={() => {
                      setSelected((prev) => (prev.includes(item.id)
                        ? prev.filter((id) => id !== item.id)
                        : [...prev, item.id]));
                    }}
                  />
                </div>
                <div className={styles.tableCell}>
                  <button type="button" className={styles.linkCell} onClick={() => navigate(`/problems/${item.id}`)}>
                    {item.title}
                  </button>
                </div>
                <div className={styles.tableCell}>
                  <span className={`${styles.badge} ${styles[item.difficulty.toLowerCase()]}`}>{item.difficulty}</span>
                </div>
                <div className={styles.tableCell}>
                  <div className={styles.tagWrap}>
                    {item.tags.map((tag) => (
                      <span key={tag} className={styles.tag}>{tag}</span>
                    ))}
                  </div>
                </div>
                <div className={styles.tableCell}>{item.author}</div>
                <div className={styles.tableCell}>{new Date(item.updatedAt).toLocaleDateString()}</div>
                <div className={styles.tableCell}>
                  <div className={styles.rowActions}>
                    <button type="button" onClick={() => navigate(`/problems/${item.id}`)}>View</button>
                    <button type="button" onClick={() => openEdit(item)}>Edit</button>
                    <button type="button" onClick={() => handleDelete(item)} className={styles.dangerButton}>Delete</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </Card>

        <div className={styles.pagination}>
          <div className={styles.pageInfo}>Page {page} of {totalPages}</div>
          <div className={styles.pageControls}>
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              Previous
            </button>
            <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              Next
            </button>
          </div>
          <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>{size} / page</option>
            ))}
          </select>
        </div>

        {modalOpen && (
          <div className={styles.modalOverlay} onClick={() => setModalOpen(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>{modalMode === 'create' ? 'New problem' : 'Edit problem'}</h2>
                <button type="button" onClick={() => setModalOpen(false)}>Close</button>
              </div>
              <div className={styles.modalBody}>
                <label>
                  Title
                  <input
                    type="text"
                    value={formState.title}
                    onChange={(e) => setFormState((prev) => ({ ...prev, title: e.target.value }))}
                  />
                </label>
                <label>
                  Statement
                  <textarea
                    rows={4}
                    value={formState.statement}
                    onChange={(e) => setFormState((prev) => ({ ...prev, statement: e.target.value }))}
                  />
                </label>
                <label>
                  Difficulty
                  <select
                    value={formState.difficulty}
                    onChange={(e) => setFormState((prev) => ({ ...prev, difficulty: e.target.value as Difficulty }))}
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </label>
                <label>
                  Tags
                  <input
                    type="text"
                    value={formState.tags}
                    onChange={(e) => setFormState((prev) => ({ ...prev, tags: e.target.value }))}
                  />
                </label>
                <label>
                  Template
                  <textarea
                    rows={3}
                    value={formState.template}
                    onChange={(e) => setFormState((prev) => ({ ...prev, template: e.target.value }))}
                  />
                </label>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" onClick={() => setModalOpen(false)} className={styles.ghostButton}>Cancel</button>
                <button type="button" onClick={handleSave} disabled={saving || !formState.title.trim()} className={styles.primaryButton}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AnimatedPage>
  );
}
