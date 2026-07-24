import { useMemo, useState } from 'react';
import StatusBadge from './StatusBadge';
import Pagination from './Pagination';
import RecordDetail from './RecordDetail';
import { PAGE_SIZE } from '../data/defaults';
import { fmtDate, getField, isOverdue } from '../utils/format';
import { exportCSV } from '../utils/csv';

function unique(arr, fn) {
  return [...new Set(arr.map(fn).filter(Boolean))].sort();
}

export default function ActiveShipments({ activeData, onNavigate }) {
  const [supplier, setSupplier] = useState('');
  const [status, setStatus] = useState('');
  const [consol, setConsol] = useState('');
  const [unit, setUnit] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortCol, setSortCol] = useState(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [selected, setSelected] = useState(null);

  const suppliers = useMemo(
    () => unique(activeData, (r) => getField(r, 'Supplier')),
    [activeData]
  );
  const statuses = useMemo(
    () => unique(activeData, (r) => getField(r, 'Customs Cleared')),
    [activeData]
  );
  const consols = useMemo(
    () => unique(activeData, (r) => getField(r, 'Consol', 'Forwarder')),
    [activeData]
  );
  const units = useMemo(
    () => unique(activeData, (r) => getField(r, 'Unit', 'Plant')),
    [activeData]
  );

  const filtered = useMemo(() => {
    let rows = activeData.filter((r) => {
      if (supplier && getField(r, 'Supplier') !== supplier) return false;
      if (status && getField(r, 'Customs Cleared') !== status) return false;
      if (consol && getField(r, 'Consol', 'Forwarder') !== consol) return false;
      if (unit && getField(r, 'Unit', 'Plant') !== unit) return false;
      if (search && !JSON.stringify(r).toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });

    if (sortCol) {
      rows = [...rows].sort((a, b) => {
        const av = getField(a, sortCol) || a[sortCol] || '';
        const bv = getField(b, sortCol) || b[sortCol] || '';
        const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
        return sortAsc ? cmp : -cmp;
      });
    }
    return rows;
  }, [activeData, supplier, status, consol, unit, search, sortCol, sortAsc]);

  const total = filtered.length;
  const pages = Math.ceil(total / PAGE_SIZE) || 1;
  const start = (page - 1) * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, total);
  const pageRows = filtered.slice(start, end);

  const clearFilters = () => {
    setSupplier('');
    setStatus('');
    setConsol('');
    setUnit('');
    setSearch('');
    setPage(1);
  };

  const sortBy = (col) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else {
      setSortCol(col);
      setSortAsc(true);
    }
    setPage(1);
  };

  return (
    <div className="pg">
      <div className="pg-head">
        <div>
          <div className="pg-title">Active Shipments — Detailed View</div>
          <div className="pg-sub">All in-transit and customs clearance shipments</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-sm btn-grn" onClick={() => exportCSV(filtered, 'active')}>
            ⬇ Export CSV
          </button>
          <button className="btn-sm btn-outline" onClick={() => onNavigate('dashboard')}>
            ← Dashboard
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="fg-inline">
          <label>Supplier</label>
          <select
            value={supplier}
            onChange={(e) => {
              setSupplier(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All</option>
            {suppliers.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="fg-inline">
          <label>Status</label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All</option>
            {statuses.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="fg-inline">
          <label>Forwarder</label>
          <select
            value={consol}
            onChange={(e) => {
              setConsol(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All</option>
            {consols.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="fg-inline">
          <label>Plant</label>
          <select
            value={unit}
            onChange={(e) => {
              setUnit(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All</option>
            {units.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="fg-inline">
          <label>Search</label>
          <input
            placeholder="Job No / Part…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <button className="btn-sm btn-outline" onClick={clearFilters}>
          ✕ Clear
        </button>
      </div>

      <div className="table-card">
        <div className="table-head">
          <h3>Active Shipments ({total})</h3>
          <div className="table-actions">
            <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
              Showing {total ? start + 1 : 0}–{end} of {total} · Click a row for full details
            </span>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th onClick={() => sortBy('Job No ')}>Job No. ↕</th>
                <th onClick={() => sortBy('Date')}>Date ↕</th>
                <th>Supplier</th>
                <th>Part No.</th>
                <th className="tr">Qty</th>
                <th>MAWB</th>
                <th onClick={() => sortBy('Eta Maa')}>ETA MAA ↕</th>
                <th>B/E No.</th>
                <th>Customs Status</th>
                <th>Duty Advised</th>
                <th>Duty Received</th>
                <th>Forwarder</th>
                <th>Plant</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={14}
                    style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}
                  >
                    No records match the filters.
                  </td>
                </tr>
              ) : (
                pageRows.map((r, i) => {
                  const jobNo = getField(r, 'Job No ', 'Job No', 'Job');
                  const eta = getField(r, 'Eta Maa', 'ETA MAA');
                  const qty = getField(r, 'Qty', 'Quantity');
                  return (
                  <tr
                    key={jobNo || i}
                    className="clickable-row"
                    tabIndex={0}
                    onClick={() => setSelected(r)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelected(r);
                      }
                    }}
                  >
                    <td>
                      <span className="mono" style={{ color: '#1d4ed8' }}>
                        {jobNo || '—'}
                      </span>
                    </td>
                    <td>{fmtDate(getField(r, 'Date'))}</td>
                    <td>
                      <span className="trunc">{getField(r, 'Supplier') || '—'}</span>
                    </td>
                    <td className="mono">{getField(r, 'Part No', 'Part No.') || '—'}</td>
                    <td className="tr">
                      {qty != null ? Number(qty).toLocaleString() : '—'}
                    </td>
                    <td className="mono">
                      {String(getField(r, 'MAWB No.', 'MAWB No', 'MAWB') || '—').substring(0, 16)}
                    </td>
                    <td
                      style={{
                        fontWeight: 600,
                        color: isOverdue(eta) ? '#dc2626' : 'inherit',
                      }}
                    >
                      {fmtDate(eta)}
                    </td>
                    <td className="mono">{getField(r, 'B/E No', 'B/E No.') || '—'}</td>
                    <td>
                      <StatusBadge value={getField(r, 'Customs Cleared')} />
                    </td>
                    <td>{fmtDate(getField(r, 'Duty Advised ', 'Duty Advised'))}</td>
                    <td>{fmtDate(getField(r, 'Duty Received'))}</td>
                    <td>{getField(r, 'Consol', 'Forwarder') || '—'}</td>
                    <td>
                      <span className="badge b-blue">{getField(r, 'Unit', 'Plant') || '—'}</span>
                    </td>
                    <td>
                      <span
                        className="trunc"
                        style={{ maxWidth: 160 }}
                        title={getField(r, 'Remarks') || ''}
                      >
                        {getField(r, 'Remarks') || '—'}
                      </span>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          current={page}
          total={pages}
          totalRows={total}
          onPage={setPage}
        />
      </div>

      {selected && (
        <RecordDetail
          record={selected}
          type="active"
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
