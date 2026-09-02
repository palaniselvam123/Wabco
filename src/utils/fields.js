/** Canonical keys used across the app */
export const CANONICAL = {
  slNo: 'Sl No',
  jobNo: 'Job No ',
  date: 'Date',
  deliveredDate: 'Wabco Delevered Date',
  supplier: 'Supplier',
  partNo: 'Part No',
  material: 'Material Description',
  qty: 'Qty',
  unit: 'Unit',
  terms: 'Terms ',
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
  loadType: 'LCL/FCL',
  containerNo: 'Container No.',
  vesselName: 'VESSEL NAME',
  igmNo: 'IGM NO',
  igmDate: 'IGM DATE',
  inward: 'INWARD',
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
  challanNo: 'CHALLAN NO',
  oocDate: 'OOC DATE',
  cfs: 'CFS',
  cfsCharges: 'CFS CHARGES APPROXIMATELY',
  storageCharges: 'STORAGE CHARGES APROXIMATELY',
  totalCfsCharges: 'TOTAL CFS CHARGES APROXIMATELY',
  asn: 'ASN',
  asnDate: 'ASN Date',
  status: 'STATUS',
  deliveryPlace: 'Delivery Place',
  remarks: 'Remarks',
  invoiceCurrency: 'Invoice Currency',
  unitPrice: 'Unit Price',
  invoiceRate: 'Invoice Rate',
  exchangeRate: 'Exchange Rate',
  totalAmountInr: 'Total Amount In Inr',
  frt: 'FRT',
  ex: 'EX',
  totalCost: 'Total Cost',
  fineAmt: 'FINE AMT',
  truck: 'TRUCK',
  flightNo: 'Flight No ',
  vendorId: 'Vendor Id',
  freeDaysCompleted: 'Free Days Completed',
  bcNo: 'BC NO',
  location: 'Location',
};

