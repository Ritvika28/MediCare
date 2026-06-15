import { api } from '@/api/axios';

export const hospitalService = {
  getAll: (params) => api.get('/hospitals', { params }).then((r) => r.data),

  getNearby: (latitude, longitude, options = {}) => {
    const { maxDistanceKm = 50, search, city, state, facilities } = options;
    const params = {
      latitude,
      longitude,
      maxDistance: maxDistanceKm * 1000,
    };
    if (search) params.search = search;
    if (city && city !== 'All') params.city = city;
    if (state) params.state = state;
    if (facilities) params.facilities = facilities;
    return api.get('/hospitals/nearby', { params }).then((r) => r.data);
  },

  getById: (id) => api.get(`/hospitals/${id}`).then((r) => r.data),
  getDoctors: (hospitalId, params) =>
    api.get(`/hospitals/${hospitalId}/doctors`, { params }).then((r) => r.data),
  compare: (ids) => api.get('/hospitals/compare', { params: { ids: ids.join(',') } }).then((r) => r.data),
  getDepartments: (hospitalId) =>
    api.get(`/departments/hospital/${hospitalId}`).then((r) => r.data),
  getBeds: (hospitalId) => api.get(`/beds/${hospitalId}`).then((r) => r.data),
};

export const INDIAN_CITIES = [
  'Mumbai', 'Delhi', 'Lucknow', 'Pune', 'Bangalore', 'Hyderabad',
  'Chennai', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Bhopal', 'Indore',
];

export const HOSPITAL_FACILITIES = [
  { key: 'Emergency', label: 'Emergency Admissions', icon: '🚨' },
  { key: 'ICU', label: 'Intensive Care Unit (ICU)', icon: '🏥' },
  { key: 'NICU', label: 'Neonatal ICU (NICU)', icon: '👶' },
  { key: 'Ambulance', label: 'Ambulance Service', icon: '🚑' },
  { key: 'Pharmacy', label: 'In-house Pharmacy', icon: '💊' },
  { key: 'Lab', label: 'Diagnostics Laboratory', icon: '🧪' },
  { key: 'MRI', label: 'MRI Scanner', icon: '🧲' },
  { key: 'CTScan', label: 'CT Scanner', icon: '🌀' },
  { key: 'BloodBank', label: 'Blood Bank Services', icon: '🩸' },
  { key: 'Dialysis', label: 'Dialysis Unit', icon: '💧' },
  { key: 'Ventilator', label: 'Ventilator Support', icon: '🫁' },
  { key: 'OperationTheatre', label: 'Operation Theatre', icon: '🏨' },
];
