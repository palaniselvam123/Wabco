import { normalizeHeader } from './fields';

export function fmtCur(n) {
  if (n >= 1e7) return '₹' + (n / 1e7).toFixed(2) + ' Cr';
  if (n >= 1e5) return '₹' + (n / 1e5).toFixed(1) + 'L';
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

export function fmtN(n) {
  if (n >= 1e5) return (n / 1e5).toFixed(1) + 'L';
  return Math.round(n).toLocaleString('en-IN');
}

export function fmtDate(v) {
  if (!v) return '—';
  if (typeof v === 'number' && v > 40000) {
    const d = new Date((v - 25569) * 86400000);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
  const d = new Date(v);
  if (!isNaN(d) && String(v).length > 5) {
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
  return String(v);
}

export function fmtMoney(v) {
  const n = parseFloat(v);
  if (isNaN(n) || v == null || v === '') return '—';
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

export function isOverdue(eta) {
  if (!eta) return false;
  const d = new Date(eta);
  return !isNaN(d) && d < new Date();
}

export function getField(r, ...keys) {
  if (!r) return null;
  for (const k of keys) {
    if (r[k] != null && r[k] !== '') return r[k];
  }
  const map = {};
  Object.keys(r).forEach((k) => {
    map[normalizeHeader(k)] = k;
  });
  for (const k of keys) {
    const hit = map[normalizeHeader(k)];
    if (hit != null && r[hit] != null && r[hit] !== '') return r[hit];
  }
  return null;
}
