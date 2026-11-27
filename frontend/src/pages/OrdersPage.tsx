import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import Spinner from '../components/Spinner';
import StatusBadge from '../components/StatusBadge';
import { getMyOrders } from '../api/orders';
import { getErrorMessage } from '../utils/request';
import { formatPrice } from '../utils/format';
import type { Order } from '../types';

/** Historique des commandes de l'utilisateur connecté (bonus JWT). */
const OrdersPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await getMyOrders();
        if (!cancelled) setOrders(data);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, 'Impossible de charger vos commandes.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="page-center">
        <Spinner label="Chargement de vos commandes…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <EmptyState title="Une erreur est survenue" message={error} icon="⚠️" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="container">
        <EmptyState
          title="Aucune commande pour l'instant"
          message="Vos futures commandes apparaîtront ici avec leur statut en temps réel."
          icon="📦"
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
    <div className="container">
      <header className="page-head">
        <h1>Mes commandes</h1>
        <p className="muted">{orders.length} commande{orders.length > 1 ? 's' : ''} enregistrée{orders.length > 1 ? 's' : ''}.</p>
      </header>

      <div className="orders-list">
        {orders.map((order) => (
          <Link key={order._id} to={`/orders/${order._id}`} className="order-card card">
            <div className="order-card__head">
              <span className="order-card__id">n° {order._id.slice(-8).toUpperCase()}</span>
              <StatusBadge status={order.status} />
            </div>

            <div className="order-card__body">
              <span className="order-card__items">
                {order.items.reduce((sum, item) => sum + item.quantity, 0)} article
                {order.items.reduce((sum, item) => sum + item.quantity, 0) > 1 ? 's' : ''}
              </span>
              <strong className="order-card__total">{formatPrice(order.totalAmount)}</strong>
            </div>

            <div className="order-card__foot">
              <span className="muted small">Passée le {new Date(order.createdAt).toLocaleDateString('fr-FR')}</span>
              <span className="order-card__link">Voir le détail →</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default OrdersPage;
