import { useRef, useCallback, useEffect } from 'react';
import { io } from 'socket.io-client';

// Lazy Socket.io connection, torn down on unmount.
export function useSocket() {
  const socketRef = useRef(null);

  const getSocket = useCallback(() => {
    socketRef.current ??= io(); // same origin — proxied to the Express server in dev
    return socketRef.current;
  }, []);

  const closeSocket = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
  }, []);

  useEffect(() => closeSocket, [closeSocket]);

  return { getSocket, closeSocket };
}
