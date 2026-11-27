import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductList from '../components/ProductList';
import * as productsApi from '../api/products';
import { getErrorMessage } from '../utils/request';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
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
          <span className="hero__badge">Workshop fullstack · React · Node.js · MongoDB · Stripe</span>
          <h1 className="hero__title">
            Le matériel informatique, <span className="gradient-text">en toute confiance.</span>
          </h1>
          <p className="hero__subtitle">
            Ordinateurs, écrans, périphériques et composants sélectionnés avec soin.
            Ajoutez au panier, payez de façon sécurisée avec Stripe et suivez votre commande en temps réel.
          </p>
          <div className="hero__cta">
            <a href="#catalogue" className="button button--primary button--lg">
              Découvrir le catalogue
            </a>
            <Link to="/cart" className="button button--outline button--lg">
              Voir mon panier
            </Link>
          </div>
          <ul className="hero__trust">
            <li>🔒 Paiement sécurisé Stripe</li>
            <li>📦 Suivi de commande en direct</li>
            <li>👤 Sans compte ou avec compte</li>
          </ul>
        </div>
      </section>

      <section id="catalogue" className="catalog container">
        <header className="section-head">
          <h2 className="section-head__title">Notre catalogue</h2>
          <p className="section-head__subtitle">
            {total} référence{total > 1 ? 's' : ''} disponible{total > 1 ? 's' : ''} — filtrez par catégorie, famille puis sous-famille.
          </p>
        </header>

        <div className="catalog__toolbar">
          <div className="catalog__cascade">
            <label className="field">
              <span>Catégorie</span>
              <select
                className="input input--select"
                value={group}
                onChange={(event) => {
                  setGroup(event.target.value);
                  setCategory('');
                  setSubcategory('');
                }}
              >
                <option value="">Toutes les catégories</option>
                {groups.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Famille</span>
              <select
                className="input input--select"
                value={category}
                disabled={!group || families.length === 0}
                onChange={(event) => {
                  setCategory(event.target.value);
                  setSubcategory('');
                }}
              >
                <option value="">Toutes les familles</option>
                {families.map((family) => (
                  <option key={family._id} value={family.name}>{family.name}</option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Sous-famille</span>
              <select
                className="input input--select"
                value={subcategory}
                disabled={!category || subcategories.length === 0}
                onChange={(event) => setSubcategory(event.target.value)}
              >
                <option value="">Toutes les sous-familles</option>
                {subcategories.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="catalog__controls">
            <input
              type="search"
              className="input"
              placeholder="Rechercher un produit…"
              aria-label="Rechercher un produit"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
            <select
              className="input input--select"
              aria-label="Trier les produits"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="recent">Nouveautés</option>
              <option value="price-asc">Prix croissant</option>
              <option value="price-desc">Prix décroissant</option>
            </select>
          </div>
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
              {loadingMore ? 'Chargement…' : `Afficher plus (${products.length}/${total})`}
            </button>
          </div>
        )}
      </section>
    </>
  );
};

export default HomePage;
