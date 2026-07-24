/** Canonical keys used across the app */
export const CANONICAL = {
  jobNo: 'Job No ',
  date: 'Date',
  deliveredDate: 'Wabco Delevered Date',
  supplier: 'Supplier',
  partNo: 'Part No',
  material: 'Material Description',
  qty: 'Qty',
  unit: 'Unit',
  invoiceNo: 'Invoice No',
  invoiceDate: 'Invoice Date',
  poNo: 'PO No',
  origin: 'Country Of Origin',
  consol: 'Consol',
  hawb: 'HAWB No.',
  mawb: 'MAWB No.',
  port: 'Port Of Loading',
  eta: 'Eta Maa',
  ata: 'Ata Maa',
  mode: 'Mode',
  pkgs: 'No Of Pkgs',
  weight: 'Weight',
  cbm: 'CBM',
  cha: 'CHA',
  beNo: 'B/E No',
  beDate: 'B/E Date',
  customs: 'Customs Cleared',
  filter: 'Filter',
  dutyAdvised: 'Duty Advised ',
  dutyReceived: 'Duty Received',
  dutyAmount: 'Duty Amount',
  assessable: 'Assessable Value',
  asn: 'ASN',
  asnDate: 'ASN Date',
  remarks: 'Remarks',
  frt: 'FRT',
  ex: 'EX',
  totalCost: 'Total Cost',
};

