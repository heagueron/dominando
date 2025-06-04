// /home/heagueron/jmu/dominando/src/store/dominoStore.ts
import { create } from 'zustand';
import { EstadoMesaPublicoCliente, JugadorCliente } from '@/types/domino'; // Importamos JugadorCliente
import { FichaDomino } from '@/utils/dominoUtils'; // Importamos FichaDomino

// Definimos la interfaz para el estado de nuestro store
interface DominoStoreState {
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
}

// Creamos el store
export const useDominoStore = create<DominoStoreState>((set) => ({
  // Estado inicial
  estadoMesaCliente: null,

  // Acciones para modificar el estado
  setEstadoMesaCliente: (nuevoEstado) => set({ estadoMesaCliente: nuevoEstado }),

  // Estado inicial para jugadores y mano
  miIdJugadorSocket: null,
  manosJugadores: [],
  playableFichaIds: [],

  // Acciones para jugadores y mano
  setMiIdJugadorSocket: (id) => set({ miIdJugadorSocket: id }),
  setManosJugadores: (manosOrUpdater) =>
    set((state) => ({
      manosJugadores: typeof manosOrUpdater === 'function'
        ? (manosOrUpdater as (prevManos: JugadorCliente[]) => JugadorCliente[])(state.manosJugadores)
        : manosOrUpdater,
    })),
  setPlayableFichaIds: (ids) => set({ playableFichaIds: ids }),
}));
