import { getStore } from '@netlify/blobs'
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto'

export const STORE = 'wabco'

const K_USERS = 'users'
const K_SETTINGS = 'security-settings'
const K_AUDIT = 'audit-log'

/* ── Roles & permissions ─────────────────────────────────── */

export const ROLES = {
  admin: { label: 'Administrator', rank: 3 },
  manager: { label: 'Manager', rank: 2 },
  viewer: { label: 'Viewer', rank: 1 },
}

export const PERMISSIONS = {
  admin: ['view', 'export', 'upload', 'manage_users', 'manage_security'],
  manager: ['view', 'export'],
  viewer: ['view'],
}

export function can(user, permission) {
  if (!user || user.status !== 'active') return false
  const perms = PERMISSIONS[user.role] || []
  return perms.includes(permission)
}

/* ── Default security settings ───────────────────────────── */

export const DEFAULT_SETTINGS = {
  password: {
    minLength: 10,
    requireUppercase: true,
    requireNumber: true,
    requireSymbol: false,
    expiryDays: 90, // 0 = never expires
    preventReuse: 3, // remember last N password hashes
  },
  session: {
    idleTimeoutMinutes: 30,
    absoluteTimeoutHours: 12,
  },
  login: {
    maxFailedAttempts: 5,
    lockoutMinutes: 15,
  },
  upload: {
    allowedRoles: ['admin'],
    maxFileSizeMb: 25,
    allowedExtensions: ['.xlsx', '.xls', '.xlsb'],
  },
  audit: {
    enabled: true,
    retainEvents: 500,
  },
}

/* ── Blob helpers ────────────────────────────────────────── */

export function store() {
  // Blobs default to eventually-consistent reads served from the edge.
  // Auth data is read-modify-written, so a stale read loses data —
  // every access here must be strongly consistent.
  return getStore({ name: STORE, consistency: 'strong' })
}

async function readJSON(key, fallback) {
  try {
    const v = await store().get(key, { type: 'json' })
    return v ?? fallback
  } catch {
    return fallback
  }
}

async function writeJSON(key, value) {
  await store().setJSON(key, value)
}

/**
 * Compare-and-swap update of a JSON document.
 *
 * Strong consistency stops us reading stale data, but two requests can still
 * read the same version and have one overwrite the other. Conditional writes
 * (`onlyIfMatch`) reject the second write, so we re-read and re-apply instead
 * of silently losing a record. Falls back to a plain write where the runtime
 * does not expose conditional writes.
 */
const CAS_ATTEMPTS = 6

async function mutateJSON(key, apply, seed) {
  const blobs = store()

  if (typeof blobs.getWithMetadata !== 'function') {
    const current = (await readJSON(key, null)) ?? seed()
    const next = apply(current)
    await writeJSON(key, next)
    return next
  }

  for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt++) {
    let current = null
    let etag
    try {
      const res = await blobs.getWithMetadata(key, { type: 'json' })
      current = res?.data ?? null
      etag = res?.etag
    } catch {
      current = null
    }

    const base = current ?? seed()
    const next = apply(structuredClone(base))

    try {
      const opts = etag ? { onlyIfMatch: etag } : { onlyIfNew: true }
      const res = await blobs.setJSON(key, next, opts)
      // `modified: false` means someone else wrote first — re-read and retry.
      if (!res || res.modified !== false) return next
    } catch {
      /* retry */
    }
  }
  throw new Error('Conflicting update — please try again')
}

/* ── Password hashing (scrypt) ───────────────────────────── */