/** Map normalized header text → canonical key */
const HEADER_ALIASES = [
  [/^(job\s*no\.?|job\s*number|job)$/, CANONICAL.jobNo],
  [/^(date|job\s*date|shipment\s*date)$/, CANONICAL.date],
  [/^(wabco\s*dele?vered\s*date|delivered\s*date|delivery\s*date)$/, CANONICAL.deliveredDate],
  [/^(supplier|vendor|shipper)$/, CANONICAL.supplier],
  [/^(part\s*no\.?|part\s*number|part\s*#|item\s*no\.?)$/, CANONICAL.partNo],
  [/^(material\s*description|material|description|item\s*description)$/, CANONICAL.material],
  [/^(qty|quantity|qnty)$/, CANONICAL.qty],
  [/^(unit|plant|destination|dest\s*unit)$/, CANONICAL.unit],
  [/^(invoice\s*no\.?|inv\s*no\.?|invoice\s*number)$/, CANONICAL.invoiceNo],
  [/^(invoice\s*date|inv\s*date)$/, CANONICAL.invoiceDate],
  [/^(po\s*no\.?|po\s*number|purchase\s*order|p\.?o\.?)$/, CANONICAL.poNo],
  [/^(country\s*of\s*origin|coo|origin\s*country|origin)$/, CANONICAL.origin],
  [/^(consol|forwarder|ff|freight\s*forwarder|consolidator)$/, CANONICAL.consol],
  [/^(hawb\s*no\.?|hawb|house\s*awb|hbl)$/, CANONICAL.hawb],
  [/^(mawb\s*no\.?|mawb|master\s*awb|mbl)$/, CANONICAL.mawb],
  [/^(port\s*of\s*loading|pol|origin\s*port|loading\s*port)$/, CANONICAL.port],
  [/^(eta\s*maa|eta|eta\s*chennai|eta\s*india)$/, CANONICAL.eta],
  [/^(ata\s*maa|ata|actual\s*arrival|arrived)$/, CANONICAL.ata],
  [/^(mode|shipment\s*mode|transport\s*mode)$/, CANONICAL.mode],
  [/^(no\s*of\s*pkgs?|packages|pkgs?|no\.?\s*of\s*packages)$/, CANONICAL.pkgs],
  [/^(weight|gross\s*weight|wt|gr\.?\s*wt)$/, CANONICAL.weight],
  [/^(cbm|volume|vol)$/, CANONICAL.cbm],
  [/^(cha|custom\s*house\s*agent|customs\s*broker)$/, CANONICAL.cha],
  [/^(b\/?e\s*no\.?|be\s*no\.?|bill\s*of\s*entry|boe\s*no\.?)$/, CANONICAL.beNo],
  [/^(b\/?e\s*date|be\s*date|boe\s*date)$/, CANONICAL.beDate],
  [/^(customs\s*cleared|customs\s*status|clearance\s*status|customs)$/, CANONICAL.customs],
  [/^(filter|filter\s*flag|status\s*flag)$/, CANONICAL.filter],
  [/^(duty\s*advised|duty\s*advise\s*date|duty\s*advise)$/, CANONICAL.dutyAdvised],
  [/^(duty\s*received|duty\s*receipt\s*date|duty\s*recv)$/, CANONICAL.dutyReceived],
  [/^(duty\s*amount|customs\s*duty|duty\s*inr|duty)$/, CANONICAL.dutyAmount],
  [/^(assessable\s*value|assessable\s*val|av|ass\.?\s*value)$/, CANONICAL.assessable],
  [/^(asn|asn\s*status|asn\s*no\.?)$/, CANONICAL.asn],
  [/^(asn\s*date)$/, CANONICAL.asnDate],
  [/^(remarks?|comments?|notes?)$/, CANONICAL.remarks],
  [/^(frt|freight|air\s*freight|frt\s*\(?inr\)?|freight\s*cost)$/, CANONICAL.frt],
  [/^(ex|ex\s*\(?inr\)?|expenses|other\s*charges)$/, CANONICAL.ex],
  [/^(total\s*cost|grand\s*total|total)$/, CANONICAL.totalCost],
];

export function normalizeHeader(header) {
  return String(header ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/[_./]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function canonicalKeyForHeader(header) {
  const norm = normalizeHeader(header);
  if (!norm) return null;
  for (const [re, canonical] of HEADER_ALIASES) {
    if (re.test(norm)) return canonical;
  }
  // Keep original trimmed header if unknown
  return String(header).replace(/\u00a0/g, ' ').replace(/[\r\n]+/g, ' ').trim();
}

export function hasUsefulValue(value) {
  if (value == null) return false;
  if (typeof value === 'number') return !Number.isNaN(value);
  const s = String(value).trim();
  return s !== '' && s !== '-' && s.toLowerCase() !== 'null' && s.toLowerCase() !== 'n/a';
}

/** Normalize one Excel row onto canonical keys while keeping extras */
export function normalizeRecord(row) {
  const out = {};
  Object.entries(row || {}).forEach(([header, value]) => {
    if (header == null || String(header).startsWith('__EMPTY')) return;
    const key = canonicalKeyForHeader(header);
    if (!key) return;

    // Prefer first non-empty value if duplicate headers map to same key
    if (Object.prototype.hasOwnProperty.call(out, key) && hasUsefulValue(out[key])) {
      return;
    }
    out[key] = value;
  });
  return out;
}

export function getRecordValue(record, ...keys) {
  if (!record) return null;

  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(record, k) && hasUsefulValue(record[k])) {
      return record[k];
    }
  }

  const map = {};
  Object.keys(record).forEach((k) => {
    map[normalizeHeader(k)] = k;
  });

  for (const k of keys) {
    const hit = map[normalizeHeader(k)];
    if (hit && hasUsefulValue(record[hit])) return record[hit];
  }

  // last resort: return first existing key even if empty (for display of structure)
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(record, k)) return record[k];
    const hit = map[normalizeHeader(k)];
    if (hit) return record[hit];
  }
  return null;
}

export function resolveRecordKey(record, keys) {
  if (!record) return null;
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(record, k)) return k;
  }
  const map = {};
  Object.keys(record).forEach((k) => {
    map[normalizeHeader(k)] = k;
  });
  for (const k of keys) {
    const hit = map[normalizeHeader(k)];
    if (hit) return hit;
  }
  return null;
}
