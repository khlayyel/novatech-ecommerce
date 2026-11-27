import { useCallback, useEffect, useMemo, useState } from 'react';
import Panel from '../../components/ui/Panel';
import DataTable from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
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

/** Suivi des commandes : filtres repliables, tableau triable/paginé, détail et export. */
const AdminOrdersPage = () => {
  const { showToast } = useToast();

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listOrders({ status: status || undefined, limit: 200 });
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

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return orders;
    return orders.filter((order) => {
      const reference = order._id.slice(-8).toLowerCase();
      const customer = order.user ? `${order.user.name} ${order.user.email}`.toLowerCase() : 'invité';
      return reference.includes(term) || customer.includes(term);
    });
  }, [orders, search]);

  const columns: Column<AdminOrder>[] = useMemo(
    () => [
      {
        key: 'id',
        label: 'Commande',
        sortValue: (order) => order.createdAt,
        render: (order) => <span className="mono">{order._id.slice(-8).toUpperCase()}</span>
      },
      {
        key: 'client',
        label: 'Client',
        sortValue: (order) => (order.user ? order.user.name : 'Invité'),
        render: (order) =>
          order.user ? (
            <span>
              {order.user.name}
              <small className="muted block">{order.user.email}</small>
            </span>
          ) : (
            <span className="muted">Invité</span>
          )
      },
      {
        key: 'createdAt',
        label: 'Date',
        sortValue: (order) => order.createdAt,
        render: (order) => formatDate(order.createdAt)
      },
      {
        key: 'totalAmount',
        label: 'Montant',
        align: 'right',
        sortValue: (order) => order.totalAmount,
        render: (order) => formatPrice(order.totalAmount)
      },
      {
        key: 'status',
        label: 'Statut',
        sortValue: (order) => order.status,
        render: (order) => <StatusBadge status={order.status} />
      },
      {
        key: 'action',
        label: 'Action',
        align: 'right',
        sortable: false,
        render: (order) => {
          const next = NEXT_STATUS[order.status];
          if (!next) return <span className="muted small">—</span>;
          return (
            <button
              type="button"
              className="button button--ghost button--sm"
              onClick={() => advance(order)}
              disabled={updatingId === order._id}
            >
              {updatingId === order._id ? 'Mise à jour…' : NEXT_LABEL[order.status]}
            </button>
          );
        }
      }
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [updatingId]
  );

  const renderDetail = (order: AdminOrder) => (
    <div className="admin-detail">
      <div>
        <h4>Articles ({order.items.reduce((sum, item) => sum + item.quantity, 0)})</h4>
        <ul className="order-items">
          {order.items.map((item, index) => (
            <li key={`${item.product}-${index}`} className="order-item">
              <img src={item.imageUrl} alt="" />
              <div className="order-item__info">
                <span className="order-item__name">{item.name}</span>
                <small>{formatPrice(item.priceAtPurchase)} × {item.quantity}</small>
              </div>
              <span className="order-item__total">{formatPrice(item.priceAtPurchase * item.quantity)}</span>
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
  );

  if (loading && orders.length === 0) {
    return (
      <div className="page-center">
        <Spinner label="Chargement des commandes…" />
      </div>
    );
  }

  if (error) {
    return (
      <Panel title="Commandes indisponibles" storageKey="orders-error">
        <p className="muted">{error}</p>
        <button type="button" className="button button--primary" onClick={load}>
          Réessayer
        </button>
      </Panel>
    );
  }

  return (
    <div className="admin-panel">
      <Panel
        title="Filtres"
        subtitle="Filtrer par statut de commande"
        storageKey="orders-filters"
        actions={
          <>
            <span className="muted small">{filtered.length} commande(s)</span>
            <button type="button" className="button button--outline button--sm" onClick={handleExport} disabled={exporting}>
              {exporting ? 'Export…' : 'Exporter CSV'}
            </button>
          </>
        }
      >
        <div className="filter-grid filter-grid--two">
          <label className="field">
            <span>Statut</span>
            <select
              className="input input--select"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              {STATUS_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Recherche</span>
            <input
              type="search"
              className="input"
              placeholder="Référence, client ou email…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>
      </Panel>

      <Panel
        title="Commandes"
        subtitle="Cliquez sur un en-tête pour trier, « Voir » pour le détail"
        storageKey="orders-table"
        bodyClassName="panel__body--flush"
      >
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(order) => order._id}
          pageSizeKey="admin-orders"
          renderDetail={renderDetail}
          emptyLabel="Aucune commande ne correspond à ce filtre."
        />
      </Panel>
    </div>
  );
};

export default AdminOrdersPage;
