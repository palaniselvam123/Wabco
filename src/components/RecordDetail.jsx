import { useEffect, useMemo } from 'react';
import StatusBadge from './StatusBadge';
import { fmtDate, fmtMoney, isOverdue } from '../utils/format';
import {
  getRecordValue,
  hasUsefulValue,
  resolveRecordKey,
} from '../utils/fields';

const FIELD_META = [
  { keys: ['Job No ', 'Job No', 'Job'], label: 'Job No.', emoji: '🔖', section: 'identity' },
  { keys: ['Date', 'Job Date'], label: 'Job Date', emoji: '📅', section: 'identity', format: 'date' },
  {
    keys: ['Wabco Delevered Date', 'Wabco Delivered Date', 'Delivered Date'],
    label: 'Delivered Date',
    emoji: '📅',
    section: 'identity',
    format: 'date',
  },
  { keys: ['Supplier'], label: 'Supplier', emoji: '🏭', section: 'identity' },
  { keys: ['Part No', 'Part No.', 'Part Number'], label: 'Part No.', emoji: '🧩', section: 'identity' },
  {
    keys: ['Material Description', 'Material', 'Description'],
    label: 'Material Description',
    emoji: '🧰',
    section: 'identity',
    full: true,
  },
  { keys: ['Qty', 'Quantity', 'QTY'], label: 'Quantity', emoji: '🔢', section: 'identity', format: 'number' },
  { keys: ['Unit', 'Plant', 'Destination'], label: 'Plant / Unit', emoji: '🏢', section: 'identity' },
  { keys: ['Invoice No', 'Invoice No.', 'Inv No'], label: 'Invoice No.', emoji: '🧾', section: 'identity' },
  {
    keys: ['Invoice Date', 'Inv Date'],
    label: 'Invoice Date',
    emoji: '🗓️',
    section: 'identity',
    format: 'date',
  },
  {
    keys: ['PO No', 'PO No.', 'PO Number', 'Purchase Order'],
    label: 'PO No.',
    emoji: '📋',
    section: 'identity',
  },
  {
    keys: ['Country Of Origin', 'Country of Origin', 'COO', 'Origin Country'],
    label: 'Country of Origin',
    emoji: '🌐',
    section: 'identity',
  },

  { keys: ['Consol', 'Forwarder', 'FF'], label: 'Forwarder', emoji: '🚚', section: 'transport' },
  { keys: ['HAWB No.', 'HAWB No', 'HAWB', 'House AWB'], label: 'HAWB No.', emoji: '📄', section: 'transport' },
  { keys: ['MAWB No.', 'MAWB No', 'MAWB', 'Master AWB'], label: 'MAWB No.', emoji: '✈️', section: 'transport' },
  {
    keys: ['Port Of Loading', 'Port of Loading', 'POL', 'Origin Port'],
    label: 'Port of Loading',
    emoji: '🛫',
    section: 'transport',
  },
  {
    keys: ['Eta Maa', 'ETA MAA', 'ETA', 'ETA Chennai'],
    label: 'ETA MAA',
    emoji: '⏱️',
    section: 'transport',
    format: 'date',
    highlightOverdue: true,
  },
  {
    keys: ['Ata Maa', 'ATA MAA', 'ATA', 'Actual Arrival'],
    label: 'ATA MAA',
    emoji: '🛬',
    section: 'transport',
    format: 'date',
  },
  { keys: ['Mode', 'Shipment Mode', 'Transport Mode'], label: 'Mode', emoji: '🚛', section: 'transport' },
  {
    keys: ['No Of Pkgs', 'No of Pkgs', 'Packages', 'Pkgs'],
    label: 'No. of Packages',
    emoji: '📦',
    section: 'transport',
    format: 'number',
  },
  {
    keys: ['Weight', 'Gross Weight', 'Wt'],
    label: 'Weight (kg)',
    emoji: '⚖️',
    section: 'transport',
    format: 'number',
  },
  { keys: ['CBM', 'Volume'], label: 'CBM', emoji: '📐', section: 'transport', format: 'number' },
  { keys: ['CHA', 'Custom House Agent'], label: 'CHA', emoji: '🏛️', section: 'transport' },

  { keys: ['B/E No', 'B/E No.', 'BE No', 'Bill of Entry'], label: 'B/E No.', emoji: '🛂', section: 'customs' },
  { keys: ['B/E Date', 'BE Date'], label: 'B/E Date', emoji: '🗓️', section: 'customs', format: 'date' },
  {
    keys: ['Customs Cleared', 'Customs Status', 'Clearance Status'],
    label: 'Customs Status',
    emoji: '✅',
    section: 'customs',
    format: 'status',
  },
  { keys: ['Filter', 'Filter Flag', 'Status Flag'], label: 'Filter Flag', emoji: '🏷️', section: 'customs' },
  {
    keys: ['Duty Advised ', 'Duty Advised', 'Duty Advise Date'],
    label: 'Duty Advised',
    emoji: '💰',
    section: 'customs',
    format: 'date',
  },
  {
    keys: ['Duty Received', 'Duty Receipt Date'],
    label: 'Duty Received',
    emoji: '🏦',
    section: 'customs',
    format: 'date',
  },
  {
    keys: ['Duty Amount', 'Duty', 'Customs Duty'],
    label: 'Duty Amount',
    emoji: '💵',
    section: 'customs',
    format: 'money',
  },
  {
    keys: ['Assessable Value', 'Assessable Val', 'AV'],
    label: 'Assessable Value',
    emoji: '📈',
    section: 'customs',
    format: 'money',
  },
  { keys: ['ASN', 'ASN Status', 'ASN No'], label: 'ASN', emoji: '📨', section: 'customs' },
  { keys: ['ASN Date'], label: 'ASN Date', emoji: '📆', section: 'customs', format: 'date' },
  {
    keys: ['Remarks', 'Remark', 'Comments'],
    label: 'Remarks',
    emoji: '💬',
    section: 'customs',
    full: true,
  },

  {
    keys: ['FRT', 'Freight', 'Air Freight', 'FRT (INR)'],
    label: 'Freight (INR)',
    emoji: '💸',
    section: 'cost',
    format: 'money',
  },
  {
    keys: ['EX', 'EX (INR)', 'Expenses', 'Other Charges'],
    label: 'EX (INR)',
    emoji: '📊',
    section: 'cost',
    format: 'money',
  },
  {
    keys: ['Total Cost', 'Total', 'Grand Total'],
    label: 'Total Cost',
    emoji: '🧮',
    section: 'cost',
    format: 'money',
  },
];

