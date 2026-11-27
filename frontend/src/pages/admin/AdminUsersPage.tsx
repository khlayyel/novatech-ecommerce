import { useCallback, useEffect, useMemo, useState } from 'react';
import Panel from '../../components/ui/Panel';
import DataTable from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import Spinner from '../../components/Spinner';
import { downloadCsv, listUsers, updateUserRole } from '../../api/admin';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../utils/request';
import { formatDate, formatPrice } from '../../utils/format';
import type { AdminUserRow, UserRole } from '../../types';

const ROLE_FILTERS = [
  { value: '', label: 'Tous les rôles' },
  { value: 'customer', label: 'Clients' },
  { value: 'admin', label: 'Administrateurs' }
];

/** Clients et rôles : filtres repliables, tableau triable/paginé, export. */
const AdminUsersPage = () => {
  const { showToast } = useToast();
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listUsers({ search: search || undefined, role: role || undefined, limit: 200 });
      setUsers(data.users);
    } catch (err) {
      setError(getErrorMessage(err, 'Impossible de charger les clients.'));
    } finally {
      setLoading(false);
    }
  }, [search, role]);

  useEffect(() => {
    load();
  }, [load]);

  const changeRole = async (row: AdminUserRow, nextRole: UserRole) => {
    const action = nextRole === 'admin' ? 'promouvoir administrateur' : 'rétrograder en client';
    if (!window.confirm(`Voulez-vous ${action} « ${row.name} » ?`)) return;

    setUpdatingId(row.id);
    try {
      await updateUserRole(row.id, nextRole);
      setUsers((current) => current.map((item) => (item.id === row.id ? { ...item, role: nextRole } : item)));
      showToast(`Rôle de ${row.name} mis à jour.`, 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Changement de rôle impossible.'), 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadCsv('/admin/export/users.csv', 'novatech-clients.csv');
      showToast('Export des clients téléchargé.', 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Export impossible.'), 'error');
    } finally {
      setExporting(false);
    }
  };

  const columns: Column<AdminUserRow>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Client',
        sortValue: (row) => row.name,
        render: (row) => (
          <div className="admin-user__cell">
            <span className="admin-avatar admin-avatar--sm" aria-hidden="true">
              {row.name.slice(0, 1).toUpperCase()}
            </span>
            <span>
              {row.name}
              <small className="muted block">{row.email}</small>
            </span>
          </div>
        )
      },
      {
        key: 'role',
        label: 'Rôle',
        sortValue: (row) => row.role,
        render: (row) => (
          <span className={`role-badge role-badge--${row.role}`}>
            {row.role === 'admin' ? 'Admin' : 'Client'}
          </span>
        )
      },
      {
        key: 'orders',
        label: 'Commandes',
        align: 'right',
        sortValue: (row) => row.orders
      },
      {
        key: 'spent',
        label: 'Total dépensé',
        align: 'right',
        sortValue: (row) => row.spent,
        render: (row) => formatPrice(row.spent)
      },
      {
        key: 'createdAt',
        label: 'Inscription',
        sortValue: (row) => row.createdAt,
        render: (row) => formatDate(row.createdAt)
      },
      {
        key: 'action',
        label: 'Action',
        align: 'right',
        sortable: false,
        render: (row) => {
          const isSelf = row.id === currentUser?.id;
          if (isSelf) return <span className="muted small">Votre compte</span>;
          return (
            <button
              type="button"
              className="button button--ghost button--sm"
              onClick={() => changeRole(row, row.role === 'admin' ? 'customer' : 'admin')}
              disabled={updatingId === row.id}
            >
              {updatingId === row.id
                ? 'Mise à jour…'
                : row.role === 'admin'
                  ? 'Rétrograder'
                  : 'Promouvoir admin'}
            </button>
          );
        }
      }
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [updatingId, currentUser?.id]
  );

  if (loading && users.length === 0) {
    return (
      <div className="page-center">
        <Spinner label="Chargement des clients…" />
      </div>
    );
  }

  if (error) {
    return (
      <Panel title="Clients indisponibles" storageKey="users-error">
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
        subtitle="Rechercher un nom ou un email, filtrer par rôle"
        storageKey="users-filters"
        actions={
          <>
            <span className="muted small">{users.length} compte(s)</span>
            <button type="button" className="button button--outline button--sm" onClick={handleExport} disabled={exporting}>
              {exporting ? 'Export…' : 'Exporter CSV'}
            </button>
          </>
        }
      >
        <div className="filter-grid filter-grid--two">
          <label className="field">
            <span>Recherche</span>
            <input
              type="search"
              className="input"
              placeholder="Nom ou email…"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Rôle</span>
            <select className="input input--select" value={role} onChange={(event) => setRole(event.target.value)}>
              {ROLE_FILTERS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
        </div>
      </Panel>

      <Panel
        title="Clients"
        subtitle="Commandes et total dépensé par compte"
        storageKey="users-table"
        bodyClassName="panel__body--flush"
      >
        <DataTable
          columns={columns}
          rows={users}
          rowKey={(row) => row.id}
          pageSizeKey="admin-users"
          emptyLabel="Aucun compte ne correspond à cette recherche."
        />
      </Panel>
    </div>
  );
};

export default AdminUsersPage;
