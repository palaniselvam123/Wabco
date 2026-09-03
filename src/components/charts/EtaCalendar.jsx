import { useMemo, useState } from 'react';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const keyOf = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;

/**
 * Month grid of arriving shipments, an alternative reading of the same ETA
 * data as the bar chart — useful for spotting clustering around weekends
 * and month-ends, which a 14-day bar run hides.
 */
export default function EtaCalendar({ etaByDate = {}, onSelectDay }) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const { cells, monthTotal } = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Monday-first offset
    const lead = (first.getDay() + 6) % 7;
    const out = [];
    for (let i = 0; i < lead; i++) out.push(null);

    let total = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const count = etaByDate[keyOf(date)] || 0;
      total += count;
      out.push({ date, day, count, isToday: date.getTime() === today.getTime() });
    }
    while (out.length % 7 !== 0) out.push(null);
    return { cells: out, monthTotal: total };
  }, [cursor, etaByDate, today]);

  // Scale colour intensity against the busiest day in view.
  const peak = Math.max(1, ...cells.filter(Boolean).map((c) => c.count));

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

      <div className="eta-cal-grid">
        {WEEKDAYS.map((w) => (
          <div key={w} className="eta-cal-dow">
            {w}
          </div>
        ))}
        {cells.map((cell, i) =>
          cell === null ? (
            <div key={`pad-${i}`} className="eta-cal-day is-pad" />
          ) : (
            <button
              key={keyOf(cell.date)}
              className={
                'eta-cal-day' +
                (cell.isToday ? ' is-today' : '') +
                (cell.count ? ' has-eta' : '')
              }
              style={
                cell.count
                  ? { '--eta-weight': (cell.count / peak).toFixed(2) }
                  : undefined
              }
              onClick={() => cell.count && onSelectDay?.(cell.date, cell.count)}
              disabled={!cell.count}
              title={
                cell.count
                  ? `${cell.count} shipment${cell.count === 1 ? '' : 's'} arriving ${cell.date.toLocaleDateString('en-IN')}`
                  : undefined
              }
            >
              <span className="eta-cal-num">{cell.day}</span>
              {cell.count > 0 && (
                <span className="eta-cal-count">
                  <strong>{cell.count}</strong>
                  <em>{cell.count === 1 ? 'shpmt' : 'shpmts'}</em>
                </span>
              )}
            </button>
          )
        )}
      </div>
    </div>
  );
}
