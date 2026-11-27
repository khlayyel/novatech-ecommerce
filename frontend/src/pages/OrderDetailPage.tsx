import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import Spinner from '../components/Spinner';
import StatusBadge from '../components/StatusBadge';
import { getOrder } from '../api/orders';
import { getErrorMessage } from '../utils/request';
import { formatDate, formatPrice } from '../utils/format';
import type { Order } from '../types';

/** Étapes du suivi, dans l'ordre chronologique de la vie d'une commande. */
const TIMELINE_STEPS = [
  { key: 'pending', label: 'Commande passée', icon: '🧾', hint: 'En attente du paiement' },
  { key: 'paid', label: 'Paiement confirmé', icon: '💳', hint: 'Paiement accepté par Stripe' },
  { key: 'shipped', label: 'Expédition', icon: '🚚', hint: 'Colis pris en charge' },
  { key: 'delivered', label: 'Livraison', icon: '🏠', hint: 'Colis livré' }
];

const statusIndex = (status: string): number => {
  switch (status) {
    case 'paid':
      return 1;
    case 'shipped':
      return 2;
    case 'delivered':
      return 3;
    default:
      return 0;
  }
};

/**
 * Suivi de commande (bonus) : chronologie des étapes, articles, montants.
 * Accessible au propriétaire connecté OU via le jeton de suivi (invité).
 */
const OrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getOrder(id);
      setOrder(data);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Commande introuvable. Connectez-vous avec le compte utilisé pour la commande.'));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Si un paiement vient d'être lancé, actualisation automatique de l'état.
  useEffect(() => {
    if (!order || order.status !== 'pending') return;
    const timer = window.setInterval(load, 3000);
    return () => window.clearInterval(timer);
  }, [order, load]);

  if (error) {
    return (
      <div className="container">
        <EmptyState
          title="Commande introuvable"
          message={error}
          icon="🔒"
          action={
            <div className="empty-state__actions">
              <Link to="/login" className="button button--primary">
                Se connecter
              </Link>
              <Link to="/" className="button button--outline">
                Retour au catalogue
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="page-center">
        <Spinner label="Chargement du suivi de commande…" />
      </div>
    );
  }

  const currentStep = statusIndex(order.status);
  const failed = order.status === 'failed';

  return (
    <div className="container order-detail">
      <header className="page-head">
        <h1>Suivi de commande</h1>
        <p className="muted">
          Commande n° {order._id.slice(-8).toUpperCase()} — <StatusBadge status={order.status} />
        </p>
      </header>

      {failed && (
        <div className="banner banner--danger" role="alert">
          Le paiement de cette commande a échoué. Vous pouvez repasser commande depuis le catalogue.
        </div>
      )}

      <div className="order-detail__grid">
        <section className="card">
          <h2 className="card__title">Progression</h2>

          <ol className={`timeline${failed ? ' timeline--failed' : ''}`}>
            {TIMELINE_STEPS.map((step, index) => {
              const state = index < currentStep ? 'done' : index === currentStep ? 'current' : 'upcoming';
              return (
                <li key={step.key} className={`timeline__step timeline__step--${state}`}>
                  <span className="timeline__icon" aria-hidden="true">{step.icon}</span>
                  <span className="timeline__text">
                    <strong>{step.label}</strong>
                    <small>
                      {state === 'done' && step.key === 'paid' && order.paidAt
                        ? formatDate(order.paidAt)
                        : step.hint}
                    </small>
                  </span>
                </li>
              );
            })}
          </ol>

          <dl className="order-meta">
            <div>
              <dt>Commande passée</dt>
              <dd>{formatDate(order.createdAt)}</dd>
            </div>
            <div>
              <dt>Paiement</dt>
              <dd>{order.stripePaymentIntentId ? `${order.stripePaymentIntentId.slice(0, 14)}…` : '—'}</dd>
            </div>
            <div>
              <dt>Montant</dt>
              <dd>{formatPrice(order.totalAmount)}</dd>
            </div>
          </dl>
        </section>

        <section className="card">
          <h2 className="card__title">Articles ({order.items.reduce((sum, item) => sum + item.quantity, 0)})</h2>
          <ul className="order-items">
            {order.items.map((item, index) => (
              <li key={index} className="order-item">
                <img src={item.imageUrl} alt="" />
                <div className="order-item__info">
                  <span className="order-item__name">{item.name}</span>
                  <small>
                    {formatPrice(item.priceAtPurchase)} × {item.quantity}
                  </small>
                </div>
                <span className="order-item__total">{formatPrice(item.priceAtPurchase * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="order-total">
            <span>Total</span>
            <strong>{formatPrice(order.totalAmount)}</strong>
          </div>
          <p className="muted small">Les prix affichés sont ceux enregistrés au moment de l'achat.</p>
        </section>
      </div>
    </div>
  );
};

export default OrderDetailPage;
