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

function ChartCard({ title, sub, badge, tall, children }) {
  return (
    <div className={`chart-card${tall ? ' chart-card-tall' : ''}`}>
      <div className="chart-head">
        <div>
          <div className="chart-title">{title}</div>
          {sub && <div className="chart-sub">{sub}</div>}
        </div>
        {badge && <div className="chart-badge">{badge}</div>}
      </div>
      <div className="chart-body">{children}</div>
    </div>
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

export default function DashboardCharts({ stats, onChartClick }) {
  const monthly = stats.monthly || DEF.monthly;
  const mFreight = stats.mFreight || stats.monthlyFreight || DEF.mFreight;
  const consol = stats.consol || DEF.consol;
  const units = stats.units || DEF.units;
  const sups = stats.suppliers_chart || stats.topSuppliers || DEF.suppliers_chart;
  const customs = stats.customs || stats.customsStatus || DEF.customs;
  const ports = stats.ports || DEF.ports;

  const supLabels = Array.isArray(sups?.labels) ? sups.labels : DEF.suppliers_chart.labels;
  const supData = Array.isArray(sups?.data) ? sups.data : DEF.suppliers_chart.data;

  return (
    <>
      <div className="charts-row cr2">
        <ChartCard
          title="Monthly Delivery Trend"
          sub="Shipments vs Freight cost by month"
          badge="FY 2026-27"
          tall
        >
          <Chart
            type="bar"
            data={{
              labels: monthly.labels,
              datasets: [
                {
                  label: 'Shipments',
                  data: monthly.data,
                  backgroundColor: 'rgba(59,130,246,.85)',
                  borderRadius: 6,
                  maxBarThickness: 48,
                  yAxisID: 'y',
                  datalabels: {
                    anchor: 'end',
                    align: 'top',
                    offset: 2,
                    color: '#1d4ed8',
                    font: LABEL_FONT,
                    formatter: (v) => v,
                  },
                },
                {
                  label: 'Freight (INR)',
                  data: mFreight.data,
                  type: 'line',
                  borderColor: '#f07c2c',
                  backgroundColor: 'rgba(240,124,44,.1)',
                  borderWidth: 3,
                  pointBackgroundColor: '#f07c2c',
                  pointRadius: 5,
                  pointHoverRadius: 7,
                  tension: 0.35,
                  yAxisID: 'y1',
                  fill: true,
                  datalabels: {
                    anchor: 'end',
                    align: 'top',
                    offset: 6,
                    color: '#c2410c',
                    font: { ...LABEL_FONT, size: 10 },
                    formatter: (v) => fmtCompactInr(v),
                  },
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              animation: { duration: 700 },
              interaction: { mode: 'index', intersect: false },
              layout: { padding: { top: 22, right: 8, bottom: 4, left: 4 } },
              ...clickOpts('monthly', onChartClick, monthly.labels),
              plugins: {
                legend: { ...LEGEND, position: 'top' },
                datalabels: { display: true },
                tooltip: {
                  ...TT,
                  callbacks: {
                    label: (ctx) => {
                      if (ctx.dataset.yAxisID === 'y1') {
                        return `${ctx.dataset.label}: ₹${Math.round(ctx.raw).toLocaleString('en-IN')}`;
                      }
                      return `${ctx.dataset.label}: ${ctx.raw}`;
                    },
                  },
                },
              },
              scales: {
                x: {
                  grid: { display: false },
                  ticks: { ...tick, font: { size: 12.5 } },
                },
                y: {
                  position: 'left',
                  grid: { color: '#e8eef5' },
                  ticks: tick,
                  grace: '12%',
                  title: {
                    display: true,
                    text: 'Shipments',
                    color: '#64748b',
                    font: { size: 12, weight: '600' },
                  },
                },
                y1: {
                  position: 'right',
                  grid: { display: false },
                  ticks: {
                    ...tick,
                    color: '#c2410c',
                    callback: (v) => '₹' + (v / 1e5).toFixed(0) + 'L',
                  },
                  grace: '18%',
                  title: {
                    display: true,
                    text: 'Freight (INR)',
                    color: '#c2410c',
                    font: { size: 12, weight: '600' },
                  },
                },
              },
            }}
          />
        </ChartCard>

        <ChartCard title="Freight Forwarders" sub="Shipments by logistics partner" tall>
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

      <div className="charts-row cr3">
        <ChartCard
          title="Top Suppliers by Volume"
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

        <ChartCard title="Plant Distribution" sub="Shipments by destination unit" tall>
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

        <ChartCard title="Customs Pipeline" sub="Active shipment clearance stages" tall>
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
        <ChartCard
          title="Monthly Freight Expenditure (INR)"
          sub="Air freight cost trend FY 26-27"
          tall
        >
          <Line
            data={{
              labels: mFreight.labels,
              datasets: [
                {
                  label: 'Freight (INR)',
                  data: mFreight.data,
                  borderColor: '#0d1f3c',
                  backgroundColor: 'rgba(13,31,60,.08)',
                  borderWidth: 3,
                  pointBackgroundColor: '#f07c2c',
                  pointBorderColor: '#fff',
                  pointBorderWidth: 2,
                  pointRadius: 6,
                  pointHoverRadius: 8,
                  tension: 0.35,
                  fill: true,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              animation: { duration: 700 },
              layout: { padding: { top: 22 } },
              ...clickOpts('freight', onChartClick, mFreight.labels),
              plugins: {
                legend: { display: false },
                datalabels: {
                  anchor: 'end',
                  align: 'top',
                  offset: 6,
                  color: '#0d1f3c',
                  font: LABEL_FONT,
                  formatter: (v) => fmtCompactInr(v),
                },
                tooltip: {
                  ...TT,
                  callbacks: {
                    label: (ctx) =>
                      ` ₹${Math.round(ctx.raw).toLocaleString('en-IN')}`,
                  },
                },
              },
              scales: {
                x: {
                  grid: { display: false },
                  ticks: { ...tick, font: { size: 12.5 } },
                },
                y: {
                  grid: { color: '#e8eef5' },
                  ticks: {
                    ...tick,
                    callback: (v) => '₹' + (v / 1e5).toFixed(0) + 'L',
                  },
                  beginAtZero: true,
                  grace: '18%',
                },
              },
            }}
          />
        </ChartCard>

        <ChartCard title="Ports of Loading" sub="Top origin airports & seaports" badge="Top 8" tall>
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
    </>
  );
}
