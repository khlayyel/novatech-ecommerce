import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import Spinner from '../components/Spinner';
import StatusBadge from '../components/StatusBadge';
import { getOrder } from '../api/orders';
import { getErrorMessage } from '../utils/request';
import { formatPrice } from '../utils/format';
import { imageSrc } from '../utils/image';
import type { Order } from '../types';

/**
 * Page de confirmation : affiche la commande réellement enregistrée.
 * Si le statut est encore "pending" (webhook en route), la page
 * actualise automatiquement l'état toutes les 3 secondes.
 */
const ConfirmationPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orderId) return;
    try {
      const data = await getOrder(orderId);
      setOrder(data);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Commande introuvable.'));
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  // Actualisation automatique tant que le paiement n'est pas confirmé.
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
          icon="🔍"
          action={
            <Link to="/" className="button button--primary">
              Retour au catalogue
            </Link>
          }
        />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="page-center">
        <Spinner label="Chargement de votre commande…" />
      </div>
    );
  }

  const paid = order.status === 'paid' || order.status === 'shipped' || order.status === 'delivered';

  return (
    <div className="container confirmation">
      <div className={`confirmation__hero ${paid ? 'confirmation__hero--success' : 'confirmation__hero--pending'}`}>
        <div className="confirmation__check" aria-hidden="true">
          {paid ? '✓' : '⏳'}
        </div>
        <h1>{paid ? 'Merci pour votre commande !' : 'Paiement en cours de confirmation…'}</h1>
        <p>
          Commande <strong>n° {order._id.slice(-8).toUpperCase()}</strong> — <StatusBadge status={order.status} />
        </p>
        {order.status === 'pending' && (
          <p className="muted small">Cette page s'actualise automatiquement dès que le paiement est confirmé.</p>
        )}
      </div>

      <div className="confirmation__grid">
        <section className="card">
          <h2 className="card__title">Détail de la commande</h2>
          <ul className="order-items">
            {order.items.map((item, index) => (
              <li key={index} className="order-item">
                <img src={imageSrc(item.imageUrl)} alt="" />
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
            <span>Total payé</span>
            <strong>{formatPrice(order.totalAmount)}</strong>
          </div>
        </section>

        <section className="card confirmation__next">
          <h2 className="card__title">Et maintenant ?</h2>
          <ul className="next-steps">
            <li>📦 Suivez l'état de votre commande à tout moment.</li>
            <li>🔐 Connectez-vous avec votre compte pour retrouver votre historique complet.</li>
            <li>💳 Le paiement est traité de façon sécurisée — aucune donnée bancaire ne transite par nos serveurs.</li>
          </ul>
          <div className="confirmation__actions">
            <Link to={`/orders/${order._id}`} className="button button--primary">
              Suivre ma commande
            </Link>
            <Link to="/" className="button button--outline">
              Continuer mes achats
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ConfirmationPage;