/** Map normalized header text → canonical key */
const HEADER_ALIASES = [
  [/^(sl\s*no\.?|s\.?\s*no\.?|serial\s*no\.?)$/, CANONICAL.slNo],
  [/^(job\s*no\.?|job\s*number|job)$/, CANONICAL.jobNo],
  [/^(date|job\s*date|shipment\s*date)$/, CANONICAL.date],
  [/^(wabco\s*dele?vered\s*date|delivered\s*date|delivery\s*date)$/, CANONICAL.deliveredDate],
  [/^(supplier|vendor|shipper|supplier\s*name)$/, CANONICAL.supplier],
  [/^(part\s*no\.?|part\s*number|part\s*#|item\s*no\.?)$/, CANONICAL.partNo],
  [/^(material\s*description|material|description|item\s*description)$/, CANONICAL.material],
  [/^(qty|quantity|qnty)$/, CANONICAL.qty],
  [/^(unit|plant|destination|dest\s*unit)$/, CANONICAL.unit],
  [/^(terms?|incoterms?|delivery\s*terms?)$/, CANONICAL.terms],
  [
    /^(shipper\s*invoice\s*no\.?|invoice\s*no\.?|inv\s*no\.?|invoice\s*number)$/,
    CANONICAL.invoiceNo,
  ],
  [/^(invoice\s*date|inv\s*date)$/, CANONICAL.invoiceDate],
  [/^(po\s*no\.?|po\s*number|purchase\s*order|p\.?o\.?)$/, CANONICAL.poNo],
  [/^(country\s*of\s*origin|coo|origin\s*country|origin)$/, CANONICAL.origin],
  [/^(consol|forwarder|ff|freight\s*forwarder|consolidator)$/, CANONICAL.consol],
  [/^(hawb\s*no\.?|hawb|house\s*awb|hbl\s*no\.?|hbl)$/, CANONICAL.hawb],
  [/^(mawb\s*no\.?|mawb|master\s*awb|mbl\s*no\.?|mbl)$/, CANONICAL.mawb],
  [/^(port\s*of\s*loading|pol|origin\s*port|loading\s*port)$/, CANONICAL.port],
  [/^(eta\s*maa|eta|eta\s*chennai|eta\s*india)$/, CANONICAL.eta],
  [/^(ata\s*maa|ata|actual\s*arrival|arrived)$/, CANONICAL.ata],
  [/^(mode|shipment\s*mode|transport\s*mode)$/, CANONICAL.mode],
  [/^(lcl\/?fcl|load\s*type|container\s*type)$/, CANONICAL.loadType],
  [/^(container\s*no\.?|container\s*number|cntr\s*no\.?)$/, CANONICAL.containerNo],
  [/^(vessel\s*name|vessel|ship\s*name)$/, CANONICAL.vesselName],
  [/^(igm\s*no\.?|igm\s*number)$/, CANONICAL.igmNo],
  [/^(igm\s*date)$/, CANONICAL.igmDate],
  [/^(inward|inward\s*date|inward\s*no\.?)$/, CANONICAL.inward],
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
  [
    /^(assessable\s*value|assessable\s*val|av|ass\.?\s*value|ass\.?\s*value)$/,
    CANONICAL.assessable,
  ],
  [/^(challan\s*no\.?|challan\s*number)$/, CANONICAL.challanNo],
  [/^(ooc\s*date|out\s*of\s*charge\s*date)$/, CANONICAL.oocDate],
  [/^(cfs|cfs\s*name|container\s*freight\s*station)$/, CANONICAL.cfs],
  [/^(cfs\s*charges?\s*approx?imately|cfs\s*charges?)$/, CANONICAL.cfsCharges],
  [
    /^(storage\s*charges?\s*approx?imately|storage\s*charges?)$/,
    CANONICAL.storageCharges,
  ],
  [
    /^(total\s*cfs\s*charges?\s*approx?imately|total\s*cfs\s*charges?)$/,
    CANONICAL.totalCfsCharges,
  ],
  [/^(asn|asn\s*status|asn\s*no\.?|asn\s*number)$/, CANONICAL.asn],
  [/^(asn\s*date)$/, CANONICAL.asnDate],
  [/^(status|shipment\s*status)$/, CANONICAL.status],
  [/^(delivery\s*place|del\s*place|delivery\s*location)$/, CANONICAL.deliveryPlace],
  [/^(remarks?|comments?|notes?)$/, CANONICAL.remarks],
  [/^(invoice\s*currency|currency|inv\s*currency)$/, CANONICAL.invoiceCurrency],
  [/^(unit\s*price|price\s*per\s*unit)$/, CANONICAL.unitPrice],
  [/^(invoice\s*rate|inv\s*rate|line\s*amount)$/, CANONICAL.invoiceRate],
  [/^(exchange\s*rate|fx\s*rate|forex\s*rate)$/, CANONICAL.exchangeRate],
  [/^(total\s*amount\s*in\s*inr|total\s*inr|amount\s*inr)$/, CANONICAL.totalAmountInr],
  [
    /^(frt|freight|air\s*freight|frt\s*\(?inr\)?|freight\s*cost|freight\s*charges?)$/,
    CANONICAL.frt,
  ],
  [/^(ex|ex\s*\(?inr\)?|expenses|other\s*charges)$/, CANONICAL.ex],
  [/^(total\s*cost|grand\s*total|total)$/, CANONICAL.totalCost],
  [/^(fine\s*amt|fine\s*amount|penalty\s*amount)$/, CANONICAL.fineAmt],
  [/^(truck|truck\s*no\.?|vehicle\s*no\.?)$/, CANONICAL.truck],
  [/^(flight\s*no\.?|flight\s*number|flt\s*no\.?)$/, CANONICAL.flightNo],
  [/^(vendor\s*id|vendor\s*code)$/, CANONICAL.vendorId],
  [/^(free\s*days?\s*completed|free\s*days?)$/, CANONICAL.freeDaysCompleted],
  [/^(bc\s*no\.?|bc\s*number)$/, CANONICAL.bcNo],
  [/^(location|loc)$/, CANONICAL.location],
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
