import { CANONICAL } from './fields';

function rowKey(record) {
  const jobNo = String(record[CANONICAL.jobNo] ?? record['Job No'] ?? '').trim();
  const partNo = String(record[CANONICAL.partNo] ?? '').trim();
  const hawb   = String(record[CANONICAL.hawb]   ?? '').trim();
  const inv    = String(record[CANONICAL.invoiceNo] ?? record['Shipper Invoice No'] ?? '').trim();
  const sup    = String(record[CANONICAL.supplier]  ?? '').trim();

  const hasJobNo  = jobNo  && jobNo  !== '-';
  const hasPartNo = partNo && partNo !== '-';
  const hasHawb   = hawb   && hawb   !== '-';
  const hasInv    = inv    && inv    !== '-';
  const hasSup    = sup    && sup    !== '-';

  // 1. Job No + Part No  (most precise — one line item per part per shipment)
  if (hasJobNo && hasPartNo) return `${jobNo}|${partNo}`;

  // 2. Job No alone       (single-part shipment or Part No column missing)
  if (hasJobNo) return `job:${jobNo}`;

  // 3. HAWB + Part No     (no Job No, but HAWB identifies the shipment)
  if (hasHawb && hasPartNo) return `hawb:${hawb}|${partNo}`;

  // 4. Supplier + Invoice + Part No
  if (hasSup && hasInv && hasPartNo) return `inv:${sup}|${inv}|${partNo}`;

  // 5. Supplier + Invoice  (single-part or Part No missing)
  if (hasSup && hasInv) return `inv:${sup}|${inv}`;

  return null; // unidentifiable — replaced each upload, not merged
}

/**
 * Merge an incoming upload into existing data.
 * - Keyed rows (Job No / HAWB / Invoice+Supplier): upsert
 * - Unkeyed rows: replaced entirely by whatever is in the new file
 * - Rows that move from active → delivered: removed from active automatically
 */
export function mergeShipmentData(existing, incoming) {
  const existingActive = existing?.activeData ?? [];
  const existingDelivered = existing?.deliveredData ?? [];
  const { activeData: incomingActive, deliveredData: incomingDelivered } = incoming;

  const activeMap = new Map();
  existingActive.forEach((r) => {
    const k = rowKey(r);
    if (k) activeMap.set(k, r);
  });

  const deliveredMap = new Map();
  existingDelivered.forEach((r) => {
    const k = rowKey(r);
    if (k) deliveredMap.set(k, r);
  });

  let newActive = 0, updatedActive = 0;
  let newDelivered = 0, updatedDelivered = 0, movedToDelivered = 0;
  const noKeyActive = [];
  const noKeyDelivered = [];

  // Process delivered first — it takes priority over active
  incomingDelivered.forEach((r) => {
    const k = rowKey(r);
    if (!k) { noKeyDelivered.push(r); return; }

    if (deliveredMap.has(k)) {
      updatedDelivered++;
    } else if (activeMap.has(k)) {
      movedToDelivered++;
      activeMap.delete(k);
    } else {
      newDelivered++;
    }
    deliveredMap.set(k, r);
  });

  // Process active — skip anything already delivered
  incomingActive.forEach((r) => {
    const k = rowKey(r);
    if (!k) { noKeyActive.push(r); return; }
    if (deliveredMap.has(k)) return;

    if (activeMap.has(k)) updatedActive++;
    else newActive++;

    activeMap.set(k, r);
  });

  return {
    activeData: [...activeMap.values(), ...noKeyActive],
    deliveredData: [...deliveredMap.values(), ...noKeyDelivered],
    summary: { newActive, updatedActive, newDelivered, updatedDelivered, movedToDelivered },
  };
}
