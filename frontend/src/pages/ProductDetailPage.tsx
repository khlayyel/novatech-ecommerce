import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import ProductCard from '../components/ProductCard';
import QuantityStepper from '../components/QuantityStepper';
import Spinner from '../components/Spinner';
import * as productsApi from '../api/products';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useI18n } from '../i18n';
import { getErrorMessage } from '../utils/request';
import { formatPrice } from '../utils/format';
import { imageSrc } from '../utils/image';
import type { Product } from '../types';

/**
 * Fiche produit : visuel, description complète, stock, sélecteur de quantité
 * et produits de la même catégorie.
 */
const ProductDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const { t } = useI18n();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
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
        setActiveImage(
          data.imageUrls && data.imageUrls.length > 0 ? data.imageUrls[0] : data.imageUrl || ''
        );

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

  useEffect(() => {
    if (!lightboxOpen) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightboxOpen(false);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [lightboxOpen]);

  const handleAdd = async () => {
    if (!product) return;
    setAdding(true);
    try {
      await addToCart(product._id, quantity);
      showToast(t('product.added', { count: quantity, name: product.name }), 'success');
    } catch (err) {
      showToast(getErrorMessage(err, t('product.notAdded')), 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleAddRelated = async (item: Product) => {
    setAddingRelatedId(item._id);
    try {
      await addToCart(item._id);
      showToast(t('product.added', { count: 1, name: item.name }), 'success');
    } catch (err) {
      showToast(getErrorMessage(err, t('product.notAdded')), 'error');
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
          title={t('product.notFoundTitle')}
          message={error || t('product.notFoundMessage')}
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
  const gallery =
    product.imageUrls && product.imageUrls.length > 0
      ? product.imageUrls
      : product.imageUrl
        ? [product.imageUrl]
        : [];
  const mainImage = activeImage || gallery[0] || '';

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
          <button
            type="button"
            className="product-detail__image-btn"
            onClick={() => {
              setZoom(1);
              setLightboxOpen(true);
            }}
            aria-label={t('product.enlarge')}
            title={t('product.enlarge')}
          >
            <img src={imageSrc(mainImage)} alt={product.name} />
          </button>
          <figcaption className="product-detail__category">{product.category}</figcaption>

          {gallery.length > 1 && (
            <div className="product-gallery">
              {gallery.map((url, index) => (
                <button
                  key={`${url}-${index}`}
                  type="button"
                  className={`product-gallery__thumb${mainImage === url ? ' is-active' : ''}`}
                  aria-label={`Voir l'image ${index + 1}`}
                  aria-pressed={mainImage === url}
                  onClick={() => {
                    setActiveImage(url);
                    setZoom(1);
                  }}
                >
                  <img src={imageSrc(url)} alt="" />
                </button>
              ))}
            </div>
          )}
        </figure>

        <div className="product-detail__info">
          <h1>{product.name}</h1>

          <p className="product-detail__price">{formatPrice(product.price)}</p>
          <p className={`stock-hint ${soldOut ? 'stock-hint--out' : lowStock ? 'stock-hint--low' : ''}`}>
            {soldOut
              ? t('product.soldOut')
              : lowStock
                ? t('product.lowStock', { count: product.stock })
                : t('product.inStockCount', { count: product.stock })}
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
              {soldOut ? t('product.unavailable') : adding ? t('product.adding') : t('product.add')}
            </button>
          </div>

          <ul className="product-detail__perks">
            <li>{t('product.perksStripe')}</li>
            <li>{t('product.perksTracking')}</li>
            <li>{t('product.perksReturns')}</li>
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

      {lightboxOpen && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={t('product.enlarge')}
          onClick={() => setLightboxOpen(false)}
        >
          <div className="lightbox__toolbar" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => setZoom((current) => Math.max(1, Math.round((current - 0.25) * 100) / 100))}
              aria-label={t('product.zoomOut')}
              title={t('product.zoomOut')}
            >
              −
            </button>
            <span>{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              onClick={() => setZoom((current) => Math.min(3, Math.round((current + 0.25) * 100) / 100))}
              aria-label={t('product.zoomIn')}
              title={t('product.zoomIn')}
            >
              +
            </button>
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              aria-label={t('common.close')}
              title={t('common.close')}
            >
              ×
            </button>
          </div>
          <img
            className="lightbox__image"
            style={{ transform: `scale(${zoom})` }}
            src={imageSrc(mainImage)}
            alt={product.name}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default ProductDetailPage;
