import { getField } from './format';
import { hasUsefulValue } from './fields';

/**
 * Air or Sea for a shipment row.
 *
 * The Job No prefix (AIC / SIC) is the primary signal, but continuation rows
 * often carry a blank or "-" Job No. Those fall back to documents that only
 * exist for one mode: a vessel name, MBL or LCL/FCL means sea; an air waybill
 * or flight number means air.
 */
export function transportMode(r) {
  const jn = String(getField(r, 'Job No ', 'Job No') || '');
  if (/^AIC/i.test(jn)) return 'air';
  if (/^SIC/i.test(jn)) return 'sea';

  if (
    hasUsefulValue(getField(r, 'VESSEL NAME', 'Vessel Name')) ||
    hasUsefulValue(getField(r, 'LCL/FCL', 'Load Type')) ||
    hasUsefulValue(getField(r, 'MBL NO', 'MBL No', 'MBL/HBL'))
  ) {
    return 'sea';
  }
  if (
    hasUsefulValue(getField(r, 'MAWB No.', 'MAWB No', 'MAWB')) ||
    hasUsefulValue(getField(r, 'Flight No', 'Flight'))
  ) {
    return 'air';
  }

  // Continuation rows of a multi-part shipment carry none of the transport
  // documents — those sit on the parent row only. Their status text usually
  // still names the mode ("AWAITING FOR VESSEL ARRIVAL"), so read that last.
  const status = `${getField(r, 'STATUS', 'Status') || ''} ${
    getField(r, 'Remarks') || ''
  }`;
  if (/vessel|sailing|berth|port\s*of\s*discharge/i.test(status)) return 'sea';
  if (/flight|airway|air\s*freight/i.test(status)) return 'air';

  return 'other';
}

