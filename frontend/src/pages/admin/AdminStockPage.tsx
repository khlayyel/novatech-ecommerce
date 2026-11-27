import { useCallback, useEffect, useMemo, useState } from 'react';
import EmptyState from '../../components/EmptyState';
import Spinner from '../../components/Spinner';
import * as productsApi from '../../api/products';
import { updateProductStock } from '../../api/admin';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../utils/request';
import { formatPrice } from '../../utils/format';
import type { Product } from '../../types';

type StockFilter = 'all' | 'low' | 'out';

const FILTERS: { value: StockFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'low', label: 'Stock faible' },
  { value: 'out', label: 'Épuisés' }
];

/** Gestion des stocks : ajustement rapide, alertes et valeur d'inventaire. */
const AdminStockPage = () => {
  const { showToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StockFilter>('all');
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await productsApi.listProducts({ limit: 48, sort: 'recent' });
      setProducts(data.products);
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

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((product) => {
      if (filter === 'low' && !(product.stock > 0 && product.stock <= 5)) return false;
      if (filter === 'out' && product.stock !== 0) return false;
      if (!term) return true;
      return product.name.toLowerCase().includes(term);
    });
  }, [products, filter, search]);

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

  if (loading && products.length === 0) {
    return (
      <div className="page-center">
        <Spinner label="Chargement des stocks…" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Stocks indisponibles"
        message={error}
        icon="⚠️"
        action={
          <button type="button" className="button button--primary" onClick={load}>
            Réessayer
          </button>
        }
      />
    );
  }

  return (
    <div className="admin-panel">
      <div className="stat-grid">
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

      <div className="admin-toolbar">
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
        <input
          type="search"
          className="input"
          placeholder="Rechercher un produit…"
          aria-label="Rechercher un produit"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="table-wrapper card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Produit</th>
              <th>Famille</th>
              <th>Prix</th>
              <th>Stock</th>
              <th>Nouveau stock</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((product) => {
              const draft = drafts[product._id];
              const dirty = draft !== undefined && Number(draft) !== product.stock;
              return (
                <tr key={product._id}>
                  <td>
                    <div className="admin-product__cell">
                      <img src={product.imageUrl} alt="" />
                      <span>{product.name}</span>
                    </div>
                  </td>
                  <td>{product.category}</td>
                  <td>{formatPrice(product.price)}</td>
                  <td>
                    <span className={`stock-hint ${product.stock === 0 ? 'stock-hint--out' : product.stock <= 5 ? 'stock-hint--low' : ''}`}>
                      {product.stock}
                    </span>
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="input input--compact"
                      aria-label={`Nouveau stock pour ${product.name}`}
                      value={draft ?? String(product.stock)}
                      onChange={(event) => setDrafts((current) => ({ ...current, [product._id]: event.target.value }))}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="button button--ghost button--sm"
                      onClick={() => handleSave(product)}
                      disabled={!dirty || savingId === product._id}
                    >
                      {savingId === product._id ? 'Enregistrement…' : dirty ? 'Enregistrer' : 'À jour'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {visible.length === 0 && (
        <EmptyState title="Aucun produit" message="Aucun produit ne correspond à ce filtre." icon="📦" />
      )}
    </div>
  );
};

export default AdminStockPage;
