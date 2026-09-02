import { useMemo, useState } from 'react';
import DataTable from './DataTable';
import StatusBadge from './StatusBadge';
import RecordDetail from './RecordDetail';
import { fmtDate, getField } from '../utils/format';
import { exportCSV } from '../utils/csv';

function monthOf(r) {
  const dv = getField(r, 'Wabco Delevered Date', 'Wabco Delivered Date') || getField(r, 'Date');
  if (!dv) return '';
  const d = new Date(dv);
  return isNaN(d) ? '' : d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

export default function DeliveredShipments({ deliveredData, onNavigate, canExport = false }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const rows = useMemo(() => {
    if (!search) return deliveredData;
    const q = search.toLowerCase();
    return deliveredData.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
  }, [deliveredData, search]);

  const columns = useMemo(
    () => [
      {
        key: 'jobNo',
        label: 'Job No.',
        get: (r) => getField(r, 'Job No ', 'Job No', 'Job'),
        render: (r, v) => <span className="mono" style={{ color: '#1d4ed8' }}>{v || '—'}</span>,
      },
      {
        key: 'delivered',
        label: 'Delivered Date',
        type: 'date',
        get: (r) => getField(r, 'Wabco Delevered Date', 'Wabco Delivered Date'),
        render: (r, v) => <span style={{ fontWeight: 500 }}>{fmtDate(v)}</span>,
      },
      { key: 'month', label: 'Month', get: monthOf },
      { key: 'date', label: 'Job Date', type: 'date', get: (r) => getField(r, 'Date'), render: (r, v) => fmtDate(v) },
      {
        key: 'supplier',
        label: 'Supplier',
        get: (r) => getField(r, 'Supplier'),
        render: (r, v) => <span className="trunc" title={v || ''}>{v || '—'}</span>,
      },
      {
        key: 'material',
        label: 'Material',
        get: (r) => getField(r, 'Material Description', 'Material'),
        render: (r, v) => <span className="trunc" style={{ maxWidth: 160 }} title={v || ''}>{v || '—'}</span>,
      },
      {
        key: 'part',
        label: 'Part No.',
        get: (r) => getField(r, 'Part No', 'Part No.'),
        render: (r, v) => <span className="mono">{v || '—'}</span>,
      },
      {
        key: 'qty',
        label: 'Qty',
        type: 'number',
        align: 'right',
        get: (r) => getField(r, 'Qty', 'Quantity'),
        render: (r, v) => (v != null && v !== '' ? Number(v).toLocaleString() : '—'),
      },
      { key: 'consol', label: 'Forwarder', get: (r) => getField(r, 'Consol', 'Forwarder') },
      { key: 'port', label: 'Port of Loading', get: (r) => getField(r, 'Port Of Loading', 'POL') },
      { key: 'country', label: 'Country', get: (r) => getField(r, 'Country Of Origin', 'COO') },
      {
        key: 'mode',
        label: 'Mode',
        get: (r) => getField(r, 'Mode'),
        render: (r, v) => (v ? <span className="badge b-blue" style={{ fontSize: 11 }}>{v}</span> : '—'),
      },
      { key: 'lclfcl', label: 'LCL/FCL', get: (r) => getField(r, 'LCL/FCL', 'Load Type') },
      {
        key: 'eta',
        label: 'ETA MAA',
        type: 'date',
        get: (r) => getField(r, 'Eta Maa', 'ETA MAA'),
        render: (r, v) => fmtDate(v),
      },
      {
        key: 'beNo',
        label: 'B/E No.',
        get: (r) => getField(r, 'B/E No', 'B/E No.'),
        render: (r, v) => <span className="mono">{v || '—'}</span>,
      },
      { key: 'beDate', label: 'B/E Date', type: 'date', get: (r) => getField(r, 'B/E Date', 'BE Date'), render: (r, v) => fmtDate(v) },
      {
        key: 'status',
        label: 'Shipment Status',
        get: (r) => getField(r, 'Customs Cleared', 'Customs Status'),
        render: (r, v) => <StatusBadge value={v} />,
      },
      {
        key: 'ooc',
        label: 'OOC Date',
        type: 'date',
        get: (r) => getField(r, 'OOC DATE', 'OOC Date'),
        render: (r, v) => fmtDate(v),
      },
      {
        key: 'duty',
        label: 'Duty (INR)',
        type: 'number',
        align: 'right',
        get: (r) => getField(r, 'Duty Amount', 'Duty'),
        render: (r, v) => (
          <span className="mono" style={{ fontSize: 12 }}>
            {v ? '₹' + Number(v).toLocaleString('en-IN') : '—'}
          </span>
        ),
      },
      { key: 'cfs', label: 'CFS Name', get: (r) => getField(r, 'CFS', 'CFS Name') },
      {
        key: 'plant',
        label: 'Plant',
        get: (r) => getField(r, 'Unit', 'Plant'),
        render: (r, v) => <span className="badge b-blue">{v || '—'}</span>,
      },
      {
        key: 'remarks',
        label: 'Remarks',
        get: (r) => getField(r, 'Remarks'),
        render: (r, v) => <span className="trunc" style={{ maxWidth: 160 }} title={v || ''}>{v || '—'}</span>,
      },
    ],
    []
  );

  return (
    <div className="pg">
      <div className="pg-head">
        <div>
          <div className="pg-title">Delivered Shipments — Complete Record</div>
          <div className="pg-sub">All completed deliveries in FY 2026-27</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canExport && (
            <button className="btn-sm btn-grn" onClick={() => exportCSV(rows, 'delivered')}>
              ⬇ Export CSV
            </button>
          )}
          <button className="btn-sm btn-outline" onClick={() => onNavigate('dashboard')}>
            ← Dashboard
          </button>
        </div>
      </div>

      <DataTable
        title="Delivered Shipments"
        columns={columns}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Job No / Supplier / Part…"
        onRowClick={setSelected}
      />

      {selected && (
        <RecordDetail record={selected} type="delivered" onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
