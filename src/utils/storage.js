import { apiFetch } from './auth'

const API = '/api/shipment-data'

/** @returns {Promise<{ activeData: object[], deliveredData: object[], fileName?: string, savedAt?: string } | null>} */
export async function loadShipmentData() {
  try {
    const data = await apiFetch(API)
    if (
      !data ||
      !Array.isArray(data.activeData) ||
      !Array.isArray(data.deliveredData) ||
      (data.activeData.length === 0 && data.deliveredData.length === 0)
    ) {
      return null
    }
    return data
  } catch {
    return null
  }
}

/**
 * Persists merged shipment data. The server independently re-checks that the
 * caller holds the upload permission, so a tampered client cannot write.
 * @param {{ activeData: object[], deliveredData: object[], fileName?: string }} payload
 */
export async function saveShipmentData(payload) {
  const record = {
    activeData: payload.activeData,
    deliveredData: payload.deliveredData,
    fileName: payload.fileName || '',
  }
  const res = await apiFetch(API, {
    method: 'POST',
    body: JSON.stringify(record),
  })
  return { ...record, savedAt: res?.savedAt || new Date().toISOString() }
}

export async function clearShipmentData() {
  // no-op: use the upload UI to replace data
}
