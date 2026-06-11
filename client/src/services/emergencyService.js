import { api } from '@/api/axios';

export const emergencyService = {
  getNearest: (lat, lng) => api.get('/emergency/nearest', { params: { lat, lng } }).then((r) => r.data),
  createRequest: (data) => api.post('/emergency/request', data).then((r) => r.data),
  getRequests: () => api.get('/emergency/requests').then((r) => r.data),
};