export function hashPassword(plain) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(plain, salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

export function verifyPassword(plain, stored) {
  if (typeof stored !== 'string') return false
  const [scheme, salt, hash] = stored.split('$')
  if (scheme !== 'scrypt' || !salt || !hash) return false
  const candidate = scryptSync(plain, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  if (candidate.length !== expected.length) return false
  return timingSafeEqual(candidate, expected)
}

/* ── Password policy ─────────────────────────────────────── */

export function validatePassword(plain, policy) {
  const p = policy || DEFAULT_SETTINGS.password
  const errors = []
  if (!plain || plain.length < p.minLength) {
    errors.push(`Must be at least ${p.minLength} characters`)
  }
  if (p.requireUppercase && !/[A-Z]/.test(plain || '')) {
    errors.push('Must contain an uppercase letter')
  }
  if (p.requireNumber && !/[0-9]/.test(plain || '')) {
    errors.push('Must contain a number')
  }
  if (p.requireSymbol && !/[^A-Za-z0-9]/.test(plain || '')) {
    errors.push('Must contain a symbol')
  }
  return errors
}

/* ── Users ──────────────────────────────────────────────────
   Stored as a single strongly-consistent document. The per-user
   helpers below keep callers simple; `list()` is deliberately not
   used, as blob listing is not dependable in this runtime.
   ─────────────────────────────────────────────────────────── */

/** Seeds a first administrator so the system is never locked out. */
function seedAdmin() {
  const now = new Date().toISOString()
  return {
    id: 'usr_admin',
    username: 'admin',
    fullName: 'System Administrator',
    email: '',
    role: 'admin',
    status: 'active',
    passwordHash: hashPassword('wabco2026'),
    passwordHistory: [],
    passwordChangedAt: now,
    mustChangePassword: true,
    failedAttempts: 0,
    lockedUntil: null,
    lastLoginAt: null,
    createdAt: now,
    createdBy: 'system',
  }
}

export async function getUsers() {
  const data = await readJSON(K_USERS, null)
  if (data && Array.isArray(data.users) && data.users.length) {
    return data.users
  }
  const admin = seedAdmin()
  await writeJSON(K_USERS, { users: [admin] })
  return [admin]
}

export async function getUserById(id) {
  if (!id) return null
  const users = await getUsers()
  return users.find((u) => u.id === id) || null
}

/** Inserts or replaces one account, leaving every other record untouched. */
export async function saveUser(user) {
  await mutateJSON(
    K_USERS,
    (doc) => {
      const users = Array.isArray(doc.users) ? doc.users : []
      const idx = users.findIndex((u) => u.id === user.id)
      if (idx === -1) users.push(user)
      else users[idx] = user
      return { users }
    },
    () => ({ users: [seedAdmin()] })
  )
}

export async function deleteUser(id) {
  await mutateJSON(
    K_USERS,
    (doc) => ({ users: (doc.users || []).filter((u) => u.id !== id) }),
    () => ({ users: [seedAdmin()] })
  )
}

/** Strips secrets before a user object is sent to the browser. */
export function publicUser(u) {
  if (!u) return null
  return {
    id: u.id,
    username: u.username,
    fullName: u.fullName,
    email: u.email,
    role: u.role,
    status: u.status,
    mustChangePassword: !!u.mustChangePassword,
    passwordChangedAt: u.passwordChangedAt,
    lastLoginAt: u.lastLoginAt,
    lockedUntil: u.lockedUntil,
    createdAt: u.createdAt,
    permissions: PERMISSIONS[u.role] || [],
  }
}

/* ── Settings ────────────────────────────────────────────── */

export async function getSettings() {
  const s = await readJSON(K_SETTINGS, null)
  if (!s) return structuredClone(DEFAULT_SETTINGS)
  // Merge so newly added defaults appear for existing installs.
  return {
    password: { ...DEFAULT_SETTINGS.password, ...(s.password || {}) },
    session: { ...DEFAULT_SETTINGS.session, ...(s.session || {}) },
    login: { ...DEFAULT_SETTINGS.login, ...(s.login || {}) },
    upload: { ...DEFAULT_SETTINGS.upload, ...(s.upload || {}) },
    audit: { ...DEFAULT_SETTINGS.audit, ...(s.audit || {}) },
  }
}

export async function saveSettings(settings) {
  await writeJSON(K_SETTINGS, settings)
}

/* ── Sessions ───────────────────────────────────────────────
   Each session is its own blob key. A single shared `sessions`
   document would lose updates whenever two requests wrote at the
   same time — and session validation runs on every request.
   ─────────────────────────────────────────────────────────── */

const SESS_PREFIX = 'sess/'

function sessionKey(token) {
  // Store a digest, so a leaked blob listing cannot be replayed as a token.
  return SESS_PREFIX + createHash('sha256').update(token).digest('hex')
}

export async function createSession(userId) {
  const token = randomBytes(32).toString('hex')
  const now = Date.now()
  await store().setJSON(sessionKey(token), {
    uid: userId,
    createdAt: now,
    lastSeenAt: now,
  })
  return token
}

export async function destroySession(token) {
  if (!token) return
  try {
    await store().delete(sessionKey(token))
  } catch {
    /* already gone */
  }
}

/**
 * Invalidates every session for a user without needing to enumerate blobs:
 * a revocation stamp is written on the account and `authenticate()` rejects
 * any session created before it.
 */
export async function destroyUserSessions(userId) {
  const users = await getUsers()
  const user = users.find((u) => u.id === userId)
  if (!user) return
  user.sessionsValidFrom = Date.now()
  await saveUser(user)
}

/**
 * Resolves the caller from the Authorization header, enforcing both the idle
 * and absolute session timeouts from the security settings.
 * @returns {Promise<{ user: object, token: string } | { error: string, status: number }>}
 */
export async function authenticate(req) {
  const header = req.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) return { error: 'Not signed in', status: 401 }

  const blobs = store()
  const key = sessionKey(token)

  let session = null
  try {
    session = await blobs.get(key, { type: 'json' })
  } catch {
    session = null
  }
  if (!session) return { error: 'Session expired', status: 401 }

  const settings = await getSettings()
  const now = Date.now()
  const idleMs = (settings.session.idleTimeoutMinutes || 30) * 60_000
  const absMs = (settings.session.absoluteTimeoutHours || 12) * 3_600_000

  if (now - session.lastSeenAt > idleMs) {
    await blobs.delete(key).catch(() => {})
    return { error: 'Signed out due to inactivity', status: 401 }
  }
  if (now - session.createdAt > absMs) {
    await blobs.delete(key).catch(() => {})
    return { error: 'Session expired, please sign in again', status: 401 }
  }

  const user = await getUserById(session.uid)
  if (!user) return { error: 'Account no longer exists', status: 401 }
  if (user.status !== 'active') return { error: 'Account is disabled', status: 403 }
  if (user.sessionsValidFrom && session.createdAt < user.sessionsValidFrom) {
    await blobs.delete(key).catch(() => {})
    return { error: 'Session was revoked, please sign in again', status: 401 }
  }

  // Throttle activity writes to at most once a minute. Touching only this
  // session's own key means concurrent requests cannot clobber each other.
  if (now - session.lastSeenAt > 60_000) {
    await blobs
      .setJSON(key, { ...session, lastSeenAt: now })
      .catch(() => {})
  }

  return { user, token }
}

/* ── Audit log ───────────────────────────────────────────── */

export async function audit(action, actor, detail = '') {
  try {
    const settings = await getSettings()
    if (!settings.audit.enabled) return
    const entry = {
      at: new Date().toISOString(),
      action,
      actor: actor || 'anonymous',
      detail,
    }
    const cap = settings.audit.retainEvents || 500
    await mutateJSON(
      K_AUDIT,
      (doc) => ({ events: [entry, ...(doc.events || [])].slice(0, cap) }),
      () => ({ events: [] })
    )
  } catch {
    // Auditing must never break the request it is recording.
  }
}

export async function getAudit(limit = 100) {
  const log = await readJSON(K_AUDIT, { events: [] })
  return log.events.slice(0, limit)
}

/* ── HTTP helpers (Functions v2 / Web Fetch API) ─────────── */

export const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
}

export function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

/** Reads the request once, returning both the raw text and parsed JSON. */
export async function readBody(req) {
  let raw = ''
  try {
    raw = await req.text()
  } catch {
    return { raw: '', body: {} }
  }
  try {
    return { raw, body: raw ? JSON.parse(raw) : {} }
  } catch {
    return { raw, body: {} }
  }
}

export function bearer(req) {
  const h = req.headers.get('authorization') || ''
  return h.startsWith('Bearer ') ? h.slice(7).trim() : ''
}

export function newId(prefix) {
  return `${prefix}_${randomBytes(8).toString('hex')}`
}