const SECTION_META = {
  identity: { title: 'Shipment Identity', emoji: '📦', accent: 'org' },
  transport: { title: 'Transport & Documents', emoji: '✈️', accent: 'blue' },
  customs: { title: 'Customs & Duty', emoji: '🛃', accent: 'grn' },
  cost: { title: 'Cost & Charges', emoji: '💰', accent: 'teal' },
  other: { title: 'Additional Details', emoji: '🗂️', accent: 'pur' },
};

function guessFormat(key, value) {
  const k = String(key).toLowerCase().trim();
  if (k === 'customs cleared' || k === 'customs status' || k === 'clearance status') {
    return 'status';
  }
  if (/date|eta|ata|advised|received|delivered/.test(k)) return 'date';
  if (/frt|freight|assessable|duty amount|total cost/.test(k) || k === 'ex') return 'money';
  if (
    /qty|quantity|weight|pkgs|cbm|packages/.test(k) &&
    (typeof value === 'number' || /^\d+(\.\d+)?$/.test(String(value || '')))
  ) {
    return 'number';
  }
  return null;
}

function formatValue(value, format, field) {
  if (!hasUsefulValue(value)) return '—';

  if (format === 'date') {
    const formatted = fmtDate(value);
    if (field?.highlightOverdue && isOverdue(value)) {
      return <span className="detail-overdue">{formatted} · Overdue</span>;
    }
    return formatted;
  }
  if (format === 'money') return fmtMoney(value);
  if (format === 'number') {
    const n = Number(value);
    return Number.isFinite(n) ? n.toLocaleString('en-IN') : String(value);
  }
  if (format === 'status') return <StatusBadge value={value} />;
  return String(value);
}

