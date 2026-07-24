import { useMemo, useState } from 'react';
import Pagination from './Pagination';
import RecordDetail from './RecordDetail';
import { PAGE_SIZE } from '../data/defaults';
import { fmtDate, fmtMoney } from '../utils/format';
import { exportCSV } from '../utils/csv';

function unique(arr, fn) {
  return [...new Set(arr.map(fn).filter(Boolean))].sort();
}

export default function DeliveredShipments({ deliveredData, onNavigate }) {
  const [supplier, setSupplier] = useState('');
  const [unit, setUnit] = useState('');
  const [consol, setConsol] = useState('');
  const [month, setMonth] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  const suppliers = useMemo(
    () => unique(deliveredData, (r) => r['Supplier']),
    [deliveredData]
  );
  const units = useMemo(() => unique(deliveredData, (r) => r['Unit']), [deliveredData]);
  const consols = useMemo(
    () => unique(deliveredData, (r) => r['Consol']),
    [deliveredData]
  );
  const months = useMemo(() => {
    return [
      ...new Set(
        deliveredData
          .map((r) => {
            const dv = r['Wabco Delevered Date'] || r['Date'];
            if (!dv) return null;
            const d = new Date(dv);
            if (isNaN(d)) return null;
            return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
          })
          .filter(Boolean)
      ),
    ].sort((a, b) => new Date(a) - new Date(b));
  }, [deliveredData]);

  const filtered = useMemo(() => {
    return deliveredData.filter((r) => {
      if (supplier && r['Supplier'] !== supplier) return false;
      if (unit && r['Unit'] !== unit) return false;
      if (consol && r['Consol'] !== consol) return false;
      if (month) {
        const dv = r['Wabco Delevered Date'] || r['Date'];
        if (!dv) return false;
        const d = new Date(dv);
        if (isNaN(d)) return false;
        if (d.toLocaleString('en-US', { month: 'short', year: 'numeric' }) !== month)
          return false;
      }
      if (search && !JSON.stringify(r).toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [deliveredData, supplier, unit, consol, month, search]);

  const total = filtered.length;
  const pages = Math.ceil(total / PAGE_SIZE) || 1;
  const start = (page - 1) * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, total);
  const pageRows = filtered.slice(start, end);

  const clearFilters = () => {
    setSupplier('');
    setUnit('');
    setConsol('');
    setMonth('');
    setSearch('');
    setPage(1);
  };

  return (
    <div className="pg">
      <div className="pg-head">
        <div>
          <div className="pg-title">Delivered Shipments — Complete Record</div>
          <div className="pg-sub">All completed deliveries in FY 2026-27</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn-sm btn-grn"
            onClick={() => exportCSV(filtered, 'delivered')}
          >
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
          <label>Month</label>
          <select
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All</option>
            {months.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="fg-inline">
          <label>Search</label>
          <input
            placeholder="Job No / Supplier…"
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
          <h3>Delivered Shipments ({total})</h3>
          <div className="table-actions">
            <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
              Click a row for full details
            </span>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Job No.</th>
                <th>Delivered Date</th>
                <th>Supplier</th>
                <th>Material</th>
                <th className="tr">Qty</th>
                <th>Forwarder</th>
                <th>Port of Loading</th>
                <th>B/E No.</th>
                <th>Plant</th>
                <th className="tr">FRT (INR)</th>
                <th className="tr">EX (INR)</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}
                  >
                    No records match the filters.
                  </td>
                </tr>
              ) : (
                pageRows.map((r, i) => (
                  <tr
                    key={r['Job No '] || i}
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
                        {r['Job No '] || '—'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>
                      {fmtDate(r['Wabco Delevered Date'])}
                    </td>
                    <td>
                      <span className="trunc">{r['Supplier'] || '—'}</span>
                    </td>
                    <td>
                      <span className="trunc">{r['Material Description'] || '—'}</span>
                    </td>
                    <td className="tr">
                      {r['Qty'] != null ? Number(r['Qty']).toLocaleString() : '—'}
                    </td>
                    <td>{r['Consol'] || '—'}</td>
                    <td>{r['Port Of Loading'] || '—'}</td>
                    <td className="mono">{r['B/E No'] || '—'}</td>
                    <td>
                      <span className="badge b-blue">{r['Unit'] || '—'}</span>
                    </td>
                    <td
                      className="tr"
                      style={{ fontWeight: 600, color: 'var(--primary)' }}
                    >
                      {fmtMoney(r['FRT'])}
                    </td>
                    <td className="tr">{fmtMoney(r['EX'])}</td>
                  </tr>
                ))
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
          type="delivered"
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
