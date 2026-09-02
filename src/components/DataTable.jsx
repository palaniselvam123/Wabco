import { useMemo, useState } from 'react';
import MultiFilter from './MultiFilter';
import Pagination from './Pagination';
import { PAGE_SIZE } from '../data/defaults';

/**
 * Generic table with per-column multi-select filters + sorting on every column.
 *
 * columns: [{
 *   key      unique id
 *   label    header text
 *   get      (row) => raw value used for filtering + sorting
 *   render   (row, value) => node        (optional; defaults to text or '—')
 *   type     'text' | 'number' | 'date'  (sorting mode, default 'text')
 *   align    'right' for numeric columns
 *   filter   false to disable the column filter (default true)
 *   sort     false to disable sorting (default true)
 * }]
 */
export default function DataTable({
  columns,
  rows,
  title,
  search,
  onSearch,
  searchPlaceholder = 'Search…',
  onRowClick,
  rowStyle,
  emptyText = 'No records match the filters.',
  actions,
  pageSize = PAGE_SIZE,
}) {
  const [colFilters, setColFilters] = useState({});
  const [sortKey, setSortKey] = useState(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);

  const val = (col, r) => {
    const v = col.get(r);
    return v == null || v === '' ? '' : String(v).trim();
  };

  // Option lists come from rows already narrowed by the OTHER columns' filters,
  // so choices stay meaningful as filters are combined.
  const options = useMemo(() => {
    const out = {};
    columns.forEach((col) => {
      if (col.filter === false) return;
      const others = rows.filter((r) =>
        columns.every((c) => {
          if (c.key === col.key) return true;
          const sel = colFilters[c.key];
          return !sel?.length || sel.includes(val(c, r));
        })
      );
      out[col.key] = [...new Set(others.map((r) => val(col, r)).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true })
      );
    });
    return out;
  }, [rows, columns, colFilters]);

  const filtered = useMemo(() => {
    let out = rows.filter((r) =>
      columns.every((c) => {
        const sel = colFilters[c.key];
        return !sel?.length || sel.includes(val(c, r));
      })
    );

    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey);
      if (col) {
        out = [...out].sort((a, b) => {
          const av = col.get(a);
          const bv = col.get(b);
          const aEmpty = av == null || av === '' || av === '-';
          const bEmpty = bv == null || bv === '' || bv === '-';
          if (aEmpty && bEmpty) return 0;
          if (aEmpty) return 1; // blanks always last
          if (bEmpty) return -1;

          let cmp;
          if (col.type === 'number') {
            cmp = (parseFloat(av) || 0) - (parseFloat(bv) || 0);
          } else if (col.type === 'date') {
            const ad = new Date(av);
            const bd = new Date(bv);
            cmp = (isNaN(ad) ? 0 : ad.getTime()) - (isNaN(bd) ? 0 : bd.getTime());
          } else {
            cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
          }
          return sortAsc ? cmp : -cmp;
        });
      }
    }
    return out;
  }, [rows, columns, colFilters, sortKey, sortAsc]);

  const total = filtered.length;
  const pages = Math.ceil(total / pageSize) || 1;
  const safePage = Math.min(page, pages);
  const start = (safePage - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const pageRows = filtered.slice(start, end);

  const activeCount = Object.values(colFilters).filter((v) => v?.length).length;

  const setFilter = (key, v) => {
    setColFilters((p) => ({ ...p, [key]: v }));
    setPage(1);
  };

  const clearAll = () => {
    setColFilters({});
    setSortKey(null);
    onSearch?.('');
    setPage(1);
  };

  const toggleSort = (col) => {
    if (col.sort === false) return;
    if (sortKey === col.key) setSortAsc((a) => !a);
    else {
      setSortKey(col.key);
      setSortAsc(true);
    }
    setPage(1);
  };

  return (
    <>
      <div className="filter-bar">
        <div className="fg-inline">
          <label>Search</label>
          <input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => {
              onSearch?.(e.target.value);
              setPage(1);
            }}
            style={{ minWidth: 200 }}
          />
        </div>
        <span style={{ fontSize: 11.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
          {activeCount > 0 ? (
            <strong style={{ color: '#c2410c' }}>
              {activeCount} column filter{activeCount === 1 ? '' : 's'} active
            </strong>
          ) : (
            <>
              Click a column name to sort · click
              <span
                style={{
                  background: '#fff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 4,
                  padding: '1px 5px',
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#475569',
                }}
              >
                ▼
              </span>
              next to it to filter
            </>
          )}
        </span>
        {(activeCount > 0 || sortKey || search) && (
          <button className="btn-sm btn-outline" onClick={clearAll}>
            ✕ Reset filters & sort
          </button>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>{actions}</div>
      </div>

      <div className="table-card">
        <div className="table-head">
          <h3>
            {title} ({total.toLocaleString()})
          </h3>
          <div className="table-actions">
            <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
              Showing {total ? start + 1 : 0}–{end} of {total.toLocaleString()} · click a row for
              full details
            </span>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {columns.map((col) => {
                  const isSorted = sortKey === col.key;
                  return (
                    <th
                      key={col.key}
                      className={col.align === 'right' ? 'tr' : undefined}
                      onClick={() => toggleSort(col)}
                      style={{
                        cursor: col.sort === false ? 'default' : 'pointer',
                        userSelect: 'none',
                        whiteSpace: 'nowrap',
                      }}
                      title={col.sort === false ? undefined : `Sort by ${col.label}`}
                    >
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 2,
                          justifyContent: col.align === 'right' ? 'flex-end' : 'flex-start',
                        }}
                      >
                        {col.label}
                        {col.sort !== false && (
                          <span
                            style={{
                              opacity: isSorted ? 1 : 0.4,
                              fontSize: 9,
                              color: isSorted ? '#f07c2c' : 'inherit',
                            }}
                          >
                            {isSorted ? (sortAsc ? '▲' : '▼') : '↕'}
                          </span>
                        )}
                        {col.filter !== false && (
                          <MultiFilter
                            variant="chip"
                            options={options[col.key] || []}
                            selected={colFilters[col.key] || []}
                            onChange={(v) => setFilter(col.key, v)}
                          />
                        )}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    style={{ textAlign: 'center', padding: 26, color: 'var(--muted)' }}
                  >
                    {emptyText}
                  </td>
                </tr>
              ) : (
                pageRows.map((r, i) => (
                  <tr
                    key={i}
                    className={onRowClick ? 'clickable-row' : undefined}
                    style={rowStyle?.(r)}
                    tabIndex={onRowClick ? 0 : undefined}
                    onClick={() => onRowClick?.(r)}
                    onKeyDown={(e) => {
                      if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        onRowClick(r);
                      }
                    }}
                  >
                    {columns.map((col) => {
                      const raw = col.get(r);
                      return (
                        <td key={col.key} className={col.align === 'right' ? 'tr' : undefined}>
                          {col.render ? col.render(r, raw) : raw != null && raw !== '' ? String(raw) : '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination current={safePage} total={pages} totalRows={total} onPage={setPage} />
      </div>
    </>
  );
}
