import { getField } from './format';

export function computeStats(active, delivered, pendingCnt) {
  const s = {};
  s.active = active.length;
  s.delivered = delivered.length;
  s.longPending = pendingCnt || 0;

  s.duty = active.filter(
    (r) => String(getField(r, 'Filter', '') || '').toUpperCase() === 'DUTY'
  ).length;
  s.cleared = active.filter(
    (r) => String(getField(r, 'Filter', '') || '').toUpperCase() === 'CLR'
  ).length;

  const toNum = (v) => {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  };

  s.freight = delivered.reduce((a, r) => a + toNum(getField(r, 'FRT', 'Freight')), 0);
  s.pkgs = delivered.reduce(
    (a, r) => a + toNum(getField(r, 'No Of Pkgs', 'Packages', 'Pkgs')),
    0
  );
  s.weight = delivered.reduce(
    (a, r) => a + toNum(getField(r, 'Weight', 'Gross Weight')),
    0
  );
  s.suppliers = new Set(
    delivered.map((r) => getField(r, 'Supplier')).filter(Boolean)
  ).size;

  const mMap = {};
  const mFrt = {};
  delivered.forEach((r) => {
    const dv = getField(r, 'Wabco Delevered Date', 'Wabco Delivered Date', 'Date');
    if (!dv) return;
    const dt = new Date(dv);
    if (isNaN(dt)) return;
    const m = dt.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    mMap[m] = (mMap[m] || 0) + 1;
    mFrt[m] = (mFrt[m] || 0) + toNum(getField(r, 'FRT', 'Freight'));
  });
  const ms = Object.keys(mMap).sort((a, b) => new Date(a) - new Date(b));
  s.monthly = { labels: ms, data: ms.map((m) => mMap[m]) };
  s.mFreight = { labels: ms, data: ms.map((m) => Math.round(mFrt[m] || 0)) };

  const agg = (arr, fn, top = 8) => {
    const m = {};
    arr.forEach((r) => {
      const k = fn(r) || 'Other';
      m[k] = (m[k] || 0) + 1;
    });
    const sorted = Object.entries(m)
      .sort((a, b) => b[1] - a[1])
      .slice(0, top);
    return { labels: sorted.map((x) => x[0]), data: sorted.map((x) => x[1]) };
  };

  s.consol = agg(delivered, (r) => getField(r, 'Consol', 'Forwarder'), 6);
  s.units = agg(delivered, (r) => getField(r, 'Unit', 'Plant'), 7);
  s.suppliers_chart = agg(
    delivered,
    (r) => String(getField(r, 'Supplier') || '').substring(0, 30),
    8
  );
  s.customs = agg(active, (r) => getField(r, 'Customs Cleared', 'Customs Status'), 8);
  s.ports = agg(delivered, (r) => getField(r, 'Port Of Loading', 'POL'), 8);

  return s;
}
