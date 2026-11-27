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
  { title: 'Mots de passe', detail: 'Hachage bcrypt (10 rounds), champ jamais renvoyé par l’API.' },
  { title: 'Authentification', detail: 'JWT signé, expiration 7 jours, révocation par relecture du rôle en base.' },
  { title: 'Autorisation', detail: 'Middleware requireAdmin, réponses 401/403 explicites.' },
  { title: 'En-têtes HTTP', detail: 'Helmet (CSP, no-sniff, frameguard) sur chaque réponse.' },
  { title: 'Limitation de débit', detail: 'Auth 30 req/15 min, checkout 10 req/15 min par IP.' },
  { title: 'Paiement', detail: 'Montants recalculés serveur, webhook à signature HMAC vérifiée.' },
  { title: 'Entrées', detail: 'Validation Mongoose, listes blanches de champs, anti-injection NoSQL.' },
  { title: 'CORS', detail: 'Origines autorisées limitées à la boutique déployée et au poste local.' }
];

/** Sécurité : posture de l'API et journal d'audit paginé. */
const AdminSecurityPage = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
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

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return logs;
    return logs.filter((entry) => {
      const label = ACTION_LABELS[entry.action] || entry.action;
      return (
        label.toLowerCase().includes(term) ||
        entry.target.toLowerCase().includes(term) ||
        entry.actorEmail.toLowerCase().includes(term) ||
        entry.ip.toLowerCase().includes(term)
      );
    });
  }, [logs, search]);

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
        title="Filtres"
        subtitle="Rechercher une action, une cible ou un auteur"
        storageKey="security-filters"
        actions={<span className="muted small">{filtered.length} / {total} entrée(s)</span>}
      >
        <div className="filter-grid">
          <label className="field">
            <span>Recherche</span>
            <input
              type="search"
              className="input"
              placeholder="product.create, admin@…, adresse IP…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>
      </Panel>

      <Panel
        title="Contrôles de sécurité actifs"
        subtitle="API Express + MongoDB"
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
          rows={filtered}
          rowKey={(entry) => entry._id}
          pageSizeKey="admin-audit"
          emptyLabel="Aucune entrée ne correspond à cette recherche."
        />
      </Panel>
    </div>
  );
};

export default AdminSecurityPage;
