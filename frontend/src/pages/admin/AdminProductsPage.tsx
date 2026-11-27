import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import EmptyState from '../../components/EmptyState';
import Spinner from '../../components/Spinner';
import * as productsApi from '../../api/products';
import { createProduct, deleteProduct, updateProduct } from '../../api/admin';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../utils/request';
import { formatPrice } from '../../utils/format';
import type { Category, Product } from '../../types';

const CATEGORIES: Category[] = ['Ordinateurs', 'Écrans', 'Périphériques', 'Composants', 'Réseau', 'Impression'];

interface ProductForm {
  name: string;
  description: string;
  price: string;
  category: string;
  stock: string;
  imageUrl: string;
}

const EMPTY_FORM: ProductForm = {
  name: '',
  description: '',
  price: '',
  category: 'Ordinateurs',
  stock: '',
  imageUrl: ''
};

/** Gestion du catalogue : création, modification et suppression de produits. */
const AdminProductsPage = () => {
  const { showToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await productsApi.listProducts({ limit: 48, sort: 'recent' });
      setProducts(data.products);
    } catch (err) {
      setError(getErrorMessage(err, 'Impossible de charger le catalogue.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({
      name: product.name,
      description: product.description,
      price: String(product.price),
      category: String(product.category),
      stock: String(product.stock),
      imageUrl: product.imageUrl
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const price = Number(form.price);
    const stock = Number(form.stock);

    if (!form.name.trim() || !form.description.trim()) {
      showToast('Le nom et la description sont requis.', 'error');
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      showToast('Le prix doit être un nombre supérieur à zéro.', 'error');
      return;
    }
    if (!Number.isInteger(stock) || stock < 0) {
      showToast('Le stock doit être un entier positif ou nul.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price,
        category: form.category,
        stock,
        imageUrl: form.imageUrl.trim()
      };

      if (editing) {
        await updateProduct(editing._id, payload);
        showToast(`« ${payload.name} » mis à jour.`, 'success');
      } else {
        await createProduct(payload);
        showToast(`« ${payload.name} » ajouté au catalogue.`, 'success');
      }

      closeForm();
      await load();
    } catch (err) {
      showToast(getErrorMessage(err, 'Enregistrement impossible.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product: Product) => {
    const confirmed = window.confirm(`Supprimer définitivement « ${product.name} » du catalogue ?`);
    if (!confirmed) return;

    setDeletingId(product._id);
    try {
      await deleteProduct(product._id);
      showToast(`« ${product.name} » supprimé.`, 'success');
      if (editing?._id === product._id) closeForm();
      await load();
    } catch (err) {
      showToast(getErrorMessage(err, 'Suppression impossible.'), 'error');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading && products.length === 0) {
    return (
      <div className="page-center">
        <Spinner label="Chargement du catalogue…" />
      </div>
    );
  }

  if (error) {
    return <EmptyState title="Catalogue indisponible" message={error} icon="⚠️" action={
      <button type="button" className="button button--primary" onClick={load}>
        Réessayer
      </button>
    } />;
  }

  return (
    <div className="admin-panel">
      <div className="admin-toolbar">
        <p className="muted">
          {products.length} produit{products.length > 1 ? 's' : ''} au catalogue.
        </p>
        <button type="button" className="button button--primary" onClick={openCreate}>
          + Nouveau produit
        </button>
      </div>

      {formOpen && (
        <form className="card admin-form" onSubmit={handleSubmit}>
          <div className="card__head">
            <h2 className="card__title">{editing ? 'Modifier le produit' : 'Nouveau produit'}</h2>
            <button type="button" className="button button--ghost button--sm" onClick={closeForm}>
              Annuler
            </button>
          </div>

          <div className="admin-form__grid">
            <label className="field">
              <span>Nom</span>
              <input
                className="input"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
                maxLength={120}
              />
            </label>

            <label className="field">
              <span>Catégorie</span>
              <select
                className="input input--select"
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value })}
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Prix (€)</span>
              <input
                className="input"
                type="number"
                min="0.01"
                step="0.01"
                value={form.price}
                onChange={(event) => setForm({ ...form, price: event.target.value })}
                required
              />
            </label>

            <label className="field">
              <span>Stock</span>
              <input
                className="input"
                type="number"
                min="0"
                step="1"
                value={form.stock}
                onChange={(event) => setForm({ ...form, stock: event.target.value })}
                required
              />
            </label>

            <label className="field admin-form__wide">
              <span>Image (chemin ou URL)</span>
              <input
                className="input"
                value={form.imageUrl}
                onChange={(event) => setForm({ ...form, imageUrl: event.target.value })}
                placeholder="/images/products/mon-produit.svg"
              />
            </label>

            <label className="field admin-form__wide">
              <span>Description</span>
              <textarea
                className="input"
                rows={3}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                required
                maxLength={2000}
              />
            </label>
          </div>

          <div className="admin-form__actions">
            <button type="submit" className="button button--primary" disabled={saving}>
              {saving ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Créer le produit'}
            </button>
          </div>
        </form>
      )}

      <div className="table-wrapper card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Produit</th>
              <th>Catégorie</th>
              <th>Prix</th>
              <th>Stock</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
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
                  <div className="admin-row-actions">
                    <button type="button" className="button button--ghost button--sm" onClick={() => openEdit(product)}>
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminProductsPage;
