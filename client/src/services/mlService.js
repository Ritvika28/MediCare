import { api } from '@/api/axios';

export const mlService = {
  getPredictions: () => api.get('/ml/predict').then((r) => r.data),
  getForecast: () => api.get('/ml/forecast').then((r) => r.data),
  getAnomalies: () => api.get('/ml/anomalies').then((r) => r.data),
  getRecommendations: (params) => api.get('/ml/recommendations', { params }).then((r) => r.data),
  getHealthTwin: () => api.get('/ml/health-twin').then((r) => r.data),
  symptomTriage: (symptoms, coords = {}) => 
    api.post('/ml/symptom-triage', { symptoms, ...coords }).then((r) => r.data),
};
