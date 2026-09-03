import { useMemo, useState } from 'react';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const keyOf = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;

/** ISO-8601 week number, so the week column matches a standard planner. */
function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

/* Each arrival type gets its own chip colour, so a glance at the month shows
   the mix as well as the volume. */
const MODES = [
  { key: 'air', label: 'Air', cls: 'is-air' },
  { key: 'sea', label: 'Sea', cls: 'is-sea' },
  { key: 'other', label: 'Other', cls: 'is-other' },
];

/**
 * Month view of arriving shipments, laid out like a planning calendar:
 * a week-number column, one column per weekday, and each day carrying
 * labelled chips rather than a bare number.
 */
export default function EtaCalendar({ etaByDate = {}, onSelectDay }) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [cursor, setCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const { weeks, monthTotal, modeTotals } = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const lead = (first.getDay() + 6) % 7; // Monday-first

    const flat = [];
    for (let i = 0; i < lead; i++) flat.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const entry = etaByDate[keyOf(date)];
      const counts =
        typeof entry === 'number'
          ? { total: entry, air: 0, sea: 0, other: entry }
          : entry || { total: 0, air: 0, sea: 0, other: 0 };
      flat.push({ date, day, counts, isToday: date.getTime() === today.getTime() });
    }
    while (flat.length % 7 !== 0) flat.push(null);

    const rows = [];
    for (let i = 0; i < flat.length; i += 7) {
      const days = flat.slice(i, i + 7);
      const anchor = days.find(Boolean);
      rows.push({ week: anchor ? isoWeek(anchor.date) : '', days });
    }

    const totals = { total: 0, air: 0, sea: 0, other: 0 };
    flat.filter(Boolean).forEach((c) => {
      totals.total += c.counts.total;
      totals.air += c.counts.air;
      totals.sea += c.counts.sea;
      totals.other += c.counts.other;
    });
    return { weeks: rows, monthTotal: totals.total, modeTotals: totals };
  }, [cursor, etaByDate, today]);

  const shift = (delta) =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));

  return (
    <div className="eta-cal">
      <div className="eta-cal-head">
        <button className="eta-cal-nav" onClick={() => shift(-1)} aria-label="Previous month">
          ‹
        </button>
        <div className="eta-cal-month">
          <strong>
            {cursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </strong>
          <span>{monthTotal} arriving</span>
        </div>
        <div className="eta-cal-legend">
          {MODES.filter((m) => modeTotals[m.key] > 0).map((m) => (
            <span key={m.key} className={`eta-legend-chip ${m.cls}`}>
              {m.label} {modeTotals[m.key]}
            </span>
          ))}
        </div>
        <button className="eta-cal-nav" onClick={() => shift(1)} aria-label="Next month">
          ›
        </button>
        <button
          className="eta-cal-today"
          onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
        >
          Today
        </button>
      </div>

      <div className="eta-cal-table">
        <div className="eta-cal-row is-head">
          <div className="eta-cal-wk is-head">Week</div>
          {WEEKDAYS.map((w) => (
            <div key={w} className="eta-cal-dow">
              {w}
            </div>
          ))}
        </div>

        {weeks.map((row, ri) => (
          <div className="eta-cal-row" key={`w-${ri}`}>
            <div className="eta-cal-wk">{row.week}</div>
            {row.days.map((cell, ci) =>
              cell === null ? (
                <div key={`pad-${ri}-${ci}`} className="eta-cal-day is-pad" />
              ) : (
                <div
                  key={keyOf(cell.date)}
                  className={`eta-cal-day${cell.isToday ? ' is-today' : ''}`}
                >
                  <span className="eta-cal-num">{cell.day}</span>
                  <div className="eta-cal-chips">
                    {MODES.filter((m) => cell.counts[m.key] > 0).map((m) => (
                      <button
                        key={m.key}
                        className={`eta-chip ${m.cls}`}
                        onClick={() => onSelectDay?.(cell.date, cell.counts.total)}
                        title={`${cell.counts[m.key]} ${m.label} shipment${
                          cell.counts[m.key] === 1 ? '' : 's'
                        } arriving ${cell.date.toLocaleDateString('en-IN')}`}
                      >
                        <span className="eta-chip-label">{m.label}</span>
                        <span className="eta-chip-value">{cell.counts[m.key]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
