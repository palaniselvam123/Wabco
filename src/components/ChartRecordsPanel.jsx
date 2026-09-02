import { useEffect, useState } from 'react';
import StatusBadge from './StatusBadge';
import RecordDetail from './RecordDetail';
import { fmtDate, fmtMoney, getField, isOverdue } from '../utils/format';
import { exportCSV } from '../utils/csv';

export default function ChartRecordsPanel({
  title,
  subtitle,
  records,
  type = 'delivered',
  canExport = false,
  onClose,
}) {
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !selected) onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose, selected]);

  return (
    <div className="chart-records" role="dialog" aria-modal="true">
      <div className="chart-records-bar">
        <button type="button" className="btn-sm btn-outline record-back" onClick={onClose}>
          ← Back to dashboard
        </button>
        <div className="chart-records-bar-main">
          <div className="record-detail-kicker">📊 Chart drill-down</div>
          <h1 className="record-detail-title">{title}</h1>
          {subtitle && <p className="record-detail-sub">{subtitle}</p>}
        </div>
        <div className="record-detail-bar-meta">
          <span className="badge b-blue">{records.length} records</span>
          {canExport && (
            <button
              type="button"
              className="btn-sm btn-grn"
              onClick={() => exportCSV(records, type === 'active' ? 'active' : 'delivered')}
              disabled={!records.length}
            >
              ⬇ Export CSV
            </button>
          )}
          <button type="button" className="record-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
      </div>

      <div className="chart-records-body">
        <div className="table-card" style={{ margin: 0 }}>
          <div className="table-head">
            <h3>Matching Excel records</h3>
            <div className="table-actions">
              <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                Click a row for full details
              </span>
            </div>
          </div>
          <div className="table-wrap">
            {type === 'active' ? (
              <table>
                <thead>
                  <tr>
                    <th>Job No.</th>
                    <th>Date</th>
                    <th>Supplier</th>
                    <th>ETA MAA</th>
                    <th>Forwarder</th>
                    <th>Customs Status</th>
                    <th>Plant</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: 28, color: 'var(--muted)' }}>
                        No matching records for this chart segment.
                      </td>
                    </tr>
                  ) : (
                    records.map((r, i) => {
                      const jobNo = getField(r, 'Job No ', 'Job No', 'Job');
                      const eta = getField(r, 'Eta Maa', 'ETA MAA');
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
                          <td
                            style={{
                              fontWeight: 600,
                              color: isOverdue(eta) ? '#dc2626' : 'inherit',
                            }}
                          >
                            {fmtDate(eta)}
                          </td>
                          <td>{getField(r, 'Consol', 'Forwarder') || '—'}</td>
                          <td>
                            <StatusBadge value={getField(r, 'Customs Cleared')} />
                          </td>
                          <td>
                            <span className="badge b-blue">
                              {getField(r, 'Unit', 'Plant') || '—'}
                            </span>
                          </td>
                          <td>
                            <span className="trunc" style={{ maxWidth: 180 }}>
                              {getField(r, 'Remarks') || '—'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Job No.</th>
                    <th>Delivered Date</th>
                    <th>Supplier</th>
                    <th>Material</th>
                    <th className="tr">Qty</th>
                    <th>Forwarder</th>
                    <th>Port</th>
                    <th>Plant</th>
                    <th className="tr">FRT</th>
                  </tr>
                </thead>
                <tbody>
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: 28, color: 'var(--muted)' }}>
                        No matching records for this chart segment.
                      </td>
                    </tr>
                  ) : (
                    records.map((r, i) => {
                      const jobNo = getField(r, 'Job No ', 'Job No', 'Job');
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
                          <td>
                            {fmtDate(
                              getField(r, 'Wabco Delevered Date', 'Wabco Delivered Date')
                            )}
                          </td>
                          <td>
                            <span className="trunc">{getField(r, 'Supplier') || '—'}</span>
                          </td>
                          <td>
                            <span className="trunc">
                              {getField(r, 'Material Description', 'Material') || '—'}
                            </span>
                          </td>
                          <td className="tr">
                            {getField(r, 'Qty') != null
                              ? Number(getField(r, 'Qty')).toLocaleString()
                              : '—'}
                          </td>
                          <td>{getField(r, 'Consol', 'Forwarder') || '—'}</td>
                          <td>{getField(r, 'Port Of Loading') || '—'}</td>
                          <td>
                            <span className="badge b-blue">
                              {getField(r, 'Unit', 'Plant') || '—'}
                            </span>
                          </td>
                          <td className="tr" style={{ fontWeight: 600 }}>
                            {fmtMoney(getField(r, 'FRT'))}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {selected && (
        <RecordDetail
          record={selected}
          type={type}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
