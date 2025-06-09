// src/hooks/useDominoSocket.ts
import { useEffect, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { useDominoStore } from '@/store/dominoStore';


export interface UseDominoSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  socketError: string | null;
  emitEvent: <T>(eventName: string, payload: T) => void;
  // Las funciones connect/disconnect ahora se manejan a través de initializeSocket/disconnectSocket del store
  registerEventHandlers: (handlers: Record<string, (...args: unknown[]) => void>) => void;
  unregisterEventHandlers: (eventNames: string[]) => void;
  initializeSocketIfNeeded: (userId: string, nombreJugador: string) => void; // Nueva función para conveniencia
  disconnectSocketFromStore: () => void; // Nueva función para conveniencia
}

export const useDominoSocket = (): UseDominoSocketReturn => {
  // Seleccionar cada pieza del estado individualmente para optimizar re-renders
  // y evitar problemas con la firma de dos argumentos de useStore.
  const socket = useDominoStore(state => state.socket);
  const isConnected = useDominoStore(state => state.isConnected);
  const socketError = useDominoStore(state => state.socketError);
  // const currentUserId = useDominoStore(state => state.currentUserId);
  // const currentNombreJugador = useDominoStore(state => state.currentNombreJugador);

  // Obtenemos las acciones (funciones) por separado. Zustand garantiza que estas referencias son estables.
  // Esta parte ya estaba bien y no necesita una función de igualdad.
  const emitEvent = useDominoStore(state => state.emitEvent);
  const initializeSocket = useDominoStore(state => state.initializeSocket);
  const disconnectSocket = useDominoStore(state => state.disconnectSocket);
  const clearSocketError = useDominoStore(state => state.clearSocketError);

  // Ref to store dynamically registered event handlers
  const dynamicHandlersRef = useRef<Record<string, (...args: unknown[]) => void>>({});

  // Limpiar los handlers de este hook cuando el componente que lo usa se desmonte
  useEffect(() => {
    const currentSocket = socket; // Capturar el socket actual para la limpieza
    return () => {
      if (currentSocket) {
        Object.entries(dynamicHandlersRef.current).forEach(([event, handler]) => {
          currentSocket.off(event, handler);
        });
      }
      dynamicHandlersRef.current = {};
    };
  }, [socket]); // Re-ejecutar si la instancia del socket del store cambia

  const registerEventHandlers = useCallback((handlers: Record<string, (...args: unknown[]) => void>) => {
    if (socket) {
      Object.entries(handlers).forEach(([event, handler]) => {
        // Remove previous handler for this event, if any, to prevent duplicates
        if (dynamicHandlersRef.current[event]) {
          socket.off(event, dynamicHandlersRef.current[event]);
        }
        // Add new handler
        socket.on(event, handler);
        // Store in ref
        dynamicHandlersRef.current[event] = handler;
      });
    } else {
        console.warn('[useDominoSocket] Cannot register event handlers: socket instance is null.');
    }
  }, [socket]);

  const unregisterEventHandlers = useCallback((eventNames: string[]) => {
    if (socket) {
      eventNames.forEach(event => {
        if (dynamicHandlersRef.current[event]) {
          socket.off(event, dynamicHandlersRef.current[event]);
          delete dynamicHandlersRef.current[event];
        }
      });
    }
  }, [socket]);

  const initializeSocketIfNeeded = useCallback((uid: string, nombre: string) => {
    // Llama a initializeSocket del store.
    initializeSocket(uid, nombre);
    // Opcional: Limpiar errores previos al intentar inicializar/conectar
    clearSocketError();
  }, [initializeSocket, clearSocketError]); // Añadir clearSocketError a las dependencias

  const disconnectSocketFromStore = useCallback(() => {
    disconnectSocket();
  }, [disconnectSocket]);

  return { 
    socket, 
    isConnected, 
    socketError, 
    emitEvent, // emitEvent ahora viene de la segunda llamada a useDominoStore
    registerEventHandlers, 
    unregisterEventHandlers,
    initializeSocketIfNeeded,
    disconnectSocketFromStore,
  };
};
