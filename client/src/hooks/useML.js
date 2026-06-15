import { useQuery, useMutation } from '@tanstack/react-query';
import { mlService } from '@/services/mlService';

export function usePredictions() {
  return useQuery({
    queryKey: ['ml-predictions'],
    queryFn: () => mlService.getPredictions(),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
}

export function useForecast() {
  return useQuery({
    queryKey: ['ml-forecast'],
    queryFn: () => mlService.getForecast(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAnomalies() {
  return useQuery({
    queryKey: ['ml-anomalies'],
    queryFn: () => mlService.getAnomalies(),
    staleTime: 2 * 60 * 1000, // 2 minutes cache
  });
}

export function useMLRecommendations(params = {}, enabled = true) {
  return useQuery({
    queryKey: ['ml-recommendations', params],
    queryFn: () => mlService.getRecommendations(params),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useHealthTwin() {
  return useQuery({
    queryKey: ['ml-health-twin'],
    queryFn: () => mlService.getHealthTwin(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSymptomTriage() {
  return useMutation({
    mutationFn: ({ symptoms, location }) => mlService.symptomTriage(symptoms, location),
  });
}
