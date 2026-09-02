import { useMemo, useState } from 'react';
import DataTable from './DataTable';
import StatusBadge from './StatusBadge';
import RecordDetail from './RecordDetail';
import { fmtDate, getField, isOverdue } from '../utils/format';
import { exportCSV } from '../utils/csv';

/** BE filed > 2 days ago with no OOC date yet */
function beOverdue(r) {
  const ooc = getField(r, 'OOC DATE', 'OOC Date', 'Customs Cleared');
  const beDate = getField(r, 'B/E Date', 'BE Date');
  if (!beDate) return false;
  if (ooc && String(ooc).trim() !== '' && String(ooc).trim() !== '-') return false;
  const bd = new Date(beDate);
  return !isNaN(bd) && (new Date() - bd) / 86400000 >= 2;
}

export default function ActiveShipments({ activeData, onNavigate }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const rows = useMemo(() => {
    if (!search) return activeData;
    const q = search.toLowerCase();
    return activeData.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
  }, [activeData, search]);

  const columns = useMemo(
    () => [
      {
        key: 'jobNo',
        label: 'Job No.',
        get: (r) => getField(r, 'Job No ', 'Job No', 'Job'),
        render: (r, v) => <span className="mono" style={{ color: '#1d4ed8' }}>{v || '—'}</span>,
      },
      { key: 'date', label: 'Date', type: 'date', get: (r) => getField(r, 'Date'), render: (r, v) => fmtDate(v) },
      {
        key: 'supplier',
        label: 'Supplier',
        get: (r) => getField(r, 'Supplier'),
        render: (r, v) => <span className="trunc" title={v || ''}>{v || '—'}</span>,
      },
      {
        key: 'part',
        label: 'Part No.',
        get: (r) => getField(r, 'Part No', 'Part No.'),
        render: (r, v) => <span className="mono">{v || '—'}</span>,
      },
      {
        key: 'material',
        label: 'Material',
        get: (r) => getField(r, 'Material Description', 'Material'),
        render: (r, v) => <span className="trunc" style={{ maxWidth: 150 }} title={v || ''}>{v || '—'}</span>,
      },
      {
        key: 'qty',
        label: 'Qty',
        type: 'number',
        align: 'right',
        get: (r) => getField(r, 'Qty', 'Quantity'),
        render: (r, v) => (v != null && v !== '' ? Number(v).toLocaleString() : '—'),
      },
      {
        key: 'mbl',
        label: 'MBL/MAWB',
        get: (r) => getField(r, 'MAWB No.', 'MAWB No', 'MAWB', 'MBL NO', 'MBL No'),
        render: (r, v) => <span className="mono">{v ? String(v).substring(0, 16) : '—'}</span>,
      },
      { key: 'port', label: 'Port', get: (r) => getField(r, 'Port Of Loading', 'POL') },
      {
        key: 'mode',
        label: 'Mode',
        get: (r) => getField(r, 'Mode'),
        render: (r, v) => (v ? <span className="badge b-blue" style={{ fontSize: 11 }}>{v}</span> : '—'),
      },
      { key: 'lclfcl', label: 'LCL/FCL', get: (r) => getField(r, 'LCL/FCL', 'Load Type') },
      { key: 'country', label: 'Country', get: (r) => getField(r, 'Country Of Origin', 'COO') },
      {
        key: 'eta',
        label: 'ETA MAA',
        type: 'date',
        get: (r) => getField(r, 'Eta Maa', 'ETA MAA'),
        render: (r, v) => (
          <span style={{ fontWeight: 600, color: isOverdue(v) ? '#dc2626' : 'inherit' }}>
            {fmtDate(v)}
          </span>
        ),
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
        render: (r, v) => {
          const late = beOverdue(r);
          if (v && String(v).trim() !== '-') {
            return <span style={{ fontWeight: 600 }}>{fmtDate(v)}</span>;
          }
          return late ? <span style={{ fontWeight: 700, color: '#ea580c' }}>⚠ Overdue</span> : '—';
        },
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
      {
        key: 'cfs',
        label: 'CFS Name',
        get: (r) => getField(r, 'CFS', 'CFS Name'),
        render: (r, v) => <span className="trunc" style={{ maxWidth: 110, fontSize: 12 }}>{v || '—'}</span>,
      },
      { key: 'dutyAdv', label: 'Duty Advised', type: 'date', get: (r) => getField(r, 'Duty Advised ', 'Duty Advised'), render: (r, v) => fmtDate(v) },
      { key: 'dutyRec', label: 'Duty Received', type: 'date', get: (r) => getField(r, 'Duty Received'), render: (r, v) => fmtDate(v) },
      { key: 'consol', label: 'Forwarder', get: (r) => getField(r, 'Consol', 'Forwarder') },
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
        render: (r, v) => <span className="trunc" style={{ maxWidth: 150 }} title={v || ''}>{v || '—'}</span>,
      },
    ],
    []
  );

  return (
    <div className="pg">
      <div className="pg-head">
        <div>
          <div className="pg-title">Active Shipments — Detailed View</div>
          <div className="pg-sub">All in-transit and customs clearance shipments</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-sm btn-grn" onClick={() => exportCSV(rows, 'active')}>
            ⬇ Export CSV
          </button>
          <button className="btn-sm btn-outline" onClick={() => onNavigate('dashboard')}>
            ← Dashboard
          </button>
        </div>
      </div>

      <DataTable
        title="Active Shipments"
        columns={columns}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Job No / Part / Invoice…"
        onRowClick={setSelected}
        rowStyle={(r) =>
          beOverdue(r)
            ? { background: 'rgba(251,146,60,.12)', borderLeft: '3px solid #f97316' }
            : undefined
        }
      />

      {selected && (
        <RecordDetail record={selected} type="active" onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
