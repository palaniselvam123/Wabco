import * as XLSX from 'xlsx';
import { DEF_ACTIVE, DEF_DELIVERED } from '../data/defaults';
import { computeStats } from './stats';
import { getRecordValue, hasUsefulValue, normalizeRecord } from './fields';

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
    'hbl',
    'mbl',
    'delivered',
    'material',
    'qty',
    'unit',
    'frt',
    'freight',
    'port',
    'b/e',
    'be no',
    'part',
    'vessel',
    'container',
    'igm',
    'shipper invoice',
  ];
  markers.forEach((m) => {
    if (joined.includes(m)) score += 1;
  });
  const textCells = row.filter((c) => typeof c === 'string' && c.trim().length > 0).length;
  score += Math.min(textCells / 4, 3);
  return score;
}

function isHeaderRow(row) {
  if (!Array.isArray(row) || row.length < 3) return false;
  const joined = row.map((c) => String(c || '').toLowerCase()).join(' | ');
  return joined.includes('job') && joined.includes('supplier') && scoreHeaderRow(row) >= 5;
}

function findHeaderSections(matrix) {
  const sections = [];
  for (let i = 0; i < matrix.length; i++) {
    if (isHeaderRow(matrix[i])) {
      sections.push(i);
    }
  }
  if (!sections.length && matrix.length) {
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
    sections.push(bestIdx);
  }
  return sections;
}

function matrixToRecords(matrix) {
  if (!matrix?.length) return [];
  const headerSections = findHeaderSections(matrix);
  const rows = [];

  headerSections.forEach((headerIdx, sectionIndex) => {
    const nextHeader =
      sectionIndex + 1 < headerSections.length
        ? headerSections[sectionIndex + 1]
        : matrix.length;
    const MAX_COLS = 42; // read up to column AP (index 41); AQ-AU are junk/formulae
    const headers = (matrix[headerIdx] || []).slice(0, MAX_COLS).map((h, i) => {
      const label = String(h ?? '').trim();
      return label || `__EMPTY_${i}`;
    });

    for (let r = headerIdx + 1; r < nextHeader; r++) {
      const line = (matrix[r] || []).slice(0, MAX_COLS);
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
  });

  return rows;
}

/**
 * Fill down Job No to continuation rows that share the same Supplier + Invoice.
 * Excel files commonly leave Job No blank on rows 2..N of the same shipment.
 */
function fillDownJobNo(records) {
  let lastJobNo = null;
  let lastInvoice = null;
  let lastSupplier = null;

  return records.map((r) => {
    const jobNo = String(r['Job No '] ?? r['Job No'] ?? '').trim();
    const invoice = String(
      r['Shipper Invoice No'] ?? r['Invoice No'] ?? ''
    ).trim();
    const supplier = String(r['Supplier'] ?? '').trim();

    if (jobNo && jobNo !== '-') {
      lastJobNo = jobNo;
      lastInvoice = invoice;
      lastSupplier = supplier;
      return r;
    }

    if (lastJobNo && supplier === lastSupplier && invoice && invoice === lastInvoice) {
      return { ...r, 'Job No ': lastJobNo };
    }

    return r;
  });
}

/** Copy LCL/FCL into Mode when air/sea mode column is empty */
function enrichTransportFields(records) {
  return records.map((r) => {
    const out = { ...r };
    if (!hasUsefulValue(out.Mode) && hasUsefulValue(out['LCL/FCL'])) {
      out.Mode = out['LCL/FCL'];
    }
    if (!hasUsefulValue(out['Eta Maa']) && hasUsefulValue(out['ETA MAA'])) {
      out['Eta Maa'] = out['ETA MAA'];
    }
    return out;
  });
}

function hasDeliveredDate(record) {
  return (
    hasUsefulValue(getRecordValue(record, 'Wabco Delevered Date', 'Wabco Delivered Date'))
  );
}

function splitActiveDelivered(records) {
  const active = [];
  const delivered = [];
  records.forEach((r) => {
    if (hasDeliveredDate(r)) delivered.push(r);
    else active.push(r);
  });
  return { active, delivered };
}

function readSheetRecords(wb, sheetName) {
  if (!sheetName) return [];
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  return enrichTransportFields(fillDownJobNo(matrixToRecords(sheetToMatrix(ws))));
}

function dedupeRecords(records) {
  const seen = new Set();
  const out = [];
  records.forEach((r) => {
    const key = [
      getRecordValue(r, 'Job No ', 'Job No') || '',
      getRecordValue(r, 'Part No') || '',
      getRecordValue(r, 'Invoice No', 'Shipper Invoice No') || '',
      getRecordValue(r, 'Supplier') || '',
    ].join('|');
    if (seen.has(key)) return;
    seen.add(key);
    out.push(r);
  });
  return out;
}

export function processWorkbook(wb, fileName) {
  const sheets = wb.SheetNames;
  const findSheet = (...keywords) =>
    sheets.find((s) =>
      keywords.some((k) => s.toLowerCase().includes(k.toLowerCase()))
    );

  const mainSheet =
    findSheet('Ambattur', 'Plant Shipment', 'Shipment', 'AIR', 'Active') ||
    sheets[0];
  const deliveredSheet = findSheet('DELIVERED', 'Delivered', 'Delivery', 'CARGO CLEARED', 'Cargo Cleared', 'Cleared');
  const pendingSheet = findSheet('Pending', 'PENDING', 'Long');
  const dailySheet = findSheet('Daily Report', 'Daily');

  const mainRecords = readSheetRecords(wb, mainSheet);
  let activeRaw = [];
  let deliveredRaw = [];

  if (deliveredSheet && deliveredSheet !== mainSheet) {
    activeRaw = mainRecords;
    deliveredRaw = readSheetRecords(wb, deliveredSheet);
  } else {
    const split = splitActiveDelivered(mainRecords);
    activeRaw = split.active;
    deliveredRaw = split.delivered;
  }

  if (dailySheet && dailySheet !== mainSheet) {
    const dailyRecords = readSheetRecords(wb, dailySheet);
    const dailySplit = splitActiveDelivered(dailyRecords);
    activeRaw = dedupeRecords([...activeRaw, ...dailySplit.active]);
    deliveredRaw = dedupeRecords([...deliveredRaw, ...dailySplit.delivered]);
  }

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
