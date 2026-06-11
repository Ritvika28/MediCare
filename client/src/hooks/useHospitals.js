import { useQuery } from '@tanstack/react-query';
import { hospitalService } from '@/services/hospitalService';

export function useNearbyHospitals(latitude, longitude, enabled = true) {
  const hasCoords =
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    !Number.isNaN(latitude) &&
    !Number.isNaN(longitude);

  return useQuery({
    queryKey: ['hospitals', 'nearby', latitude, longitude],
    queryFn: () => hospitalService.getNearby(latitude, longitude),
    enabled: enabled && hasCoords,
    retry: 1,
  });
}

export function useHospital(id) {
  return useQuery({
    queryKey: ['hospital', id],
    queryFn: () => hospitalService.getById(id),
    enabled: !!id,
  });
}

export function useHospitalDoctors(hospitalId, departmentId) {
  return useQuery({
    queryKey: ['hospital-doctors', hospitalId, departmentId],
    queryFn: () => hospitalService.getDoctors(hospitalId, { departmentId }),
    enabled: !!hospitalId,
  });
}
