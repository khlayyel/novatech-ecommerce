import { Fragment, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useI18n } from '../../i18n';

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  /** Valeur utilisée pour le tri (par défaut : row[key]). */
  sortValue?: (row: T) => string | number;
  /** Texte utilisé par la recherche globale du tableau. */
  searchValue?: (row: T) => string;
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
 * Tableau standard du projet (source unique) : recherche en temps réel,
 * tri par clic sur l'en-tête, sélecteur de lignes en haut à gauche,
 * pagination centrée sous le tableau et détail dépliable.
 */
function DataTable<T>({
  columns,
  rows,
  rowKey,
  defaultPageSize = 10,
  pageSizeKey,
  emptyLabel,
  renderDetail
}: DataTableProps<T>) {
  const { t } = useI18n();
  const storageKey = pageSizeKey ? `novatech.table.${pageSizeKey}.size` : null;

  const [pageSize, setPageSize] = useState(() => readPageSize(storageKey, defaultPageSize));
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const rowSearchText = (row: T): string =>
    columns
      .map((column) => {
        if (column.searchValue) return column.searchValue(row);
        if (column.sortValue) return String(column.sortValue(row));
        return String((row as Record<string, unknown>)[column.key] ?? '');
      })
      .join(' ')
      .toLowerCase();

  const matched = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => rowSearchText(row).includes(term));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, query, columns]);

  const sorted = useMemo(() => {
    if (!sort) return matched;
    const column = columns.find((item) => item.key === sort.key);
    if (!column) return matched;

    const getValue =
      column.sortValue ??
      ((row: T) => (row as Record<string, unknown>)[column.key] as string | number);

    const direction = sort.direction === 'asc' ? 1 : -1;
    return [...matched].sort((a, b) => {
      const left = getValue(a);
      const right = getValue(b);
      if (typeof left === 'number' && typeof right === 'number') {
        return (left - right) * direction;
      }
      return String(left ?? '').localeCompare(String(right ?? ''), 'fr', { numeric: true }) * direction;
    });
  }, [matched, sort, columns]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pages);

  useEffect(() => {
    setPage(1);
    setExpanded(null);
    // Le tri, la taille de page, la recherche ou le volume changent : retour page 1.
  }, [rows.length, pageSize, sort, query]);

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
      <div className="data-table__toolbar">
        <label className="data-table__size">
          <span className="muted small">{t('table.rowsPerPage')}</span>
          <select
            className="input input--select input--compact"
            value={pageSize}
            onChange={(event) => changePageSize(Number(event.target.value))}
            aria-label={t('table.rowsPerPage')}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </label>

        <div className="data-table__search">
          <input
            type="search"
            className="input"
            placeholder={t('table.search')}
            aria-label={t('table.search')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

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
              {renderDetail && <th className="is-right">{t('table.details')}</th>}
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
                          {isExpanded ? t('table.hide') : t('table.show')}
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
        <p className="muted data-table__empty">{emptyLabel ?? t('table.empty')}</p>
      ) : (
        <div className="data-table__foot">
          <nav className="pagination" aria-label={t('table.rowsPerPage')}>
            <button
              type="button"
              className="pagination__btn"
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              aria-label={t('table.previous')}
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
              aria-label={t('table.next')}
            >
              ›
            </button>
          </nav>

          <span className="data-table__range muted small">
            {t('table.range', { from, to, total: sorted.length })}
          </span>
        </div>
      )}
    </div>
  );
}

export default DataTable;
