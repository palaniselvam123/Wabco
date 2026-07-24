import { getField } from './format';

export function uniqueValues(arr, fn) {
  return [...new Set(arr.map(fn).filter(Boolean))].sort();
}

export function recordMonth(r) {
  const dv =
    getField(r, 'Wabco Delevered Date', 'Wabco Delivered Date', 'Date', 'Eta Maa') ||
    null;
  if (!dv) return null;
  const d = new Date(dv);
  if (isNaN(d)) return null;
  return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

export function matchesDashboardFilters(r, filters) {
  const {
    supplier = '',
    consol = '',
    unit = '',
    status = '',
    port = '',
    origin = '',
    mode = '',
    month = '',
    search = '',
  } = filters || {};

  if (supplier && getField(r, 'Supplier') !== supplier) return false;
  if (consol && getField(r, 'Consol', 'Forwarder') !== consol) return false;
  if (unit && getField(r, 'Unit', 'Plant') !== unit) return false;
  if (status && getField(r, 'Customs Cleared', 'Customs Status') !== status) return false;
  if (port && getField(r, 'Port Of Loading', 'POL') !== port) return false;
  if (origin && getField(r, 'Country Of Origin', 'COO') !== origin) return false;
  if (mode && getField(r, 'Mode') !== mode) return false;
  if (month && recordMonth(r) !== month) return false;
  if (search && !JSON.stringify(r).toLowerCase().includes(search.toLowerCase())) {
    return false;
  }
  return true;
}

export function filterRecords(arr, filters) {
  if (!arr?.length) return [];
  return arr.filter((r) => matchesDashboardFilters(r, filters));
}

export function emptyFilters() {
  return {
    supplier: '',
    consol: '',
    unit: '',
    status: '',
    port: '',
    origin: '',
    mode: '',
    month: '',
    search: '',
  };
}

/** Resolve records for a chart segment click */
export function recordsForChartClick({ chartId, label, fullLabel }, activeData, deliveredData) {
  const key = fullLabel || label;
  if (!key) return { records: [], type: 'delivered', title: 'Records' };

  switch (chartId) {
    case 'monthly':
    case 'freight':
      return {
        type: 'delivered',
        title: `Delivered in ${key}`,
        records: deliveredData.filter((r) => recordMonth(r) === key),
      };
    case 'consol':
      return {
        type: 'delivered',
        title: `Forwarder: ${key}`,
        records: deliveredData.filter(
          (r) => getField(r, 'Consol', 'Forwarder') === key
        ),
      };
    case 'suppliers':
      return {
        type: 'delivered',
        title: `Supplier: ${key}`,
        records: deliveredData.filter((r) => {
          const s = String(getField(r, 'Supplier') || '');
          return s === key || s.startsWith(key.replace(/…$/, ''));
        }),
      };
    case 'units':
      return {
        type: 'delivered',
        title: `Plant: ${key}`,
        records: deliveredData.filter((r) => {
          const u = String(getField(r, 'Unit', 'Plant') || '');
          return (
            u === key ||
            u.toLowerCase() === key.toLowerCase() ||
            (key === 'Ambattur' && u === 'AMB') ||
            (key === 'Safexpress' && u.toUpperCase() === 'SAFEXPRESS') ||
            (key === 'Jharkhand' && u.toUpperCase() === 'JHARKHAND') ||
            (key === 'Uttar Pradesh' && /uttar|up/i.test(u))
          );
        }),
      };
    case 'customs':
      return {
        type: 'active',
        title: `Customs: ${key}`,
        records: activeData.filter((r) => {
          const s = String(getField(r, 'Customs Cleared', 'Customs Status') || '');
          const compact = s.replace(/\s+/g, '');
          const keyCompact = String(key).replace(/\s+/g, '');
          return (
            s === key ||
            compact.toUpperCase() === keyCompact.toUpperCase() ||
            s.toUpperCase().includes(String(key).toUpperCase()) ||
            String(key).toUpperCase().includes(s.toUpperCase())
          );
        }),
      };
    case 'ports':
      return {
        type: 'delivered',
        title: `Port: ${key}`,
        records: deliveredData.filter(
          (r) => getField(r, 'Port Of Loading', 'POL') === key
        ),
      };
    default:
      return { records: [], type: 'delivered', title: 'Records' };
  }
}
