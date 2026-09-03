import { useEffect, useState } from 'react';
import EtaCalendar from './EtaCalendar';
import { createPortal } from 'react-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  LineElement,
  LineController,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Chart, Bar, Doughnut, Line } from 'react-chartjs-2';
import { DEF } from '../../data/defaults';
import { lockScroll, unlockScroll } from '../../utils/scrollLock';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  LineElement,
  LineController,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartDataLabels
);

const PALETTE = {
  multi: ['#0d1f3c', '#f07c2c', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#14b8a6', '#ec4899'],
  donut: ['#0d1f3c', '#f07c2c', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b'],
  bar: ['#3b82f6', '#f07c2c', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#14b8a6', '#ec4899'],
};

const TT = {
  backgroundColor: '#0d1f3c',
  titleColor: '#fff',
  bodyColor: 'rgba(255,255,255,.9)',
  padding: 12,
  cornerRadius: 8,
  titleFont: { size: 13, weight: '600', family: "'Segoe UI',sans-serif" },
  bodyFont: { size: 12.5, family: "'Segoe UI',sans-serif" },
};

const LEGEND = {
  labels: {
    font: { family: "'Segoe UI',sans-serif", size: 12.5 },
    boxWidth: 12,
    padding: 14,
    color: '#334155',
  },
};

const tick = { color: '#475569', font: { size: 12, family: "'Segoe UI',sans-serif" } };

const LABEL_FONT = {
  size: 11,
  weight: '700',
  family: "'Segoe UI',sans-serif",
};

function clickOpts(chartId, onChartClick, labels) {
  if (!onChartClick) return {};
  return {
    onHover: (event, elements) => {
      const canvas = event?.native?.target || event?.chart?.canvas;
      if (canvas) canvas.style.cursor = elements?.length ? 'pointer' : 'default';
    },
    onClick: (_event, elements, chart) => {
      if (!elements?.length) return;
      const index = elements[0].index;
      const label = chart.data.labels[index];
      const value = chart.data.datasets[elements[0].datasetIndex]?.data?.[index];
      onChartClick({
        chartId,
        label,
        fullLabel: Array.isArray(labels) ? labels[index] : label,
        value,
        index,
      });
    },
  };
}

function fmtCompactInr(v) {
  const n = Number(v) || 0;
  if (n >= 1e7) return '₹' + (n / 1e7).toFixed(2) + 'Cr';
  if (n >= 1e5) return '₹' + (n / 1e5).toFixed(1) + 'L';
  if (n >= 1e3) return '₹' + (n / 1e3).toFixed(0) + 'K';
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

function ChartCard({ title, sub, badge, tall, compact, actions, filterBar, children }) {
  const [fs, setFs] = useState(false);

  // Esc closes fullscreen; lock background scroll while open
  useEffect(() => {
    if (!fs) return;
    const onKey = (e) => e.key === 'Escape' && setFs(false);
    document.addEventListener('keydown', onKey);
    lockScroll();
    return () => {
      document.removeEventListener('keydown', onKey);
      unlockScroll();
    };
  }, [fs]);

  return (
    <>
      <div className={`chart-card${tall ? ' chart-card-tall' : ''}${compact ? ' chart-card-compact' : ''}`}>
        <div className="chart-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="chart-title">{title}</div>
            {sub && <div className="chart-sub">{sub}</div>}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
            {actions}
            {badge && <div className="chart-badge">{badge}</div>}
            <button
              onClick={() => setFs(true)}
              title="Fullscreen"
              style={{
                background: 'rgba(13,31,60,.07)',
                border: '1px solid #e2e8f0',
                borderRadius: 6,
                width: 28,
                height: 28,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                color: '#475569',
                flexShrink: 0,
              }}
            >
              ⛶
            </button>
          </div>
        </div>
        {!fs && <div className="chart-body">{children}</div>}
      </div>

      {fs &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: '#fff',
              zIndex: 11000,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 26px',
                borderBottom: '1px solid #e8eef5',
                background: '#0d1f3c',
                flexShrink: 0,
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 18, color: '#fff' }}>{title}</div>
                {sub && (
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,.65)', marginTop: 2 }}>
                    {sub}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {badge && (
                  <span
                    style={{
                      background: 'rgba(255,255,255,.15)',
                      color: '#fff',
                      borderRadius: 20,
                      padding: '4px 12px',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {badge}
                  </span>
                )}
                <button
                  onClick={() => setFs(false)}
                  style={{
                    background: '#f07c2c',
                    border: 'none',
                    borderRadius: 8,
                    padding: '7px 16px',
                    cursor: 'pointer',
                    fontSize: 13,
                    color: '#fff',
                    fontWeight: 700,
                  }}
                >
                  ✕ Exit fullscreen
                </button>
              </div>
            </div>
            {filterBar && (
              <div className="filter-bar chart-fs-filters">{filterBar}</div>
            )}
            <div style={{ flex: 1, minHeight: 0, padding: '22px 28px 28px' }}>
              <div style={{ width: '100%', height: '100%', position: 'relative' }}>{children}</div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

function shorten(label, max = 22) {
  const s = String(label || '');
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function donutLabels() {
  return {
    color: '#fff',
    font: { ...LABEL_FONT, size: 11 },
    formatter: (value, ctx) => {
      const data = ctx.chart.data.datasets[0].data || [];
      const total = data.reduce((a, b) => a + Number(b || 0), 0);
      if (!total || !value) return '';
      const pct = (value / total) * 100;
      if (pct < 5) return '';
      return `${value}\n${pct.toFixed(0)}%`;
    },
    textAlign: 'center',
    clamp: true,
  };
}

function fmtCompactInrAxis(v) {
  const n = Number(v) || 0;
  if (n >= 1e7) return '₹' + (n / 1e7).toFixed(1) + 'Cr';
  if (n >= 1e5) return '₹' + (n / 1e5).toFixed(0) + 'L';
  return '₹' + Math.round(n).toLocaleString('en-IN');
}


/**
 * ETA forecast with two readings of the same data: the 14-day bar run, and a
 * month calendar that makes day-of-week and month-end clustering visible.
 */
function EtaForecastCard({ stats, onChartClick, filterBar, children }) {
  const [view, setView] = useState('chart');

  const toggle = (
    <div className="view-toggle" role="group" aria-label="ETA view">
      <button
        className={view === 'chart' ? 'active' : ''}
        onClick={() => setView('chart')}
        aria-pressed={view === 'chart'}
      >
        📊 Chart
      </button>
      <button
        className={view === 'calendar' ? 'active' : ''}
        onClick={() => setView('calendar')}
        aria-pressed={view === 'calendar'}
      >
        🗓️ Calendar
      </button>
    </div>
  );

  const handleDay = (date, count) => {
    if (!onChartClick) return;
    onChartClick({
      chartId: 'etaDay',
      label: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      value: count,
    });
  };

  return (
    <ChartCard filterBar={filterBar}
      title="ETA Arrival Forecast"
      sub={
        view === 'chart'
          ? 'Active shipments arriving per day — next 14 days'
          : 'Active shipments arriving per day — by month'
      }
      badge="Active"
      compact
      actions={toggle}
    >
      {view === 'chart' ? (
        children
      ) : (
        <EtaCalendar etaByDate={stats.etaByDate || {}} onSelectDay={handleDay} />
      )}
    </ChartCard>
  );
}

export default function DashboardCharts({ stats, onChartClick, filterBar }) {
  const monthly = stats.monthly || DEF.monthly;
  const consol = stats.consol || DEF.consol;
  const units = stats.units || DEF.units;
  const sups = stats.suppliers_chart || stats.topSuppliers || DEF.suppliers_chart;
  const customs = stats.customs || stats.customsStatus || DEF.customs;
  const ports = stats.ports || DEF.ports;
  const supsByVal = stats.suppliersByValue || { labels: [], data: [] };
  const eva = stats.estimateVsActual || { labels: [], estimate: [], actual: [] };
  const airVsSea = stats.airVsSea || { air: 0, sea: 0 };

  const supLabels = Array.isArray(sups?.labels) ? sups.labels : DEF.suppliers_chart.labels;
  const supData = Array.isArray(sups?.data) ? sups.data : DEF.suppliers_chart.data;

  return (
    <>
      <div className="charts-row">
        <EtaForecastCard stats={stats} onChartClick={onChartClick} filterBar={filterBar}>
          {(() => {
            const etaData = stats.etaChart || { labels: [], data: [], dates: [] };
            const etaFullDates = etaData.dates || [];
            return (
              <Bar
                data={{
                  labels: etaData.labels,
                  datasets: [
                    {
                      label: 'Shipments ETA',
                      data: etaData.data,
                      backgroundColor: etaData.data.map((_, i) =>
                        i === 0 ? 'rgba(240,124,44,.9)' : 'rgba(59,130,246,.75)'
                      ),
                      borderRadius: 6,
                      maxBarThickness: 40,
                    },
                  ],
                }}
                options={{
                  ...clickOpts('etaDay', onChartClick, etaFullDates),
                  responsive: true,
                  maintainAspectRatio: false,
                  animation: { duration: 700 },
                  layout: { padding: { top: 24, right: 8, bottom: 4, left: 4 } },
                  plugins: {
                    legend: { display: false },
                    datalabels: {
                      anchor: 'end',
                      align: 'top',
                      offset: 2,
                      color: '#1d4ed8',
                      font: LABEL_FONT,
                      formatter: (v) => (v ? v : ''),
                    },
                    tooltip: { ...TT, callbacks: { label: (ctx) => ` ETA Shipments: ${ctx.raw}` } },
                  },
                  scales: {
                    x: { grid: { display: false }, ticks: { ...tick, font: { size: 11 }, maxRotation: 45 } },
                    y: { grid: { color: '#e8eef5' }, ticks: { ...tick, stepSize: 1 }, beginAtZero: true, grace: '15%' },
                  },
                }}
              />
            );
          })()}
        </EtaForecastCard>
      </div>
      <div className="charts-row cr2">
        <ChartCard filterBar={filterBar}
          title="Monthly Delivery Trend"
          sub="Completed shipments by month"
          badge="FY 2026-27"
          tall
        >
          <Bar
            data={{
              labels: monthly.labels,
              datasets: [
                {
                  label: 'Shipments',
                  data: monthly.data,
                  backgroundColor: 'rgba(59,130,246,.85)',
                  borderRadius: 6,
                  maxBarThickness: 48,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              animation: { duration: 700 },
              layout: { padding: { top: 22, right: 8, bottom: 4, left: 4 } },
              ...clickOpts('monthly', onChartClick, monthly.labels),
              plugins: {
                legend: { display: false },
                datalabels: {
                  anchor: 'end',
                  align: 'top',
                  offset: 2,
                  color: '#1d4ed8',
                  font: LABEL_FONT,
                  formatter: (v) => v,
                },
                tooltip: { ...TT, callbacks: { label: (ctx) => ` Shipments: ${ctx.raw}` } },
              },
              scales: {
                x: { grid: { display: false }, ticks: { ...tick, font: { size: 12.5 } } },
                y: { grid: { color: '#e8eef5' }, ticks: tick, grace: '12%', beginAtZero: true },
              },
            }}
          />
        </ChartCard>

        <ChartCard filterBar={filterBar} title="Freight Forwarders" sub="Shipments by logistics partner" tall>
          <Doughnut
            data={{
              labels: consol.labels,
              datasets: [
                {
                  data: consol.data,
                  backgroundColor: PALETTE.donut,
                  borderWidth: 3,
                  borderColor: '#fff',
                  hoverOffset: 10,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              cutout: '55%',
              animation: { duration: 700 },
              ...clickOpts('consol', onChartClick, consol.labels),
              plugins: {
                datalabels: donutLabels(),
                tooltip: {
                  ...TT,
                  callbacks: {
                    label: (ctx) => {
                      const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                      const pct = total ? ((ctx.raw / total) * 100).toFixed(1) : 0;
                      return ` ${ctx.label}: ${ctx.raw} (${pct}%)`;
                    },
                  },
                },
                legend: {
                  ...LEGEND,
                  position: 'bottom',
                  labels: { ...LEGEND.labels, padding: 12 },
                },
              },
            }}
          />
        </ChartCard>
      </div>

      <div className="charts-row cr2">
        <ChartCard filterBar={filterBar}
          title="Top Suppliers by Shipments"
          sub="Delivered shipments per vendor"
          badge="Top 8"
          tall
        >
          <Bar
            data={{
              labels: supLabels.map((l) => shorten(l, 24)),
              datasets: [
                {
                  label: 'Shipments',
                  data: supData,
                  backgroundColor: PALETTE.bar,
                  borderRadius: 5,
                  maxBarThickness: 22,
                },
              ],
            }}
            options={{
              indexAxis: 'y',
              responsive: true,
              maintainAspectRatio: false,
              animation: { duration: 700 },
              layout: { padding: { left: 4, right: 28 } },
              ...clickOpts('suppliers', onChartClick, supLabels),
              plugins: {
                legend: { display: false },
                datalabels: {
                  anchor: 'end',
                  align: 'right',
                  offset: 4,
                  color: '#0d1f3c',
                  font: LABEL_FONT,
                  formatter: (v) => v,
                  clip: false,
                },
                tooltip: {
                  ...TT,
                  callbacks: {
                    title: (items) =>
                      supLabels[items[0].dataIndex] || items[0].label,
                    label: (ctx) => ` Shipments: ${ctx.raw}`,
                  },
                },
              },
              scales: {
                x: {
                  grid: { color: '#e8eef5' },
                  ticks: tick,
                  beginAtZero: true,
                  grace: '15%',
                },
                y: {
                  grid: { display: false },
                  ticks: { ...tick, font: { size: 11.5 }, color: '#1e293b' },
                },
              },
            }}
          />
        </ChartCard>
        <ChartCard filterBar={filterBar} title="Top Invoice Value" sub="Cumulative invoice value INR — Top 8" badge="Top 8" tall>
          <Bar
            data={{
              labels: supsByVal.labels.map((l) => shorten(l, 24)),
              datasets: [{
                label: 'Invoice Value (INR)',
                data: supsByVal.data,
                backgroundColor: PALETTE.bar,
                borderRadius: 5,
                maxBarThickness: 22,
              }],
            }}
            options={{
                  ...clickOpts('suppliersValue', onChartClick, supsByVal.labels),
              indexAxis: 'y',
              responsive: true,
              maintainAspectRatio: false,
              animation: { duration: 700 },
              layout: { padding: { right: 56 } },
              plugins: {
                legend: { display: false },
                datalabels: {
                  anchor: 'end', align: 'right', offset: 4,
                  color: '#0d1f3c', font: LABEL_FONT,
                  formatter: (v) => fmtCompactInr(v), clip: false,
                },
                tooltip: { ...TT, callbacks: {
                  title: (items) => supsByVal.labels[items[0].dataIndex] || items[0].label,
                  label: (ctx) => ` ${fmtCompactInr(ctx.raw)}`,
                }},
              },
              scales: {
                x: { grid: { color: '#e8eef5' }, ticks: { ...tick, callback: fmtCompactInrAxis }, beginAtZero: true, grace: '18%' },
                y: { grid: { display: false }, ticks: { ...tick, font: { size: 11.5 }, color: '#1e293b' } },
              },
            }}
          />
        </ChartCard>

      </div>

      <div className="charts-row cr2">
        <ChartCard filterBar={filterBar} title="Plant Distribution" sub="Shipments by destination unit" tall>
          <Doughnut
            data={{
              labels: units.labels,
              datasets: [
                {
                  data: units.data,
                  backgroundColor: PALETTE.multi,
                  borderWidth: 3,
                  borderColor: '#fff',
                  hoverOffset: 8,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              cutout: '52%',
              animation: { duration: 700 },
              ...clickOpts('units', onChartClick, units.labels),
              plugins: {
                datalabels: donutLabels(),
                tooltip: {
                  ...TT,
                  callbacks: {
                    label: (ctx) => {
                      const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                      const pct = total ? ((ctx.raw / total) * 100).toFixed(1) : 0;
                      return ` ${ctx.label}: ${ctx.raw} (${pct}%)`;
                    },
                  },
                },
                legend: {
                  ...LEGEND,
                  position: 'bottom',
                  labels: { ...LEGEND.labels, font: { size: 11.5 }, padding: 10 },
                },
              },
            }}
          />
        </ChartCard>

        <ChartCard filterBar={filterBar} title="Customs Pipeline" sub="Active shipment clearance stages" tall>
          <Bar
            data={{
              labels: customs.labels,
              datasets: [
                {
                  label: 'Shipments',
                  data: customs.data,
                  backgroundColor: PALETTE.bar,
                  borderRadius: 6,
                  maxBarThickness: 40,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              animation: { duration: 700 },
              layout: { padding: { top: 18 } },
              ...clickOpts('customs', onChartClick, customs.labels),
              plugins: {
                legend: { display: false },
                datalabels: {
                  anchor: 'end',
                  align: 'top',
                  offset: 2,
                  color: '#0d1f3c',
                  font: LABEL_FONT,
                  formatter: (v) => v,
                },
                tooltip: {
                  ...TT,
                  callbacks: { label: (ctx) => ` Shipments: ${ctx.raw}` },
                },
              },
              scales: {
                x: {
                  grid: { display: false },
                  ticks: { ...tick, font: { size: 11.5 }, maxRotation: 35, minRotation: 0 },
                },
                y: {
                  grid: { color: '#e8eef5' },
                  ticks: tick,
                  beginAtZero: true,
                  grace: '15%',
                },
              },
            }}
          />
        </ChartCard>
      </div>

      <div className="charts-row cr2">
        <ChartCard filterBar={filterBar} title="Air vs Sea Shipments" sub="Shipments split by transport mode" tall>
          <Doughnut
            data={{
              labels: ['Air (AIC)', 'Sea (SIC)'],
              datasets: [{
                data: [airVsSea.air, airVsSea.sea],
                backgroundColor: ['#3b82f6', '#0d1f3c'],
                borderWidth: 3,
                borderColor: '#fff',
                hoverOffset: 10,
              }],
            }}
            options={{
                  ...clickOpts('airSea', onChartClick, ['Air', 'Sea']),
              responsive: true,
              maintainAspectRatio: false,
              cutout: '55%',
              animation: { duration: 700 },
              plugins: {
                datalabels: donutLabels(),
                tooltip: { ...TT, callbacks: { label: (ctx) => {
                  const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                  const pct = total ? ((ctx.raw / total) * 100).toFixed(1) : 0;
                  return ` ${ctx.label}: ${ctx.raw} (${pct}%)`;
                }}},
                legend: { ...LEGEND, position: 'bottom' },
              },
            }}
          />
        </ChartCard>

        <ChartCard filterBar={filterBar} title="Ports of Loading" sub="Top origin airports & seaports" badge="Top 8" tall>
          <Bar
            data={{
              labels: ports.labels,
              datasets: [
                {
                  label: 'Shipments',
                  data: ports.data,
                  backgroundColor: 'rgba(13,31,60,.8)',
                  borderRadius: 5,
                  maxBarThickness: 22,
                },
              ],
            }}
            options={{
              indexAxis: 'y',
              responsive: true,
              maintainAspectRatio: false,
              animation: { duration: 700 },
              layout: { padding: { right: 28 } },
              ...clickOpts('ports', onChartClick, ports.labels),
              plugins: {
                legend: { display: false },
                datalabels: {
                  anchor: 'end',
                  align: 'right',
                  offset: 4,
                  color: '#0d1f3c',
                  font: LABEL_FONT,
                  formatter: (v) => v,
                  clip: false,
                },
                tooltip: {
                  ...TT,
                  callbacks: { label: (ctx) => ` Shipments: ${ctx.raw}` },
                },
              },
              scales: {
                x: {
                  grid: { color: '#e8eef5' },
                  ticks: tick,
                  beginAtZero: true,
                  grace: '15%',
                },
                y: {
                  grid: { display: false },
                  ticks: { ...tick, font: { size: 12 }, color: '#1e293b' },
                },
              },
            }}
          />
        </ChartCard>
      </div>

      <div className="charts-row">

        <ChartCard filterBar={filterBar} title="Estimated CFS Cost vs Actual CFS Cost" sub="Approximate vs final CFS charges by month" tall>
          <Bar
            data={{
              labels: eva.labels,
              datasets: [
                {
                  label: 'Invoice Rate (Est.)',
                  data: eva.estimate,
                  backgroundColor: 'rgba(59,130,246,.75)',
                  borderRadius: 5,
                  maxBarThickness: 28,
                },
                {
                  label: 'Assessable Value (Act.)',
                  data: eva.actual,
                  backgroundColor: 'rgba(240,124,44,.85)',
                  borderRadius: 5,
                  maxBarThickness: 28,
                },
              ],
            }}
            options={{
                  ...clickOpts('cfsMonth', onChartClick, eva.labels),
              responsive: true,
              maintainAspectRatio: false,
              animation: { duration: 700 },
              interaction: { mode: 'index', intersect: false },
              layout: { padding: { top: 20 } },
              plugins: {
                legend: { ...LEGEND, position: 'top' },
                datalabels: { display: false },
                tooltip: { ...TT, callbacks: {
                  label: (ctx) => ` ${ctx.dataset.label}: ₹${Math.round(ctx.raw).toLocaleString('en-IN')}`,
                }},
              },
              scales: {
                x: { grid: { display: false }, ticks: { ...tick, font: { size: 12 } } },
                y: { grid: { color: '#e8eef5' }, ticks: { ...tick, callback: fmtCompactInrAxis }, beginAtZero: true, grace: '15%' },
              },
            }}
          />
        </ChartCard>
      </div>

    </>
  );
}
