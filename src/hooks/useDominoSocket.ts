// src/hooks/useDominoSocket.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:3001';

export interface UseDominoSocketProps {
  userId: string | null;
  nombreJugador: string | null;
  autoConnect?: boolean;
  onConnect?: (emitEvent: <T = any>(eventName: string, payload: T) => void) => void;
  onDisconnect?: (reason: Socket.DisconnectReason) => void;
  onConnectError?: (err: Error) => void;
}

export interface UseDominoSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  error: string | null;
  emitEvent: <T = any>(eventName: string, payload: T) => void;
  connectSocket: () => void;
  disconnectSocket: () => void;
  registerEventHandlers: (handlers: Record<string, (...args: any[]) => void>) => void;
  unregisterEventHandlers: (eventNames: string[]) => void;
}

export const useDominoSocket = ({
  userId,
  nombreJugador,
  autoConnect = true,
  onConnect: onConnectCallback,
  onDisconnect: onDisconnectCallback,
  onConnectError: onConnectErrorCallback,
}: UseDominoSocketProps): UseDominoSocketReturn => {
  const [socketInstance, setSocketInstance] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null); // Ref para acceso síncrono al socket
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Ref to store dynamically registered event handlers
  const dynamicHandlersRef = useRef<Record<string, (...args: any[]) => void>>({});

  // Effect for socket creation, core event handling, and connection management
  useEffect(() => {
    if (!userId || !nombreJugador) {
      if (socketRef.current) { // Usar socketRef para la comprobación
        console.log('[useDominoSocket] userId or nombreJugador became null. Disconnecting existing socket.');
        socketRef.current.disconnect(); // Usar socketRef para desconectar
        setSocketInstance(null);
        socketRef.current = null; // Limpiar ref
        setIsConnected(false);
        // Clear dynamic handlers as the socket is gone
        dynamicHandlersRef.current = {};
      }
      return;
    }

    console.log('[useDominoSocket] Initializing socket with auth:', { userId, nombreJugador });
    const newSocket = io(SOCKET_SERVER_URL, {
      auth: { userId, nombreJugador },
      transports: ['websocket'],
      autoConnect: false, // We control connection explicitly via autoConnect prop or connectSocket()
    });
    setSocketInstance(newSocket);
    socketRef.current = newSocket; // Asignar a ref

    // Crear una función emit específica para este newSocket, para pasarla a onConnect
    // Esto asegura que el onConnectCallback use el socket correcto que acaba de ser creado
    // y no dependa del estado socketInstance que se actualiza asíncronamente.
    const emitForThisConnection = <T = any>(eventName: string, payload: T) => {
      if (newSocket.connected) { // Usar newSocket directamente
        newSocket.emit(eventName, payload);
      } else {
        console.warn(`[useDominoSocket] emitForThisConnection: Socket (id: ${newSocket.id}) not connected. Cannot emit event: ${eventName}`);
      }
    };

    const handleConnect = () => {
      console.log('[useDominoSocket] Connected:', newSocket.id);
      setIsConnected(true);
      setError(null);
      onConnectCallback?.(emitForThisConnection); // Usar la función de emisión específica de esta conexión
    };

    const handleDisconnect = (reason: Socket.DisconnectReason) => {
      console.log('[useDominoSocket] Disconnected:', reason);
      setIsConnected(false);
      // setError(`Disconnected: ${reason}`); // Optional: set error on disconnect
      onDisconnectCallback?.(reason);
    };

    const handleConnectError = (err: Error) => {
      console.error('[useDominoSocket] Connection Error:', err.message, err);
      setError(`Connection Error: ${err.message}`);
      setIsConnected(false);
      onConnectErrorCallback?.(err);
    };

    newSocket.on('connect', handleConnect);
    newSocket.on('disconnect', handleDisconnect);
    newSocket.on('connect_error', handleConnectError);

    if (autoConnect) {
      console.log('[useDominoSocket] Auto-connecting...');
      newSocket.connect();
    }

    return () => {
      console.log('[useDominoSocket] Cleaning up socket instance.');
      newSocket.off('connect', handleConnect);
      newSocket.off('disconnect', handleDisconnect);
      newSocket.off('connect_error', handleConnectError);

      // Unregister all dynamically added event handlers
      Object.entries(dynamicHandlersRef.current).forEach(([event, handler]) => {
        newSocket.off(event, handler);
      });
      dynamicHandlersRef.current = {}; // Clear the ref

      newSocket.disconnect();
      setSocketInstance(null);
      socketRef.current = null; // Limpiar ref
      setIsConnected(false);
    };
  // La dependencia de `emitEvent` (la función del hook) fue intencionalmente omitida del array de dependencias
  // (y por eso el eslint-disable) porque:
  // 1. Si se incluyera, causaría un ciclo infinito, ya que `emitEvent` depende de `socketInstance`,
  //    y `socketInstance` se establece dentro de este mismo `useEffect`.
  // 2. La función `emitEvent` que se pasa al `onConnectCallback` ahora es `emitForThisConnection`,
  //    que se crea localmente dentro del efecto y está vinculada al `newSocket` de la ejecución actual del efecto.
  //    Esto asegura que `onConnectCallback` siempre reciba una función `emit` válida para el socket recién conectado.
  // Los callbacks (onConnectCallback, onDisconnectCallback, onConnectErrorCallback) pasados como props
  // deben ser memoizados en el componente padre si tienen dependencias, para evitar que este efecto se ejecute innecesariamente.
  }, [userId, nombreJugador, autoConnect, onConnectCallback, onDisconnectCallback, onConnectErrorCallback]);

  const connectSocket = useCallback(() => {
    if (socketInstance?.connected) {
      console.log('[useDominoSocket] Already connected.');
      return;
    }
    if (socketInstance) {
      console.log('[useDominoSocket] Manually connecting...');
      socketInstance.connect();
    } else {
      console.warn('[useDominoSocket] connectSocket called but socket instance is null. Ensure userId and nombreJugador are set.');
    }
  }, [socketInstance]);

  const disconnectSocket = useCallback(() => {
    if (socketInstance) {
      console.log('[useDominoSocket] Manually disconnecting...');
      socketInstance.disconnect();
    }
  }, [socketInstance]);

  const emitEvent = useCallback(<T = any>(eventName: string, payload: T) => {
    if (socketInstance?.connected) {
      socketInstance.emit(eventName, payload);
    } else {
      console.warn(`[useDominoSocket] Socket not connected. Cannot emit event: ${eventName}`);
    }
  }, [socketInstance]);

  const registerEventHandlers = useCallback((handlers: Record<string, (...args: any[]) => void>) => {
    if (socketRef.current) { // Usar socketRef.current para acceso síncrono
      Object.entries(handlers).forEach(([event, handler]) => {
        // Remove previous handler for this event, if any, to prevent duplicates
        if (dynamicHandlersRef.current[event]) {
          socketRef.current!.off(event, dynamicHandlersRef.current[event]);
        }
        // Add new handler
        socketRef.current!.on(event, handler);
        // Store in ref
        dynamicHandlersRef.current[event] = handler;
      });
    } else {
        console.warn('[useDominoSocket] Cannot register event handlers: socket instance is null.');
    }
  }, []); // socketRef y dynamicHandlersRef son estables, por lo que las dependencias pueden ser vacías

  const unregisterEventHandlers = useCallback((eventNames: string[]) => {
    if (socketRef.current) { // Usar socketRef.current para acceso síncrono
      eventNames.forEach(event => {
        if (dynamicHandlersRef.current[event]) {
          socketRef.current!.off(event, dynamicHandlersRef.current[event]);
          delete dynamicHandlersRef.current[event];
        }
      });
    }
  }, []); // socketRef y dynamicHandlersRef son estables

  return { 
    socket: socketInstance, 
    isConnected, 
    error: error, 
    emitEvent, 
    connectSocket, 
    disconnectSocket, 
    registerEventHandlers, 
    unregisterEventHandlers 
  };
};
