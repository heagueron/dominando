// /home/heagueron/jmu/dominando/src/store/dominoStore.ts
import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { EstadoMesaPublicoCliente, JugadorCliente } from '@/types/domino'; // Importamos JugadorCliente

const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:3001';

// Definimos la interfaz para el estado de nuestro store
export interface DominoStoreState { // <--- AÑADIR EXPORT
  estadoMesaCliente: EstadoMesaPublicoCliente | null;
  setEstadoMesaCliente: (estado: EstadoMesaPublicoCliente | null) => void;

  // Nuevos estados para información de jugadores y mano local
  miIdJugadorSocket: string | null;
  manosJugadores: JugadorCliente[]; // Información de todos los jugadores (mano completa para local, solo count para otros)
  playableFichaIds: string[]; // IDs de fichas jugables para el jugador local

  // Nuevas acciones
  setMiIdJugadorSocket: (id: string | null) => void;
  setManosJugadores: (manos: JugadorCliente[] | ((prevManos: JugadorCliente[]) => JugadorCliente[])) => void;
  setPlayableFichaIds: (ids: string[]) => void;

  // Estados y acciones para Socket.IO
  socket: Socket | null;
  isConnected: boolean;
  socketError: string | null;
  currentUserId: string | null; // Para saber con qué userId se conectó el socket
  currentNombreJugador: string | null; // Para saber con qué nombreJugador se conectó el socket

  initializeSocket: (userId: string, nombreJugador: string) => void;
  disconnectSocket: () => void;
  emitEvent: <T>(eventName: string, payload: T) => void;
  // Opcional: limpiar errores del socket
  clearSocketError: () => void;
}

// Creamos el store
export const useDominoStore = create<DominoStoreState>((set, get) => ({
  // Estado inicial
  estadoMesaCliente: null,
  setEstadoMesaCliente: (nuevoEstado) => set({ estadoMesaCliente: nuevoEstado }),

  // Estado inicial para jugadores y mano
  miIdJugadorSocket: null,
  manosJugadores: [],
  playableFichaIds: [],
  setMiIdJugadorSocket: (id) => set({ miIdJugadorSocket: id }),
  setManosJugadores: (manosOrUpdater) =>
    set((state) => ({
      manosJugadores: typeof manosOrUpdater === 'function'
        ? (manosOrUpdater as (prevManos: JugadorCliente[]) => JugadorCliente[])(state.manosJugadores)
        : manosOrUpdater,
    })),
  setPlayableFichaIds: (ids) => set({ playableFichaIds: ids }),

  // Estado inicial para Socket.IO
  socket: null,
  isConnected: false,
  socketError: null,
  currentUserId: null,
  currentNombreJugador: null,

  initializeSocket: (userId, nombreJugador) => {
    const { socket: existingSocket, isConnected: alreadyConnected, currentUserId: existingUserId } = get();

    // Si ya hay un socket conectado con el mismo userId, no hacer nada.
    if (existingSocket && alreadyConnected && existingUserId === userId) {
      console.log('[DOMINO_STORE] Socket ya inicializado y conectado para este usuario.');
      return;
    }

    // Si hay un socket existente (incluso si está desconectado o con otro userId), desconectarlo primero.
    if (existingSocket) {
      console.log('[DOMINO_STORE] Desconectando socket existente antes de crear uno nuevo.');
      existingSocket.disconnect();
    }

    console.log(`[DOMINO_STORE] Inicializando socket para userId: ${userId}, nombreJugador: ${nombreJugador}`);
    const newSocket = io(SOCKET_SERVER_URL, {
      auth: { userId, nombreJugador }, // Usar 'auth' para enviar datos al conectar
      transports: ['websocket'],
      // autoConnect: true, // Dejar que se conecte automáticamente al crear la instancia
    });

    newSocket.on('connect', () => {
      console.log('[DOMINO_STORE_SOCKET] Conectado al servidor. Socket ID:', newSocket.id);
      set({ socket: newSocket, isConnected: true, socketError: null, currentUserId: userId, currentNombreJugador: nombreJugador });
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[DOMINO_STORE_SOCKET] Desconectado del servidor. Razón:', reason);
      // No limpiar el socket aquí para permitir intentos de reconexión o conexión manual.
      // Solo actualizar el estado de conexión.
      set({ isConnected: false, socketError: `Desconectado: ${reason}` });
    });

    newSocket.on('connect_error', (err) => {
      console.error('[DOMINO_STORE_SOCKET] Error de conexión:', err.message, err);
      set({ isConnected: false, socketError: `Error de conexión: ${err.message}`, socket: null, currentUserId: null, currentNombreJugador: null });
    });
    
    // Guardar la instancia del socket en el store inmediatamente para poder llamarle .connect() si autoConnect fuera false
    // o para tenerla disponible. Si autoConnect es true (por defecto en io()), el evento 'connect' se encargará.
    // set({ socket: newSocket, currentUserId: userId, currentNombreJugador: nombreJugador }); // Se actualiza en 'connect'
  },

  disconnectSocket: () => {
    get().socket?.disconnect();
    console.log('[DOMINO_STORE] Solicitud de desconexión del socket.');
    // El estado se actualizará a través del evento 'disconnect' del socket.
    // Podríamos forzar el estado aquí si es necesario:
    // set({ socket: null, isConnected: false, currentUserId: null, currentNombreJugador: null });
  },

  emitEvent: <T>(eventName: string, payload: T) => {
    const { socket, isConnected } = get();
    if (socket && isConnected) {
      socket.emit(eventName, payload);
    } else {
      console.error(`[DOMINO_STORE] No se puede emitir evento '${eventName}': socket no conectado o no inicializado.`);
    }
  },

  clearSocketError: () => set({ socketError: null }),
}));
