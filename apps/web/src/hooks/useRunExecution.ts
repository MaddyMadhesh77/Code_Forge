import { useMutation } from '@tanstack/react-query';
import { fetchRunExecution } from '../services/api';

export function useRunExecution() {
  return useMutation({
    mutationFn: fetchRunExecution,
  });
}
