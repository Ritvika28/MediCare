import { useMutation } from '@tanstack/react-query';
import { recommendationService } from '@/services/recommendationService';

export function useRecommendations() {
  return useMutation({
    mutationFn: (payload) => recommendationService.get(payload),
  });
}
