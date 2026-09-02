import {
  audit,
  authenticate,
  createSession,
  destroySession,
  destroyUserSessions,
  getSettings,
  getUsers,
  hashPassword,
  json,
  readBody,
  bearer,
  publicUser,
  saveUser,
  getUserById,
  validatePassword,
  verifyPassword,
} from '../lib/security.mjs'

/** Days between two ISO timestamps. */
function daysSince(iso) {
  if (!iso) return Infinity
  return (Date.now() - new Date(iso).getTime()) / 86_400_000
}

export default async (req) => {

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }
  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  const { body } = await readBody(req)
  const action = body.action

  /* ── Sign in ───────────────────────────────────────────── */
  if (action === 'login') {
    const username = String(body.username || '').trim().toLowerCase()
    const password = String(body.password || '')
    const settings = await getSettings()
    const users = await getUsers()
    const user = users.find((u) => u.username.toLowerCase() === username)

    // Uniform failure message: never reveal whether the account exists.
    const fail = () => json(401, { error: 'Invalid username or password' })

    if (!user) {
      await audit('login.failed', username, 'unknown username')
      return fail()
    }

    if (user.status !== 'active') {
      await audit('login.blocked', user.username, 'account disabled')
      return json(403, { error: 'This account has been disabled' })
    }

    if (user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now()) {
      const mins = Math.ceil(
        (new Date(user.lockedUntil).getTime() - Date.now()) / 60_000
      )
      await audit('login.blocked', user.username, 'account locked')
      return json(423, {
        error: `Account locked. Try again in ${mins} minute${mins === 1 ? '' : 's'}.`,
      })
    }

    if (!verifyPassword(password, user.passwordHash)) {
      user.failedAttempts = (user.failedAttempts || 0) + 1
      const max = settings.login.maxFailedAttempts || 5
      let message = 'Invalid username or password'
      if (user.failedAttempts >= max) {
        user.lockedUntil = new Date(
          Date.now() + (settings.login.lockoutMinutes || 15) * 60_000
        ).toISOString()
        user.failedAttempts = 0
        message = `Too many failed attempts. Account locked for ${settings.login.lockoutMinutes} minutes.`
        await audit('login.locked', user.username, `${max} failed attempts`)
      } else {
        await audit(
          'login.failed',
          user.username,
          `attempt ${user.failedAttempts} of ${max}`
        )
      }
      await saveUser(user)
      return json(401, { error: message })
    }

    // Success — clear counters and open a session.
    user.failedAttempts = 0
    user.lockedUntil = null
    user.lastLoginAt = new Date().toISOString()

    const expiryDays = settings.password.expiryDays || 0
    const expired = expiryDays > 0 && daysSince(user.passwordChangedAt) > expiryDays
    if (expired) user.mustChangePassword = true

    await saveUser(user)
    const token = await createSession(user.id)
    await audit('login.success', user.username, `role: ${user.role}`)

    return json(200, {
      token,
      user: publicUser(user),
      passwordExpired: expired,
    })
  }

  /* ── Sign out ──────────────────────────────────────────── */
  if (action === 'logout') {
    const token = bearer(req)
    const auth = await authenticate(req)
    if (auth.user) await audit('logout', auth.user.username)
    await destroySession(token)
    return json(200, { ok: true })
  }

  /* ── Who am I (session restore on page reload) ─────────── */
  if (action === 'me') {
    const auth = await authenticate(req)
    if (auth.error) return json(auth.status, { error: auth.error })
    const settings = await getSettings()
    return json(200, {
      user: publicUser(auth.user),
      settings: {
        // Only the policy the browser needs for live form validation.
        password: settings.password,
        upload: settings.upload,
        session: settings.session,
      },
    })
  }

  /* ── Change own password ───────────────────────────────── */
  if (action === 'changePassword') {
    const auth = await authenticate(req)
    if (auth.error) return json(auth.status, { error: auth.error })

    const current = String(body.currentPassword || '')
    const next = String(body.newPassword || '')
    const settings = await getSettings()
    const user = await getUserById(auth.user.id)

    if (!verifyPassword(current, user.passwordHash)) {
      await audit('password.change.failed', user.username, 'wrong current password')
      return json(400, { error: 'Current password is incorrect' })
    }

    const errors = validatePassword(next, settings.password)
    if (errors.length) return json(400, { error: errors.join('. ') })

    if (verifyPassword(next, user.passwordHash)) {
      return json(400, { error: 'New password must differ from the current one' })
    }

    const reuse = settings.password.preventReuse || 0
    const history = user.passwordHistory || []
    if (reuse > 0) {
      const recent = history.slice(0, reuse)
      if (recent.some((h) => verifyPassword(next, h))) {
        return json(400, {
          error: `Cannot reuse any of your last ${reuse} passwords`,
        })
      }
    }

    user.passwordHistory = [user.passwordHash, ...history].slice(0, 10)
    user.passwordHash = hashPassword(next)
    user.passwordChangedAt = new Date().toISOString()
    user.mustChangePassword = false
    await saveUser(user)

    // Force a fresh sign-in everywhere else after a credential change.
    await destroyUserSessions(user.id)
    const token = await createSession(user.id)
    await audit('password.changed', user.username)

    return json(200, { ok: true, token, user: publicUser(user) })
  }

  return json(400, { error: 'Unknown action' })
}
