import { Link, useNavigate } from 'react-router-dom';
import QuantityStepper from '../components/QuantityStepper';
import EmptyState from '../components/EmptyState';
import Spinner from '../components/Spinner';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { formatPrice } from '../utils/format';

/** Page panier : modification des quantités, suppression, récapitulatif, passage au paiement. */
const CartPage = () => {
  const { items, loading, error, subtotal, totalItems, updateQuantity, removeItem, clear } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleUpdate = async (productId: string, quantity: number, name: string) => {
    try {
      await updateQuantity(productId, quantity);
    } catch {
      showToast(`Impossible de régler la quantité de « ${name} » (stock insuffisant ?)`, 'error');
    }
  };

  const handleRemove = async (productId: string, name: string) => {
    await removeItem(productId);
    showToast(`« ${name} » retiré du panier.`, 'info');
  };

  const handleClear = async () => {
    await clear();
    showToast('Panier vidé.', 'info');
  };

  if (loading && items.length === 0) {
    return (
      <div className="page-center">
        <Spinner label="Chargement du panier…" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container">
        {error && (
          <div className="banner banner--danger" role="alert">
            {error}
          </div>
        )}
        <EmptyState
          title="Votre panier est vide"
          message="Parcourez le catalogue et ajoutez vos premiers produits."
          action={
            <Link to="/" className="button button--primary">
              Découvrir le catalogue
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="container cart-layout">
      <header className="page-head">
        <h1>Mon panier</h1>
        <p className="muted">{totalItems} article{totalItems > 1 ? 's' : ''} — TVA incluse.</p>
      </header>

      <div className="cart-grid">
        <section className="card cart-items" aria-label="Articles du panier">
          <ul className="cart-items__list">
            {items.map((item) => (
              <li key={item.product._id} className="cart-item">
                <img className="cart-item__media" src={item.product.imageUrl} alt={item.product.name} />

                <div className="cart-item__info">
                  <Link to="/" className="cart-item__name">{item.product.name}</Link>
                  <span className="cart-item__unit">{formatPrice(item.product.price)} / unité</span>
                </div>

                <QuantityStepper
                  value={item.quantity}
                  max={item.product.stock}
                  onChange={(quantity) => handleUpdate(item.product._id, quantity, item.product.name)}
                />

                <span className="cart-item__total">{formatPrice(item.product.price * item.quantity)}</span>

                <button
                  type="button"
                  className="cart-item__remove"
                  aria-label={`Retirer ${item.product.name} du panier`}
                  onClick={() => handleRemove(item.product._id, item.product.name)}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>

          <footer className="cart-items__footer">
            <button type="button" className="button button--ghost button--sm" onClick={handleClear}>
              Vider le panier
            </button>
          </footer>
        </section>

        <aside className="card cart-summary" aria-label="Récapitulatif de la commande">
          <h2 className="cart-summary__title">Récapitulatif</h2>

          <dl className="cart-summary__rows">
            <div>
              <dt>Sous-total</dt>
              <dd>{formatPrice(subtotal)}</dd>
            </div>
            <div className="cart-summary__total">
              <dt>Total</dt>
              <dd>{formatPrice(subtotal)}</dd>
            </div>
          </dl>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="button"
            className="button button--primary button--full button--lg"
            onClick={() => navigate('/checkout')}
          >
            Passer au paiement
          </button>

          <p className="muted small cart-summary__note">
            🔒 Paiement sécurisé — carte de test : 4242 4242 4242 4242.
          </p>
        </aside>
      </div>
    </div>
  );
};

export default CartPage;
