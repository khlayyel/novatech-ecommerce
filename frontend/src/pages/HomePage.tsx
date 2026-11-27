import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductList from '../components/ProductList';
import * as productsApi from '../api/products';
import { getErrorMessage } from '../utils/request';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useI18n } from '../i18n';
import type { CategoryInfo, Product } from '../types';

/**
 * Accueil : héro + catalogue filtrable.
 * Les filtres sont hiérarchiques : Catégorie → Famille → Sous-famille
 * (une famille n'est sélectionnable qu'après une catégorie).
 */
const HomePage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [tree, setTree] = useState<CategoryInfo[]>([]);
  const [group, setGroup] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  const { addToCart } = useCart();
  const { showToast } = useToast();
  const { t } = useI18n();

  // Recherche avec anti-rebond (300 ms).
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  // Arbre des catégories (catégorie → famille → sous-familles).
  useEffect(() => {
    productsApi
      .listCategoryTree()
      .then(setTree)
      .catch(() => undefined);
  }, []);

  // Chargement de la première page à chaque changement de filtre.
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await productsApi.listProducts({
          group: group || undefined,
          category: category || undefined,
          subcategory: subcategory || undefined,
          search: search || undefined,
          sort,
          page: 1,
          limit: 12
        });
        if (!cancelled) {
          setProducts(data.products);
          setTotal(data.total);
          setPages(data.pages);
          setPage(1);
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, 'Le catalogue est momentanément indisponible.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [group, category, subcategory, search, sort]);

  const groups = useMemo(
    () => [...new Set(tree.map((item) => item.group || '').filter(Boolean))].sort(),
    [tree]
  );

  const families = useMemo(() => {
    if (!group) return [];
    return tree.filter((item) => (item.group || '') === group);
  }, [tree, group]);

  const subcategories = useMemo(() => {
    const family = tree.find((item) => item.name === category);
    return family?.subcategories ?? [];
  }, [tree, category]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const data = await productsApi.listProducts({
        group: group || undefined,
        category: category || undefined,
        subcategory: subcategory || undefined,
        search: search || undefined,
        sort,
        page: page + 1,
        limit: 12
      });
      setProducts((current) => [...current, ...data.products]);
      setPage((current) => current + 1);
    } catch (err) {
      showToast(getErrorMessage(err, 'Impossible de charger la suite du catalogue.'), 'error');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleAdd = async (product: Product) => {
    setAddingId(product._id);
    try {
      await addToCart(product._id);
      showToast(`${product.name} ajouté au panier.`, 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Impossible d\'ajouter au panier.'), 'error');
    } finally {
      setAddingId(null);
    }
  };

  return (
    <>
      <section className="hero">
        <div className="container hero__inner">
          <span className="hero__badge">{t('home.badge')}</span>
          <h1 className="hero__title">
            {t('home.titleStart')} <span className="gradient-text">{t('home.titleHighlight')}</span>
          </h1>
          <p className="hero__subtitle">{t('home.subtitle')}</p>
          <div className="hero__cta">
            <a href="#catalogue" className="button button--primary button--lg">
              {t('home.discover')}
            </a>
            <Link to="/cart" className="button button--outline button--lg">
              {t('home.viewCart')}
            </Link>
          </div>
          <ul className="hero__trust">
            <li>{t('home.trustStripe')}</li>
            <li>{t('home.trustTracking')}</li>
            <li>{t('home.trustGuest')}</li>
          </ul>
        </div>
      </section>

      <section id="catalogue" className="catalog container">
        <header className="section-head">
          <h2 className="section-head__title">{t('home.catalogTitle')}</h2>
          <p className="section-head__subtitle">
            {t('home.catalogSubtitle', { count: total })}
          </p>
        </header>

        <div className="catalog__toolbar">
          <div className="catalog__cascade">
            <label className="field">
              <span>{t('home.category')}</span>
              <select
                className="input input--select"
                value={group}
                onChange={(event) => {
                  setGroup(event.target.value);
                  setCategory('');
                  setSubcategory('');
                }}
              >
                <option value="">{t('home.allCategories')}</option>
                {groups.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>{t('home.family')}</span>
              <select
                className="input input--select"
                value={category}
                disabled={!group || families.length === 0}
                onChange={(event) => {
                  setCategory(event.target.value);
                  setSubcategory('');
                }}
              >
                <option value="">{t('home.allFamilies')}</option>
                {families.map((family) => (
                  <option key={family._id} value={family.name}>{family.name}</option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>{t('home.subfamily')}</span>
              <select
                className="input input--select"
                value={subcategory}
                disabled={!category || subcategories.length === 0}
                onChange={(event) => setSubcategory(event.target.value)}
              >
                <option value="">{t('home.allSubfamilies')}</option>
                {subcategories.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="catalog__controls">
            <select
              className="input input--select"
              aria-label={t('home.sort')}
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="recent">{t('home.sortRecent')}</option>
              <option value="price-asc">{t('home.sortPriceAsc')}</option>
              <option value="price-desc">{t('home.sortPriceDesc')}</option>
            </select>
          </div>
        </div>

        <div className="catalog__search">
          <input
            type="search"
            className="input"
            placeholder={t('home.search')}
            aria-label={t('home.search')}
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>

        <ProductList
          products={products}
          loading={loading}
          error={error}
          addingId={addingId}
          onAdd={handleAdd}
          onRetry={() => setSearch((current) => current)}
        />

        {page < pages && (
          <div className="catalog__more">
            <button type="button" className="button button--outline" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? t('home.loadingMore') : t('home.loadMore', { shown: products.length, total })}
            </button>
          </div>
        )}
      </section>
    </>
  );
};

export default HomePage;
