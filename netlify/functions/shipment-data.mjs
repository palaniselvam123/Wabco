import { getStore, connectLambda } from '@netlify/blobs'

const WRITE_KEY = 'wabco2026'

export const handler = async (event) => {
  connectLambda(event)

  const resHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: resHeaders, body: '' }
  }

  const store = getStore('wabco')

  if (event.httpMethod === 'GET') {
    try {
      const data = await store.get('latest', { type: 'json' })
      return {
        statusCode: 200,
        headers: resHeaders,
        body: JSON.stringify(data ?? null),
      }
    } catch {
      return { statusCode: 200, headers: resHeaders, body: 'null' }
    }
  }

  if (event.httpMethod === 'POST') {
    const reqKey = (event.headers || {})['x-wabco-key']
    if (reqKey !== WRITE_KEY) {
      return { statusCode: 401, body: 'Unauthorized' }
    }
    try {
      const body = JSON.parse(event.body || '{}')
      await store.setJSON('latest', body)
      return {
        statusCode: 200,
        headers: resHeaders,
        body: JSON.stringify({ ok: true, savedAt: new Date().toISOString() }),
      }
    } catch (err) {
      return {
        statusCode: 500,
        headers: resHeaders,
        body: JSON.stringify({ ok: false, error: String(err?.message) }),
      }
    }
  }

  return { statusCode: 405, body: 'Method not allowed' }
}
