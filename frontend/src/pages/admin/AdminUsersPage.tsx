import { useCallback, useEffect, useState } from 'react';
import EmptyState from '../../components/EmptyState';
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

/** Clients et rôles : recherche, statistiques d'achat, promotion/rétrogradation. */
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
      const data = await listUsers({ search: search || undefined, role: role || undefined, limit: 50 });
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

  if (loading && users.length === 0) {
    return (
      <div className="page-center">
        <Spinner label="Chargement des clients…" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Clients indisponibles"
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
        <input
          type="search"
          className="input"
          placeholder="Rechercher un nom ou un email…"
          aria-label="Rechercher un client"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <div className="admin-toolbar__actions">
          <select
            className="input input--select"
            aria-label="Filtrer par rôle"
            value={role}
            onChange={(event) => setRole(event.target.value)}
          >
            {ROLE_FILTERS.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
          <span className="muted small">{users.length} compte(s)</span>
          <button
            type="button"
            className="button button--outline button--sm"
            disabled={exporting}
            onClick={async () => {
              setExporting(true);
              try {
                await downloadCsv('/admin/export/users.csv', 'novatech-clients.csv');
                showToast('Export des clients téléchargé.', 'success');
              } catch (err) {
                showToast(getErrorMessage(err, 'Export impossible.'), 'error');
              } finally {
                setExporting(false);
              }
            }}
          >
            {exporting ? 'Export…' : 'Exporter CSV'}
          </button>
        </div>
      </div>

      <div className="table-wrapper card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Rôle</th>
              <th>Commandes</th>
              <th>Total dépensé</th>
              <th>Inscription</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((row) => {
              const isSelf = row.id === currentUser?.id;
              return (
                <tr key={row.id}>
                  <td>
                    <div className="admin-user__cell">
                      <span className="admin-avatar admin-avatar--sm" aria-hidden="true">
                        {row.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span>
                        {row.name}
                        <small className="muted block">{row.email}</small>
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={`role-badge role-badge--${row.role}`}>
                      {row.role === 'admin' ? 'Admin' : 'Client'}
                    </span>
                  </td>
                  <td>{row.orders}</td>
                  <td>{formatPrice(row.spent)}</td>
                  <td>{formatDate(row.createdAt)}</td>
                  <td>
                    {isSelf ? (
                      <span className="muted small">Votre compte</span>
                    ) : (
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
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <EmptyState title="Aucun client" message="Aucun compte ne correspond à cette recherche." icon="👥" />
      )}
    </div>
  );
};

export default AdminUsersPage;
