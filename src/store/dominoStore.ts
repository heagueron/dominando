// /home/heagueron/jmu/dominando/src/store/dominoStore.ts
import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { EstadoMesaPublicoCliente, JugadorCliente } from '@/types/domino'; // Importamos JugadorCliente

// Determinar la URL del servidor de sockets basada en el entorno
const getSocketServerUrl = (): string => {
  if (process.env.NODE_ENV === 'production') {
    // En producción (Vercel), usa la URL de producción
    if (!process.env.NEXT_PUBLIC_SOCKET_SERVER_URL_PROD) {
      console.error("Error: NEXT_PUBLIC_SOCKET_SERVER_URL_PROD no está definida para producción. Usando fallback.");
      // Considera un fallback más robusto o lanzar un error si es crítico
      return 'https://your-production-server.com'; // CAMBIAR: URL de fallback o manejo de error
    }
    return process.env.NEXT_PUBLIC_SOCKET_SERVER_URL_PROD;
  } else {
    // En desarrollo, usa la URL de desarrollo
    if (!process.env.NEXT_PUBLIC_SOCKET_SERVER_URL_DEV) {
      console.warn("Advertencia: NEXT_PUBLIC_SOCKET_SERVER_URL_DEV no está definida para desarrollo. Usando localhost:3001 como fallback.");
      return 'http://localhost:3001'; // Fallback a localhost si no está definida
    }
    return process.env.NEXT_PUBLIC_SOCKET_SERVER_URL_DEV;
  }
};

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
  currentUserImageUrl: string | null; // NUEVO: Opcional para guardar la imagen del usuario actual

  initializeSocket: (userId: string, nombreJugador: string, imageUrl?: string | null) => void; // Modificada
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
  currentUserImageUrl: null, // NUEVO

  initializeSocket: (userId, nombreJugador, imageUrl) => { // Modificada
    const { socket: existingSocket, isConnected: alreadyConnected, currentUserId: existingUserId, currentUserImageUrl: existingImageUrl } = get();
    
    // Si ya hay un socket conectado con el mismo userId, no hacer nada.
    if (existingSocket && alreadyConnected && existingUserId === userId) {
      console.log('[DOMINO_STORE] Socket ya inicializado y conectado para este usuario.');
      return;
    }

    // Si hay un socket existente (incluso si está desconectado o con otro userId o imageUrl), desconectarlo primero.
    if (existingSocket) {
      // Solo desconectar si los datos de autenticación han cambiado o si no está conectado
      if (!alreadyConnected || existingUserId !== userId || existingImageUrl !== imageUrl) {
        console.log('[DOMINO_STORE] Desconectando socket existente antes de crear uno nuevo debido a cambio de auth o estado de conexión.');
        existingSocket.disconnect();
        // Limpiar el socket del estado para forzar la creación de uno nuevo
        set({ socket: null, isConnected: false, currentUserId: null, currentNombreJugador: null, currentUserImageUrl: null });
      }
    }

    const SOCKET_SERVER_URL = getSocketServerUrl(); // Obtener la URL dinámicamente
    console.log(`[DOMINO_STORE] Inicializando socket con URL: ${SOCKET_SERVER_URL} para userId: ${userId}, nombreJugador: ${nombreJugador}, imageUrl: ${imageUrl}`);
    const newSocket = io(SOCKET_SERVER_URL, {
      auth: { userId, nombreJugador, imageUrl: imageUrl || undefined }, // Enviar imageUrl si existe
      transports: ['websocket'],
      // autoConnect: true, // Dejar que se conecte automáticamente al crear la instancia
    });

    newSocket.on('connect', () => {
      console.log('[DOMINO_STORE_SOCKET] Conectado al servidor. Socket ID:', newSocket.id);
      set({ socket: newSocket, isConnected: true, socketError: null, currentUserId: userId, currentNombreJugador: nombreJugador });
      set({ currentUserImageUrl: imageUrl || null }); // Guardar la imagen
    });

    // Es importante guardar el socket en el estado inmediatamente,
    // no solo en el evento 'connect', para que esté disponible para otras acciones.
    // Sin embargo, el estado de 'isConnected' y 'currentUserId' se actualiza en 'connect'.
    set({ socket: newSocket });

    newSocket.on('disconnect', (reason) => {
      console.log('[DOMINO_STORE_SOCKET] Desconectado del servidor. Razón:', reason);
      // No limpiar el socket aquí para permitir intentos de reconexión o conexión manual.
      // Solo actualizar el estado de conexión.
      set({ isConnected: false, socketError: `Desconectado: ${reason}` });
    });

    newSocket.on('connect_error', (err) => {
      console.error('[DOMINO_STORE_SOCKET] Error de conexión:', err.message, err);
      set({ isConnected: false, socketError: `Error de conexión: ${err.message}`, socket: null, currentUserId: null, currentNombreJugador: null, currentUserImageUrl: null });
    });
  },

  disconnectSocket: () => {
    get().socket?.disconnect();
    console.log('[DOMINO_STORE] Solicitud de desconexión del socket.');
    // El estado se actualizará a través del evento 'disconnect' del socket.
    // Podríamos forzar el estado aquí si es necesario:
    set({ socket: null, isConnected: false, currentUserId: null, currentNombreJugador: null, currentUserImageUrl: null });
  },

  emitEvent: <T>(eventName: string, payload: T) => {
    const { socket, isConnected } = get();
    if (socket && isConnected) {
      // BUG_HUNT: Logging para el bug de jugada inválida
      if (eventName === 'cliente:jugarFicha') {
        const { miIdJugadorSocket, estadoMesaCliente, manosJugadores, playableFichaIds } = get();
        const miMano = manosJugadores.find(j => j.id === miIdJugadorSocket);
        const miEstado = estadoMesaCliente?.jugadores.find(j => j.id === miIdJugadorSocket);

        const logData = {
          evento: 'cliente:pre-jugarFicha',
          timestamp: new Date().toISOString(),
          payload,
          estadoCliente: {
            miIdJugadorSocket,
            turnoActual: estadoMesaCliente?.partidaActual?.rondaActual?.currentPlayerId,
            extremosMesa: estadoMesaCliente?.partidaActual?.rondaActual?.extremos,
            estadoJugador: miEstado?.estadoJugadorEnMesa,
            manoLength: miMano?.numFichas,
            playableFichaIds,
          }
        };
        console.log(`BUG_HUNT_CLIENTE: ${JSON.stringify(logData)}`);
      }
      socket.emit(eventName, payload);
    } else {
      console.error(`[DOMINO_STORE] No se puede emitir evento '${eventName}': socket no conectado o no inicializado.`);
    }
  },

  clearSocketError: () => set({ socketError: null }),
}));
