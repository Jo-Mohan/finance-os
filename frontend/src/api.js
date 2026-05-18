const BASE = '/api'

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`)
  return res.json()
}

export const api = {
  accounts: {
    list: () => req('GET', '/accounts/'),
    create: (body) => req('POST', '/accounts/', body),
    update: (id, body) => req('PUT', `/accounts/${id}`, body),
    remove: (id) => req('DELETE', `/accounts/${id}`),
  },
  cards: {
    list: () => req('GET', '/cards/'),
    create: (body) => req('POST', '/cards/', body),
    remove: (id) => req('DELETE', `/cards/${id}`),
  },
  transactions: {
    list: (month) => req('GET', `/transactions/${month ? `?month=${month}` : ''}`),
    remove: (id) => req('DELETE', `/transactions/${id}`),
  },
  budgets: {
    list: () => req('GET', '/budgets/'),
    upsert: (body) => req('PUT', '/budgets/', body),
  },
}
