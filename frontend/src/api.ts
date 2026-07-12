import type {
  User, Organization, Project, Queue, QueueStats,
  Job, JobExecution, JobLog, WorkerInfo, DLQEntry,
  DashboardStats, PaginationMeta
} from './types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: { message: string };
  pagination?: PaginationMeta;
}

function getToken(): string | null {
  return localStorage.getItem('vortexjob_token');
}

export function setToken(token: string) {
  localStorage.setItem('vortexjob_token', token);
}

export function clearToken() {
  localStorage.removeItem('vortexjob_token');
}

export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
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
    window.location.href = '/';
    throw new Error('Session expired. Please log in again.');
  }

  if (!res.ok) {
    const text = await res.text();
    let message = `Request failed with status ${res.status}`;
    try {
      const json = JSON.parse(text);
      if (json.error?.message) message = json.error.message;
    } catch {
      // not JSON
    }
    throw new Error(message);
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || 'Request failed');
  }
  return json;
}

export const authApi = {
  register: (email: string, password: string, full_name: string) =>
    api<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name }),
    }),
  login: (email: string, password: string) =>
    api<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => api<User>('/auth/me'),
};

export const orgApi = {
  list: () => api<Organization[]>('/organizations'),
  create: (name: string) =>
    api<Organization>('/organizations', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
};

export const projectApi = {
  list: (orgId: string) => api<Project[]>(`/projects?org_id=${orgId}`),
  create: (orgId: string, name: string) =>
    api<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify({ organization_id: orgId, name }),
    }),
  get: (id: string) => api<Project>(`/projects/${id}`),
};

export const queueApi = {
  list: (projectId: string) => api<Queue[]>(`/projects/${projectId}/queues`),
  create: (projectId: string, data: {
    name: string;
    concurrency_limit: number;
    priority: number;
    rate_limit_count?: number | null;
    rate_limit_window_seconds?: number | null;
  }) =>
    api<Queue>(`/projects/${projectId}/queues`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  get: (id: string) => api<Queue>(`/queues/${id}`),
  update: (id: string, data: Partial<Queue>) =>
    api<Queue>(`/queues/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) => api<void>(`/queues/${id}`, { method: 'DELETE' }),
  pause: (id: string) => api<void>(`/queues/${id}/pause`, { method: 'POST' }),
  resume: (id: string) => api<void>(`/queues/${id}/resume`, { method: 'POST' }),
  stats: (id: string) => api<QueueStats>(`/queues/${id}/stats`),
};

export const jobApi = {
  list: (queueId: string, params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api<Job[]>(`/queues/${queueId}/jobs${qs ? '?' + qs : ''}`);
  },
  get: (id: string) => api<Job>(`/jobs/${id}`),
  create: (queueId: string, data: {
    name: string;
    payload: Record<string, unknown>;
    type?: string;
    cron_expression?: string;
    run_at?: string;
    depends_on?: string[];
  }) =>
    api<Job>(`/queues/${queueId}/jobs`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  executions: (id: string) => api<JobExecution[]>(`/jobs/${id}/executions`),
  logs: (id: string) => api<JobLog[]>(`/jobs/${id}/logs`),
  retry: (id: string) => api<void>(`/jobs/${id}/retry`, { method: 'POST' }),
  cancel: (id: string) => api<void>(`/jobs/${id}/cancel`, { method: 'POST' }),
  batch: (data: { queue_id: string; jobs: { name: string; payload: Record<string, unknown> }[] }) =>
    api<Job[]>('/jobs/batch', { method: 'POST', body: JSON.stringify(data) }),
  aiSummary: (id: string) => api<{ summary: string }>(`/jobs/${id}/ai-summary`),
  getDependencies: (id: string) => api<Job[]>(`/jobs/${id}/dependencies`),
  addDependency: (id: string, parentJobId: string) =>
    api<void>(`/jobs/${id}/dependencies`, {
      method: 'POST',
      body: JSON.stringify({ depends_on_job_id: parentJobId }),
    }),
  schedules: (queueId: string) => api<Job[]>(`/queues/${queueId}/schedules`),
};

export const workerApi = {
  list: () => api<WorkerInfo[]>('/workers'),
  get: (id: string) => api<WorkerInfo>(`/workers/${id}`),
  heartbeats: (id: string) => api<{ id: string; worker_id: string; timestamp: string }[]>(`/workers/${id}/heartbeats`),
};

export const dlqApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? new URLSearchParams(params).toString() : '';
    return api<DLQEntry[]>(`/dlq${qs ? '?' + qs : ''}`);
  },
  retry: (id: string) => api<void>(`/dlq/${id}/retry`, { method: 'POST' }),
  ignore: (id: string) => api<void>(`/dlq/${id}/ignore`, { method: 'POST' }),
};

export const statsApi = {
  project: (projectId: string) => api<DashboardStats>(`/projects/${projectId}/stats`),
};
