import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Panel from '../../components/ui/Panel';
import DataTable from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import Spinner from '../../components/Spinner';
import { deleteCategory, listCategories } from '../../api/admin';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../utils/request';
import type { CategoryInfo } from '../../types';

/** Familles et sous-familles : tableau triable/paginé, création et édition en pages dédiées. */
const AdminCategoriesPage = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listCategories();
      setCategories(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Impossible de charger les catégories.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo(
    () => [...new Set(categories.map((category) => category.group || '').filter(Boolean))].sort(),
    [categories]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return categories.filter((category) => {
      if (groupFilter && (category.group || '') !== groupFilter) return false;
      if (!term) return true;
      return (
        category.name.toLowerCase().includes(term) ||
        category.description.toLowerCase().includes(term) ||
        category.subcategories.some((name) => name.toLowerCase().includes(term))
      );
    });
  }, [categories, search, groupFilter]);

  const handleDelete = async (category: CategoryInfo) => {
    const confirmed = window.confirm(`Supprimer la famille « ${category.name} » ?`);
    if (!confirmed) return;

    setDeletingId(category._id);
    try {
      await deleteCategory(category._id);
      showToast(`Famille « ${category.name} » supprimée.`, 'success');
      await load();
    } catch (err) {
      showToast(getErrorMessage(err, 'Suppression impossible.'), 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const columns: Column<CategoryInfo>[] = useMemo(
    () => [
      {
        key: 'group',
        label: 'Catégorie',
        sortValue: (category) => category.group || '',
        render: (category) => category.group || <span className="muted small">—</span>
      },
      {
        key: 'name',
        label: 'Famille',
        sortValue: (category) => category.name,
        render: (category) => <strong>{category.name}</strong>
      },
      {
        key: 'description',
        label: 'Description',
        sortValue: (category) => category.description,
        render: (category) =>
          category.description ? (
            <span className="muted">{category.description}</span>
          ) : (
            <span className="muted small">—</span>
          )
      },
      {
        key: 'subcategories',
        label: 'Sous-familles',
        sortValue: (category) => category.subcategories.length,
        render: (category) =>
          category.subcategories.length === 0 ? (
            <span className="muted small">—</span>
          ) : (
            <ul className="chip-row chip-row--static">
              {category.subcategories.slice(0, 4).map((name) => (
                <li key={name} className="chip chip--static">{name}</li>
              ))}
              {category.subcategories.length > 4 && (
                <li className="chip chip--static">+{category.subcategories.length - 4}</li>
              )}
            </ul>
          )
      },
      {
        key: 'actions',
        label: 'Actions',
        align: 'right',
        sortable: false,
        render: (category) => (
          <div className="admin-row-actions">
            <button
              type="button"
              className="button button--ghost button--sm"
              onClick={() => navigate(`/admin/categories/${category._id}/edit`)}
            >
              Modifier
            </button>
            <button
              type="button"
              className="button button--danger-ghost button--sm"
              onClick={() => handleDelete(category)}
              disabled={deletingId === category._id}
            >
              {deletingId === category._id ? 'Suppression…' : 'Supprimer'}
            </button>
          </div>
        )
      }
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deletingId]
  );

  if (loading && categories.length === 0) {
    return (
      <div className="page-center">
        <Spinner label="Chargement des catégories…" />
      </div>
    );
  }

  if (error) {
    return (
      <Panel title="Catégories indisponibles" storageKey="categories-error">
        <p className="muted">{error}</p>
        <button type="button" className="button button--primary" onClick={load}>
          Réessayer
        </button>
      </Panel>
    );
  }

  return (
    <div className="admin-panel">
      <Panel
        title="Filtres"
        subtitle="Rechercher une famille, une description ou une sous-famille"
        storageKey="categories-filters"
        actions={<span className="muted small">{filtered.length} / {categories.length} famille(s)</span>}
      >
        <div className="filter-grid filter-grid--two">
          <label className="field">
            <span>Catégorie</span>
            <select
              className="input input--select"
              value={groupFilter}
              onChange={(event) => setGroupFilter(event.target.value)}
            >
              <option value="">Toutes les catégories</option>
              {groups.map((group) => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Recherche</span>
            <input
              type="search"
              className="input"
              placeholder="Portables, moniteurs…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>
      </Panel>

      <Panel
        title="Familles et sous-familles"
        subtitle="Renommer une famille met à jour les produits associés"
        storageKey="categories-table"
        bodyClassName="panel__body--flush"
        actions={
          <button
            type="button"
            className="button button--primary button--sm"
            onClick={() => navigate('/admin/categories/new')}
          >
            + Nouvelle famille
          </button>
        }
      >
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(category) => category._id}
          pageSizeKey="admin-categories"
          emptyLabel="Aucune famille ne correspond à cette recherche."
        />
      </Panel>
    </div>
  );
};

export default AdminCategoriesPage;
