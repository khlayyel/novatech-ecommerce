import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import ProductCard from '../components/ProductCard';
import QuantityStepper from '../components/QuantityStepper';
import Spinner from '../components/Spinner';
import * as productsApi from '../api/products';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../utils/request';
import { formatPrice } from '../utils/format';
import type { Product } from '../types';

/**
 * Fiche produit : visuel, description complète, stock, sélecteur de quantité
 * et produits de la même catégorie.
 */
const ProductDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { addToCart } = useCart();
  const { showToast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [addingRelatedId, setAddingRelatedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setQuantity(1);

    const load = async () => {
      if (!id) return;
      try {
        const data = await productsApi.getProduct(id);
        if (cancelled) return;
        setProduct(data);

        const siblings = await productsApi.listProducts({ category: data.category, limit: 4 });
        if (!cancelled) {
          setRelated(siblings.products.filter((item) => item._id !== data._id).slice(0, 3));
        }
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err, 'Ce produit est introuvable ou n\'est plus disponible.'));
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

  const handleAdd = async () => {
    if (!product) return;
    setAdding(true);
    try {
      await addToCart(product._id, quantity);
      showToast(`${quantity} × ${product.name} ajouté${quantity > 1 ? 's' : ''} au panier.`, 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Impossible d\'ajouter au panier.'), 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleAddRelated = async (item: Product) => {
    setAddingRelatedId(item._id);
    try {
      await addToCart(item._id);
      showToast(`${item.name} ajouté au panier.`, 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Impossible d\'ajouter au panier.'), 'error');
    } finally {
      setAddingRelatedId(null);
    }
  };

  if (loading) {
    return (
      <div className="page-center">
        <Spinner label="Chargement du produit…" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container">
        <EmptyState
          title="Produit indisponible"
          message={error || 'Ce produit n\'existe pas ou a été retiré du catalogue.'}
          icon="🔎"
          action={
            <Link to="/" className="button button--primary">
              Retour au catalogue
            </Link>
          }
        />
      </div>
    );
  }

  const soldOut = product.stock <= 0;
  const lowStock = !soldOut && product.stock <= 5;

  return (
    <div className="container product-detail">
      <nav className="breadcrumb" aria-label="Fil d'Ariane">
        <Link to="/">Catalogue</Link>
        <span aria-hidden="true">/</span>
        <span>{product.category}</span>
        <span aria-hidden="true">/</span>
        <span className="breadcrumb__current">{product.name}</span>
      </nav>

      <div className="product-detail__grid">
        <figure className="product-detail__media">
          <img src={product.imageUrl} alt={product.name} />
          <figcaption className="product-detail__category">{product.category}</figcaption>
        </figure>

        <div className="product-detail__info">
          <h1>{product.name}</h1>

          <p className="product-detail__price">{formatPrice(product.price)}</p>
          <p className={`stock-hint ${soldOut ? 'stock-hint--out' : lowStock ? 'stock-hint--low' : ''}`}>
            {soldOut ? 'Produit épuisé' : lowStock ? `Plus que ${product.stock} en stock` : `${product.stock} en stock`}
          </p>

          <p className="product-detail__description">{product.description}</p>

          <div className="product-detail__buy">
            <QuantityStepper
              value={quantity}
              max={Math.max(1, Math.min(product.stock, 99))}
              disabled={soldOut}
              onChange={setQuantity}
            />
            <button
              type="button"
              className="button button--primary button--lg"
              onClick={handleAdd}
              disabled={soldOut || adding}
            >
              {soldOut ? 'Indisponible' : adding ? 'Ajout…' : 'Ajouter au panier'}
            </button>
          </div>

          <ul className="product-detail__perks">
            <li>🔒 Paiement sécurisé par Stripe</li>
            <li>🚚 Suivi de commande en temps réel</li>
            <li>↩️ Retour sous 30 jours</li>
          </ul>

          <dl className="order-meta">
            <div>
              <dt>Référence</dt>
              <dd>{product._id.slice(-8).toUpperCase()}</dd>
            </div>
            <div>
              <dt>Catégorie</dt>
              <dd>{product.category}</dd>
            </div>
            <div>
              <dt>Disponibilité</dt>
              <dd>{soldOut ? 'Épuisé' : 'Expédié sous 24 h'}</dd>
            </div>
          </dl>
        </div>
      </div>

      {related.length > 0 && (
        <section className="related">
          <header className="section-head">
            <h2 className="section-head__title">Dans la même catégorie</h2>
          </header>
          <div className="product-grid">
            {related.map((item) => (
              <ProductCard
                key={item._id}
                product={item}
                onAdd={handleAddRelated}
                adding={addingRelatedId === item._id}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductDetailPage;