function buildSections(record, type) {
  const used = new Set();
  const buckets = {
    identity: [],
    transport: [],
    customs: [],
    cost: [],
    other: [],
  };

  FIELD_META.forEach((meta) => {
    const key = resolveRecordKey(record, meta.keys);
    const value = getRecordValue(record, ...meta.keys);
    if (!key || !hasUsefulValue(value)) return;
    used.add(key);
    buckets[meta.section].push({
      key,
      value,
      label: meta.label,
      emoji: meta.emoji,
      format: meta.format,
      full: meta.full,
      highlightOverdue: meta.highlightOverdue,
    });
  });

  Object.keys(record).forEach((key) => {
    if (used.has(key) || !hasUsefulValue(record[key])) return;
    const trimmed = key.trim();
    if (!trimmed) return;
    buckets.other.push({
      key,
      value: record[key],
      label: trimmed,
      emoji: '📌',
      format: guessFormat(key, record[key]),
      full: /remark|comment|description|material/i.test(trimmed),
    });
  });

  const order =
    type === 'delivered'
      ? ['identity', 'transport', 'cost', 'customs', 'other']
      : ['identity', 'transport', 'customs', 'cost', 'other'];

  return order
    .filter((id) => buckets[id].length > 0)
    .map((id) => ({
      id,
      ...SECTION_META[id],
      fields: buckets[id],
    }));
}

function journeySteps(record, type) {
  if (type === 'delivered') {
    return [
      {
        emoji: '🛫',
        label: 'Origin',
        value: getRecordValue(record, 'Port Of Loading') || 'Loaded',
        done: true,
      },
      {
        emoji: '✈️',
        label: 'In Transit',
        value: getRecordValue(record, 'Consol') || 'Air freight',
        done: true,
      },
      { emoji: '🛃', label: 'Customs', value: 'Cleared', done: true },
      {
        emoji: '🏁',
        label: 'Delivered',
        value:
          fmtDate(
            getRecordValue(record, 'Wabco Delevered Date', 'Wabco Delivered Date')
          ) || 'Complete',
        done: true,
        active: true,
      },
    ];
  }

  const status = String(getRecordValue(record, 'Customs Cleared') || '').toUpperCase();
  const filter = String(getRecordValue(record, 'Filter') || '').toUpperCase();
  const cleared = filter === 'CLR' || status.includes('OOC');
  const eta = getRecordValue(record, 'Eta Maa', 'ETA MAA');
  const overdue = isOverdue(eta);

  return [
    {
      emoji: '📦',
      label: 'Booked',
      value: fmtDate(getRecordValue(record, 'Date')) || 'Created',
      done: true,
    },
    {
      emoji: '✈️',
      label: 'In Transit',
      value: getRecordValue(record, 'Consol') || 'Air freight',
      done: true,
    },
    {
      emoji: '🛃',
      label: 'Customs',
      value: getRecordValue(record, 'Customs Cleared') || 'Pending',
      done: cleared || status.includes('DUTY') || status.includes('OTP'),
      active: !cleared,
    },
    {
      emoji: overdue ? '⚠️' : '🏁',
      label: overdue ? 'ETA Overdue' : 'Delivery',
      value: fmtDate(eta) || 'Awaiting',
      done: false,
      active: cleared,
      warn: overdue,
    },
  ];
}

