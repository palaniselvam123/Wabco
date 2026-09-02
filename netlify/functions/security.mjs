import {
  DEFAULT_SETTINGS,
  ROLES,
  audit,
  authenticate,
  can,
  getAudit,
  getSettings,
  json,
  readBody,
  saveSettings,
} from '../lib/security.mjs'

/** Keeps a numeric setting inside a range that cannot brick the app. */
function clamp(value, min, max, fallback) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

function sanitise(incoming, current) {
  const p = incoming.password || {}
  const s = incoming.session || {}
  const l = incoming.login || {}
  const u = incoming.upload || {}
  const a = incoming.audit || {}

  const roles = Array.isArray(u.allowedRoles)
    ? u.allowedRoles.filter((r) => ROLES[r])
    : current.upload.allowedRoles
  const exts = Array.isArray(u.allowedExtensions)
    ? u.allowedExtensions
        .map((e) => String(e).trim().toLowerCase())
        .filter((e) => /^\.[a-z0-9]{1,8}$/.test(e))
    : current.upload.allowedExtensions

  return {
    password: {
      minLength: clamp(p.minLength, 8, 64, current.password.minLength),
      requireUppercase: !!p.requireUppercase,
      requireNumber: !!p.requireNumber,
      requireSymbol: !!p.requireSymbol,
      expiryDays: clamp(p.expiryDays, 0, 365, current.password.expiryDays),
      preventReuse: clamp(p.preventReuse, 0, 10, current.password.preventReuse),
    },
    session: {
      idleTimeoutMinutes: clamp(
        s.idleTimeoutMinutes, 5, 480, current.session.idleTimeoutMinutes
      ),
      absoluteTimeoutHours: clamp(
        s.absoluteTimeoutHours, 1, 168, current.session.absoluteTimeoutHours
      ),
    },
    login: {
      maxFailedAttempts: clamp(
        l.maxFailedAttempts, 3, 20, current.login.maxFailedAttempts
      ),
      lockoutMinutes: clamp(l.lockoutMinutes, 1, 1440, current.login.lockoutMinutes),
    },
    upload: {
      // Administrators can never be removed from the upload allow-list,
      // otherwise nobody could ever load data again.
      allowedRoles: roles.includes('admin') ? roles : ['admin', ...roles],
      maxFileSizeMb: clamp(u.maxFileSizeMb, 1, 200, current.upload.maxFileSizeMb),
      allowedExtensions: exts.length ? exts : current.upload.allowedExtensions,
    },
    audit: {
      enabled: a.enabled !== false,
      retainEvents: clamp(a.retainEvents, 50, 5000, current.audit.retainEvents),
    },
  }
}

export default async (req) => {

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }

  const auth = await authenticate(req)
  if (auth.error) return json(auth.status, { error: auth.error })
  if (!can(auth.user, 'manage_security')) {
    await audit('security.denied', auth.user.username, req.method)
    return json(403, { error: 'You do not have permission to manage security settings' })
  }

  if (req.method === 'GET') {
    const [settings, events] = await Promise.all([getSettings(), getAudit(150)])
    return json(200, {
      settings,
      defaults: DEFAULT_SETTINGS,
      auditEvents: events,
      roles: Object.entries(ROLES).map(([key, meta]) => ({ key, ...meta })),
    })
  }

  if (req.method === 'PUT') {
    const current = await getSettings()
    const next = sanitise((await readBody(req)).body, current)
    await saveSettings(next)
    await audit('security.updated', auth.user.username, 'settings changed')
    return json(200, { settings: next })
  }

  return json(405, { error: 'Method not allowed' })
}
