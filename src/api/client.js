import axios from 'axios';

const api = axios.create({
  // Use relative base in development so CRA proxy (`proxy` in package.json) makes requests same-origin
  baseURL: (() => {
    const isLocal3000 = typeof window !== 'undefined' && window.location && window.location.port === '3000';
    const baseURL = isLocal3000 ? '/api' : (process.env.REACT_APP_API_URL || 'http://localhost:5000/api');
    console.log('🔍 API baseURL:', baseURL, 'isLocal3000:', isLocal3000);
    return baseURL;
  })(),
  withCredentials: true,
});

// Attach access token from localStorage if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
      // console.log('🔍 API Request with token:', config.method?.toUpperCase(), config.url);
      
      // Debug: Decode token to see what user it contains
      // try {
      //   const payload = JSON.parse(atob(token.split('.')[1]));
      //   console.log('🔍 Token contains userId:', payload.userId, 'Expires:', new Date(payload.exp * 1000));
      // } catch (e) {
      //   console.log('🔍 Could not decode token');
      // }
    } else {
      // console.log('🔍 API Request without token:', config.method?.toUpperCase(), config.url);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Simplified response handling: on 401, clear token and bubble up for UI to redirect/logout
api.interceptors.response.use(
  (response) => {
    //console.log('✅ API Response:', response.status, response.config.method?.toUpperCase(), response.config.url);
    return response;
  },
  async (error) => {
    const status = error.response?.status;
    console.error('❌ API Error:', status, error.config?.method?.toUpperCase(), error.config?.url, error.response?.data);
    
    if (status === 401) {
      // console.log('🔍 401 error - clearing token');
      try {
        localStorage.removeItem('token');
      } catch (_) {}
    }
    return Promise.reject(error);
  }
);

// LeetCode Admin API
export const leetCodeApi = {
  // Tasks (corrected from task-sets)
  getTaskSets: () => api.get('/leetcode/tasks'),
  getTaskSet: (id) => api.get(`/leetcode/tasks/${id}`),
  createTaskSet: (data) => api.post('/leetcode/tasks', data),
  updateTaskSet: (id, data) => api.put(`/leetcode/tasks/${id}`, data),
  deleteTaskSet: (id) => api.delete(`/leetcode/tasks/${id}`),
  
  // Submissions (admin route with filters)
  getSubmissions: (params = {}) => api.get('/leetcode/submissions', { params }),
  getSubmission: (id) => api.get(`/leetcode/submissions/${id}`),
  getSubmissionStats: (taskId) => api.get(`/leetcode/tasks/${taskId}/stats`),
  
  // Tasks
  getTasks: (params = {}) => api.get('/leetcode/tasks', { params }),
  getTask: (id) => api.get(`/leetcode/tasks/${id}`),
  
  // Users
  getUsers: () => api.get('/users'),
  getUser: (id) => api.get(`/users/${id}`),
  
  // Admin
  updateSubmissionStatus: (id, status) => 
    api.patch(`/leetcode/submissions/${id}/status`, { status }),
  
  // Search
  searchSubmissions: (query) => 
    api.get('/leetcode/submissions/search', { params: { q: query } })
};

export default api;
