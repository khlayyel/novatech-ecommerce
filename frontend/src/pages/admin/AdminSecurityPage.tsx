import { useCallback, useEffect, useState } from 'react';
import EmptyState from '../../components/EmptyState';
import Spinner from '../../components/Spinner';
import { listAuditLogs } from '../../api/admin';
import { getErrorMessage } from '../../utils/request';
import { formatDate } from '../../utils/format';
import type { AuditLogEntry } from '../../types';

const ACTION_LABELS: Record<string, string> = {
  'product.create': 'Création de produit',
  'product.update': 'Modification de produit',
  'product.delete': 'Suppression de produit',
  'order.status': 'Changement de statut',
  'category.create': 'Création de famille',
  'category.update': 'Modification de famille',
  'category.delete': 'Suppression de famille',
  'user.role': 'Changement de rôle'
};

const CONTROLS = [
  { title: 'Mots de passe', detail: 'Hachage bcrypt (10 rounds), champ jamais renvoyé par l’API.' },
  { title: 'Authentification', detail: 'JWT signé, expiration 7 jours, révocation par relecture du rôle en base.' },
  { title: 'Autorisation', detail: 'Middleware requireAdmin, réponses 401/403 explicites.' },
  { title: 'En-têtes HTTP', detail: 'Helmet (CSP, no-sniff, frameguard) sur chaque réponse.' },
  { title: 'Limitation de débit', detail: 'Auth 30 req/15 min, checkout 10 req/15 min par IP.' },
  { title: 'Paiement', detail: 'Montants recalculés serveur, webhook à signature HMAC vérifiée.' },
  { title: 'Entrées', detail: 'Validation Mongoose, listes blanches de champs, anti-injection NoSQL.' },
  { title: 'CORS', detail: 'Origines autorisées limitées à la boutique déployée et au poste local.' }
];

/** Sécurité : posture de l'API et journal des actions d'administration. */
const AdminSecurityPage = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAuditLogs({ limit: 50 });
      setLogs(data.logs);
      setTotal(data.total);
    } catch (err) {
      setError(getErrorMessage(err, 'Impossible de charger le journal.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && logs.length === 0) {
    return (
      <div className="page-center">
        <Spinner label="Chargement du journal…" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Journal indisponible"
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
      <section className="card">
        <div className="card__head">
          <h2 className="card__title">Contrôles de sécurité actifs</h2>
          <span className="badge-soft">API Express + MongoDB</span>
        </div>
        <ul className="security-grid">
          {CONTROLS.map((control) => (
            <li key={control.title} className="security-item">
              <span className="security-item__check" aria-hidden="true">✓</span>
              <div>
                <strong>{control.title}</strong>
                <p className="muted small">{control.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <div className="card__head">
          <h2 className="card__title">Journal d’audit ({total})</h2>
          <button type="button" className="button button--ghost button--sm" onClick={load}>
            Actualiser
          </button>
        </div>

        {logs.length === 0 ? (
          <p className="muted">Aucune action d’administration enregistrée pour le moment.</p>
        ) : (
          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Action</th>
                  <th>Cible</th>
                  <th>Auteur</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((entry) => (
                  <tr key={entry._id}>
                    <td>{formatDate(entry.createdAt)}</td>
                    <td>
                      <span className={`audit-action audit-action--${entry.action.split('.')[0]}`}>
                        {ACTION_LABELS[entry.action] || entry.action}
                      </span>
                    </td>
                    <td className="mono">{entry.target || '—'}</td>
                    <td>{entry.actorEmail || '—'}</td>
                    <td className="mono">{entry.ip || '—'}</td>
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

export default AdminSecurityPage;
