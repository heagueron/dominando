// /home/heagueron/jmu/dominando/src/types/domino.ts

import { FichaDomino, FichaEnMesaParaLogica } from '@/utils/dominoUtils';

// --- Nuevos Enums para Tipos de Partida (deben coincidir con schema.prisma y game.types.ts del servidor) ---

export enum MatchCategory {
  FREE_PLAY = 'FREE_PLAY',
  PAID_PLAY = 'PAID_PLAY',
}

export enum GameMode {
  SINGLE_ROUND = 'SINGLE_ROUND',
  FULL_GAME = 'FULL_GAME',
}

export enum Currency {
  VES = 'VES',
  USDT = 'USDT',
}

// --- Fin Nuevos Enums ---

export interface JugadorCliente {
  idJugador: string;
  nombre?: string;
  fichas: FichaDomino[];
  numFichas?: number;
  estaConectado?: boolean;
  ordenTurno?: number;
  image?: string; // Añadido para la URL del avatar del jugador
  seatIndex?: number; // Añadido para la posición en la mesa
}

export interface JugadorPublicoInfoCliente {
  id: string;
  nombre: string;
  numFichas?: number;
  estaConectado: boolean;
  ordenTurnoEnRondaActual?: number;
  puntosPartidaActual?: number;
  listoParaSiguientePartida?: boolean;
  listoParaMano?: boolean; // Añadido para consistencia con el servidor
  image?: string; // Añadido para la URL del avatar del jugador
  seatIndex?: number; // Añadido para la posición en la mesa
}

export interface ExtremoDetalladoCliente {
  pos: { fila: number; columna: number };
  rot: number;
  valor: number | null; // El valor numérico del extremo
}

export interface EstadoRondaPublicoCliente {
  rondaId: string;
  jugadoresRonda: JugadorPublicoInfoCliente[];
  currentPlayerId: string | null;
  anclaFicha: FichaEnMesaParaLogica | null;
  fichasIzquierda: FichaEnMesaParaLogica[];
  fichasDerecha: FichaEnMesaParaLogica[];
  extremos: { izquierda: number | null; derecha: number | null };
  infoExtremos: {
    izquierda: ExtremoDetalladoCliente | null;
    derecha: ExtremoDetalladoCliente | null;
  };
  estadoActual: 'enProgreso' | 'terminada';
  idJugadorQueRealizoUltimaAccion?: string;
  idUltimaFichaJugada?: string;
  autoPaseInfo?: {
    jugadorId: string;
    estado: 'esperando_confirmacion_paso' | 'mostrando_mensaje_paso';
  };
  duracionTurnoActual?: number;
  timestampTurnoInicio?: number;
  ganadorRondaId?: string;
  tipoFinRonda?: 'domino' | 'trancado';
}

export interface EstadoPartidaPublicoCliente {
  partidaId: string;
  gameMode: GameMode; // Usar el nuevo enum
  matchCategory: MatchCategory; // Usar el nuevo enum
  jugadoresParticipantesIds: string[];
  rondaActualNumero: number;
  puntuacionesPartida: { jugadorId: string, puntos: number }[];
  estadoPartida: 'iniciandoRonda' | 'rondaEnProgreso' | 'rondaTerminadaEsperandoSiguiente' | 'partidaTerminada';
  ganadorPartidaId?: string;
  rondaActual?: EstadoRondaPublicoCliente;
}



export interface EstadoMesaPublicoCliente {
  mesaId: string;
  jugadores: JugadorPublicoInfoCliente[];
  configuracionJuego: { // Actualizar para reflejar los nuevos campos
    gameMode: GameMode;
    matchCategory: MatchCategory;
    maxJugadores: number;
    fichasPorJugadorOriginal: number;
    duracionTurnoSegundos: number;
    puntosParaGanarPartida?: number;
    feeAmount?: number;
    feeCurrency?: Currency;
  };
  partidaActualId: string | null;
  estadoGeneralMesa: 'esperandoJugadores' | 'partidaEnProgreso' | 'esperandoParaSiguientePartida' | 'configurandoNuevaPartida' | 'transicionNuevaRonda';
  creadorMesaId: string;
  partidaActual?: EstadoPartidaPublicoCliente;
}

export interface TeUnisteAMesaPayloadCliente {
  mesaId: string;
  tuJugadorIdEnPartida: string;
  estadoMesa: EstadoMesaPublicoCliente;
}

export interface TuManoPayloadCliente {
  fichas: FichaDomino[];
}

export interface TuTurnoPayloadCliente {
  currentPlayerId: string;
  duracionTurnoTotal?: number;
  playableFichaIds: string[];
}

export interface FinDeRondaPayloadCliente {
  rondaId: string;
  partidaId: string;
  ganadorRondaId?: string;
  nombreGanador?: string;
  tipoFinRonda: 'domino' | 'trancado';
  detalleAdicional?: string;
  puntuaciones?: {
    jugadorId: string;
    puntos: number;
  }[];
  manosFinales?: {
    jugadorId: string;
    fichas: FichaDomino[];
  }[];
  anclaFicha?: FichaEnMesaParaLogica | null;
  fichasIzquierda?: FichaEnMesaParaLogica[];
  fichasDerecha?: FichaEnMesaParaLogica[];
  extremos?: { izquierda: number | null; derecha: number | null };
  puntosGanadosEstaRonda?: number;
  puntuacionesPartidaActualizadas?: { jugadorId: string, puntos: number }[]; // Accumulated scores for the full game
  puntuacionesPartidaPrevias?: { jugadorId: string, puntos: number }[]; // Accumulated scores before this round
}

export interface FinDePartidaPayloadCliente {
  partidaId: string;
  mesaId: string;
  ganadorPartidaId?: string;
  puntuacionesFinalesPartida: { jugadorId: string, puntos: number }[];
}