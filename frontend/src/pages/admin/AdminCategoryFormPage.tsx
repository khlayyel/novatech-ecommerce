import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Panel from '../../components/ui/Panel';
import ImageDropzone from '../../components/ui/ImageDropzone';
import Spinner from '../../components/Spinner';
import {
  createCategory,
  getCategory,
  listCategories,
  listCategoryGroups,
  updateCategory,
  upsertCategoryGroup
} from '../../api/admin';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../utils/request';
import type { CategoryGroup } from '../../types';

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
 * (`/admin/categories/:id/edit`) d'une famille, avec upload d'images pour la
 * catégorie de niveau 1, la famille et chaque sous-famille.
 */
const AdminCategoryFormPage = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [groupImage, setGroupImage] = useState('');
  const [familyImage, setFamilyImage] = useState('');
  const [subcategoryImages, setSubcategoryImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [tree, groupList] = await Promise.all([listCategories(), listCategoryGroups()]);
        if (cancelled) return;

        const merged = [...groupList];
        for (const category of tree) {
          const name = String(category.group || '').trim();
          if (name && !merged.some((group) => group.name === name)) {
            merged.push({ name, imageUrl: '' });
          }
        }
        merged.sort((left, right) => left.name.localeCompare(right.name, 'fr'));
        setGroups(merged);

        if (id) {
          const category = await getCategory(id);
          if (cancelled) return;
          setForm({
            group: category.group || '',
            name: category.name,
            description: category.description,
            subcategories: category.subcategories.join(', ')
          });
          setFamilyImage(category.imageUrl || '');
          setSubcategoryImages(category.subcategoryImages || {});
          setGroupImage(groupList.find((group) => group.name === category.group)?.imageUrl || '');
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

  // Le visuel de la catégorie de niveau 1 suit le nom saisi.
  useEffect(() => {
    const found = groups.find((group) => group.name === form.group.trim());
    setGroupImage(found?.imageUrl || '');
  }, [form.group, groups]);

  const subcategories = parseSubcategories(form.subcategories);
  const hasGroup = form.group.trim().length >= 2;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.name.trim().length < 2) {
      showToast('Le nom doit contenir au moins 2 caractères.', 'error');
      return;
    }

    setSaving(true);
    try {
      const prunedImages = Object.fromEntries(
        Object.entries(subcategoryImages).filter(
          ([name, url]) => subcategories.includes(name) && Boolean(url)
        )
      );

      const payload = {
        group: form.group.trim(),
        name: form.name.trim(),
        description: form.description.trim(),
        subcategories,
        imageUrl: familyImage,
        subcategoryImages: prunedImages
      };

      if (isEdit && id) {
        await updateCategory(id, payload);
        showToast(`Famille « ${payload.name} » mise à jour.`, 'success');
      } else {
        await createCategory(payload);
        showToast(`Famille « ${payload.name} » créée.`, 'success');
      }

      const groupName = form.group.trim();
      if (groupName.length >= 2) {
        const existing = groups.find((group) => group.name === groupName);
        if (groupImage && groupImage !== (existing?.imageUrl || '')) {
          await upsertCategoryGroup(groupName, groupImage);
        }
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
                  <option key={group.name} value={group.name} />
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

            <label className="field">
              <span>Sous-familles (séparées par des virgules)</span>
              <input
                className="input"
                value={form.subcategories}
                onChange={(event) => setForm({ ...form, subcategories: event.target.value })}
                placeholder="Portables, Bureaux, Mini PC"
              />
            </label>

            <div className="admin-form__wide">
              {hasGroup ? (
                <ImageDropzone
                  value={groupImage ? [groupImage] : []}
                  onChange={(urls) => setGroupImage(urls[0] || '')}
                  max={1}
                  label="Image de la catégorie (niveau 1)"
                  hint="Visuel commun à toutes les familles de cette catégorie."
                />
              ) : (
                <p className="muted small">Renseignez la catégorie de niveau 1 pour ajouter son visuel.</p>
              )}
            </div>

            <div className="admin-form__wide">
              <ImageDropzone
                value={familyImage ? [familyImage] : []}
                onChange={(urls) => setFamilyImage(urls[0] || '')}
                max={1}
                label="Image de la famille"
                hint="Visuel affiché pour cette famille."
              />
            </div>

            {subcategories.length > 0 && (
              <div className="admin-form__wide">
                <span className="field__label">Images des sous-familles</span>
                <div className="subcategory-images">
                  {subcategories.map((name) => (
                    <div key={name} className="subcategory-image">
                      <strong>{name}</strong>
                      <ImageDropzone
                        value={subcategoryImages[name] ? [subcategoryImages[name]] : []}
                        onChange={(urls) =>
                          setSubcategoryImages((current) => {
                            const next = { ...current };
                            if (urls[0]) next[name] = urls[0];
                            else delete next[name];
                            return next;
                          })
                        }
                        max={1}
                        label={`Image — ${name}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="field admin-form__wide">
              <span>Aperçu des sous-familles ({subcategories.length})</span>
              {subcategories.length === 0 ? (
                <p className="muted small">Aucune sous-famille saisie.</p>
              ) : (
                <ul className="chip-row chip-row--static">
                  {subcategories.map((name) => (
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
