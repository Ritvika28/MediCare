import { api } from '@/api/axios';

export const recommendationService = {
  get: (payload) => api.post('/recommendations', payload).then((r) => r.data),
};