export function computeStats(active, delivered, pendingCnt) {
  const s = {};
  s.active = active.length;
  s.delivered = delivered.length;
  s.longPending = pendingCnt || 0;

  s.duty = active.filter(
    (r) => String(getField(r, 'Filter', '') || '').toUpperCase() === 'DUTY'
  ).length;
  // OOC Received — shipments where customs has released the goods,
  // i.e. an OOC date exists on the record.
  const oocRows = active.filter((r) =>
    hasUsefulValue(getField(r, 'OOC DATE', 'OOC Date', 'Customs Cleared'))
  );
  s.cleared = oocRows.length;

  // Most recent OOC date, shown beneath the count.
  s.lastOocDate = oocRows
    .map((r) => new Date(getField(r, 'OOC DATE', 'OOC Date', 'Customs Cleared')))
    .filter((d) => !isNaN(d))
    .sort((a, b) => b - a)[0] || null;

  const toNum = (v) => {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  };

  s.pkgs = delivered.reduce(
    (a, r) => a + toNum(getField(r, 'No Of Pkgs', 'Packages', 'Pkgs')),
    0
  );
  s.weight = delivered.reduce(
    (a, r) => a + toNum(getField(r, 'Weight', 'Gross Weight')),
    0
  );
  s.suppliers = new Set(
    [...active, ...delivered].map((r) => getField(r, 'Supplier')).filter(Boolean)
  ).size;

  // --- Air vs Sea ---
  const allRows = [...active, ...delivered];
  let airCount = 0, seaCount = 0;
  allRows.forEach((r) => {
    const mode = transportMode(r);
    if (mode === 'air') airCount++;
    else if (mode === 'sea') seaCount++;
  });
  s.airVsSea = { air: airCount, sea: seaCount };

  // --- Duty not paid (OOC Date empty) ---
  s.dutyNotPaid = allRows.filter((r) => {
    const ooc = getField(r, 'OOC DATE', 'OOC Date', 'Customs Cleared');
    return !hasUsefulValue(ooc);
  }).length;

  // --- BE Filed but OOC not given > 2 days (active shipments only) ---
  const today = new Date();
  s.beFiledNoOoc = active.filter((r) => {
    const beDate = getField(r, 'B/E Date', 'BE Date');
    const ooc = getField(r, 'OOC DATE', 'OOC Date', 'Customs Cleared');
    if (!hasUsefulValue(beDate) || hasUsefulValue(ooc)) return false;
    const bd = new Date(beDate);
    if (isNaN(bd)) return false;
    return (today - bd) / 86400000 >= 2;
  }).length;

  // --- Total CFS Costs, over pending (active) and delivered alike ---
  const cfsOf = (r) =>
    toNum(
      getField(
        r,
        'TOTAL CFS CHARGES APROXIMATELY',
        'TOTAL CFS CHARGES APPROXIMATELY',
        'Total Cfs Charges',
        'TOTAL CFS CHARGES'
      )
    );
  s.totalCfsCost = allRows.reduce((a, r) => a + cfsOf(r), 0);
  s.cfsCostPending = active.reduce((a, r) => a + cfsOf(r), 0);
  s.cfsCostDelivered = delivered.reduce((a, r) => a + cfsOf(r), 0);

  // --- ETA Today / This Week / 14-day distribution ---
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(todayStart); weekEnd.setDate(todayStart.getDate() + 7);

  const getEtaDate = (r) => {
    const v = getField(r, 'Eta Maa', 'ETA MAA');
    if (!v) return null;
    const d = new Date(v); d.setHours(0, 0, 0, 0);
    return isNaN(d) ? null : d;
  };

  s.etaToday = active.filter((r) => {
    const d = getEtaDate(r);
    return d && d.getTime() === todayStart.getTime();
  }).length;

  s.etaThisWeek = active.filter((r) => {
    const d = getEtaDate(r);
    return d && d >= todayStart && d < weekEnd;
  }).length;

  const etaDayDates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(todayStart); d.setDate(d.getDate() + i);
    return d;
  });
  const etaDayLabels = etaDayDates.map((d) =>
    d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
  );
  const etaDayCounts = new Array(14).fill(0);
  active.forEach((r) => {
    const d = getEtaDate(r);
    if (!d) return;
    const diff = Math.round((d - todayStart) / 86400000);
    if (diff >= 0 && diff < 14) etaDayCounts[diff]++;
  });
  // `dates` lets a clicked bar resolve back to an exact day for the drill-down.
  s.etaChart = {
    labels: etaDayLabels,
    data: etaDayCounts,
    dates: etaDayDates.map((d) => d.toISOString()),
  };

  // Per-date ETA counts, keyed YYYY-MM-DD in local time, so the calendar
  // view can render any month rather than just the next fortnight.
  // Split by transport mode so the calendar can show Air and Sea separately,
  // the way a planner reads a wall calendar.
  const etaByDate = {};
  active.forEach((r) => {
    const d = getEtaDate(r);
    if (!d) return;
    const key =
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-` +
      `${String(d.getDate()).padStart(2, '0')}`;
    const mode = transportMode(r);
    if (!etaByDate[key]) etaByDate[key] = { total: 0, air: 0, sea: 0, other: 0 };
    etaByDate[key].total += 1;
    etaByDate[key][mode] += 1;
  });
  s.etaByDate = etaByDate;

  // --- Monthly delivery trend ---
  const mMap = {};
  delivered.forEach((r) => {
    const dv = getField(r, 'Wabco Delevered Date', 'Wabco Delivered Date', 'Date');
    if (!dv) return;
    const dt = new Date(dv);
    if (isNaN(dt)) return;
    const m = dt.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    mMap[m] = (mMap[m] || 0) + 1;
  });
  const ms = Object.keys(mMap).sort((a, b) => new Date(a) - new Date(b));
  s.monthly = { labels: ms, data: ms.map((m) => mMap[m]) };

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

  // --- Top suppliers by invoice value ---
  const supValMap = {};
  allRows.forEach((r) => {
    const sup = String(getField(r, 'Supplier') || '').trim().substring(0, 30);
    if (!sup) return;
    supValMap[sup] = (supValMap[sup] || 0) + toNum(getField(r, 'Invoice Rate', 'Inv Rate'));
  });
  const sortedSupVal = Object.entries(supValMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
  s.suppliersByValue = {
    labels: sortedSupVal.map((x) => x[0]),
    data: sortedSupVal.map((x) => Math.round(x[1])),
  };

  // --- Estimate (Invoice Rate) vs Actual (ASS. VALUE) by month ---
  const estMap = {}, actMap = {};
  allRows.forEach((r) => {
    const d = getField(r, 'Date');
    if (!d) return;
    const dt = new Date(d);
    if (isNaN(dt)) return;
    const m = dt.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    // Estimated = the approximate CFS charge; actual = the final total charged.
    estMap[m] =
      (estMap[m] || 0) +
      toNum(getField(r, 'CFS CHARGES APPROXIMATELY', 'CFS CHARGES', 'Cfs Charges'));
    actMap[m] =
      (actMap[m] || 0) +
      toNum(
        getField(
          r,
          'TOTAL CFS CHARGES APROXIMATELY',
          'TOTAL CFS CHARGES APPROXIMATELY',
          'TOTAL CFS CHARGES'
        )
      );
  });
  const evaMs = Object.keys(estMap).sort((a, b) => new Date(a) - new Date(b));
  s.estimateVsActual = {
    labels: evaMs,
    estimate: evaMs.map((m) => Math.round(estMap[m] || 0)),
    actual: evaMs.map((m) => Math.round(actMap[m] || 0)),
  };

  return s;
}
