import { Link } from 'react-router-dom';
import { formatPrice } from '../utils/format';
import type { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
  adding?: boolean;
}

/** Carte produit du catalogue : visuel, prix, stock et ajout au panier. */
const ProductCard = ({ product, onAdd, adding = false }: ProductCardProps) => {
  const soldOut = product.stock <= 0;
  const lowStock = !soldOut && product.stock <= 5;

  return (
    <article className="product-card">
      <div className="product-card__media">
        <Link to={`/products/${product._id}`} className="product-card__media-link">
          <img src={product.imageUrl} alt={product.name} loading="lazy" />
        </Link>
        <span className="product-card__category">{product.category}</span>
        {soldOut && <span className="product-card__ribbon">Épuisé</span>}
      </div>

      <div className="product-card__body">
        <h3 className="product-card__name">
          <Link to={`/products/${product._id}`}>{product.name}</Link>
        </h3>
        <p className="product-card__description">{product.description}</p>

        <div className="product-card__meta">
          <span className="product-card__price">{formatPrice(product.price)}</span>
          <span className={`stock-hint ${soldOut ? 'stock-hint--out' : lowStock ? 'stock-hint--low' : ''}`}>
            {soldOut ? 'Épuisé' : lowStock ? `Plus que ${product.stock} en stock` : 'En stock'}
          </span>
        </div>

        <button
          type="button"
          className="button button--primary button--full"
          onClick={() => onAdd(product)}
          disabled={soldOut || adding}
        >
          {soldOut ? 'Indisponible' : adding ? 'Ajout…' : 'Ajouter au panier'}
        </button>
      </div>
    </article>
  );
};

export default ProductCard;
