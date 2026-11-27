import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import EmptyState from '../../components/EmptyState';
import Spinner from '../../components/Spinner';
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory
} from '../../api/admin';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../utils/request';
import type { CategoryInfo } from '../../types';

interface CategoryForm {
  name: string;
  description: string;
  subcategories: string;
}

const EMPTY_FORM: CategoryForm = { name: '', description: '', subcategories: '' };

const toSubcategoryInput = (list: string[]) => list.join(', ');
const parseSubcategories = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

/** Familles et sous-familles : création, renommage, suppression. */
const AdminCategoriesPage = () => {
  const { showToast } = useToast();

  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryInfo | null>(null);
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
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

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (category: CategoryInfo) => {
    setEditing(category);
    setForm({
      name: category.name,
      description: category.description,
      subcategories: toSubcategoryInput(category.subcategories)
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
    if (form.name.trim().length < 2) {
      showToast('Le nom doit contenir au moins 2 caractères.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        subcategories: parseSubcategories(form.subcategories)
      };

      if (editing) {
        await updateCategory(editing._id, payload);
        showToast(`Famille « ${payload.name} » mise à jour.`, 'success');
      } else {
        await createCategory(payload);
        showToast(`Famille « ${payload.name} » créée.`, 'success');
      }

      closeForm();
      await load();
    } catch (err) {
      showToast(getErrorMessage(err, 'Enregistrement impossible.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category: CategoryInfo) => {
    const confirmed = window.confirm(`Supprimer la famille « ${category.name} » ?`);
    if (!confirmed) return;

    setDeletingId(category._id);
    try {
      await deleteCategory(category._id);
      showToast(`Famille « ${category.name} » supprimée.`, 'success');
      if (editing?._id === category._id) closeForm();
      await load();
    } catch (err) {
      showToast(getErrorMessage(err, 'Suppression impossible.'), 'error');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading && categories.length === 0) {
    return (
      <div className="page-center">
        <Spinner label="Chargement des catégories…" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Catégories indisponibles"
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
      <div className="admin-toolbar">
        <p className="muted">
          {categories.length} famille(s) — renommer une famille met à jour les produits associés.
        </p>
        <button type="button" className="button button--primary" onClick={openCreate}>
          + Nouvelle famille
        </button>
      </div>

      {formOpen && (
        <form className="card admin-form" onSubmit={handleSubmit}>
          <div className="card__head">
            <h2 className="card__title">{editing ? 'Modifier la famille' : 'Nouvelle famille'}</h2>
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
                maxLength={60}
              />
            </label>

            <label className="field">
              <span>Description</span>
              <input
                className="input"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                maxLength={240}
              />
            </label>

            <label className="field admin-form__wide">
              <span>Sous-familles (séparées par des virgules)</span>
              <input
                className="input"
                value={form.subcategories}
                onChange={(event) => setForm({ ...form, subcategories: event.target.value })}
                placeholder="Portables, Bureaux, Mini PC"
              />
            </label>
          </div>

          <div className="admin-form__actions">
            <button type="submit" className="button button--primary" disabled={saving}>
              {saving ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Créer la famille'}
            </button>
          </div>
        </form>
      )}

      <div className="category-grid">
        {categories.map((category) => (
          <article key={category._id} className="category-card">
            <header className="category-card__head">
              <h3>{category.name}</h3>
              <span className="badge-soft">{category.subcategories.length} sous-famille(s)</span>
            </header>

            {category.description && <p className="muted small">{category.description}</p>}

            {category.subcategories.length > 0 ? (
              <ul className="chip-row chip-row--static">
                {category.subcategories.map((name) => (
                  <li key={name} className="chip chip--static">{name}</li>
                ))}
              </ul>
            ) : (
              <p className="muted small">Aucune sous-famille.</p>
            )}

            <footer className="category-card__actions">
              <button type="button" className="button button--ghost button--sm" onClick={() => openEdit(category)}>
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
            </footer>
          </article>
        ))}
      </div>

      {categories.length === 0 && (
        <EmptyState
          title="Aucune catégorie"
          message="Créez une première famille pour organiser le catalogue."
          icon="🗂️"
        />
      )}
    </div>
  );
};

export default AdminCategoriesPage;
