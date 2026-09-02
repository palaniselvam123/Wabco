import {
  ROLES,
  audit,
  authenticate,
  can,
  destroyUserSessions,
  getSettings,
  getUsers,
  hashPassword,
  json,
  newId,
  readBody,
  publicUser,
  saveUser,
  deleteUser,
  validatePassword,
} from '../lib/security.mjs'

const USERNAME_RE = /^[a-z0-9._-]{3,32}$/

/** Number of enabled administrators, used to prevent an admin lockout. */
function activeAdmins(users) {
  return users.filter((u) => u.role === 'admin' && u.status === 'active')
}

export default async (req) => {

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }

  const auth = await authenticate(req)
  if (auth.error) return json(auth.status, { error: auth.error })
  if (!can(auth.user, 'manage_users')) {
    await audit('users.denied', auth.user.username, req.method)
    return json(403, { error: 'You do not have permission to manage users' })
  }

  const actor = auth.user
  const users = await getUsers()
  const body = (await readBody(req)).body

  /* ── List ──────────────────────────────────────────────── */
  if (req.method === 'GET') {
    return json(200, {
      users: users.map(publicUser),
      roles: Object.entries(ROLES).map(([key, meta]) => ({ key, ...meta })),
    })
  }

  /* ── Create ────────────────────────────────────────────── */
  if (req.method === 'POST') {
    const username = String(body.username || '').trim().toLowerCase()
    const password = String(body.password || '')
    const role = String(body.role || 'viewer')
    const settings = await getSettings()

    if (!USERNAME_RE.test(username)) {
      return json(400, {
        error:
          'Username must be 3-32 characters, lowercase letters, numbers, dot, dash or underscore',
      })
    }
    if (users.some((u) => u.username.toLowerCase() === username)) {
      return json(409, { error: 'That username is already taken' })
    }
    if (!ROLES[role]) {
      return json(400, { error: 'Unknown role' })
    }
    const pwErrors = validatePassword(password, settings.password)
    if (pwErrors.length) return json(400, { error: pwErrors.join('. ') })

    const now = new Date().toISOString()
    const user = {
      id: newId('usr'),
      username,
      fullName: String(body.fullName || '').trim(),
      email: String(body.email || '').trim(),
      role,
      status: 'active',
      passwordHash: hashPassword(password),
      passwordHistory: [],
      passwordChangedAt: now,
      // New accounts always rotate the password the admin typed.
      mustChangePassword: body.mustChangePassword !== false,
      failedAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      createdAt: now,
      createdBy: actor.username,
    }
    await saveUser(user)
    await audit('user.created', actor.username, `${username} (${role})`)
    return json(201, { user: publicUser(user) })
  }

  /* ── Update ────────────────────────────────────────────── */
  if (req.method === 'PUT') {
    const target = users.find((u) => u.id === body.id)
    if (!target) return json(404, { error: 'User not found' })

    const settings = await getSettings()
    const changes = []

    // Role change — never allow the last administrator to be demoted.
    if (body.role && body.role !== target.role) {
      if (!ROLES[body.role]) return json(400, { error: 'Unknown role' })
      if (
        target.role === 'admin' &&
        body.role !== 'admin' &&
        activeAdmins(users).length <= 1
      ) {
        return json(409, {
          error: 'Cannot change the role of the only active administrator',
        })
      }
      changes.push(`role ${target.role}→${body.role}`)
      target.role = body.role
    }

    // Status change — same lockout guard.
    if (body.status && body.status !== target.status) {
      if (
        body.status !== 'active' &&
        target.role === 'admin' &&
        activeAdmins(users).length <= 1
      ) {
        return json(409, {
          error: 'Cannot disable the only active administrator',
        })
      }
      changes.push(`status ${target.status}→${body.status}`)
      target.status = body.status
      if (body.status !== 'active') await destroyUserSessions(target.id)
    }

    if (typeof body.fullName === 'string' && body.fullName !== target.fullName) {
      target.fullName = body.fullName.trim()
      changes.push('name')
    }
    if (typeof body.email === 'string' && body.email !== target.email) {
      target.email = body.email.trim()
      changes.push('email')
    }

    // Admin-initiated password reset.
    if (body.newPassword) {
      const pwErrors = validatePassword(body.newPassword, settings.password)
      if (pwErrors.length) return json(400, { error: pwErrors.join('. ') })
      target.passwordHistory = [
        target.passwordHash,
        ...(target.passwordHistory || []),
      ].slice(0, 10)
      target.passwordHash = hashPassword(body.newPassword)
      target.passwordChangedAt = new Date().toISOString()
      target.mustChangePassword = true
      await destroyUserSessions(target.id)
      changes.push('password reset')
    }

    // Clear a lockout early.
    if (body.unlock) {
      target.lockedUntil = null
      target.failedAttempts = 0
      changes.push('unlocked')
    }

    // Explicit control over the first-sign-in rotation. Applied after any
    // password reset above, so an administrator can hand someone a new
    // password without also forcing them to change it immediately.
    if (
      typeof body.mustChangePassword === 'boolean' &&
      body.mustChangePassword !== target.mustChangePassword
    ) {
      target.mustChangePassword = body.mustChangePassword
      changes.push(
        `change-at-next-login ${body.mustChangePassword ? 'on' : 'off'}`
      )
    }

    await saveUser(target)
    await audit(
      'user.updated',
      actor.username,
      `${target.username}: ${changes.join(', ') || 'no changes'}`
    )
    return json(200, { user: publicUser(target) })
  }

  /* ── Delete ────────────────────────────────────────────── */
  if (req.method === 'DELETE') {
    const id = body.id || new URL(req.url).searchParams.get('id')
    const idx = users.findIndex((u) => u.id === id)
    if (idx === -1) return json(404, { error: 'User not found' })

    const target = users[idx]
    if (target.id === actor.id) {
      return json(409, { error: 'You cannot delete your own account' })
    }
    if (target.role === 'admin' && activeAdmins(users).length <= 1) {
      return json(409, { error: 'Cannot delete the only active administrator' })
    }

    await deleteUser(target.id)
    await destroyUserSessions(target.id)
    await audit('user.deleted', actor.username, target.username)
    return json(200, { ok: true })
  }

  return json(405, { error: 'Method not allowed' })
}
