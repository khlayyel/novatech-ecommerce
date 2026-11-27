import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../../components/EmptyState';
import Spinner from '../../components/Spinner';
import StatusBadge from '../../components/StatusBadge';
import { getStats } from '../../api/admin';
import { getErrorMessage } from '../../utils/request';
import { formatDate, formatPrice } from '../../utils/format';
import type { AdminStats } from '../../types';

/** Tableau de bord : indicateurs clés et dernières commandes. */
const AdminDashboardPage = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getStats()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Impossible de charger les indicateurs.'));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <EmptyState title="Indicateurs indisponibles" message={error} icon="⚠️" />;
  }

  if (!stats) {
    return (
      <div className="page-center">
        <Spinner label="Chargement des indicateurs…" />
      </div>
    );
  }

  const cards = [
    { label: "Chiffre d'affaires", value: formatPrice(stats.revenue), hint: `${stats.paidOrders} commande(s) payée(s)` },
    { label: 'Commandes', value: String(stats.orders.total), hint: `${stats.orders.pending} en attente` },
    { label: 'Produits', value: String(stats.products.total), hint: `${stats.products.lowStock} stock faible` },
    { label: 'Clients', value: String(stats.users), hint: 'comptes créés' }
  ];

  return (
    <div className="admin-dashboard">
      <div className="stat-grid">
        {cards.map((card) => (
          <article key={card.label} className="stat-card">
            <span className="stat-card__label">{card.label}</span>
            <strong className="stat-card__value">{card.value}</strong>
            <span className="stat-card__hint">{card.hint}</span>
          </article>
        ))}
      </div>

      {stats.products.lowStock > 0 && (
        <div className="banner banner--warn" role="status">
          {stats.products.lowStock} produit(s) ont un stock inférieur ou égal à 5.{' '}
          <Link to="/admin/products">Ajuster les stocks</Link>
        </div>
      )}

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
