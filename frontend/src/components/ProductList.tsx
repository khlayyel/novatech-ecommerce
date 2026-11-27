import ProductCard from './ProductCard';
import EmptyState from './EmptyState';
import type { Product } from '../types';

interface ProductListProps {
  products: Product[];
  loading: boolean;
  error: string | null;
  addingId?: string | null;
  onAdd: (product: Product) => void;
  onRetry: () => void;
}

/** Grille du catalogue : squelettes de chargement, erreur, vide ou cartes produits. */
const ProductList = ({ products, loading, error, addingId, onAdd, onRetry }: ProductListProps) => {
  if (loading) {
    return (
      <div className="product-grid" aria-busy="true" aria-label="Chargement du catalogue">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="skeleton-card">
            <div className="skeleton skeleton__media" />
            <div className="skeleton skeleton__line" />
            <div className="skeleton skeleton__line skeleton__line--short" />
            <div className="skeleton skeleton__button" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Impossible de charger le catalogue"
        message={error}
        icon="⚠️"
        action={
          <button type="button" className="button button--primary" onClick={onRetry}>
            Réessayer
          </button>
        }
      />
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState
        title="Aucun produit ne correspond"
        message="Essayez de modifier votre recherche ou de choisir une autre catégorie."
        icon="🔍"
      />
    );
  }

  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard key={product._id} product={product} onAdd={onAdd} adding={addingId === product._id} />
      ))}
    </div>
  );
};

export default ProductList;
