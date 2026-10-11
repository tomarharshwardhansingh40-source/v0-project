const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? ''

type RequestOptions = RequestInit & { body?: unknown }

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}))
    throw new Error(detail.error ?? detail.message ?? 'The SkillPath API is unavailable. Please try again.')
  }
  return response.status === 204 ? (undefined as T) : response.json()
}

export const api = {
  register: (body: unknown) => request('/api/auth/register', { method: 'POST', body }),
  login: (body: unknown) => request('/api/auth/login', { method: 'POST', body }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request('/api/auth/me'),
  createAnalysis: (body: unknown) => request('/api/analyses', { method: 'POST', body }),
  history: () => request('/api/analyses'),
  getAnalysis: (id: string) => request(`/api/analyses/${id}`),
  deleteAnalysis: (id: string) => request(`/api/analyses/${id}`, { method: 'DELETE' }),
}

export { API_BASE_URL }
