import { useCallback, useEffect, useMemo, useState } from 'react';
import Panel from '../../components/ui/Panel';
import DataTable from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import Spinner from '../../components/Spinner';
import * as productsApi from '../../api/products';
import { updateProductStock, listCategories } from '../../api/admin';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../utils/request';
import { formatPrice } from '../../utils/format';
import type { Product } from '../../types';
import type { CategoryInfo } from '../../types';

type StockFilter = 'all' | 'low' | 'out';

const FILTERS: { value: StockFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'low', label: 'Stock faible' },
  { value: 'out', label: 'Épuisés' }
];

/** Gestion des stocks : filtres repliables, tableau triable/paginé, édition rapide. */
const AdminStockPage = () => {
  const { showToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [tree, setTree] = useState<CategoryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StockFilter>('all');
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [subcategoryFilter, setSubcategoryFilter] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

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
      setDrafts({});
    } catch (err) {
      setError(getErrorMessage(err, 'Impossible de charger les stocks.'));
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

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((product) => {
      if (filter === 'low' && !(product.stock > 0 && product.stock <= 5)) return false;
      if (filter === 'out' && product.stock !== 0) return false;
      if (categoryFilter && String(product.category) !== categoryFilter) return false;
      if (subcategoryFilter && (product.subcategory || '') !== subcategoryFilter) return false;
      if (groupFilter) {
        const family = tree.find((item) => item.name === String(product.category));
        if ((family?.group || '') !== groupFilter) return false;
      }
      if (!term) return true;
      return product.name.toLowerCase().includes(term);
    });
  }, [products, tree, filter, search, groupFilter, categoryFilter, subcategoryFilter]);

  const totals = useMemo(() => {
    const units = products.reduce((sum, product) => sum + product.stock, 0);
    const value = products.reduce((sum, product) => sum + product.stock * product.price, 0);
    const low = products.filter((product) => product.stock > 0 && product.stock <= 5).length;
    const out = products.filter((product) => product.stock === 0).length;
    return { units, value, low, out };
  }, [products]);

  const handleSave = async (product: Product) => {
    const raw = drafts[product._id];
    const next = Number(raw);

    if (raw === undefined) return;
    if (!Number.isInteger(next) || next < 0) {
      showToast('Le stock doit être un entier positif ou nul.', 'error');
      return;
    }
    if (next === product.stock) return;

    setSavingId(product._id);
    try {
      const updated = await updateProductStock(product._id, next);
      setProducts((current) => current.map((item) => (item._id === product._id ? { ...item, stock: updated.stock } : item)));
      setDrafts((current) => {
        const nextDrafts = { ...current };
        delete nextDrafts[product._id];
        return nextDrafts;
      });
      showToast(`Stock de « ${product.name} » : ${updated.stock}.`, 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Mise à jour du stock impossible.'), 'error');
    } finally {
      setSavingId(null);
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
            <span>{product.name}</span>
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
        label: 'Stock actuel',
        align: 'right',
        sortValue: (product) => product.stock,
        render: (product) => (
          <span className={`stock-hint ${product.stock === 0 ? 'stock-hint--out' : product.stock <= 5 ? 'stock-hint--low' : ''}`}>
            {product.stock}
          </span>
        )
      },
      {
        key: 'newStock',
        label: 'Nouveau stock',
        sortable: false,
        render: (product) => {
          const draft = drafts[product._id];
          return (
            <input
              type="number"
              min="0"
              step="1"
              className="input input--compact"
              aria-label={`Nouveau stock pour ${product.name}`}
              value={draft ?? String(product.stock)}
              onChange={(event) => setDrafts((current) => ({ ...current, [product._id]: event.target.value }))}
            />
          );
        }
      },
      {
        key: 'action',
        label: 'Action',
        align: 'right',
        sortable: false,
        render: (product) => {
          const draft = drafts[product._id];
          const dirty = draft !== undefined && Number(draft) !== product.stock;
          return (
            <button
              type="button"
              className="button button--ghost button--sm"
              onClick={() => handleSave(product)}
              disabled={!dirty || savingId === product._id}
            >
              {savingId === product._id ? 'Enregistrement…' : dirty ? 'Enregistrer' : 'À jour'}
            </button>
          );
        }
      }
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [drafts, savingId]
  );

  if (loading && products.length === 0) {
    return (
      <div className="page-center">
        <Spinner label="Chargement des stocks…" />
      </div>
    );
  }

  if (error) {
    return (
      <Panel title="Stocks indisponibles" storageKey="stock-error">
        <p className="muted">{error}</p>
        <button type="button" className="button button--primary" onClick={load}>
          Réessayer
        </button>
      </Panel>
    );
  }

  return (
    <div className="admin-panel">
      <Panel title="Indicateurs" subtitle="Vue d'ensemble de l'inventaire" storageKey="stock-stats">
        <div className="stat-grid stat-grid--tight">
          <article className="stat-card">
            <span className="stat-card__label">Unités en stock</span>
            <strong className="stat-card__value">{totals.units}</strong>
            <span className="stat-card__hint">{products.length} références</span>
          </article>
          <article className="stat-card">
            <span className="stat-card__label">Valeur d'inventaire</span>
            <strong className="stat-card__value">{formatPrice(totals.value)}</strong>
            <span className="stat-card__hint">prix de vente × stock</span>
          </article>
          <article className="stat-card">
            <span className="stat-card__label">Stocks faibles</span>
            <strong className="stat-card__value">{totals.low}</strong>
            <span className="stat-card__hint">≤ 5 unités restantes</span>
          </article>
          <article className="stat-card">
            <span className="stat-card__label">Épuisés</span>
            <strong className="stat-card__value">{totals.out}</strong>
            <span className="stat-card__hint">à réapprovisionner</span>
          </article>
        </div>
      </Panel>

      <Panel
        title="Filtres"
        subtitle="Filtrer par niveau de stock ou par nom"
        storageKey="stock-filters"
        actions={<span className="muted small">{visible.length} / {products.length} produit(s)</span>}
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

          <div className="field">
            <span>Niveau de stock</span>
            <div className="chip-row" role="group" aria-label="Filtrer les stocks">
              {FILTERS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`chip${filter === item.value ? ' chip--active' : ''}`}
                  onClick={() => setFilter(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <label className="field">
            <span>Recherche</span>
            <input
              type="search"
              className="input"
              placeholder="Rechercher un produit…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>
      </Panel>

      <Panel
        title="Stocks"
        subtitle="Modifiez la quantité puis « Enregistrer »"
        storageKey="stock-table"
        bodyClassName="panel__body--flush"
      >
        <DataTable
          columns={columns}
          rows={visible}
          rowKey={(product) => product._id}
          pageSizeKey="admin-stock"
          emptyLabel="Aucun produit ne correspond à ce filtre."
        />
      </Panel>
    </div>
  );
};

export default AdminStockPage;
