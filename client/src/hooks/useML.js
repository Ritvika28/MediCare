import { useQuery, useMutation } from '@tanstack/react-query';
import { mlService } from '@/services/mlService';
import { useAuth } from '@/context/AuthContext';

export function usePredictions() {
  const { user, authInitialized } = useAuth();
  const token = localStorage.getItem('accessToken');
  const isEnabled = !!user && !!token && authInitialized;

  console.log('[React Query] ml-predictions query enabled status:', isEnabled);

  return useQuery({
    queryKey: ['ml-predictions'],
    queryFn: () => mlService.getPredictions(),
    enabled: isEnabled,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
}

export function useForecast() {
  const { user, authInitialized } = useAuth();
  const token = localStorage.getItem('accessToken');
  const isEnabled = !!user && !!token && authInitialized;

  console.log('[React Query] ml-forecast query enabled status:', isEnabled);

  return useQuery({
    queryKey: ['ml-forecast'],
    queryFn: () => mlService.getForecast(),
    enabled: isEnabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAnomalies() {
  const { user, authInitialized } = useAuth();
  const token = localStorage.getItem('accessToken');
  const isEnabled = !!user && !!token && authInitialized;

  console.log('[React Query] ml-anomalies query enabled status:', isEnabled);

  return useQuery({
    queryKey: ['ml-anomalies'],
    queryFn: () => mlService.getAnomalies(),
    enabled: isEnabled,
    staleTime: 2 * 60 * 1000, // 2 minutes cache
  });
}

export function useMLRecommendations(params = {}, enabled = true) {
  const { user, authInitialized } = useAuth();
  const token = localStorage.getItem('accessToken');
  const isEnabled = enabled && !!user && !!token && authInitialized;

  console.log('[React Query] ml-recommendations query enabled status:', isEnabled);

  return useQuery({
    queryKey: ['ml-recommendations', params],
    queryFn: () => mlService.getRecommendations(params),
    enabled: isEnabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useHealthTwin() {
  const { user, authInitialized } = useAuth();
  const token = localStorage.getItem('accessToken');
  const isEnabled = !!user && !!token && authInitialized;

  console.log('[React Query] ml-health-twin query enabled status:', isEnabled);

  return useQuery({
    queryKey: ['ml-health-twin'],
    queryFn: () => mlService.getHealthTwin(),
    enabled: isEnabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSymptomTriage() {
  return useMutation({
    mutationFn: ({ symptoms, location }) => mlService.symptomTriage(symptoms, location),
  });
}
