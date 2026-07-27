import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';

type SocketContextValue = {
  socket: Socket | null;
  connected: boolean;
  connect: () => Socket | null;
  disconnect: () => void;
  url: string;
};

const processEnv = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env;
const SOCKET_URL = processEnv?.NEXT_PUBLIC_WS_URL || import.meta.env.VITE_WS_URL || '';

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  const disconnect = useCallback(() => {
    setConnected(false);
    setSocket((current) => {
      current?.disconnect();
      current?.removeAllListeners();
      return null;
    });
  }, []);

  const connect = useCallback(() => {
    if (!SOCKET_URL || socket) {
      return socket;
    }

    const instance = io(SOCKET_URL, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    instance.on('connect', () => setConnected(true));
    instance.on('disconnect', () => setConnected(false));

    setSocket(instance);
    return instance;
  }, [socket]);

  useEffect(() => {
    if (!SOCKET_URL) {
      return undefined;
    }

    const instance = connect();
    return () => {
      instance?.disconnect();
      instance?.removeAllListeners();
      setSocket(null);
      setConnected(false);
    };
  }, [connect]);

  const value = useMemo<SocketContextValue>(() => ({
    socket,
    connected,
    connect,
    disconnect,
    url: SOCKET_URL,
  }), [connect, connected, disconnect, socket]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocketContext(): SocketContextValue {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error('useSocketContext must be used within SocketProvider');
  }

  return context;
}
