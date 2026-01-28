import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  }),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/users/me'),
};

export const appointmentAPI = {
  create: (data) => api.post('/appointments/', data),
  getAll: () => api.get('/appointments/'),
  updateStatus: (id, status) => api.put(`/appointments/${id}/status?status=${status}`),
};

export const medicalAPI = {
  getDoctors: () => api.get('/users/doctors'),
  createPrescription: (data) => api.post('/medical/prescriptions', data),
  getPrescriptions: () => api.get('/medical/prescriptions'),
  dispensePrescription: (id) => api.put(`/medical/prescriptions/${id}/dispense`),
  createLabRequest: (data) => api.post('/medical/lab-requests', data),
  getLabRequests: () => api.get('/medical/lab-requests'),
  uploadLabReport: (id, formData) => api.post(`/medical/lab-requests/${id}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getLabReport: (id) => api.get(`/medical/lab-reports/${id}`),
};

export const adminAPI = {
    getStats: () => api.get('/admin/stats'),
    getAllUsers: () => api.get('/users/'),
    deleteUser: (id) => api.delete(`/users/${id}`),
    createUser: (userData) => api.post('/auth/register', userData), // Admin can use the same register endpoint with the token auth to create specific roles
};

// Public API (no auth required)
export const publicAPI = {
    getStats: () => api.get('/admin/public-stats'),
};

export default api;
