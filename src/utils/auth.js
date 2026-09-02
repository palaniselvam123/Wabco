const TOKEN_KEY = 'zf.session'
const AUTH_API = '/api/auth'

/* Session tokens live in sessionStorage, not localStorage, so closing the
   tab ends the session and the token never outlives the browsing context. */

export function getToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

export function setToken(token) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token)
    else sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    /* private browsing — session simply won't survive a reload */
  }
}

export function clearToken() {
  setToken('')
}

/** Broadcast so the app can drop to the login screen from anywhere. */
function signalExpiry(message) {
  clearToken()
  window.dispatchEvent(new CustomEvent('zf:session-expired', { detail: message }))
}

/**
 * fetch() with the bearer token attached and consistent error handling.
 * Throws an Error carrying `.status` so callers can branch on it.
 */
export async function apiFetch(url, options = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(url, { ...options, headers })

  let payload = null
  try {
    payload = await res.json()
  } catch {
    payload = null
  }

  if (res.status === 401) {
    signalExpiry(payload?.error || 'Your session has ended. Please sign in again.')
  }

  if (!res.ok) {
    const err = new Error(payload?.error || `Request failed (${res.status})`)
    err.status = res.status
    throw err
  }

  return payload
}

/* ── Auth actions ────────────────────────────────────────── */

export async function login(username, password) {
  const res = await fetch(AUTH_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', username, password }),
  })
  const payload = await res.json().catch(() => null)
  if (!res.ok) {
    const err = new Error(payload?.error || 'Sign in failed')
    err.status = res.status
    throw err
  }
  setToken(payload.token)
  return payload
}

export async function logout() {
  try {
    await apiFetch(AUTH_API, {
      method: 'POST',
      body: JSON.stringify({ action: 'logout' }),
    })
  } catch {
    /* signing out locally matters more than the server round-trip */
  }
  clearToken()
}

/** Restores the session on page reload. Returns null when not signed in. */
export async function fetchMe() {
  if (!getToken()) return null
  try {
    return await apiFetch(AUTH_API, {
      method: 'POST',
      body: JSON.stringify({ action: 'me' }),
    })
  } catch {
    return null
  }
}

export async function changePassword(currentPassword, newPassword) {
  const payload = await apiFetch(AUTH_API, {
    method: 'POST',
    body: JSON.stringify({ action: 'changePassword', currentPassword, newPassword }),
  })
  if (payload.token) setToken(payload.token)
  return payload
}

/* ── Permissions (mirror of the server-side table) ───────── */

export function can(user, permission) {
  if (!user || user.status !== 'active') return false
  return (user.permissions || []).includes(permission)
}

/** Client-side mirror of the server password policy, for live form feedback. */
export function passwordIssues(password, policy) {
  if (!policy) return []
  const issues = []
  if (!password || password.length < policy.minLength) {
    issues.push(`At least ${policy.minLength} characters`)
  }
  if (policy.requireUppercase && !/[A-Z]/.test(password || '')) {
    issues.push('An uppercase letter')
  }
  if (policy.requireNumber && !/[0-9]/.test(password || '')) {
    issues.push('A number')
  }
  if (policy.requireSymbol && !/[^A-Za-z0-9]/.test(password || '')) {
    issues.push('A symbol')
  }
  return issues
}
