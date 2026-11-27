import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import type { Stripe } from '@stripe/stripe-js';
import CheckoutForm from '../components/CheckoutForm';
import EmptyState from '../components/EmptyState';
import Spinner from '../components/Spinner';
import { checkout } from '../api/orders';
import { getErrorMessage } from '../utils/request';
import { useCart } from '../context/CartContext';
import { STRIPE_PUBLIC_KEY } from '../config';
import { formatPrice } from '../utils/format';
import type { CheckoutResponse } from '../types';

/**
 * Tunnel de paiement : crée la commande + l'intention de paiement côté serveur,
 * puis monte Stripe Elements (PaymentElement) pour saisir la carte.
 * Le montant affiché est TOUJOURS celui recalculé par le serveur.
 */
const CheckoutPage = () => {
  const { items, subtotal, refresh } = useCart();
  const navigate = useNavigate();

  const [checkoutData, setCheckoutData] = useState<CheckoutResponse | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  // Panier vide → retour au panier.
  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart', { replace: true });
    }
  }, [items.length, navigate]);

  // Création de la commande + intention de paiement (une seule fois).
  useEffect(() => {
    if (items.length === 0) return;

    let cancelled = false;
    const prepare = async () => {
      setError(null);
      try {
        if (!STRIPE_PUBLIC_KEY) {
          // Détail technique réservé à la console ; message neutre pour l'utilisateur.
          console.error('Clé publique de paiement absente (frontend/.env).');
          throw new Error('Le paiement est momentanément indisponible.');
        }
        const data = await checkout();
        if (cancelled) return;
        setCheckoutData(data);
        setStripePromise(loadStripe(STRIPE_PUBLIC_KEY));
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, 'Impossible de préparer le paiement.'));
      }
    };

    prepare();
    return () => {
      cancelled = true;
    };
  }, [items.length, retryToken]);

  if (error) {
    return (
      <div className="container">
        <EmptyState
          title="Le paiement ne peut pas démarrer"
          message={error}
          icon="💳"
          action={
            <div className="empty-state__actions">
              <button
                type="button"
                className="button button--primary"
                onClick={() => {
                  setCheckoutData(null);
                  setRetryToken((token) => token + 1);
                }}
              >
                Réessayer
              </button>
              <button type="button" className="button button--outline" onClick={() => navigate('/cart')}>
                Retour au panier
              </button>
            </div>
          }
        />
      </div>
    );
  }

  if (!checkoutData || !stripePromise) {
    return (
      <div className="page-center">
        <Spinner label="Préparation du paiement sécurisé…" />
      </div>
    );
  }

  const onPaid = () => {
    refresh(); // le panier a été vidé côté serveur après confirmation
    navigate(`/confirmation/${checkoutData.orderId}`, { replace: true });
  };

  return (
    <div className="container checkout-layout">
      <header className="page-head">
        <h1>Paiement</h1>
        <p className="muted">Montant à régler : <strong>{formatPrice(checkoutData.totalAmount)}</strong></p>
      </header>

      <div className="checkout-grid">
        <section className="card checkout-form-card">
          <h2 className="checkout-form-card__title">Carte bancaire</h2>
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret: checkoutData.clientSecret,
              appearance: {
                theme: 'stripe',
                variables: {
                  colorPrimary: '#4f46e5',
                  colorBackground: '#ffffff',
                  colorText: '#0b1220',
                  colorDanger: '#dc2626',
                  fontFamily: 'inherit',
                  borderRadius: '10px'
                }
              }
            }}
          >
            <CheckoutForm orderId={checkoutData.orderId} totalAmount={checkoutData.totalAmount} onDone={onPaid} />
          </Elements>
        </section>

        <aside className="card checkout-summary" aria-label="Récapitulatif avant paiement">
          <h2 className="checkout-summary__title">Votre commande</h2>
          <ul className="checkout-summary__items">
            {items.map((item) => (
              <li key={item.product._id}>
                <img src={item.product.imageUrl} alt="" />
                <span className="checkout-summary__name">
                  {item.product.name}
                  <small>× {item.quantity}</small>
                </span>
                <span className="checkout-summary__price">
                  {formatPrice(item.product.price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <div className="checkout-summary__total">
            <span>Total</span>
            <span>{formatPrice(checkoutData.totalAmount || subtotal)}</span>
          </div>
          <p className="muted small">
            Le montant est recalculé et vérifié côté serveur à partir des prix du catalogue.
          </p>
        </aside>
      </div>
    </div>
  );
};

export default CheckoutPage;