export default function RecordDetail({ record, type = 'active', onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const sections = useMemo(() => buildSections(record || {}, type), [record, type]);

  if (!record) return null;

  const jobNo =
    getRecordValue(record, 'Job No ', 'Job No', 'Job') || 'Shipment Record';
  const supplier = getRecordValue(record, 'Supplier') || '';
  const status = getRecordValue(record, 'Customs Cleared');
  const unit = getRecordValue(record, 'Unit');
  const eta = getRecordValue(record, 'Eta Maa', 'ETA MAA');
  const overdue = type === 'active' && isOverdue(eta);
  const steps = journeySteps(record, type);
  const fieldCount = sections.reduce((n, s) => n + s.fields.length, 0);

  const snapshots =
    type === 'delivered'
      ? [
          {
            emoji: '📅',
            label: 'Delivered',
            value: fmtDate(
              getRecordValue(record, 'Wabco Delevered Date', 'Wabco Delivered Date')
            ),
          },
          { emoji: '🏭', label: 'Supplier', value: supplier || '—' },
          {
            emoji: '🛫',
            label: 'Origin',
            value: getRecordValue(record, 'Port Of Loading') || '—',
          },
          {
            emoji: '💸',
            label: 'Freight',
            value: fmtMoney(getRecordValue(record, 'FRT')),
          },
        ]
      : [
          {
            emoji: '📅',
            label: 'Job Date',
            value: fmtDate(getRecordValue(record, 'Date')),
          },
          {
            emoji: '⏱️',
            label: 'ETA MAA',
            value: fmtDate(eta),
            warn: overdue,
          },
          {
            emoji: '🚚',
            label: 'Forwarder',
            value: getRecordValue(record, 'Consol') || '—',
          },
          { emoji: '🏢', label: 'Plant', value: unit || '—' },
        ];

  return (
    <div className="record-detail" role="dialog" aria-modal="true">
      <div className="record-detail-bar">
        <button type="button" className="btn-sm btn-outline record-back" onClick={onClose}>
          ← Back to records
        </button>
        <div className="record-detail-bar-main">
          <div className="record-detail-kicker">
            {type === 'delivered' ? '✅ Delivered Shipment' : '🚚 Active Shipment'}
            <span className="record-field-count"> · {fieldCount} fields with data</span>
          </div>
          <h1 className="record-detail-title">{jobNo}</h1>
          {supplier && <p className="record-detail-sub">🏭 {supplier}</p>}
        </div>
        <div className="record-detail-bar-meta">
          {status && <StatusBadge value={status} />}
          {unit && <span className="badge b-blue">🏢 {unit}</span>}
          <button type="button" className="record-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
      </div>

      <div className="record-detail-body">
        <div className="record-detail-grid">
          <section className="record-hero">
            <div className="record-hero-media">
              <img
                src="/shipment-hero.png"
                alt="Air freight logistics illustration"
                className="record-hero-img"
              />
              <div className="record-hero-overlay" />
              <div className="record-hero-caption">
                <span className="record-hero-chip">✈️ Air Freight Ops</span>
                <strong>
                  {type === 'delivered' ? 'Journey complete' : 'Live tracking view'}
                </strong>
                <p>
                  {type === 'delivered'
                    ? 'End-to-end delivery record for FY 2026-27'
                    : 'Track documents, customs clearance, and ETA in one place'}
                </p>
              </div>
            </div>

            <div className="record-hero-side">
              <div className="record-snapshot-grid">
                {snapshots.map((item) => (
                  <div
                    key={item.label}
                    className={`record-snapshot${item.warn ? ' is-warn' : ''}`}
                  >
                    <div className="record-snapshot-emoji">{item.emoji}</div>
                    <div>
                      <div className="record-snapshot-label">{item.label}</div>
                      <div className="record-snapshot-value">{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="record-journey">
            <div className="record-journey-head">
              <h2>🧭 Shipment Journey</h2>
              <span>
                {type === 'delivered' ? 'Completed pipeline' : 'Live status pipeline'}
              </span>
            </div>
            <div className="record-journey-track">
              {steps.map((step, i) => (
                <div
                  key={step.label}
                  className={`journey-step${step.done ? ' is-done' : ''}${
                    step.active ? ' is-active' : ''
                  }${step.warn ? ' is-warn' : ''}`}
                >
                  <div className="journey-dot">{step.emoji}</div>
                  {i < steps.length - 1 && <div className="journey-line" />}
                  <div className="journey-label">{step.label}</div>
                  <div className="journey-value">{step.value}</div>
                </div>
              ))}
            </div>
          </section>

          {sections.map((section) => (
            <section
              key={section.id}
              className={`record-section accent-${section.accent}`}
            >
              <h2>
                <span className="section-emoji">{section.emoji}</span>
                {section.title}
                <span className="section-count">{section.fields.length}</span>
              </h2>
              <div className="record-fields">
                {section.fields.map((field) => (
                  <div
                    key={field.key}
                    className={`record-field${field.full ? ' record-field-full' : ''}`}
                  >
                    <div className="record-field-label">
                      <span>{field.emoji}</span>
                      {field.label}
                    </div>
                    <div className="record-field-value">
                      {formatValue(field.value, field.format, field)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
