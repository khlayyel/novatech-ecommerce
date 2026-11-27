import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Panel from '../../components/ui/Panel';
import DataTable from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import Spinner from '../../components/Spinner';
import StatusBadge from '../../components/StatusBadge';
import BarChart from '../../components/admin/BarChart';
import { getAnalytics, getStats } from '../../api/admin';
import { getErrorMessage } from '../../utils/request';
import { formatDate, formatPrice } from '../../utils/format';
import type { AdminAnalytics, AdminOrder, AdminStats } from '../../types';

const STATUS_META = [
  { key: 'paid', label: 'Payées', color: '#4f46e5' },
  { key: 'shipped', label: 'Expédiées', color: '#0ea5e9' },
  { key: 'delivered', label: 'Livrées', color: '#059669' },
  { key: 'pending', label: 'En attente', color: '#f59e0b' },
  { key: 'failed', label: 'Échouées', color: '#dc2626' }
];

const buildGradient = (breakdown: Record<string, number>) => {
  const total = STATUS_META.reduce((sum, item) => sum + (breakdown[item.key] || 0), 0);
  if (total === 0) return '#e6e8f0';

  let cursor = 0;
  const parts = STATUS_META.map((item) => {
    const value = breakdown[item.key] || 0;
    const from = cursor;
    cursor += (value / total) * 100;
    return `${item.color} ${from}% ${cursor}%`;
  });
  return `conic-gradient(${parts.join(', ')})`;
};

