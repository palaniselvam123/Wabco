import { useMemo, useRef, useState } from 'react';
import KpiCard from './KpiCard';
import MultiFilter from './MultiFilter';
import StatusBadge from './StatusBadge';
import RecordDetail from './RecordDetail';
import ChartRecordsPanel from './ChartRecordsPanel';
import DashboardCharts from './charts/DashboardCharts';
import { fmtCur, fmtN, fmtDate, getField, isOverdue } from '../utils/format';
import { computeStats } from '../utils/stats';
import {
  emptyFilters,
  filterRecords,
  hasActiveFilters,
  recordMonth,
  recordsForChartClick,
  uniqueValues,
} from '../utils/filters';

export default function Dashboard({
  stats: baseStats,
  activeData,
  deliveredData = [],
  reportDate,
  uploadBanner,
  onUpload,
  onNavigate,
  canUpload = false,
  canExport = false,
}) {
  const fileRef = useRef(null);
  const recordsRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState(emptyFilters());
  const [drilldown, setDrilldown] = useState(null);
  const [tableSortCol, setTableSortCol] = useState(null);
  const [tableSortAsc, setTableSortAsc] = useState(true);

  const allRows = useMemo(
    () => [...(activeData || []), ...(deliveredData || [])],
    [activeData, deliveredData]
  );

  const filterOptions = useMemo(
    () => ({
      suppliers: uniqueValues(allRows, (r) => getField(r, 'Supplier')),
      consols: uniqueValues(allRows, (r) => getField(r, 'Consol', 'Forwarder')),
      units: uniqueValues(allRows, (r) => getField(r, 'Unit', 'Plant')),
      statuses: uniqueValues(allRows, (r) => getField(r, 'Customs Cleared', 'Customs Status')),
      ports: uniqueValues(allRows, (r) => getField(r, 'Port Of Loading', 'POL')),
      origins: uniqueValues(allRows, (r) => getField(r, 'Country Of Origin', 'COO')),
      lclFcls: uniqueValues(allRows, (r) => getField(r, 'LCL/FCL', 'Load Type')),
      months: [...new Set(allRows.map(recordMonth).filter(Boolean))].sort((a, b) => new Date(a) - new Date(b)),
    }),
    [allRows]
  );

  const filteredActive = useMemo(() => filterRecords(activeData, filters), [activeData, filters]);
  const filteredDelivered = useMemo(() => filterRecords(deliveredData, filters), [deliveredData, filters]);

  const stats = useMemo(
    () => computeStats(filteredActive, filteredDelivered, baseStats.longPending || 0),
    [baseStats.longPending, filteredActive, filteredDelivered]
  );

  const anyFilter = hasActiveFilters(filters);

  const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));
  const clearFilters = () => setFilters(emptyFilters());

  const handleChartClick = (payload) => {
    const result = recordsForChartClick(payload, filteredActive, filteredDelivered);
    setDrilldown({
      ...result,
      subtitle: `${result.records.length} record${result.records.length === 1 ? '' : 's'} match this chart value · click a row for full details`,
    });
  };

  const openKpiRecords = (kind) => {
    if (kind === 'active') {
      setDrilldown({ type: 'active', title: 'Active Shipments', subtitle: 'All currently filtered active records', records: filteredActive });
    } else if (kind === 'delivered') {
      setDrilldown({ type: 'delivered', title: 'Delivered Shipments', subtitle: 'All currently filtered delivered records', records: filteredDelivered });
    } else if (kind === 'duty') {
      setDrilldown({ type: 'active', title: 'Duty Pending', subtitle: 'Active shipments with Filter = DUTY', records: filteredActive.filter((r) => String(getField(r, 'Filter') || '').toUpperCase() === 'DUTY') });
    } else if (kind === 'cleared') {
      setDrilldown({ type: 'active', title: 'Customs Cleared', subtitle: 'Active shipments with Filter = CLR', records: filteredActive.filter((r) => String(getField(r, 'Filter') || '').toUpperCase() === 'CLR') });
    } else if (kind === 'dutyNotPaid') {
      setDrilldown({ type: 'active', title: 'Duty Not Paid', subtitle: 'Shipments with no OOC Date recorded', records: filteredActive.filter((r) => { const ooc = getField(r, 'OOC DATE', 'OOC Date', 'Customs Cleared'); return !ooc || String(ooc).trim() === '' || String(ooc).trim() === '-'; }) });
    } else if (kind === 'beFiledNoOoc') {
      const today = new Date();
      setDrilldown({ type: 'active', title: 'BE Filed — OOC Overdue', subtitle: 'B/E filed more than 2 days ago with no OOC Date', records: filteredActive.filter((r) => { const beDate = getField(r, 'B/E Date', 'BE Date'); const ooc = getField(r, 'OOC DATE', 'OOC Date', 'Customs Cleared'); if (!beDate || (ooc && String(ooc).trim() !== '' && String(ooc).trim() !== '-')) return false; const bd = new Date(beDate); return !isNaN(bd) && (today - bd) / 86400000 >= 2; }) });
    } else if (kind === 'etaToday') {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      setDrilldown({ type: 'active', title: 'ETA Today', subtitle: 'Active shipments arriving today', records: filteredActive.filter((r) => { const v = getField(r, 'Eta Maa', 'ETA MAA'); if (!v) return false; const d = new Date(v); d.setHours(0, 0, 0, 0); return !isNaN(d) && d.getTime() === todayStart.getTime(); }) });
    } else if (kind === 'etaThisWeek') {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(todayStart); weekEnd.setDate(todayStart.getDate() + 7);
      setDrilldown({ type: 'active', title: 'ETA This Week', subtitle: 'Active shipments arriving within 7 days', records: filteredActive.filter((r) => { const v = getField(r, 'Eta Maa', 'ETA MAA'); if (!v) return false; const d = new Date(v); d.setHours(0, 0, 0, 0); return !isNaN(d) && d >= todayStart && d < weekEnd; }) });
    }
  };

  // Dashboard table sort
  const tableSort = (col) => {
    if (tableSortCol === col) setTableSortAsc((a) => !a);
    else { setTableSortCol(col); setTableSortAsc(true); }
  };

  const tableRows = useMemo(() => {
    let rows = [...filteredActive];
    if (tableSortCol) {
      rows.sort((a, b) => {
        const av = getField(a, tableSortCol) || a[tableSortCol] || '';
        const bv = getField(b, tableSortCol) || b[tableSortCol] || '';
        const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
        return tableSortAsc ? cmp : -cmp;
      });
    }
    return rows.slice(0, 15);
  }, [filteredActive, tableSortCol, tableSortAsc]);

  const colFilter = (key, opts) => (
    <MultiFilter options={opts} selected={filters[key] || []} onChange={(v) => setFilter(key, v)} dark align="right" />
  );

  const sortTh = (label, col, filterNode) => {
    const active = tableSortCol === col;
    return (
      <th
        onClick={() => tableSort(col)}
        style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
          {label}
          <span style={{ opacity: active ? 1 : 0.35, fontSize: 10 }}>
            {active ? (tableSortAsc ? '▲' : '▼') : '↕'}
          </span>
          {filterNode && <span onClick={(e) => e.stopPropagation()}>{filterNode}</span>}
        </span>
      </th>
    );
  };

  return (
    <div className="pg">
      <div className="pg-head">
        <div>
          <div className="pg-title">Operations Dashboard</div>
          <div className="pg-sub">
            ZF India Logistics Daily Report — Air &amp; Sea &nbsp;|&nbsp; Data as of {reportDate}
            {anyFilter ? ' · Filters applied' : ''}
          </div>
        </div>
        {canUpload && (
          <div className="upload-chip">
            <div className="upload-chip-icon">📤</div>
            <div>
              <h4>Upload DSR Report</h4>
              <p>Accepts .xlsb / .xlsx / .xls</p>
            </div>
            <div style={{ marginLeft: 10 }}>
              <button className="btn-upload" onClick={() => fileRef.current?.click()}>
                📂 Browse File
              </button>
              <input ref={fileRef} type="file" accept=".xlsb,.xlsx,.xls" style={{ display: 'none' }} onChange={onUpload} />
            </div>
          </div>
        )}
      </div>

      {uploadBanner && (
        <div className="upload-banner">
          <span style={{ fontSize: 15 }}>✅</span>
          <span>{uploadBanner}</span>
        </div>
      )}

      <div className="filter-bar dash-filter-bar">
        {[
          { label: 'Supplier', key: 'supplier', opts: filterOptions.suppliers },
          { label: 'Forwarder', key: 'consol', opts: filterOptions.consols },
          { label: 'Plant', key: 'unit', opts: filterOptions.units },
          { label: 'Customs', key: 'status', opts: filterOptions.statuses },
          { label: 'Port', key: 'port', opts: filterOptions.ports },
          { label: 'Origin', key: 'origin', opts: filterOptions.origins },
          { label: 'LCL / FCL', key: 'lclFcl', opts: filterOptions.lclFcls },
          { label: 'Month', key: 'month', opts: filterOptions.months },
        ].map(({ label, key, opts }) => (
          <div className="fg-inline" key={key}>
            <label>{label}</label>
            <MultiFilter
              options={opts}
              selected={filters[key] || []}
              onChange={(v) => setFilter(key, v)}
            />
          </div>
        ))}
        <div className="fg-inline">
          <label>Search</label>
          <input
            placeholder="Job / Part / Invoice…"
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
          />
        </div>
        <button className="btn-sm btn-outline" onClick={clearFilters}>
          ✕ Clear
        </button>
      </div>

      <div className="chart-hint">
        💡 Click any KPI or chart segment to open the underlying Excel records.
      </div>

      <div className="kpi-grid">
        <div className="kpi-click" onClick={() => openKpiRecords('active')}>
          <KpiCard color="org" icon="🚢" label="Active Shipments" value={(stats.active || 0).toLocaleString()} trend="▶ Click" trendType="neu" sub="In-transit & Customs" />
        </div>
        <div className="kpi-click" onClick={() => openKpiRecords('delivered')}>
          <KpiCard color="grn" icon="✅" label="Delivered This FY" value={(stats.delivered || 0).toLocaleString()} trend="▶ Click" trendType="up" sub="Completed deliveries" />
        </div>
        <div className="kpi-click" onClick={() => openKpiRecords('duty')}>
          <KpiCard color="red" icon="⏳" label="Duty Pending" value={(stats.duty || 0).toLocaleString()} trend="▶ Click" trendType="down" sub="PCV issued" />
        </div>
        <div className="kpi-click" onClick={() => openKpiRecords('cleared')}>
          <KpiCard color="blue" icon="🛃" label="Customs Cleared" value={(stats.cleared || 0).toLocaleString()} trend="▶ Click" trendType="up" sub="Awaiting delivery" />
        </div>
        <KpiCard color="pur" icon="⚠️" label="Long Pending" value={(stats.longPending || 0).toLocaleString()} trend="▼ Urgent" trendType="down" sub="Escalation needed" />
        <div className="kpi-click" onClick={() => openKpiRecords('dutyNotPaid')}>
          <KpiCard color="red" icon="🚫" label="Duty Not Paid" value={(stats.dutyNotPaid || 0).toLocaleString()} trend="▶ Click" trendType="down" sub="OOC Date missing" />
        </div>
      </div>

      <div className="kpi-grid kpi-grid-sm" style={{ marginBottom: 20 }}>
        <KpiCard color="blue" label="Total Packages" value={(stats.pkgs || 0).toLocaleString('en-IN')} sub="Delivered FY" compact />
        <KpiCard color="grn" label="Total Weight" value={fmtN(stats.weight || 0) + ' kg'} sub="Delivered FY" compact />
        <div className="kpi-click" onClick={() => openKpiRecords('beFiledNoOoc')}>
          <KpiCard color="org" label="BE Filed, No OOC > 2 Days" value={(stats.beFiledNoOoc || 0).toLocaleString()} sub="Clearance overdue" compact />
        </div>
        <KpiCard color="teal" label="Total Duty (CFS Cost)" value={fmtCur(stats.totalDuty || 0)} sub="INR — all records" compact />
        <KpiCard color="pur" label="Active Suppliers" value={(stats.suppliers || 0).toLocaleString()} sub="Unique vendors" compact />
        <div className="kpi-click" onClick={() => openKpiRecords('etaToday')}>
          <KpiCard color="blue" label="Today ETA" value={(stats.etaToday || 0).toLocaleString()} sub="Arriving today" compact />
        </div>
        <div className="kpi-click" onClick={() => openKpiRecords('etaThisWeek')}>
          <KpiCard color="grn" label="This Week ETA" value={(stats.etaThisWeek || 0).toLocaleString()} sub="Arriving in 7 days" compact />
        </div>
      </div>

      <DashboardCharts stats={stats} onChartClick={handleChartClick} />

      {/* ── Active Shipments mini table with sort + column filters ── */}
      <div className="table-card" ref={recordsRef}>
        <div className="table-head">
          <h3>
            🚚 Recent Active Shipments
            {anyFilter ? ` (${filteredActive.length} filtered)` : ''}
          </h3>
          <div className="table-actions">
            <button className="btn-sm btn-outline" onClick={() => onNavigate('details')}>
              View All Active →
            </button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {sortTh('Job No.', 'Job No ')}
                {sortTh('Date', 'Date')}
                {sortTh('Supplier', 'Supplier', colFilter('supplier', filterOptions.suppliers))}
                {sortTh('ETA MAA', 'Eta Maa')}
                {sortTh('Forwarder', 'Consol', colFilter('consol', filterOptions.consols))}
                {sortTh('Shipment Status', 'Customs Cleared', colFilter('status', filterOptions.statuses))}
                {sortTh('Remarks', 'Remarks')}
                {sortTh('Plant', 'Unit', colFilter('unit', filterOptions.units))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r, i) => {
                const jobNo = getField(r, 'Job No ', 'Job No', 'Job');
                const eta = getField(r, 'Eta Maa', 'ETA MAA');
                return (
                  <tr
                    key={jobNo || i}
                    className="clickable-row"
                    tabIndex={0}
                    onClick={() => setSelected(r)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(r); } }}
                  >
                    <td><span className="mono" style={{ color: '#1d4ed8' }}>{jobNo || '—'}</span></td>
                    <td>{fmtDate(getField(r, 'Date'))}</td>
                    <td><span className="trunc" title={getField(r, 'Supplier') || ''}>{getField(r, 'Supplier') || '—'}</span></td>
                    <td style={{ fontWeight: 600, color: isOverdue(eta) ? '#dc2626' : 'inherit' }}>{fmtDate(eta)}</td>
                    <td>{getField(r, 'Consol', 'Forwarder') || '—'}</td>
                    <td><StatusBadge value={getField(r, 'Customs Cleared')} /></td>
                    <td><span className="trunc" style={{ maxWidth: 160 }} title={getField(r, 'Remarks') || ''}>{getField(r, 'Remarks') || '—'}</span></td>
                    <td><span className="badge b-blue">{getField(r, 'Unit', 'Plant') || '—'}</span></td>
                  </tr>
                );
              })}
              {filteredActive.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>
                    No active shipments match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <RecordDetail record={selected} type="active" onClose={() => setSelected(null)} />
      )}

      {drilldown && (
        <ChartRecordsPanel
          canExport={canExport}
          title={drilldown.title}
          subtitle={drilldown.subtitle}
          records={drilldown.records}
          type={drilldown.type}
          onClose={() => setDrilldown(null)}
        />
      )}
    </div>
  );
}
