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
    update: (id, body) => req('PUT', `/cards/${id}`, body),
    remove: (id) => req('DELETE', `/cards/${id}`),
    optimize: (month) => req('GET', `/cards/optimize${month ? '?month=' + month : ''}`),
  },
  transactions: {
    list: (params = {}) => {
      const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
      ).toString()
      return req('GET', `/transactions/${qs ? '?' + qs : ''}`)
    },
    remove: (id) => req('DELETE', `/transactions/${id}`),
    recategorize: (id, category) => req('PATCH', `/transactions/${id}/category`, { category }),
  },
  budgets: {
    list: () => req('GET', '/budgets/'),
    upsert: (body) => req('PUT', '/budgets/', body),
  },
}
