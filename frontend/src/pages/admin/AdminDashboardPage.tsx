import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../../components/EmptyState';
import Spinner from '../../components/Spinner';
import StatusBadge from '../../components/StatusBadge';
import BarChart from '../../components/admin/BarChart';
import { getAnalytics, getStats } from '../../api/admin';
import { getErrorMessage } from '../../utils/request';
import { formatDate, formatPrice } from '../../utils/format';
import type { AdminAnalytics, AdminStats } from '../../types';

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

/**
 * Tableau de bord : indicateurs clés, courbe de chiffre d'affaires,
 * répartition des statuts, meilleures ventes et valeur du stock.
 */
const AdminDashboardPage = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [statsData, analyticsData] = await Promise.all([getStats(), getAnalytics(14)]);
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
  }, []);

  const points = useMemo(
    () =>
      (analytics?.series || []).map((point) => ({
        label: new Date(`${point.date}T00:00:00Z`).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        value: point.revenue
      })),
    [analytics]
  );

  if (error) {
    return <EmptyState title="Indicateurs indisponibles" message={error} icon="⚠️" />;
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
      <div className="stat-grid">
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

      {stats.products.lowStock > 0 && (
        <div className="banner banner--warn" role="status">
          {stats.products.lowStock} produit(s) ont un stock inférieur ou égal à 5.{' '}
          <Link to="/admin/stock">Ajuster les stocks</Link>
        </div>
      )}

      <div className="admin-grid admin-grid--two">
        <section className="card">
          <div className="card__head">
            <h2 className="card__title">Chiffre d'affaires — 14 derniers jours</h2>
            <span className="badge-soft">{formatPrice(analytics.series.reduce((sum, point) => sum + point.revenue, 0))}</span>
          </div>
          <BarChart points={points} emptyLabel="Aucune vente sur la période." />
        </section>

        <section className="card">
          <h2 className="card__title">Répartition des commandes</h2>
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
        </section>
      </div>

      <div className="admin-grid admin-grid--two">
        <section className="card">
          <h2 className="card__title">Meilleures ventes</h2>
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
        </section>

        <section className="card">
          <h2 className="card__title">Valeur du stock par famille</h2>
          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Famille</th>
                  <th>Produits</th>
                  <th>Unités</th>
                  <th>Valeur</th>
                </tr>
              </thead>
              <tbody>
                {analytics.categories.map((row) => (
                  <tr key={row.category}>
                    <td>{row.category}</td>
                    <td>{row.products}</td>
                    <td>{row.stock}</td>
                    <td>{formatPrice(row.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="card">
        <div className="card__head">
          <h2 className="card__title">Dernières commandes</h2>
          <Link to="/admin/orders" className="button button--ghost button--sm">
            Tout voir
          </Link>
        </div>

        {stats.recentOrders.length === 0 ? (
          <p className="muted">Aucune commande pour le moment.</p>
        ) : (
          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Commande</th>
                  <th>Client</th>
                  <th>Date</th>
                  <th>Montant</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((order) => (
                  <tr key={order._id}>
                    <td className="mono">{order._id.slice(-8).toUpperCase()}</td>
                    <td>{order.user ? order.user.name : 'Invité'}</td>
                    <td>{formatDate(order.createdAt)}</td>
                    <td>{formatPrice(order.totalAmount)}</td>
                    <td>
                      <StatusBadge status={order.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminDashboardPage;
