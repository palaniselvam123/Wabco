const API = '/api/shipment-data'
const WRITE_KEY = 'wabco2026'

/** @returns {Promise<{ activeData: object[], deliveredData: object[], fileName?: string, savedAt?: string } | null>} */
export async function loadShipmentData() {
  try {
    const res = await fetch(API)
    if (!res.ok) return null
    const data = await res.json()
    if (!data || !Array.isArray(data.activeData) || !Array.isArray(data.deliveredData) ||
        (data.activeData.length === 0 && data.deliveredData.length === 0)) {
      return null
    }
    return data
  } catch {
    return null
  }
}

/** @param {{ activeData: object[], deliveredData: object[], fileName?: string }} payload */
export async function saveShipmentData(payload) {
  const record = {
    activeData: payload.activeData,
    deliveredData: payload.deliveredData,
    fileName: payload.fileName || '',
    savedAt: new Date().toISOString(),
  }
  await fetch(API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-wabco-key': WRITE_KEY,
    },
    body: JSON.stringify(record),
  })
  return record
}

export async function clearShipmentData() {
  // no-op: use the upload UI to replace data
}
