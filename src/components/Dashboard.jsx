import { useMemo, useRef, useState } from 'react';
import KpiCard from './KpiCard';
import StatusBadge from './StatusBadge';
import RecordDetail from './RecordDetail';
import ChartRecordsPanel from './ChartRecordsPanel';
import DashboardCharts from './charts/DashboardCharts';
import { fmtCur, fmtN, fmtDate, getField, isOverdue } from '../utils/format';
import { computeStats } from '../utils/stats';
import {
  emptyFilters,
  filterRecords,
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
}) {
  const fileRef = useRef(null);
  const recordsRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState(emptyFilters());
  const [drilldown, setDrilldown] = useState(null);

  const allRows = useMemo(
    () => [...(activeData || []), ...(deliveredData || [])],
    [activeData, deliveredData]
  );

  const filterOptions = useMemo(
    () => ({
      suppliers: uniqueValues(allRows, (r) => getField(r, 'Supplier')),
      consols: uniqueValues(allRows, (r) => getField(r, 'Consol', 'Forwarder')),
      units: uniqueValues(allRows, (r) => getField(r, 'Unit', 'Plant')),
      statuses: uniqueValues(allRows, (r) =>
        getField(r, 'Customs Cleared', 'Customs Status')
      ),
      ports: uniqueValues(allRows, (r) => getField(r, 'Port Of Loading', 'POL')),
      origins: uniqueValues(allRows, (r) =>
        getField(r, 'Country Of Origin', 'COO')
      ),
      modes: uniqueValues(allRows, (r) => getField(r, 'Mode')),
      months: [
        ...new Set(allRows.map(recordMonth).filter(Boolean)),
      ].sort((a, b) => new Date(a) - new Date(b)),
    }),
    [allRows]
  );

  const filteredActive = useMemo(
    () => filterRecords(activeData, filters),
    [activeData, filters]
  );
  const filteredDelivered = useMemo(
    () => filterRecords(deliveredData, filters),
    [deliveredData, filters]
  );

  const stats = useMemo(
    () => computeStats(filteredActive, filteredDelivered, baseStats.longPending || 0),
    [baseStats.longPending, filteredActive, filteredDelivered]
  );

  const del = stats.delivered || 1;
  const frt = stats.freight || 0;
  const hasFilter = Object.values(filters).some(Boolean);

  const setFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => setFilters(emptyFilters());

  const handleChartClick = (payload) => {
    // Always resolve against the same datasets used to build the charts
    const result = recordsForChartClick(payload, filteredActive, filteredDelivered);
    setDrilldown({
      ...result,
      subtitle: `${result.records.length} record${result.records.length === 1 ? '' : 's'} match this chart value · click a row for full details`,
    });
  };

  const openKpiRecords = (kind) => {
    if (kind === 'active') {
      setDrilldown({
        type: 'active',
        title: 'Active Shipments',
        subtitle: 'All currently filtered active records',
        records: filteredActive,
      });
    } else if (kind === 'delivered') {
      setDrilldown({
        type: 'delivered',
        title: 'Delivered Shipments',
        subtitle: 'All currently filtered delivered records',
        records: filteredDelivered,
      });
    } else if (kind === 'duty') {
      setDrilldown({
        type: 'active',
        title: 'Duty Pending',
        subtitle: 'Active shipments with Filter = DUTY',
        records: filteredActive.filter(
          (r) => String(getField(r, 'Filter') || '').toUpperCase() === 'DUTY'
        ),
      });
    } else if (kind === 'cleared') {
      setDrilldown({
        type: 'active',
        title: 'Customs Cleared',
        subtitle: 'Active shipments with Filter = CLR',
        records: filteredActive.filter(
          (r) => String(getField(r, 'Filter') || '').toUpperCase() === 'CLR'
        ),
      });
    }
  };

  return (
    <div className="pg">
      <div className="pg-head">
        <div>
          <div className="pg-title">Operations Dashboard</div>
          <div className="pg-sub">
            WABCO AIR Freight Daily Report — FY 2026-27 &nbsp;|&nbsp; Data as of{' '}
            {reportDate}
            {hasFilter ? ' · Filters applied' : ''}
          </div>
        </div>
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
            <input
              ref={fileRef}
              type="file"
              accept=".xlsb,.xlsx,.xls"
              style={{ display: 'none' }}
              onChange={onUpload}
            />
          </div>
        </div>
      </div>

      {uploadBanner && (
        <div className="upload-banner">
          <span style={{ fontSize: 15 }}>✅</span>
          <span>{uploadBanner}</span>
        </div>
      )}

      <div className="filter-bar dash-filter-bar">
        <div className="fg-inline">
          <label>Supplier</label>
          <select
            value={filters.supplier}
            onChange={(e) => setFilter('supplier', e.target.value)}
          >
            <option value="">All</option>
            {filterOptions.suppliers.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="fg-inline">
          <label>Forwarder</label>
          <select
            value={filters.consol}
            onChange={(e) => setFilter('consol', e.target.value)}
          >
            <option value="">All</option>
            {filterOptions.consols.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="fg-inline">
          <label>Plant</label>
          <select value={filters.unit} onChange={(e) => setFilter('unit', e.target.value)}>
            <option value="">All</option>
            {filterOptions.units.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="fg-inline">
          <label>Customs</label>
          <select
            value={filters.status}
            onChange={(e) => setFilter('status', e.target.value)}
          >
            <option value="">All</option>
            {filterOptions.statuses.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="fg-inline">
          <label>Port</label>
          <select value={filters.port} onChange={(e) => setFilter('port', e.target.value)}>
            <option value="">All</option>
            {filterOptions.ports.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="fg-inline">
          <label>Origin</label>
          <select
            value={filters.origin}
            onChange={(e) => setFilter('origin', e.target.value)}
          >
            <option value="">All</option>
            {filterOptions.origins.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="fg-inline">
          <label>Mode</label>
          <select value={filters.mode} onChange={(e) => setFilter('mode', e.target.value)}>
            <option value="">All</option>
            {filterOptions.modes.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="fg-inline">
          <label>Month</label>
          <select
            value={filters.month}
            onChange={(e) => setFilter('month', e.target.value)}
          >
            <option value="">All</option>
            {filterOptions.months.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
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
          <KpiCard
            color="org"
            icon="🚢"
            label="Active Shipments"
            value={(stats.active || 0).toLocaleString()}
            trend="▶ Click"
            trendType="neu"
            sub="In-transit & Customs"
          />
        </div>
        <div className="kpi-click" onClick={() => openKpiRecords('delivered')}>
          <KpiCard
            color="grn"
            icon="✅"
            label="Delivered This FY"
            value={(stats.delivered || 0).toLocaleString()}
            trend="▶ Click"
            trendType="up"
            sub="Completed deliveries"
          />
        </div>
        <div className="kpi-click" onClick={() => openKpiRecords('duty')}>
          <KpiCard
            color="red"
            icon="⏳"
            label="Duty Pending"
            value={(stats.duty || 0).toLocaleString()}
            trend="▶ Click"
            trendType="down"
            sub="PCV issued"
          />
        </div>
        <div className="kpi-click" onClick={() => openKpiRecords('cleared')}>
          <KpiCard
            color="blue"
            icon="🛃"
            label="Customs Cleared"
            value={(stats.cleared || 0).toLocaleString()}
            trend="▶ Click"
            trendType="up"
            sub="Awaiting delivery"
          />
        </div>
        <KpiCard
          color="pur"
          icon="⚠️"
          label="Long Pending"
          value={(stats.longPending || 0).toLocaleString()}
          trend="▼ Urgent"
          trendType="down"
          sub="Escalation needed"
        />
        <KpiCard
          color="teal"
          icon="💰"
          label="Total Air Freight"
          value={fmtCur(frt)}
          small
          trend="FY 2026-27"
          trendType="neu"
          sub="INR"
        />
      </div>

      <div className="kpi-grid kpi-grid-sm" style={{ marginBottom: 20 }}>
        <KpiCard
          color="blue"
          label="Total Packages"
          value={(stats.pkgs || 0).toLocaleString('en-IN')}
          sub="Delivered FY"
          compact
        />
        <KpiCard
          color="grn"
          label="Total Weight"
          value={fmtN(stats.weight || 0) + ' kg'}
          sub="Delivered FY"
          compact
        />
        <KpiCard
          color="org"
          label="Avg Freight / Shipment"
          value={'₹' + Math.round(frt / del).toLocaleString('en-IN')}
          sub="Per delivery"
          compact
        />
        <KpiCard
          color="pur"
          label="Active Suppliers"
          value={(stats.suppliers || 0).toLocaleString()}
          sub="Unique vendors"
          compact
        />
      </div>

      <DashboardCharts stats={stats} onChartClick={handleChartClick} />

      <div className="table-card" ref={recordsRef}>
        <div className="table-head">
          <h3>
            🚚 Recent Active Shipments
            {hasFilter ? ` (${filteredActive.length} filtered)` : ''}
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
                <th>Job No.</th>
                <th>Date</th>
                <th>Supplier</th>
                <th>ETA MAA</th>
                <th>Forwarder</th>
                <th>Customs Status</th>
                <th>Remarks</th>
                <th>Plant</th>
              </tr>
            </thead>
            <tbody>
              {filteredActive.slice(0, 12).map((r, i) => {
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
                      <span className="trunc" title={getField(r, 'Supplier') || ''}>
                        {getField(r, 'Supplier') || '—'}
                      </span>
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
                      <span
                        className="trunc"
                        style={{ maxWidth: 160 }}
                        title={getField(r, 'Remarks') || ''}
                      >
                        {getField(r, 'Remarks') || '—'}
                      </span>
                    </td>
                    <td>
                      <span className="badge b-blue">
                        {getField(r, 'Unit', 'Plant') || '—'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredActive.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}
                  >
                    No active shipments match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <RecordDetail
          record={selected}
          type="active"
          onClose={() => setSelected(null)}
        />
      )}

      {drilldown && (
        <ChartRecordsPanel
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
