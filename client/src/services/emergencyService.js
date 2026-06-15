import { api } from '@/api/axios';

export const emergencyService = {
  getNearest: (lat, lng) => api.get('/emergency/nearest', { params: { lat, lng } }).then((r) => r.data),
  createRequest: (data) => api.post('/emergency/request', data).then((r) => r.data),
  getRequests: () => api.get('/emergency/requests').then((r) => r.data),
  listContacts: () => api.get('/emergency/contacts').then((r) => r.data),
  createContact: (data) => api.post('/emergency/contacts', data).then((r) => r.data),
  updateContact: (id, data) => api.patch(`/emergency/contacts/${id}`, data).then((r) => r.data),
  deleteContact: (id) => api.delete(`/emergency/contacts/${id}`).then((r) => r.data),
};
