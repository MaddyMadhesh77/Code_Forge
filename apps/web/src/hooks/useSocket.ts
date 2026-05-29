import { useSocketContext } from '../providers/SocketProvider';

export function useSocket() {
  return useSocketContext();
}