/** Tableau de bord : indicateurs, courbe, répartition, ventes et stocks. */
const AdminDashboardPage = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [days, setDays] = useState(14);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [statsData, analyticsData] = await Promise.all([getStats(), getAnalytics(days)]);
        if (cancelled) return;
        setStats(statsData);
        setAnalytics(analyticsData);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, 'Impossible de charger les indicateurs.'));
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [days]);

  const points = useMemo(
    () =>
      (analytics?.series || []).map((point) => ({
        label: new Date(`${point.date}T00:00:00Z`).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        value: point.revenue
      })),
    [analytics]
  );

  const orderColumns: Column<AdminOrder>[] = useMemo(
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
        render: (order) => (order.user ? order.user.name : 'Invité')
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
      }
    ],
    []
  );

  const categoryColumns: Column<AdminAnalytics['categories'][number]>[] = useMemo(
    () => [
      { key: 'category', label: 'Famille', sortValue: (row) => row.category },
      { key: 'products', label: 'Produits', align: 'right', sortValue: (row) => row.products },
      { key: 'stock', label: 'Unités', align: 'right', sortValue: (row) => row.stock },
      {
        key: 'value',
        label: 'Valeur',
        align: 'right',
        sortValue: (row) => row.value,
        render: (row) => formatPrice(row.value)
      }
    ],
    []
  );

  if (error) {
    return (
      <Panel title="Indicateurs indisponibles" storageKey="dashboard-error">
        <p className="muted">{error}</p>
      </Panel>
    );
  }

  if (!stats || !analytics) {
    return (
      <div className="page-center">
        <Spinner label="Chargement des indicateurs…" />
      </div>
    );
  }

  const gradient = buildGradient(analytics.statusBreakdown);
  const statusTotal = STATUS_META.reduce((sum, item) => sum + (analytics.statusBreakdown[item.key] || 0), 0);
  const maxProductRevenue = analytics.topProducts[0]?.revenue || 0;

  return (
    <div className="admin-dashboard">
      <Panel
        title="Filtres"
        subtitle="Période d'analyse des ventes"
        storageKey="dashboard-filters"
        actions={<span className="muted small">Données depuis le {new Date(Date.now() - (days - 1) * 86400000).toLocaleDateString('fr-FR')}</span>}
      >
        <div className="filter-grid filter-grid--two">
          <label className="field">
            <span>Période</span>
            <select className="input input--select" value={days} onChange={(event) => setDays(Number(event.target.value))}>
              <option value={7}>7 derniers jours</option>
              <option value={14}>14 derniers jours</option>
              <option value={30}>30 derniers jours</option>
            </select>
          </label>
        </div>
      </Panel>

      <Panel title="Indicateurs" subtitle="Vue d'ensemble de la boutique" storageKey="dashboard-stats">
        <div className="stat-grid stat-grid--tight">
          <article className="stat-card">
            <span className="stat-card__label">Chiffre d'affaires</span>
            <strong className="stat-card__value">{formatPrice(analytics.totals.revenue)}</strong>
            <span className="stat-card__hint">{stats.paidOrders} commande(s) payée(s)</span>
          </article>
          <article className="stat-card">
            <span className="stat-card__label">Panier moyen</span>
            <strong className="stat-card__value">{formatPrice(analytics.totals.averageBasket)}</strong>
            <span className="stat-card__hint">{analytics.totals.orders} commande(s) réglée(s)</span>
          </article>
          <article className="stat-card">
            <span className="stat-card__label">Commandes</span>
            <strong className="stat-card__value">{stats.orders.total}</strong>
            <span className="stat-card__hint">{stats.orders.pending} en attente · {stats.orders.failed} échouée(s)</span>
          </article>
          <article className="stat-card">
            <span className="stat-card__label">Catalogue</span>
            <strong className="stat-card__value">{stats.products.total}</strong>
            <span className="stat-card__hint">{stats.products.lowStock} en stock faible</span>
          </article>
        </div>
      </Panel>

      {stats.products.lowStock > 0 && (
        <div className="banner banner--warn" role="status">
          {stats.products.lowStock} produit(s) ont un stock inférieur ou égal à 5.{' '}
          <Link to="/admin/stock">Ajuster les stocks</Link>
        </div>
      )}

      <div className="admin-grid admin-grid--two">
        <Panel
          title={`Chiffre d'affaires — ${days} derniers jours`}
          subtitle="Commandes payées, expédiées et livrées"
          storageKey="dashboard-revenue"
          actions={<span className="badge-soft">{formatPrice(analytics.series.reduce((sum, point) => sum + point.revenue, 0))}</span>}
        >
          <BarChart points={points} emptyLabel="Aucune vente sur la période." />
        </Panel>

        <Panel title="Répartition des commandes" storageKey="dashboard-status">
          <div className="donut-row">
            <div className="donut" style={{ background: gradient }} role="img" aria-label="Répartition des commandes par statut">
              <span className="donut__hole">{statusTotal}</span>
            </div>
            <ul className="donut-legend">
              {STATUS_META.map((item) => (
                <li key={item.key}>
                  <span className="donut-legend__dot" style={{ background: item.color }} />
                  <span>{item.label}</span>
                  <strong>{analytics.statusBreakdown[item.key] || 0}</strong>
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      </div>

      <div className="admin-grid admin-grid--two">
        <Panel title="Meilleures ventes" subtitle="Top 5 par chiffre d'affaires" storageKey="dashboard-top">
          {analytics.topProducts.length === 0 ? (
            <p className="muted">Aucune vente enregistrée.</p>
          ) : (
            <ul className="rank-list">
              {analytics.topProducts.map((product) => (
                <li key={product.name}>
                  <div className="rank-list__head">
                    <span>{product.name}</span>
                    <strong>{formatPrice(product.revenue)}</strong>
                  </div>
                  <div className="rank-list__bar">
                    <span style={{ width: `${maxProductRevenue > 0 ? Math.round((product.revenue / maxProductRevenue) * 100) : 0}%` }} />
                  </div>
                  <small className="muted">{product.quantity} unité(s) vendue(s)</small>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Valeur du stock par famille"
          subtitle="Prix de vente × unités disponibles"
          storageKey="dashboard-stock"
          collapsible={false}
          bodyClassName="panel__body--flush"
        >
          <DataTable
            columns={categoryColumns}
            rows={analytics.categories}
            rowKey={(row) => row.category}
            pageSizeKey="dashboard-categories"
          />
        </Panel>
      </div>

      <Panel
        title="Dernières commandes"
        subtitle="Cinq commandes les plus récentes"
        storageKey="dashboard-orders"
        collapsible={false}
        bodyClassName="panel__body--flush"
        actions={
          <Link to="/admin/orders" className="button button--ghost button--sm">
            Tout voir
          </Link>
        }
      >
        <DataTable
          columns={orderColumns}
          rows={stats.recentOrders}
          rowKey={(order) => order._id}
          pageSizeKey="dashboard-orders"
          emptyLabel="Aucune commande pour le moment."
        />
      </Panel>
    </div>
  );
};

export default AdminDashboardPage;
