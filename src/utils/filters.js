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

// All filter fields use arrays for multi-select; search stays a string
export function emptyFilters() {
  return {
    supplier: [],
    consol: [],
    unit: [],
    status: [],
    port: [],
    origin: [],
    lclFcl: [],   // LCL / FCL container type (replaces free-text Mode)
    month: [],
    search: '',
  };
}

export function hasActiveFilters(filters) {
  const { search, ...rest } = filters || {};
  return Boolean(search) || Object.values(rest).some((v) => Array.isArray(v) && v.length > 0);
}

export function matchesDashboardFilters(r, filters) {
  const {
    supplier = [],
    consol = [],
    unit = [],
    status = [],
    port = [],
    origin = [],
    lclFcl = [],
    month = [],
    search = '',
  } = filters || {};

  if (supplier.length && !supplier.includes(getField(r, 'Supplier'))) return false;
  if (consol.length && !consol.includes(getField(r, 'Consol', 'Forwarder'))) return false;
  if (unit.length && !unit.includes(getField(r, 'Unit', 'Plant'))) return false;
  if (status.length && !status.includes(getField(r, 'Customs Cleared', 'Customs Status'))) return false;
  if (port.length && !port.includes(getField(r, 'Port Of Loading', 'POL'))) return false;
  if (origin.length && !origin.includes(getField(r, 'Country Of Origin', 'COO'))) return false;
  if (lclFcl.length && !lclFcl.includes(getField(r, 'LCL/FCL', 'Load Type'))) return false;
  if (month.length && !month.includes(recordMonth(r))) return false;
  if (search && !JSON.stringify(r).toLowerCase().includes(search.toLowerCase())) return false;
  return true;
}

export function filterRecords(arr, filters) {
  if (!arr?.length) return [];
  return arr.filter((r) => matchesDashboardFilters(r, filters));
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
        records: deliveredData.filter((r) => getField(r, 'Consol', 'Forwarder') === key),
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
        records: deliveredData.filter((r) => getField(r, 'Port Of Loading', 'POL') === key),
      };
    default:
      return { records: [], type: 'delivered', title: 'Records' };
  }
}
