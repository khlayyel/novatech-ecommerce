import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import Panel from '../../components/ui/Panel';
import Spinner from '../../components/Spinner';
import * as productsApi from '../../api/products';
import { deleteProduct, downloadCsv, listCategories } from '../../api/admin';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../utils/request';
import { formatPrice } from '../../utils/format';
import type { Product } from '../../types';
import type { CategoryInfo } from '../../types';

/**
 * Liste du catalogue : filtres repliables, tableau triable/paginé.
 * La création et la modification se font sur des pages dédiées
 * (`/admin/products/new` et `/admin/products/:id/edit`).
 */
const AdminProductsPage = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [tree, setTree] = useState<CategoryInfo[]>([]);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [subcategoryFilter, setSubcategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, categories] = await Promise.all([
        productsApi.listProducts({ limit: 200, sort: 'recent' }),
        listCategories()
      ]);
      setProducts(data.products);
      setTree(categories);
    } catch (err) {
      setError(getErrorMessage(err, 'Impossible de charger le catalogue.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo(
    () => [...new Set(tree.map((item) => item.group || '').filter(Boolean))].sort(),
    [tree]
  );

  const familyOptions = useMemo(() => {
    if (!groupFilter) return tree;
    return tree.filter((item) => (item.group || '') === groupFilter);
  }, [tree, groupFilter]);

  const subcategoryOptions = useMemo(() => {
    const family = tree.find((item) => item.name === categoryFilter);
    return family?.subcategories ?? [];
  }, [tree, categoryFilter]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((product) => {
      if (groupFilter) {
        const family = tree.find((item) => item.name === String(product.category));
        if ((family?.group || '') !== groupFilter) return false;
      }
      if (categoryFilter && String(product.category) !== categoryFilter) return false;
      if (subcategoryFilter && (product.subcategory || '') !== subcategoryFilter) return false;
      if (!term) return true;
      return (
        product.name.toLowerCase().includes(term) ||
        String(product.category).toLowerCase().includes(term) ||
        (product.subcategory || '').toLowerCase().includes(term)
      );
    });
  }, [products, tree, search, groupFilter, categoryFilter, subcategoryFilter]);

  const handleDelete = async (product: Product) => {
    const confirmed = window.confirm(`Supprimer définitivement « ${product.name} » du catalogue ?`);
    if (!confirmed) return;

    setDeletingId(product._id);
    try {
      await deleteProduct(product._id);
      showToast(`« ${product.name} » supprimé.`, 'success');
      await load();
    } catch (err) {
      showToast(getErrorMessage(err, 'Suppression impossible.'), 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadCsv('/admin/export/products.csv', 'novatech-produits.csv');
      showToast('Export du catalogue téléchargé.', 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Export impossible.'), 'error');
    } finally {
      setExporting(false);
    }
  };

  const columns: Column<Product>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Produit',
        sortValue: (product) => product.name,
        render: (product) => (
          <div className="admin-product__cell">
            <img src={product.imageUrl} alt="" />
            <span>
              {product.name}
              {product.subcategory && <small className="muted block">{product.subcategory}</small>}
            </span>
          </div>
        )
      },
      {
        key: 'category',
        label: 'Famille',
        sortValue: (product) => String(product.category)
      },
      {
        key: 'price',
        label: 'Prix',
        align: 'right',
        sortValue: (product) => product.price,
        render: (product) => formatPrice(product.price)
      },
      {
        key: 'stock',
        label: 'Stock',
        align: 'right',
        sortValue: (product) => product.stock,
        render: (product) => (
          <span className={`stock-hint ${product.stock === 0 ? 'stock-hint--out' : product.stock <= 5 ? 'stock-hint--low' : ''}`}>
            {product.stock}
          </span>
        )
      },
      {
        key: 'actions',
        label: 'Actions',
        align: 'right',
        sortable: false,
        render: (product) => (
          <div className="admin-row-actions">
            <button
              type="button"
              className="button button--ghost button--sm"
              onClick={() => navigate(`/admin/products/${product._id}/edit`)}
            >
              Modifier
            </button>
            <button
              type="button"
              className="button button--danger-ghost button--sm"
              onClick={() => handleDelete(product)}
              disabled={deletingId === product._id}
            >
              {deletingId === product._id ? 'Suppression…' : 'Supprimer'}
            </button>
          </div>
        )
      }
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deletingId]
  );

  if (loading && products.length === 0) {
    return (
      <div className="page-center">
        <Spinner label="Chargement du catalogue…" />
      </div>
    );
  }

  if (error) {
    return (
      <Panel title="Catalogue indisponible" storageKey="products-error">
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
        subtitle="Recherche par nom, famille ou sous-famille"
        storageKey="products-filters"
        actions={<span className="muted small">{filtered.length} / {products.length} produit(s)</span>}
      >
        <div className="filter-grid filter-grid--two">
          <label className="field">
            <span>Catégorie</span>
            <select
              className="input input--select"
              value={groupFilter}
              onChange={(event) => {
                setGroupFilter(event.target.value);
                setCategoryFilter('');
                setSubcategoryFilter('');
              }}
            >
              <option value="">Toutes les catégories</option>
              {groups.map((group) => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Famille</span>
            <select
              className="input input--select"
              value={categoryFilter}
              disabled={familyOptions.length === 0}
              onChange={(event) => {
                setCategoryFilter(event.target.value);
                setSubcategoryFilter('');
              }}
            >
              <option value="">Toutes les familles</option>
              {familyOptions.map((family) => (
                <option key={family._id} value={family.name}>{family.name}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Sous-famille</span>
            <select
              className="input input--select"
              value={subcategoryFilter}
              disabled={!categoryFilter || subcategoryOptions.length === 0}
              onChange={(event) => setSubcategoryFilter(event.target.value)}
            >
              <option value="">Toutes les sous-familles</option>
              {subcategoryOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Recherche</span>
            <input
              type="search"
              className="input"
              placeholder="NovaBook, Écrans…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>
      </Panel>

      <Panel
        title="Catalogue"
        subtitle="Tri par colonne, pagination et export"
        storageKey="products-table"
        bodyClassName="panel__body--flush"
        actions={
          <>
            <button type="button" className="button button--outline button--sm" onClick={handleExport} disabled={exporting}>
              {exporting ? 'Export…' : 'Exporter CSV'}
            </button>
            <button
              type="button"
              className="button button--primary button--sm"
              onClick={() => navigate('/admin/products/new')}
            >
              + Nouveau produit
            </button>
          </>
        }
      >
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(product) => product._id}
          pageSizeKey="admin-products"
          emptyLabel="Aucun produit ne correspond à cette recherche."
        />
      </Panel>
    </div>
  );
};

export default AdminProductsPage;
