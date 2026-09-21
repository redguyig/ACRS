import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

export const assignmentApi = {
  list: () => api.get('/assignments'),
  get: (id: string) => api.get(`/assignments/${id}`),
  create: (data: {
    title: string;
    description: string;
    language: string;
    deadline: string;
    rubric: Array<{ criterion: string; maxScore: number }>;
    anonymous: boolean;
    courseId: string;
  }) => api.post('/assignments', data),
  update: (id: string, data: Partial<{
    title: string;
    description: string;
    language: string;
    deadline: string;
    rubric: Array<{ criterion: string; maxScore: number }>;
    anonymous: boolean;
  }>) => api.patch(`/assignments/${id}`, data),
  getSubmissions: (id: string) => api.get(`/assignments/${id}/submissions`),
};

export const submissionApi = {
  create: (data: { assignmentId: string; code: string; language: string }) =>
    api.post('/submissions', data),
  get: (id: string) => api.get(`/submissions/${id}`),
  updateRubric: (id: string, rubricScores: Array<{ criterion: string; maxScore: number; awardedScore: number }>) =>
    api.patch(`/submissions/${id}/rubric`, { rubricScores }),
  publish: (id: string, data: { rubricScores: Array<{ criterion: string; maxScore: number; awardedScore: number }>; generalComment: string }) =>
    api.patch(`/submissions/${id}/publish`, data),
};

export const commentApi = {
  create: (data: { submissionId: string; lineNumber: number; content: string }) =>
    api.post('/comments', data),
  update: (id: string, content: string) => api.patch(`/comments/${id}`, { content }),
  delete: (id: string) => api.delete(`/comments/${id}`),
};

export const plagiarismApi = {
  run: (assignmentId: string) => api.post('/plagiarism/run', { assignment_id: assignmentId }),
  status: (assignmentId: string) => api.get(`/plagiarism/status/${assignmentId}`),
  results: (assignmentId: string) => api.get(`/plagiarism/${assignmentId}`),
  updateStatus: (id: string, status: 'reviewed' | 'escalated') => api.patch(`/plagiarism/${id}/status`, { status }),
};

export const feedbackApi = {
  get: (submissionId: string) => api.get(`/feedback/${submissionId}`),
  downloadPdf: (submissionId: string) => api.get(`/feedback/${submissionId}/pdf`, { responseType: 'blob' }),
};

export const adminApi = {
  listUsers: () => api.get('/admin/users'),
  createUser: (data: { name: string; email: string; password: string; role: string; courseId?: string }) =>
    api.post('/admin/users', data),
  updateUser: (id: string, data: Partial<{ name: string; email: string; role: string; courseId: string }>) =>
    api.patch(`/admin/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  listCourses: () => api.get('/admin/courses'),
  createCourse: (data: { name: string; department: string; batchYear: number }) =>
    api.post('/admin/courses', data),
};