import { useMutation } from '@tanstack/react-query';
import { fetchStartInterview } from '../services/api';

export function useStartInterview() {
  return useMutation({
    mutationFn: fetchStartInterview,
  });
}
