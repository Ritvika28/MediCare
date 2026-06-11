import { api } from '@/api/axios';

export const hospitalService = {
  getAll: (params) => api.get('/hospitals', { params }).then((r) => r.data),

  getNearby: (latitude, longitude, maxDistanceKm = 50) => {
    const params = { latitude, longitude, maxDistance: maxDistanceKm * 1000 };
    console.log('[NearbyHospitals] API request params:', params);
    return api.get('/hospitals/nearby', { params }).then((r) => {
      console.log('[NearbyHospitals] API response:', r.data);
      return r.data;
    });
  },

  getById: (id) => api.get(`/hospitals/${id}`).then((r) => r.data),
  getDoctors: (hospitalId, params) =>
    api.get(`/hospitals/${hospitalId}/doctors`, { params }).then((r) => r.data),
  compare: (ids) => api.get('/hospitals/compare', { params: { ids: ids.join(',') } }).then((r) => r.data),
  getDepartments: (hospitalId) =>
    api.get(`/departments/hospital/${hospitalId}`).then((r) => r.data),
  getBeds: (hospitalId) => api.get(`/beds/${hospitalId}`).then((r) => r.data),
};
