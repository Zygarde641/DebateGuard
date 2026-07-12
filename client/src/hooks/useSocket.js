import { useRef, useCallback, useEffect } from 'react';
import { io } from 'socket.io-client';
import { SERVER_URL } from '../config';

// Lazy Socket.io connection, torn down on unmount.
export function useSocket() {
  const socketRef = useRef(null);

  const getSocket = useCallback(() => {
    // SERVER_URL is '' locally (same origin, proxied) or the server URL in a split deploy
    socketRef.current ??= io(SERVER_URL || undefined);
    return socketRef.current;
  }, []);

  const closeSocket = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
  }, []);

  useEffect(() => closeSocket, [closeSocket]);

  return { getSocket, closeSocket };
}
