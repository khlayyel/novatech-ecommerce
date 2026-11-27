import { useCallback, useEffect, useState } from 'react';
import EmptyState from '../../components/EmptyState';
import Spinner from '../../components/Spinner';
import StatusBadge from '../../components/StatusBadge';
import { listOrders, updateOrderStatus } from '../../api/admin';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../utils/request';
import { formatDate, formatPrice } from '../../utils/format';
import type { AdminOrder, OrderStatus } from '../../types';

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'Tous les statuts' },
  { value: 'pending', label: 'En attente' },
  { value: 'paid', label: 'Payées' },
  { value: 'shipped', label: 'Expédiées' },
  { value: 'delivered', label: 'Livrées' },
  { value: 'failed', label: 'Échouées' }
];

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  paid: 'shipped',
  shipped: 'delivered'
};

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  paid: 'Marquer expédiée',
  shipped: 'Marquer livrée'
};

/** Suivi et traitement des commandes : changement de statut d'expédition. */
const AdminOrdersPage = () => {
  const { showToast } = useToast();

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listOrders({ status: status || undefined, limit: 50 });
      setOrders(data.orders);
    } catch (err) {
      setError(getErrorMessage(err, 'Impossible de charger les commandes.'));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const advance = async (order: AdminOrder) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;

    setUpdatingId(order._id);
    try {
      const updated = await updateOrderStatus(order._id, next);
      setOrders((current) => current.map((item) => (item._id === order._id ? { ...item, ...updated } : item)));
      showToast(`Commande ${order._id.slice(-8).toUpperCase()} : ${next === 'shipped' ? 'expédiée' : 'livrée'}.`, 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Mise à jour impossible.'), 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading && orders.length === 0) {
    return (
      <div className="page-center">
        <Spinner label="Chargement des commandes…" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Commandes indisponibles"
        message={error}
        icon="⚠️"
        action={
          <button type="button" className="button button--primary" onClick={load}>
            Réessayer
          </button>
        }
      />
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-toolbar">
        <p className="muted">
          {orders.length} commande{orders.length > 1 ? 's' : ''} affichée{orders.length > 1 ? 's' : ''}.
        </p>
        <select
          className="input input--select"
          aria-label="Filtrer par statut"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          {STATUS_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      {orders.length === 0 ? (
        <EmptyState title="Aucune commande" message="Aucune commande ne correspond à ce filtre." icon="🧾" />
      ) : (
        <div className="table-wrapper card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Commande</th>
                <th>Client</th>
                <th>Date</th>
                <th>Montant</th>
                <th>Statut</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const next = NEXT_STATUS[order.status];
                return (
                  <tr key={order._id}>
                    <td className="mono">{order._id.slice(-8).toUpperCase()}</td>
                    <td>
                      {order.user ? (
                        <>
                          <span>{order.user.name}</span>
                          <small className="muted block">{order.user.email}</small>
                        </>
                      ) : (
                        <span className="muted">Invité</span>
                      )}
                    </td>
                    <td>{formatDate(order.createdAt)}</td>
                    <td>{formatPrice(order.totalAmount)}</td>
                    <td>
                      <StatusBadge status={order.status} />
                    </td>
                    <td>
                      {next ? (
                        <button
                          type="button"
                          className="button button--ghost button--sm"
                          onClick={() => advance(order)}
                          disabled={updatingId === order._id}
                        >
                          {updatingId === order._id ? 'Mise à jour…' : NEXT_LABEL[order.status]}
                        </button>
                      ) : (
                        <span className="muted small">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminOrdersPage;
