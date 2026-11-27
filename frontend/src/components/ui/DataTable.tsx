import { Fragment, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  /** Valeur utilisée pour le tri (par défaut : row[key]). */
  sortValue?: (row: T) => string | number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  defaultPageSize?: number;
  /** Clé de mémorisation de la taille de page (ex. « orders »). */
  pageSizeKey?: string;
  emptyLabel?: string;
  /** Contenu dépliable affiché sous la ligne (détail de commande…). */
  renderDetail?: (row: T) => ReactNode;
}

const PAGE_SIZES = [5, 10, 15, 20, 50];

const readPageSize = (key: string | null, fallback: number) => {
  if (!key) return fallback;
  try {
    const stored = Number(window.localStorage.getItem(key));
    return PAGE_SIZES.includes(stored) ? stored : fallback;
  } catch {
    return fallback;
  }
};

/**
 * Tableau standard du projet : tri par clic sur l'en-tête, pagination
 * (5/10/15/20/50 lignes, 10 par défaut, choix mémorisé) et détail dépliable.
 */
function DataTable<T>({
  columns,
  rows,
  rowKey,
  defaultPageSize = 10,
  pageSizeKey,
  emptyLabel = 'Aucune donnée à afficher.',
  renderDetail
}: DataTableProps<T>) {
  const storageKey = pageSizeKey ? `novatech.table.${pageSizeKey}.size` : null;

  const [pageSize, setPageSize] = useState(() => readPageSize(storageKey, defaultPageSize));
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((item) => item.key === sort.key);
    if (!column) return rows;

    const getValue =
      column.sortValue ??
      ((row: T) => (row as Record<string, unknown>)[column.key] as string | number);

    const direction = sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const left = getValue(a);
      const right = getValue(b);
      if (typeof left === 'number' && typeof right === 'number') {
        return (left - right) * direction;
      }
      return String(left ?? '').localeCompare(String(right ?? ''), 'fr', { numeric: true }) * direction;
    });
  }, [rows, sort, columns]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pages);

  useEffect(() => {
    setPage(1);
    setExpanded(null);
    // Le tri, la taille de page ou le volume de données changent : retour page 1.
  }, [rows.length, pageSize, sort]);

  const from = sorted.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, sorted.length);
  const visible = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const pageNumbers = useMemo(() => {
    const start = Math.max(1, Math.min(currentPage - 2, pages - 4));
    const end = Math.min(pages, start + 4);
    const list: number[] = [];
    for (let index = start; index <= end; index += 1) list.push(index);
    return list;
  }, [currentPage, pages]);

  const toggleSort = (key: string) => {
    setSort((current) =>
      current?.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    );
  };

  const changePageSize = (value: number) => {
    setPageSize(value);
    setPage(1);
    if (storageKey) {
      try {
        window.localStorage.setItem(storageKey, String(value));
      } catch {
        // Stockage indisponible : le choix reste valable pour la session.
      }
    }
  };

  const columnCount = columns.length + (renderDetail ? 1 : 0);

  return (
    <div className="data-table">
      <div className="table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              {columns.map((column) => {
                const sortable = column.sortable !== false;
                const active = sort?.key === column.key;
                return (
                  <th
                    key={column.key}
                    style={column.width ? { width: column.width } : undefined}
                    aria-sort={active ? (sort?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                    className={column.align ? `is-${column.align}` : undefined}
                  >
                    {sortable ? (
                      <button type="button" className="th-sort" onClick={() => toggleSort(column.key)}>
                        <span>{column.label}</span>
                        <span className={`th-sort__arrow${active ? ' th-sort__arrow--active' : ''}`} aria-hidden="true">
                          {active ? (sort?.direction === 'asc' ? '▲' : '▼') : '↕'}
                        </span>
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                );
              })}
              {renderDetail && <th className="is-right">Détails</th>}
            </tr>
          </thead>

          <tbody>
            {visible.map((row) => {
              const key = rowKey(row);
              const isExpanded = expanded === key;
              return (
                <Fragment key={key}>
                  <tr>
                    {columns.map((column) => (
                      <td key={column.key} className={column.align ? `is-${column.align}` : undefined}>
                        {column.render ? column.render(row) : String((row as Record<string, unknown>)[column.key] ?? '')}
                      </td>
                    ))}
                    {renderDetail && (
                      <td className="is-right">
                        <button
                          type="button"
                          className="button button--ghost button--sm"
                          aria-expanded={isExpanded}
                          onClick={() => setExpanded(isExpanded ? null : key)}
                        >
                          {isExpanded ? 'Masquer' : 'Voir'}
                        </button>
                      </td>
                    )}
                  </tr>

                  {isExpanded && renderDetail && (
                    <tr className="data-table__detail">
                      <td colSpan={columnCount}>{renderDetail(row)}</td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {visible.length === 0 ? (
        <p className="muted data-table__empty">{emptyLabel}</p>
      ) : (
        <div className="data-table__foot">
          <span className="muted small">
            {from}–{to} sur {sorted.length} ligne{sorted.length > 1 ? 's' : ''}
          </span>

          <label className="data-table__size">
            <span className="muted small">Lignes par page</span>
            <select
              className="input input--select input--compact"
              value={pageSize}
              onChange={(event) => changePageSize(Number(event.target.value))}
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </label>

          <nav className="pagination" aria-label="Pagination">
            <button
              type="button"
              className="pagination__btn"
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              aria-label="Page précédente"
            >
              ‹
            </button>

            {pageNumbers[0] > 1 && (
              <>
                <button type="button" className="pagination__btn" onClick={() => setPage(1)}>1</button>
                {pageNumbers[0] > 2 && <span className="pagination__ellipsis" aria-hidden="true">…</span>}
              </>
            )}

            {pageNumbers.map((number) => (
              <button
                key={number}
                type="button"
                className={`pagination__btn${number === currentPage ? ' pagination__btn--active' : ''}`}
                onClick={() => setPage(number)}
                aria-current={number === currentPage ? 'page' : undefined}
              >
                {number}
              </button>
            ))}

            {pageNumbers[pageNumbers.length - 1] < pages && (
              <>
                {pageNumbers[pageNumbers.length - 1] < pages - 1 && (
                  <span className="pagination__ellipsis" aria-hidden="true">…</span>
                )}
                <button type="button" className="pagination__btn" onClick={() => setPage(pages)}>{pages}</button>
              </>
            )}

            <button
              type="button"
              className="pagination__btn"
              onClick={() => setPage(Math.min(pages, currentPage + 1))}
              disabled={currentPage === pages}
              aria-label="Page suivante"
            >
              ›
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}

export default DataTable;
