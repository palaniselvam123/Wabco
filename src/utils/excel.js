import * as XLSX from 'xlsx';
import { DEF_ACTIVE, DEF_DELIVERED } from '../data/defaults';
import { computeStats } from './stats';
import { hasUsefulValue, normalizeRecord } from './fields';

function sheetToMatrix(ws) {
  return XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: null,
    raw: false,
    blankrows: false,
  });
}

function scoreHeaderRow(row) {
  if (!Array.isArray(row) || row.length < 3) return 0;
  const joined = row.map((c) => String(c || '').toLowerCase()).join(' | ');
  let score = 0;
  const markers = [
    'job',
    'supplier',
    'consol',
    'eta',
    'customs',
    'hawb',
    'mawb',
    'delivered',
    'material',
    'qty',
    'unit',
    'frt',
    'port',
    'b/e',
    'be no',
    'part',
  ];
  markers.forEach((m) => {
    if (joined.includes(m)) score += 1;
  });
  // Prefer rows that look like headers (many short text cells, few numbers)
  const textCells = row.filter((c) => typeof c === 'string' && c.trim().length > 0).length;
  score += Math.min(textCells / 4, 3);
  return score;
}

function findHeaderRowIndex(matrix) {
  let bestIdx = 0;
  let bestScore = -1;
  const limit = Math.min(matrix.length, 12);
  for (let i = 0; i < limit; i++) {
    const score = scoreHeaderRow(matrix[i]);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function matrixToRecords(matrix) {
  if (!matrix?.length) return [];
  const headerIdx = findHeaderRowIndex(matrix);
  const headers = (matrix[headerIdx] || []).map((h, i) => {
    const label = String(h ?? '').trim();
    return label || `__EMPTY_${i}`;
  });

  const rows = [];
  for (let r = headerIdx + 1; r < matrix.length; r++) {
    const line = matrix[r] || [];
    if (!line.some((c) => hasUsefulValue(c))) continue;

    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = line[i] ?? null;
    });
    const normalized = normalizeRecord(obj);

    const hasIdentity =
      hasUsefulValue(normalized['Job No ']) ||
      hasUsefulValue(normalized['Job No']) ||
      hasUsefulValue(normalized.Supplier) ||
      hasUsefulValue(normalized['Material Description']);

    if (hasIdentity) rows.push(normalized);
  }
  return rows;
}

function readSheetRecords(wb, sheetName) {
  if (!sheetName) return [];
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  return matrixToRecords(sheetToMatrix(ws));
}

export function processWorkbook(wb, fileName) {
  const sheets = wb.SheetNames;
  const findSheet = (...keywords) =>
    sheets.find((s) =>
      keywords.some((k) => s.toLowerCase().includes(k.toLowerCase()))
    );

  const activeSheet = findSheet('Ambattur', 'Plant', 'AIR', 'Active') || sheets[0];
  const deliveredSheet =
    findSheet('DELIVERED', 'Delivered', 'Delivery') ||
    sheets.find((s) => s !== activeSheet) ||
    sheets[1];
  const pendingSheet = findSheet('Pending', 'PENDING', 'Long');

  const activeRaw = readSheetRecords(wb, activeSheet);
  const deliveredRaw = readSheetRecords(wb, deliveredSheet);

  let pendingCount = 0;
  if (pendingSheet) {
    pendingCount = readSheetRecords(wb, pendingSheet).length;
  }

  const activeData = activeRaw.length > 0 ? activeRaw : DEF_ACTIVE.map((r) => ({ ...r }));
  const deliveredData =
    deliveredRaw.length > 0 ? deliveredRaw : DEF_DELIVERED.map((r) => ({ ...r }));
  const stats = computeStats(activeData, deliveredData, pendingCount);

  return {
    activeData,
    deliveredData,
    stats,
    message: `"${fileName}" loaded — ${activeData.length} active shipments, ${deliveredData.length} delivered records.`,
  };
}

export function readExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, {
          type: 'array',
          cellDates: true,
          cellText: false,
        });
        resolve(processWorkbook(wb, file.name));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('File read error.'));
    reader.readAsArrayBuffer(file);
  });
}
