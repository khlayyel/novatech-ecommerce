import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Panel from '../../components/ui/Panel';
import Spinner from '../../components/Spinner';
import { createCategory, getCategory, listCategories, updateCategory } from '../../api/admin';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../utils/request';

interface CategoryForm {
  group: string;
  name: string;
  description: string;
  subcategories: string;
}

const EMPTY_FORM: CategoryForm = { group: '', name: '', description: '', subcategories: '' };

const parseSubcategories = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

/**
 * Page dédiée à la création (`/admin/categories/new`) ou à la modification
 * (`/admin/categories/:id/edit`) d'une famille. Le formulaire d'édition est
 * prérempli avec les données réelles de la famille.
 */
const AdminCategoryFormPage = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const [groups, setGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const tree = await listCategories();
        if (cancelled) return;
        setGroups([...new Set(tree.map((item) => item.group || '').filter(Boolean))].sort());

        if (id) {
          const category = await getCategory(id);
          if (cancelled) return;
          setForm({
            group: category.group || '',
            name: category.name,
            description: category.description,
            subcategories: category.subcategories.join(', ')
          });
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, 'Impossible de charger cette famille.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.name.trim().length < 2) {
      showToast('Le nom doit contenir au moins 2 caractères.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        group: form.group.trim(),
        name: form.name.trim(),
        description: form.description.trim(),
        subcategories: parseSubcategories(form.subcategories)
      };

      if (isEdit && id) {
        await updateCategory(id, payload);
        showToast(`Famille « ${payload.name} » mise à jour.`, 'success');
      } else {
        await createCategory(payload);
        showToast(`Famille « ${payload.name} » créée.`, 'success');
      }

      navigate('/admin/categories');
    } catch (err) {
      showToast(getErrorMessage(err, 'Enregistrement impossible.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-center">
        <Spinner label="Chargement de la famille…" />
      </div>
    );
  }

  if (error) {
    return (
      <Panel title="Famille introuvable" storageKey="category-form-error">
        <p className="muted">{error}</p>
        <Link to="/admin/categories" className="button button--primary">
          Retour aux catégories
        </Link>
      </Panel>
    );
  }

  const preview = parseSubcategories(form.subcategories);

  return (
    <div className="admin-panel">
      <nav className="breadcrumb" aria-label="Fil d'Ariane">
        <Link to="/admin/categories">Catégories</Link>
        <span aria-hidden="true">/</span>
        <span className="breadcrumb__current">{isEdit ? 'Modifier' : 'Nouvelle'}</span>
      </nav>

      <Panel
        title={isEdit ? 'Modifier la famille' : 'Nouvelle famille'}
        subtitle={isEdit ? 'Les champs sont préremplis avec les données actuelles' : 'Nom, description et sous-familles'}
        storageKey="category-form"
        actions={
          <Link to="/admin/categories" className="button button--ghost button--sm">
            Annuler
          </Link>
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="admin-form__grid">
            <label className="field">
              <span>Catégorie (niveau 1)</span>
              <input
                className="input"
                list="category-groups"
                value={form.group}
                onChange={(event) => setForm({ ...form, group: event.target.value })}
                placeholder="Ordinateurs & composants"
                maxLength={60}
              />
              <datalist id="category-groups">
                {groups.map((group) => (
                  <option key={group} value={group} />
                ))}
              </datalist>
            </label>

            <label className="field">
              <span>Famille (niveau 2)</span>
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

            <div className="field admin-form__wide">
              <span>Aperçu ({preview.length} sous-famille(s))</span>
              {preview.length === 0 ? (
                <p className="muted small">Aucune sous-famille saisie.</p>
              ) : (
                <ul className="chip-row chip-row--static">
                  {preview.map((name) => (
                    <li key={name} className="chip chip--static">{name}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="admin-form__actions">
            <Link to="/admin/categories" className="button button--outline">
              Annuler
            </Link>
            <button type="submit" className="button button--primary" disabled={saving}>
              {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer les modifications' : 'Créer la famille'}
            </button>
          </div>
        </form>
      </Panel>
    </div>
  );
};

export default AdminCategoryFormPage;
