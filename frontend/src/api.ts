const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getToken(): string | null {
  return localStorage.getItem('vortexjob_token');
}

export function setToken(token: string) {
  localStorage.setItem('vortexjob_token', token);
}

export function clearToken() {
  localStorage.removeItem('vortexjob_token');
}

export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    window.location.hash = '#/login';
    throw new Error('Unauthorized');
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || 'Request failed');
  }
  return json;
}

export const authApi = {
  register: (email: string, password: string, full_name: string) =>
    api('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, full_name }) }),
  login: (email: string, password: string) =>
    api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => api('/auth/me'),
};

export const orgApi = {
  list: () => api('/organizations'),
  create: (name: string) => api('/organizations', { method: 'POST', body: JSON.stringify({ name }) }),
};

export const projectApi = {
  list: (orgId: string) => api(`/projects?org_id=${orgId}`),
  create: (orgId: string, name: string) => api('/projects', { method: 'POST', body: JSON.stringify({ organization_id: orgId, name }) }),
  get: (id: string) => api(`/projects/${id}`),
};

export const queueApi = {
  list: (projectId: string) => api(`/projects/${projectId}/queues`),
  create: (projectId: string, data: any) => api(`/projects/${projectId}/queues`, { method: 'POST', body: JSON.stringify(data) }),
  get: (id: string) => api(`/queues/${id}`),
  update: (id: string, data: any) => api(`/queues/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => api(`/queues/${id}`, { method: 'DELETE' }),
  pause: (id: string) => api(`/queues/${id}/pause`, { method: 'POST' }),
  resume: (id: string) => api(`/queues/${id}/resume`, { method: 'POST' }),
  stats: (id: string) => api(`/queues/${id}/stats`),
};

export const jobApi = {
  list: (queueId: string, params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api(`/queues/${queueId}/jobs${qs ? '?' + qs : ''}`);
  },
  get: (id: string) => api(`/jobs/${id}`),
  create: (queueId: string, data: any) => api(`/queues/${queueId}/jobs`, { method: 'POST', body: JSON.stringify(data) }),
  executions: (id: string) => api(`/jobs/${id}/executions`),
  logs: (id: string) => api(`/jobs/${id}/logs`),
  retry: (id: string) => api(`/jobs/${id}/retry`, { method: 'POST' }),
  cancel: (id: string) => api(`/jobs/${id}/cancel`, { method: 'POST' }),
  batch: (data: any) => api('/jobs/batch', { method: 'POST', body: JSON.stringify(data) }),
  aiSummary: (id: string) => api(`/jobs/${id}/ai-summary`),
  getDependencies: (id: string) => api(`/jobs/${id}/dependencies`),
  addDependency: (id: string, parentJobId: string) => api(`/jobs/${id}/dependencies`, { method: 'POST', body: JSON.stringify({ depends_on_job_id: parentJobId }) }),
};

export const workerApi = {
  list: () => api('/workers'),
  get: (id: string) => api(`/workers/${id}`),
  heartbeats: (id: string) => api(`/workers/${id}/heartbeats`),
};

export const dlqApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? new URLSearchParams(params).toString() : '';
    return api(`/dlq${qs ? '?' + qs : ''}`);
  },
  retry: (id: string) => api(`/dlq/${id}/retry`, { method: 'POST' }),
  ignore: (id: string) => api(`/dlq/${id}/ignore`, { method: 'POST' }),
};

export const statsApi = {
  project: (projectId: string) => api(`/projects/${projectId}/stats`),
};
