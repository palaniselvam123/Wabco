import {
  audit,
  authenticate,
  can,
  getSettings,
  json,
  readBody,
  store,
} from '../lib/security.mjs'

export default async (req) => {

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }

  // Shipment data is commercial information — every read is authenticated.
  const auth = await authenticate(req)
  if (auth.error) return json(auth.status, { error: auth.error })

  const blobs = store()

  if (req.method === 'GET') {
    if (!can(auth.user, 'view')) {
      return json(403, { error: 'You do not have permission to view shipments' })
    }
    try {
      const data = await blobs.get('latest', { type: 'json' })
      return json(200, data ?? null)
    } catch {
      return json(200, null)
    }
  }

  if (req.method === 'POST') {
    const { raw, body } = await readBody(req)
    const settings = await getSettings()
    const allowed = settings.upload.allowedRoles || ['admin']

    // Two gates: the role must hold the upload permission AND be on the
    // administrator-configured allow-list in the security settings.
    if (!can(auth.user, 'upload') || !allowed.includes(auth.user.role)) {
      await audit(
        'upload.denied',
        auth.user.username,
        `role "${auth.user.role}" is not permitted to upload`
      )
      return json(403, {
        error: 'Only administrators can upload shipment data',
      })
    }

    // Guard against an oversized payload regardless of what the client claims.
    const limitBytes = (settings.upload.maxFileSizeMb || 25) * 1024 * 1024 * 4
    if (raw.length > limitBytes) {
      await audit('upload.rejected', auth.user.username, 'payload too large')
      return json(413, { error: 'Upload is too large' })
    }

    try {
      if (!Array.isArray(body.activeData) || !Array.isArray(body.deliveredData)) {
        return json(400, { error: 'Malformed shipment payload' })
      }
      const record = {
        activeData: body.activeData,
        deliveredData: body.deliveredData,
        fileName: String(body.fileName || ''),
        savedAt: new Date().toISOString(),
        uploadedBy: auth.user.username,
      }
      await blobs.setJSON('latest', record)
      await audit(
        'upload.success',
        auth.user.username,
        `${record.fileName || 'unnamed'} — ${record.activeData.length} active, ${record.deliveredData.length} delivered`
      )
      return json(200, { ok: true, savedAt: record.savedAt })
    } catch (err) {
      return json(500, { ok: false, error: String(err?.message) })
    }
  }

  return json(405, { error: 'Method not allowed' })
}
