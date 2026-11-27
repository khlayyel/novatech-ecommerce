import { Fragment, useCallback, useEffect, useState } from 'react';
import EmptyState from '../../components/EmptyState';
import Spinner from '../../components/Spinner';
import StatusBadge from '../../components/StatusBadge';
import { downloadCsv, listOrders, updateOrderStatus } from '../../api/admin';
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

/** Suivi et traitement des commandes : détail, statut d'expédition, export CSV. */
const AdminOrdersPage = () => {
  const { showToast } = useToast();

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

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

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadCsv('/admin/export/orders.csv', 'novatech-commandes.csv');
      showToast('Export des commandes téléchargé.', 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Export impossible.'), 'error');
    } finally {
      setExporting(false);
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
        <div className="admin-toolbar__actions">
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
          <span className="muted small">
            {orders.length} commande{orders.length > 1 ? 's' : ''}
          </span>
        </div>
        <button type="button" className="button button--outline" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Export…' : 'Exporter CSV'}
        </button>
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
                const expanded = expandedId === order._id;
                return (
                  <Fragment key={order._id}>
                    <tr>
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
                        <div className="admin-row-actions">
                          <button
                            type="button"
                            className="button button--ghost button--sm"
                            onClick={() => setExpandedId(expanded ? null : order._id)}
                            aria-expanded={expanded}
                          >
                            {expanded ? 'Masquer' : 'Détails'}
                          </button>
                          {next && (
                            <button
                              type="button"
                              className="button button--ghost button--sm"
                              onClick={() => advance(order)}
                              disabled={updatingId === order._id}
                            >
                              {updatingId === order._id ? 'Mise à jour…' : NEXT_LABEL[order.status]}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {expanded && (
                      <tr className="admin-detail-row">
                        <td colSpan={6}>
                          <div className="admin-detail">
                            <div>
                              <h4>Articles</h4>
                              <ul className="order-items">
                                {order.items.map((item, index) => (
                                  <li key={`${item.product}-${index}`} className="order-item">
                                    <img src={item.imageUrl} alt="" />
                                    <div className="order-item__info">
                                      <span className="order-item__name">{item.name}</span>
                                      <small>{formatPrice(item.priceAtPurchase)} × {item.quantity}</small>
                                    </div>
                                    <span className="order-item__total">
                                      {formatPrice(item.priceAtPurchase * item.quantity)}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <dl className="order-meta">
                              <div>
                                <dt>Paiement</dt>
                                <dd>{order.stripePaymentIntentId ? `${order.stripePaymentIntentId.slice(0, 18)}…` : '—'}</dd>
                              </div>
                              <div>
                                <dt>Payée le</dt>
                                <dd>{order.paidAt ? formatDate(order.paidAt) : '—'}</dd>
                              </div>
                              <div>
                                <dt>Expédiée le</dt>
                                <dd>{order.shippedAt ? formatDate(order.shippedAt) : '—'}</dd>
                              </div>
                              <div>
                                <dt>Livrée le</dt>
                                <dd>{order.deliveredAt ? formatDate(order.deliveredAt) : '—'}</dd>
                              </div>
                            </dl>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
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
