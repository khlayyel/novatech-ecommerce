import { useCallback, useEffect, useMemo, useState } from 'react';
import Panel from '../../components/ui/Panel';
import DataTable from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
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
  { title: 'Mots de passe', detail: 'Chiffrement robuste ; le mot de passe n’est jamais renvoyé par le serveur.' },
  { title: 'Authentification', detail: 'Session signée avec expiration automatique.' },
  { title: 'Autorisation', detail: 'Accès administrateur vérifié à chaque requête.' },
  { title: 'En-têtes HTTP', detail: 'Réponses protégées contre l’injection et le détournement de contenu.' },
  { title: 'Tentatives répétées', detail: 'Blocage temporaire après plusieurs essais de connexion ou de paiement.' },
  { title: 'Paiement', detail: 'Montants recalculés côté serveur et confirmation signée.' },
  { title: 'Données', detail: 'Validation stricte des entrées et champs modifiables limités.' },
  { title: 'Origines autorisées', detail: 'Seules les adresses de la boutique peuvent appeler le service.' }
];

/** Sécurité : posture de l'API et journal d'audit paginé. */
const AdminSecurityPage = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAuditLogs({ limit: 200 });
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

  const columns: Column<AuditLogEntry>[] = useMemo(
    () => [
      {
        key: 'createdAt',
        label: 'Date',
        sortValue: (entry) => entry.createdAt,
        render: (entry) => formatDate(entry.createdAt)
      },
      {
        key: 'action',
        label: 'Action',
        sortValue: (entry) => entry.action,
        searchValue: (entry) => `${ACTION_LABELS[entry.action] ?? entry.action} ${entry.action}`,
        render: (entry) => (
          <span className={`audit-action audit-action--${entry.action.split('.')[0]}`}>
            {ACTION_LABELS[entry.action] || entry.action}
          </span>
        )
      },
      {
        key: 'target',
        label: 'Cible',
        sortValue: (entry) => entry.target,
        render: (entry) => <span className="mono">{entry.target || '—'}</span>
      },
      {
        key: 'actorEmail',
        label: 'Auteur',
        sortValue: (entry) => entry.actorEmail,
        render: (entry) => entry.actorEmail || '—'
      },
      {
        key: 'ip',
        label: 'IP',
        sortable: false,
        render: (entry) => <span className="mono">{entry.ip || '—'}</span>
      }
    ],
    []
  );

  if (loading && logs.length === 0) {
    return (
      <div className="page-center">
        <Spinner label="Chargement du journal…" />
      </div>
    );
  }

  if (error) {
    return (
      <Panel title="Journal indisponible" storageKey="security-error">
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
        title="Contrôles de sécurité actifs"
        subtitle="Protection de la boutique"
        storageKey="security-controls"
      >
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
      </Panel>

      <Panel
        title={`Journal d’audit (${total})`}
        subtitle="Tri par colonne et pagination"
        storageKey="security-audit"
        collapsible={false}
        bodyClassName="panel__body--flush"
        actions={
          <button type="button" className="button button--ghost button--sm" onClick={load}>
            Actualiser
          </button>
        }
      >
        <DataTable
          columns={columns}
          rows={logs}
          rowKey={(entry) => entry._id}
          pageSizeKey="admin-audit"
          emptyLabel="Aucune action d’administration enregistrée pour le moment."
        />
      </Panel>
    </div>
  );
};

export default AdminSecurityPage;
