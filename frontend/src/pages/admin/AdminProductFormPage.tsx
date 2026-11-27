import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Panel from '../../components/ui/Panel';
import Spinner from '../../components/Spinner';
import * as productsApi from '../../api/products';
import { createProduct, listCategories, updateProduct } from '../../api/admin';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../utils/request';
import { formatPrice } from '../../utils/format';
import type { CategoryInfo } from '../../types';

const FALLBACK_CATEGORIES = ['Ordinateurs', 'Écrans', 'Périphériques', 'Composants', 'Réseau', 'Impression'];

interface ProductForm {
  name: string;
  description: string;
  price: string;
  category: string;
  subcategory: string;
  stock: string;
  imageUrl: string;
}

const EMPTY_FORM: ProductForm = {
  name: '',
  description: '',
  price: '',
  category: FALLBACK_CATEGORIES[0],
  subcategory: '',
  stock: '',
  imageUrl: ''
};

/**
 * Page dédiée à la création (`/admin/products/new`) ou à la modification
 * (`/admin/products/:id/edit`) d'un produit. En modification, le formulaire
 * est prérempli avec les données réelles du produit.
 */
const AdminProductFormPage = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const tree = await listCategories();
        if (cancelled) return;
        setCategories(tree);

        if (id) {
          const product = await productsApi.getProduct(id);
          if (cancelled) return;
          setForm({
            name: product.name,
            description: product.description,
            price: String(product.price),
            category: String(product.category),
            subcategory: product.subcategory || '',
            stock: String(product.stock),
            imageUrl: product.imageUrl
          });
        } else {
          setForm({ ...EMPTY_FORM, category: tree[0]?.name || FALLBACK_CATEGORIES[0] });
        }
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err, 'Impossible de charger ce produit.'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const categoryNames = categories.length > 0 ? categories.map((item) => item.name) : FALLBACK_CATEGORIES;

  const subcategoryOptions = useMemo(() => {
    const current = categories.find((item) => item.name === form.category);
    return current?.subcategories ?? [];
  }, [categories, form.category]);

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
        subcategory: form.subcategory,
        stock,
        imageUrl: form.imageUrl.trim()
      };

      if (isEdit && id) {
        await updateProduct(id, payload);
        showToast(`« ${payload.name} » mis à jour.`, 'success');
      } else {
        await createProduct(payload);
        showToast(`« ${payload.name} » ajouté au catalogue.`, 'success');
      }

      navigate('/admin/products');
    } catch (err) {
      showToast(getErrorMessage(err, 'Enregistrement impossible.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-center">
        <Spinner label={isEdit ? 'Chargement du produit…' : 'Préparation du formulaire…'} />
      </div>
    );
  }

  if (error) {
    return (
      <Panel title="Produit introuvable" storageKey="product-form-error">
        <p className="muted">{error}</p>
        <Link to="/admin/products" className="button button--primary">
          Retour aux produits
        </Link>
      </Panel>
    );
  }

  const price = Number(form.price);
  const stock = Number(form.stock);

  return (
    <div className="admin-panel">
      <nav className="breadcrumb" aria-label="Fil d'Ariane">
        <Link to="/admin/products">Produits</Link>
        <span aria-hidden="true">/</span>
        <span className="breadcrumb__current">{isEdit ? 'Modifier' : 'Nouveau'}</span>
      </nav>

      <Panel
        title={isEdit ? 'Modifier le produit' : 'Nouveau produit'}
        subtitle={isEdit ? 'Les champs sont préremplis avec les données actuelles' : 'Renseignez les informations du produit'}
        storageKey="product-form"
        actions={
          <Link to="/admin/products" className="button button--ghost button--sm">
            Annuler
          </Link>
        }
      >
        <form onSubmit={handleSubmit}>
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
              <span>Famille</span>
              <select
                className="input input--select"
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value, subcategory: '' })}
              >
                {categoryNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Sous-famille</span>
              <select
                className="input input--select"
                value={form.subcategory}
                onChange={(event) => setForm({ ...form, subcategory: event.target.value })}
              >
                <option value="">— Aucune —</option>
                {subcategoryOptions.map((name) => (
                  <option key={name} value={name}>{name}</option>
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

            <div className="field">
              <span>Aperçu</span>
              <div className="form-preview">
                {form.imageUrl ? (
                  <img src={form.imageUrl} alt="" />
                ) : (
                  <span className="muted small">Aucune image</span>
                )}
                <div>
                  <strong>{form.name || 'Nom du produit'}</strong>
                  <small className="block muted">
                    {Number.isFinite(price) && price > 0 ? formatPrice(price) : '—'}
                    {' · '}
                    {Number.isInteger(stock) ? `${stock} en stock` : 'stock —'}
                  </small>
                </div>
              </div>
            </div>

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
                rows={4}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                required
                maxLength={2000}
              />
            </label>
          </div>

          <div className="admin-form__actions">
            <Link to="/admin/products" className="button button--outline">
              Annuler
            </Link>
            <button type="submit" className="button button--primary" disabled={saving}>
              {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer les modifications' : 'Créer le produit'}
            </button>
          </div>
        </form>
      </Panel>
    </div>
  );
};

export default AdminProductFormPage;
