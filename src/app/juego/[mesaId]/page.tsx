// /home/heagueron/jmu/dominando/src/app/juego/[mesaId]/page.tsx
'use client';

import { PanInfo } from 'framer-motion';
import { motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { usePlayerHandLogic, FichaSeleccionadaInfo } from '@/hooks/usePlayerHandLogic'; // Importar el nuevo hook y tipo
import { useDominoSocket } from '@/hooks/useDominoSocket'; // Asegúrate que la ruta sea correcta
import MesaDomino from '@/components/domino/MesaDomino';
import ManoJugadorComponent from '@/components/domino/ManoJugador';
import {
 FichaDomino as FichaDominoType, // Renombrar para evitar conflicto con la interfaz local
 FichaDomino,
 FichaEnMesaParaLogica,
} from '@/utils/dominoUtils';

import { DESIGN_TABLE_WIDTH_PX, DESIGN_TABLE_HEIGHT_PX, DOMINO_WIDTH_PX, DOMINO_HEIGHT_PX } from '@/utils/dominoConstants';
import {
  FILA_ANCLA_INICIAL,
  COLUMNA_ANCLA_INICIAL
} from '@/utils/posicionamientoUtils';
// import DebugInfoOverlay from '@/components/debug/DebugInfoOverlay'; // Comentado para prueba
import ContenedorInfoJugador from '@/components/jugador/ContenedorInfoJugador';
import PlayerInfoLayout from '@/components/juego/PlayerInfoLayout'; // Importar el nuevo componente

export interface JugadorCliente {
  idJugador: string;
  nombre?: string;
  fichas: FichaDomino[];
  numFichas?: number;
  estaConectado?: boolean;
  ordenTurno?: number;
}

const DURACION_TURNO_SEGUNDOS = 5;
const TIEMPO_VISUALIZACION_FIN_RONDA_MS_CLIENTE = 10000; // 10 segundos

type TipoJuegoSolicitado = 'rondaUnica' | 'partidaCompleta';

interface JugadorPublicoInfoCliente {
  id: string;
  nombre: string;
  numFichas?: number;
  estaConectado: boolean;
  ordenTurnoEnRondaActual?: number;
  puntosPartidaActual?: number;
  listoParaSiguientePartida?: boolean;
}

export interface EstadoRondaPublicoCliente {
  rondaId: string;
  jugadoresRonda: JugadorPublicoInfoCliente[];
  currentPlayerId: string | null;
  anclaFicha: FichaEnMesaParaLogica | null;
  fichasIzquierda: FichaEnMesaParaLogica[];
  fichasDerecha: FichaEnMesaParaLogica[];
  extremos: { izquierda: number | null; derecha: number | null };
  infoExtremos: any;
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

interface EstadoPartidaPublicoCliente {
  partidaId: string;
  tipoJuego: TipoJuegoSolicitado;
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
  configuracionJuego: {
    tipoJuego: TipoJuegoSolicitado;
    maxJugadores: number;
    fichasPorJugadorOriginal: number;
    duracionTurnoSegundos: number;
  };
  partidaActualId: string | null;
  estadoGeneralMesa: 'esperandoJugadores' | 'partidaEnProgreso' | 'esperandoParaSiguientePartida' | 'configurandoNuevaPartida' | 'transicionNuevaRonda';
  creadorMesaId: string;
  partidaActual?: EstadoPartidaPublicoCliente;
}

interface TeUnisteAMesaPayloadCliente {
  mesaId: string;
  tuJugadorIdEnPartida: string;
  estadoMesa: EstadoMesaPublicoCliente;
}

interface TuManoPayloadCliente {
  fichas: FichaDomino[];
}

interface TuTurnoPayloadCliente {
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
  // Incluir los campos del tablero que vienen del servidor
  anclaFicha?: FichaEnMesaParaLogica | null;
  fichasIzquierda?: FichaEnMesaParaLogica[];
  fichasDerecha?: FichaEnMesaParaLogica[];
  extremos?: { izquierda: number | null; derecha: number | null };
}

interface FinDePartidaPayloadCliente {
  partidaId: string;
  mesaId: string;
  ganadorPartidaId?: string;
  puntuacionesFinalesPartida: { jugadorId: string, puntos: number }[];
}


export default function JuegoPage() {
  const [estadoMesaCliente, setEstadoMesaCliente] = useState<EstadoMesaPublicoCliente | null>(null);
  const miIdJugadorSocketRef = useRef<string | null>(null);
  const [miIdJugadorSocket, setMiIdJugadorSocket] = useState<string | null>(null);

  const [manosJugadores, setManosJugadores] = useState<JugadorCliente[]>([]);
  const [anclaFicha, setAnclaFicha] = useState<FichaEnMesaParaLogica | null>(null);
  const [fichasIzquierda, setFichasIzquierda] = useState<FichaEnMesaParaLogica[]>([]);
  const [fichasDerecha, setFichasDerecha] = useState<FichaEnMesaParaLogica[]>([]);
  const [extremos, setExtremos] = useState<{ izquierda: number | null, derecha: number | null }>({ izquierda: null, derecha: null });
  const [infoExtremos, setInfoExtremos] = useState<any>({ izquierda: null, derecha: null });
  const [tiempoTurnoRestante, setTiempoTurnoRestante] = useState<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [duracionTurnoActualConfigurada, setDuracionTurnoActualConfigurada] = useState<number>(DURACION_TURNO_SEGUNDOS);
  const [viewportDims, setViewportDims] = useState({ width: 0, height: 0 });
  const [mesaDims, setMesaDims] = useState({ width: 0, height: 0, scale: 1, translateX: 0, translateY: 0 });
  const [playableFichaIds, setPlayableFichaIds] = useState<string[]>([]);
  const [showRotateMessage, setShowRotateMessage] = useState(false);
  const [resultadoRonda, setResultadoRonda] = useState<{
    ganadorId?: string;
    nombreGanador?: string;
    tipoFin: 'domino' | 'trancado';
  } | null>(null);
  const [autoPaseInfoCliente, setAutoPaseInfoCliente] = useState<EstadoRondaPublicoCliente['autoPaseInfo'] | null>(null);
  const [isMyTurnTimerJustExpired, setIsMyTurnTimerJustExpired] = useState(false);
  const [manoVersion, setManoVersion] = useState(0); // Para forzar re-render de la mano si es necesario
  // const [manosAlFinalizarRonda, setManosAlFinalizarRonda] = useState<Array<{ jugadorId: string; fichas: FichaDomino[] }> | null>(null); // Ya no se necesita
  const [fichaAnimandose, setFichaAnimandose] = useState<{ id: string; jugadorIdOrigen: string; } | null>(null);
  // const [puntuacionesFinRonda, setPuntuacionesFinRonda] = useState<FinDeRondaPayloadCliente['puntuaciones'] | null>(null); // Ya no se necesita

  // Nuevos estados para manejar la visualización del fin de ronda
  const [finRondaInfoVisible, setFinRondaInfoVisible] = useState(false);
  const [finRondaData, setFinRondaData] = useState<{
    resultadoPayload: FinDeRondaPayloadCliente; // Directamente el payload del servidor
    fichasEnMesaSnapshot: FichaEnMesaParaLogica[];
    posicionAnclaSnapshot: { fila: number; columna: number };
  } | null>(null);
  const finRondaDisplayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [mensajeTransicion, setMensajeTransicion] = useState<string | null>(null);

  const mesaRef = useRef<HTMLDivElement>(null);
  const params = useParams();
  const router = useRouter();
  const mesaIdFromUrl = params.mesaId as string;
  const authoritativeMesaIdRef = useRef<string>(mesaIdFromUrl);
  
  const finalUserIdRef = useRef<string | null>(null);
  const finalNombreJugadorRef = useRef<string | null>(null);
  const tipoJuegoSolicitadoRef = useRef<TipoJuegoSolicitado | null>(null);
  
  const [playerAuthReady, setPlayerAuthReady] = useState(false);

  const audioFichaJugadaRef = useRef<HTMLAudioElement | null>(null);
  const prevIdUltimaFichaJugadaRef = useRef<string | null | undefined>(null);

  const prevPropsForSocketRef = useRef<{ userId: string | null, nombre: string | null, autoConnect: boolean } | null>(null);
  const initialAuthReportedRef = useRef(false);

  const estadoMesaClienteRef = useRef(estadoMesaCliente);
  useEffect(() => {
    estadoMesaClienteRef.current = estadoMesaCliente;
  }, [estadoMesaCliente]);

  useEffect(() => {
    // Inicializar el reproductor de audio una vez
    audioFichaJugadaRef.current = new Audio('/sounds/ficha_jugada.mp3'); 
    audioFichaJugadaRef.current.load(); // Pre-cargar para mejor rendimiento
    console.log('[AUDIO_EFFECT] Audio player for ficha_colocada initialized.');
  }, []);


  const limpiarIntervaloTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const limpiarIntervaloTimerRef = useRef(limpiarIntervaloTimer);
  useEffect(() => {
    limpiarIntervaloTimerRef.current = limpiarIntervaloTimer;
  }, [limpiarIntervaloTimer]);

  useEffect(() => {
    const currentPlayerIdRonda = estadoMesaCliente?.partidaActual?.rondaActual?.currentPlayerId;
    if (currentPlayerIdRonda !== miIdJugadorSocketRef.current) {
      setIsMyTurnTimerJustExpired(false);
    }
  }, [estadoMesaCliente?.partidaActual?.rondaActual?.currentPlayerId]);

  useEffect(() => {
    authoritativeMesaIdRef.current = mesaIdFromUrl;
  }, [mesaIdFromUrl]);

  useEffect(() => {
    console.log('[JUEGO_PAGE_EFFECT_SOCKET_INIT] Entrando. mesaIdFromUrl:', mesaIdFromUrl);
    if (!mesaIdFromUrl || typeof mesaIdFromUrl !== 'string' || mesaIdFromUrl.trim() === '') { 
      console.error("[JUEGO_PAGE_EFFECT_SOCKET_INIT] No se encontró mesaId válido en la URL. Redirigiendo al lobby. mesaIdFromUrl:", mesaIdFromUrl);
      router.push('/lobby');
      return;
    }

    console.log('[JUEGO_PAGE_EFFECT_SOCKET_INIT] Intentando leer de sessionStorage.');
    const userIdFromStorage = sessionStorage.getItem('jmu_userId');
    const nombreJugadorFromStorage = sessionStorage.getItem('jmu_nombreJugador');  
    tipoJuegoSolicitadoRef.current = sessionStorage.getItem('jmu_tipoJuegoSolicitado') as TipoJuegoSolicitado | null;

    const queryParams = new URLSearchParams(window.location.search);
    const uidFromQuery = queryParams.get('uid');
    const nombreFromQuery = queryParams.get('nombre');

    if (uidFromQuery && nombreFromQuery) {
      console.log('[JUEGO_PAGE_EFFECT_SOCKET_INIT] Leído de Query Params - userId:', uidFromQuery, 'nombreJugador:', nombreFromQuery);
      finalUserIdRef.current = uidFromQuery;
      finalNombreJugadorRef.current = nombreFromQuery;
      sessionStorage.setItem('jmu_userId', finalUserIdRef.current);
      sessionStorage.setItem('jmu_nombreJugador', finalNombreJugadorRef.current);
      console.log('[JUEGO_PAGE_EFFECT_SOCKET_INIT] Guardado en sessionStorage desde Query Params.');
    } else {
      console.log('[JUEGO_PAGE_EFFECT_SOCKET_INIT] No se encontraron datos en Query Params, intentando sessionStorage.');
      finalUserIdRef.current = userIdFromStorage;
      finalNombreJugadorRef.current = nombreJugadorFromStorage;
    }
    console.log('[JUEGO_PAGE_EFFECT_SOCKET_INIT] Valores finales para conexión - userId:', finalUserIdRef.current, 'nombreJugador:', finalNombreJugadorRef.current);

    if (!finalUserIdRef.current || !finalNombreJugadorRef.current) {
      console.error("Error: Falta información del jugador (después de query y sessionStorage). Redirigiendo al lobby.");
      router.push('/lobby');
    } else {
      setPlayerAuthReady(true); 
    }
  }, []); 

  const formatPlayerNameForTitle = (name: string | null): string => {
    if (!name) return "";
    let processedName = name;
    if (name.startsWith("Jugador ")) {
      processedName = name.substring("Jugador ".length);
    }
    return processedName.slice(-4);
  };

  useEffect(() => {
    const defaultTitle = "Juego - Dominando";
    const currentMesaIdForTitle = authoritativeMesaIdRef.current;

    if (playerAuthReady && finalNombreJugadorRef.current) {
      const shortName = formatPlayerNameForTitle(finalNombreJugadorRef.current);
      const mesaSuffix = currentMesaIdForTitle ? ` ${currentMesaIdForTitle.slice(-3)}` : "";
      document.title = shortName ? `${shortName} - Juego${mesaSuffix}` : `Juego${mesaSuffix} - Dominando`;
    } else {
      document.title = defaultTitle;
    }
  }, [playerAuthReady, estadoMesaCliente]);

  const userIdForSocket = playerAuthReady ? finalUserIdRef.current : null;
  const nombreJugadorForSocket = playerAuthReady ? finalNombreJugadorRef.current : null;
  const autoConnectForSocket = playerAuthReady;

  useEffect(() => {
    console.log('[JUEGO_PAGE] Props para useDominoSocket (evaluados):', {
      userId: userIdForSocket,
      nombreJugador: nombreJugadorForSocket,
      playerAuthReady: playerAuthReady, 
      finalUserIdRefCurrent: finalUserIdRef.current,
      finalNombreJugadorRefCurrent: finalNombreJugadorRef.current,
    });
  }, [userIdForSocket, nombreJugadorForSocket, autoConnectForSocket, playerAuthReady]); 

  useEffect(() => {
    if (playerAuthReady && !initialAuthReportedRef.current) {
      initialAuthReportedRef.current = true; 
      console.log('%c[JUEGO_PAGE_DEBUG_PROPS] Autenticación inicial completada. Props para socket:', 'color: green; font-weight: bold;', {
        userId: userIdForSocket,
        nombreJugador: nombreJugadorForSocket,
        autoConnect: autoConnectForSocket,
      });
      prevPropsForSocketRef.current = { userId: userIdForSocket, nombre: nombreJugadorForSocket, autoConnect: autoConnectForSocket };
    } else if (initialAuthReportedRef.current) {
      const currentProps = { userId: userIdForSocket, nombre: nombreJugadorForSocket, autoConnect: autoConnectForSocket };
      if (
        prevPropsForSocketRef.current?.userId !== currentProps.userId ||
        prevPropsForSocketRef.current?.nombre !== currentProps.nombre ||
        prevPropsForSocketRef.current?.autoConnect !== currentProps.autoConnect
      ) {
        console.error('%c[JUEGO_PAGE_DEBUG_PROPS] ¡CRÍTICO! Props para useDominoSocket CAMBIARON DESPUÉS DE AUTENTICACIÓN INICIAL:', 'color: red; font-weight: bold; font-size: 1.2em;', {
          prev: prevPropsForSocketRef.current,
          current: currentProps,
          playerAuthReady,
          finalUserIdRefCurrent: finalUserIdRef.current,
          finalNombreJugadorRefCurrent: finalNombreJugadorRef.current,
        });
      }
      prevPropsForSocketRef.current = currentProps;
    }
  }, [userIdForSocket, nombreJugadorForSocket, autoConnectForSocket, playerAuthReady]);

  const { socket, emitEvent, registerEventHandlers, unregisterEventHandlers } = useDominoSocket({
    userId: userIdForSocket,
    nombreJugador: nombreJugadorForSocket,
    autoConnect: autoConnectForSocket, 
    onConnect: useCallback((emitFromHook: (eventName: string, data: any) => void) => { 
      console.log('[JUEGO_PAGE_HOOK] Socket conectado. Emitiendo cliente:unirseAMesa.');
      const currentNombreJugador = finalNombreJugadorRef.current;
      const currentTipoJuego = tipoJuegoSolicitadoRef.current;
      const currentMesaId = authoritativeMesaIdRef.current; 

      if (currentNombreJugador && currentMesaId) {
        emitFromHook('cliente:unirseAMesa', {
          juegoSolicitado: currentTipoJuego, 
          nombreJugador: currentNombreJugador,
          mesaId: currentMesaId
        });
      } else {
        console.error('[JUEGO_PAGE_HOOK] onConnect: No se pudo emitir cliente:unirseAMesa. Falta nombreJugador o mesaId.', {
          nombre: currentNombreJugador,
          mesaId: currentMesaId,
        });
      }
    }, []), 
  });

  const rondaActualParaUI = estadoMesaCliente?.partidaActual?.rondaActual;
  const partidaActualParaUI = estadoMesaCliente?.partidaActual;

  const isMyTurnForHandLogic = !!(rondaActualParaUI && rondaActualParaUI.currentPlayerId === miIdJugadorSocketRef.current && !finRondaInfoVisible);
  const isRoundActiveForHandLogic = !!(rondaActualParaUI && rondaActualParaUI.estadoActual !== 'terminada' && !finRondaInfoVisible);
  const isAutoPasoForMeForHandLogic = !!(autoPaseInfoCliente && autoPaseInfoCliente.jugadorId === miIdJugadorSocketRef.current);

  const { selectedFichaInfo, selectFicha, clearSelection: clearFichaSelection } = usePlayerHandLogic({
    idJugadorMano: miIdJugadorSocketRef.current,
    isMyTurn: isMyTurnForHandLogic,
    isRoundActive: isRoundActiveForHandLogic,
    isMyTurnTimerJustExpired: isMyTurnTimerJustExpired,
    isAutoPasoForMe: isAutoPasoForMeForHandLogic,
    currentPlayableFichaIds: playableFichaIds,
  });

  const stableEmitEvent = useCallback(emitEvent, [emitEvent]); 

  const handleTeUnisteAMesa = useCallback((payload: TeUnisteAMesaPayloadCliente) => {
      console.log('[SOCKET] Evento servidor:teUnisteAMesa recibido:', payload);
      if (payload.mesaId !== authoritativeMesaIdRef.current) {
        console.warn(`[SOCKET] El mesaId del servidor (${payload.mesaId}) no coincide con el de la URL/ref actual (${authoritativeMesaIdRef.current}). Se usará el del servidor (${payload.mesaId}).`);
        authoritativeMesaIdRef.current = payload.mesaId;
      } else {
        authoritativeMesaIdRef.current = payload.mesaId;
      }
      miIdJugadorSocketRef.current = payload.tuJugadorIdEnPartida;
      setMiIdJugadorSocket(payload.tuJugadorIdEnPartida);
      setEstadoMesaCliente(payload.estadoMesa);

    if (socket?.connected && payload.tuJugadorIdEnPartida && authoritativeMesaIdRef.current) {
      console.log(`[SOCKET] Cliente ${payload.tuJugadorIdEnPartida} procesó 'teUnisteAMesa'. Emitiendo 'cliente:listoParaMano' para mesa ${authoritativeMesaIdRef.current}`);
      stableEmitEvent('cliente:listoParaMano', { 
        mesaId: authoritativeMesaIdRef.current,
        jugadorId: payload.tuJugadorIdEnPartida 
      });
    } else {
      console.warn('[SOCKET] No se pudo emitir cliente:listoParaMano. Socket no conectado o falta información crítica.', {
        connected: socket?.connected,
        jugadorId: payload.tuJugadorIdEnPartida,
        mesaId: authoritativeMesaIdRef.current
      });
    }
  }, [setMiIdJugadorSocket, setEstadoMesaCliente, stableEmitEvent, socket]);

  const handleEstadoMesaActualizado = useCallback((payload: { estadoMesa: EstadoMesaPublicoCliente }) => {
    //console.log('[SOCKET] Evento servidor:estadoMesaActualizado recibido para mesaId:', payload.estadoMesa.mesaId);
    setEstadoMesaCliente(payload.estadoMesa);
  }, [setEstadoMesaCliente]);

  const handleTuMano = useCallback((payload: TuManoPayloadCliente) => {
    console.log(`[SOCKET] Evento servidor:tuMano recibido. Payload:`, payload);
    if (miIdJugadorSocketRef.current) {
      const jugadorIdLocal = miIdJugadorSocketRef.current;
      const currentEstadoMesa = estadoMesaClienteRef.current; 
      setManosJugadores(prevManos => {
        const manoExistenteIdx = prevManos.findIndex(m => m.idJugador === jugadorIdLocal);
        if (manoExistenteIdx !== -1) {
          const nuevasManos = [...prevManos];
          nuevasManos[manoExistenteIdx] = {
            ...nuevasManos[manoExistenteIdx],
            fichas: payload.fichas,
            numFichas: payload.fichas.length
          };
          return nuevasManos;
        } else {
          const jugadorInfoGeneral = currentEstadoMesa?.jugadores.find(j => j.id === jugadorIdLocal);
          console.log(`[servidor:tuMano] Jugador local ${jugadorIdLocal} no encontrado en prevManos o sin fichas. Añadiendo/Actualizando con mano nueva.`);
          const nuevoJugador: JugadorCliente = {
            idJugador: jugadorIdLocal!, 
            nombre: jugadorInfoGeneral?.nombre || 'Yo',
            fichas: payload.fichas,
            numFichas: payload.fichas.length,
            estaConectado: jugadorInfoGeneral?.estaConectado ?? true,
            ordenTurno: jugadorInfoGeneral?.ordenTurnoEnRondaActual
          };
          return [...prevManos, nuevoJugador];
        }
      });
    }
  }, [setManosJugadores]); 

  const handleTuManoActualizada = useCallback((payload: TuManoPayloadCliente) => {
    console.log(`[SOCKET] Evento servidor:tuManoActualizada recibido. Payload:`, payload);
    if (miIdJugadorSocketRef.current) {
      setManosJugadores(prevManos =>
        prevManos.map(mano =>
          mano.idJugador === miIdJugadorSocketRef.current
            ? { ...mano, fichas: payload.fichas, numFichas: payload.fichas.length }
            : mano
        )
      );
    }
  }, [setManosJugadores]); 
  
  const handleTuTurno = useCallback((payload: TuTurnoPayloadCliente) => {
    //console.log('[SOCKET] Evento servidor:tuTurno recibido:', payload);
    if (payload.currentPlayerId === miIdJugadorSocketRef.current) {
      setPlayableFichaIds(payload.playableFichaIds);
      if (payload.duracionTurnoTotal) {
        setDuracionTurnoActualConfigurada(payload.duracionTurnoTotal);
      }
      setIsMyTurnTimerJustExpired(false);
      setManoVersion(prev => prev + 1);
    } else {
      setPlayableFichaIds([]);
    }
  }, [setPlayableFichaIds, setDuracionTurnoActualConfigurada, setIsMyTurnTimerJustExpired, setManoVersion]);

  const handleFinDeRonda = useCallback((payload: FinDeRondaPayloadCliente) => {
    console.log('[SOCKET] Evento servidor:finDeRonda recibido:', payload);

    const currentEstadoMesa = estadoMesaClienteRef.current;
    // const currentRonda = currentEstadoMesa?.partidaActual?.rondaActual; // No usar currentRonda para el snapshot, usar el payload

    let fichasEnMesaSnapshotParaFin: FichaEnMesaParaLogica[] = [];
    let posicionAnclaSnapshotParaFin: { fila: number; columna: number } = { fila: FILA_ANCLA_INICIAL, columna: COLUMNA_ANCLA_INICIAL };

    // Usar las fichas que el servidor envió en el payload de finDeRonda, ya que son las "finales"
    const anclaDelPayload = payload.anclaFicha as FichaEnMesaParaLogica | null | undefined;
    const izquierdaDelPayload = payload.fichasIzquierda as FichaEnMesaParaLogica[] | undefined;
    const derechaDelPayload = payload.fichasDerecha as FichaEnMesaParaLogica[] | undefined;

    if (anclaDelPayload || (izquierdaDelPayload && izquierdaDelPayload.length > 0) || (derechaDelPayload && derechaDelPayload.length > 0)) {
        fichasEnMesaSnapshotParaFin = [
            ...(izquierdaDelPayload || []).slice().reverse(),
            ...(anclaDelPayload ? [anclaDelPayload] : []),
            ...(derechaDelPayload || []),
        ];
        if (anclaDelPayload) {
            posicionAnclaSnapshotParaFin = anclaDelPayload.posicionCuadricula;
        } else if (fichasEnMesaSnapshotParaFin.length > 0) {
            // Si no hay ancla pero hay otras fichas, tomar la posición de la primera como referencia
            posicionAnclaSnapshotParaFin = fichasEnMesaSnapshotParaFin[0].posicionCuadricula;
        }
        console.log('[handleFinDeRonda] Snapshot del tablero tomado del payload de finDeRonda.');
    } else if (currentEstadoMesa?.partidaActual?.rondaActual) {
        // Fallback MUY improbable al estado actual del cliente si el payload no trajo el tablero
        const currentRondaFallback = currentEstadoMesa.partidaActual.rondaActual;
        console.warn("[handleFinDeRonda] Payload de finDeRonda no incluyó estado del tablero, usando snapshot del cliente (fallback).");
        fichasEnMesaSnapshotParaFin = [
            ...(currentRondaFallback.fichasIzquierda || []).slice().reverse(),
            ...(currentRondaFallback.anclaFicha ? [currentRondaFallback.anclaFicha] : []),
            ...(currentRondaFallback.fichasDerecha || []),
        ];
        if (currentRondaFallback.anclaFicha) {
            posicionAnclaSnapshotParaFin = currentRondaFallback.anclaFicha.posicionCuadricula;
        }
    } else {
        console.warn("[handleFinDeRonda] No hay ronda actual en estadoMesaCliente ni tablero en payload. El snapshot del tablero estará vacío.");
    }

    console.log('[handleFinDeRonda] Setting finRondaData con payload y snapshot. Activando visibilidad.');
    setFinRondaData({
      resultadoPayload: payload, // Usar el payload directamente
      fichasEnMesaSnapshot: fichasEnMesaSnapshotParaFin,
      posicionAnclaSnapshot: posicionAnclaSnapshotParaFin,
    });
    setFinRondaInfoVisible(true);

    // Limpiar estados de juego activo
    clearFichaSelection();
    setPlayableFichaIds([]);
    limpiarIntervaloTimerRef.current();
    setAutoPaseInfoCliente(null);
    setIsMyTurnTimerJustExpired(false);
    setTiempoTurnoRestante(null);
    setFichaAnimandose(null);
    setResultadoRonda(null);

    if (finRondaDisplayTimerRef.current) {
      clearTimeout(finRondaDisplayTimerRef.current);
    }
    finRondaDisplayTimerRef.current = setTimeout(() => {
      console.log('[handleFinDeRonda] Timer de fin de ronda completado. Ocultando información.');
      setFinRondaInfoVisible(false);
    }, TIEMPO_VISUALIZACION_FIN_RONDA_MS_CLIENTE);

    setManoVersion(prev => prev + 1); // Para refrescar la mano local si es necesario (ej. si se vació)
  }, [clearFichaSelection, limpiarIntervaloTimerRef]);

  const handleFinDePartida = useCallback((payload: FinDePartidaPayloadCliente) => {
    console.log('[SOCKET] Evento servidor:finDePartida recibido:', payload);
    // No es necesario setResultadoRonda(null) aquí, el useEffect de estadoMesaCliente lo manejará
    // o el estado finRondaInfoVisible controlará la visibilidad del modal.
  }, []);

  const handleErrorDePartida = useCallback((payload: { mensaje: string }) => {
    console.error('[SOCKET] Error de partida/mesa:', payload.mensaje);
  }, []);

  useEffect(() => {
    if (!socket || !playerAuthReady) return; 

    const eventHandlers = {
      'servidor:teUnisteAMesa': handleTeUnisteAMesa,
      'servidor:estadoMesaActualizado': handleEstadoMesaActualizado,
      'servidor:tuMano': handleTuMano,
      'servidor:tuManoActualizada': handleTuManoActualizada,
      'servidor:tuTurno': handleTuTurno,
      'servidor:finDeRonda': handleFinDeRonda,
      'servidor:finDePartida': handleFinDePartida,
      'servidor:errorDePartida': handleErrorDePartida,
    };
    registerEventHandlers(eventHandlers);

    return () => {
      unregisterEventHandlers(Object.keys(eventHandlers));
    };
  }, [
    socket, 
    playerAuthReady, 
    registerEventHandlers, 
    unregisterEventHandlers, 
    handleTeUnisteAMesa,
    handleEstadoMesaActualizado,
    handleTuMano,
    handleTuManoActualizada,
    handleTuTurno,
    handleFinDeRonda,
    handleFinDePartida,
    handleErrorDePartida
  ]);

  // useEffect para actualizar la UI basada en estadoMesaCliente y manejar la visualización de fin de ronda
  useEffect(() => {
    if (!estadoMesaCliente) {
      console.log('[EFFECT_ESTADO_MESA] estadoMesaCliente is null. Cleaning up all states.');
      // Estado inicial o desconexión, limpiar todo
      setAnclaFicha(null);
      setFichasIzquierda([]);
      setFichasDerecha([]);
      setExtremos({ izquierda: null, derecha: null });
      setInfoExtremos({ izquierda: null, derecha: null });
      setAutoPaseInfoCliente(null);
      setResultadoRonda(null); // Limpiar resultadoRonda explícitamente
      setFinRondaInfoVisible(false); // Asegurar que no se muestre info de fin de ronda
      setFinRondaData(null); // Limpiar datos de fin de ronda
      if (finRondaDisplayTimerRef.current) {
        clearTimeout(finRondaDisplayTimerRef.current);
        finRondaDisplayTimerRef.current = null;
      }
      return;
    }
    
    const partidaActual = estadoMesaCliente.partidaActual;
    const rondaActual = partidaActual?.rondaActual;

    const idActualUltimaFicha = rondaActual?.idUltimaFichaJugada;
    // const idJugadorUltimaAccion = rondaActual?.idJugadorQueRealizoUltimaAccion; // Para lógica condicional de sonido

    // Si finRondaInfoVisible está activo, la UI se basa en finRondaData.
    // Si no, se basa en el estadoMesaCliente actual.
    // Primero, manejamos el estado de transición, ya que tiene precedencia.
    if (finRondaInfoVisible) {
      console.log('[EFFECT_ESTADO_MESA] State at snapshot capture:', {
          // Acceder de forma segura a las propiedades de rondaActual
          anclaFicha: rondaActual?.anclaFicha,
          fichasIzquierdaCount: rondaActual?.fichasIzquierda?.length,
          fichasDerechaCount: rondaActual?.fichasDerecha?.length,
          // manosAlFinalizarRonda y puntuacionesFinRonda ya no son estados aquí.
          // La información relevante del fin de ronda está en finRondaData.resultadoPayload
      });
      // Si estamos mostrando info de fin de ronda, pero el estado del servidor ya cambió
      // (ej. la ronda ya no existe o no es la misma que la del finRondaData), ocultamos la info.
      // Esto actúa como una salvaguarda si el timer no se disparó o si el servidor limpió antes.
      if (!rondaActual || rondaActual.rondaId !== finRondaData?.resultadoPayload.rondaId) {
        console.log('[EFFECT_ESTADO_MESA] Estado del servidor cambió (nueva ronda o sin ronda) mientras se mostraba info de fin de ronda. Ocultando.');
        setFinRondaInfoVisible(false);
        if (finRondaDisplayTimerRef.current) {
          clearTimeout(finRondaDisplayTimerRef.current);
          finRondaDisplayTimerRef.current = null;
        }
      }
    }

    // 1. Manejar el estado de transición
    if (estadoMesaCliente.estadoGeneralMesa === 'transicionNuevaRonda') {
      if (!mensajeTransicion) setMensajeTransicion("Empezando nueva partida...");
      if (finRondaInfoVisible) setFinRondaInfoVisible(false); // Asegurar que el modal de fin de ronda se oculte
      if (finRondaDisplayTimerRef.current) {
        clearTimeout(finRondaDisplayTimerRef.current);
        finRondaDisplayTimerRef.current = null;
      }
      // Limpiar estados de juego activo, ya que estamos en transición
      setAnclaFicha(null);
      setFichasIzquierda([]);
      setFichasDerecha([]);
      setExtremos({ izquierda: null, derecha: null });
      setInfoExtremos({ izquierda: null, derecha: null });
      setAutoPaseInfoCliente(null);
      setResultadoRonda(null); // Limpiar resultadoRonda explícitamente
      limpiarIntervaloTimer();
      setTiempoTurnoRestante(null);
      setPlayableFichaIds([]); // Importante para que no se muestren como jugables fichas de la mano anterior
      if (fichaAnimandose) setFichaAnimandose(null); // Cancelar animación si la había
      // No es necesario limpiar manosJugadores aquí, se actualizará por su propio effect o por servidor:tuMano

    } else if (mensajeTransicion && ((estadoMesaCliente.estadoGeneralMesa === 'partidaEnProgreso' && rondaActual) || estadoMesaCliente.estadoGeneralMesa === 'esperandoJugadores')) {
      // Si estábamos en transición y ahora la partida ha comenzado o volvimos a esperar, limpiar el mensaje
      setMensajeTransicion(null);
    }

    // 2. Lógica para actualizar UI basada en el estado actual, SOLO si no estamos mostrando finRondaInfoVisible NI mensajeTransicion
    if (!finRondaInfoVisible && !mensajeTransicion) {
      if (rondaActual) {
        setAnclaFicha(rondaActual.anclaFicha);
        setFichasIzquierda(rondaActual.fichasIzquierda);
        setFichasDerecha(rondaActual.fichasDerecha);
        setExtremos(rondaActual.extremos);
        setInfoExtremos(rondaActual.infoExtremos);
        setAutoPaseInfoCliente(rondaActual.autoPaseInfo || null);

        if (rondaActual.duracionTurnoActual) {
          setDuracionTurnoActualConfigurada(rondaActual.duracionTurnoActual);
        }

        // Timer logic for active turn
        limpiarIntervaloTimer(); // Clear previous turn timer
        if (rondaActual.currentPlayerId && rondaActual.estadoActual === 'enProgreso' && rondaActual.duracionTurnoActual && rondaActual.timestampTurnoInicio &&
            (!rondaActual.autoPaseInfo || rondaActual.autoPaseInfo.jugadorId !== rondaActual.currentPlayerId)) {
          const tiempoTranscurridoSegundos = Math.floor((Date.now() - rondaActual.timestampTurnoInicio) / 1000);
          if (rondaActual.currentPlayerId === miIdJugadorSocketRef.current) {
              setIsMyTurnTimerJustExpired(false);
          }
          const restanteCalculado = Math.max(0, rondaActual.duracionTurnoActual - tiempoTranscurridoSegundos);
          setTiempoTurnoRestante(restanteCalculado);

          if (restanteCalculado > 0) {
            timerIntervalRef.current = setInterval(() => {
              setTiempoTurnoRestante(prevTiempo => {
                if (prevTiempo === null || prevTiempo <= 1) {
                  limpiarIntervaloTimer();
                  const currentRondaStateForTimer = estadoMesaClienteRef.current?.partidaActual?.rondaActual; 
                  if (currentRondaStateForTimer?.currentPlayerId === miIdJugadorSocketRef.current) {
                      setIsMyTurnTimerJustExpired(true);
                      setManoVersion(prev => prev + 1);
                  }
                  return 0;
                }
                return prevTiempo - 1;
              });
            }, 1000);
          } else {
              if (rondaActual.currentPlayerId === miIdJugadorSocketRef.current) {
                  setIsMyTurnTimerJustExpired(true);
                  setManoVersion(prev => prev + 1);
              }
          }
        } else {
          setTiempoTurnoRestante(null); // No active turn or auto-pass message showing
        }
        
        // If the round is in progress and not showing info of fin de ronda, resultadoRonda must be null.
        if (rondaActual.estadoActual === 'enProgreso') {
            setResultadoRonda(null); 
        }

        // Ficha animation logic (only during active game)
        if (rondaActual?.idUltimaFichaJugada &&
            rondaActual.idJugadorQueRealizoUltimaAccion &&
            rondaActual.idJugadorQueRealizoUltimaAccion !== miIdJugadorSocketRef.current) {
          setFichaAnimandose({
            id: rondaActual.idUltimaFichaJugada,
            jugadorIdOrigen: rondaActual.idJugadorQueRealizoUltimaAccion
          });
          setTimeout(() => setFichaAnimandose(null), 700);
        } else if (!rondaActual?.idUltimaFichaJugada && fichaAnimandose) {
           setFichaAnimandose(null); 
        }

        // Lógica para reproducir sonido de ficha jugada
        if (rondaActual && rondaActual.estadoActual === 'enProgreso') {
          if (idActualUltimaFicha && idActualUltimaFicha !== prevIdUltimaFichaJugadaRef.current) {
            // Opcional: No reproducir si la jugada fue del jugador local
            // if (idJugadorUltimaAccion !== miIdJugadorSocketRef.current) {
            if (audioFichaJugadaRef.current) {
              audioFichaJugadaRef.current.currentTime = 0; 
              audioFichaJugadaRef.current.play().catch(error => {
                console.error("Error al reproducir sonido de ficha:", error);
              });
            }
            // }
          }
        }
        prevIdUltimaFichaJugadaRef.current = idActualUltimaFicha;

      } else {
        console.log('[EFFECT_ESTADO_MESA] No active ronda and not showing end-of-round info. Clearing game states.');
        // No hay ronda activa Y no estamos mostrando info de fin de ronda
        setAnclaFicha(null);
        setFichasIzquierda([]);
        setFichasDerecha([]);
        setExtremos({ izquierda: null, derecha: null });
        setInfoExtremos({ izquierda: null, derecha: null });
        setAutoPaseInfoCliente(null);
        setResultadoRonda(null);
        limpiarIntervaloTimer();
        setTiempoTurnoRestante(null);
        setFichaAnimandose(null);
      }
    } else if (finRondaInfoVisible && fichaAnimandose) {
      setFichaAnimandose(null);
    } else if (mensajeTransicion && fichaAnimandose) {
      setFichaAnimandose(null);
    }
  }, [
    estadoMesaCliente, 
    finRondaInfoVisible, 
    limpiarIntervaloTimer, 
    clearFichaSelection,
    mensajeTransicion, // Añadido como dependencia
    finRondaData, // Necesario para la lógica de salvaguarda dentro del if(finRondaInfoVisible)
  ]);

  // useEffect para limpiar el timer de display de fin de ronda al desmontar
  useEffect(() => {
    return () => {
      if (finRondaDisplayTimerRef.current) {
        clearTimeout(finRondaDisplayTimerRef.current);
      }
    };
  }, []);

  // Sincroniza el estado de las fichas jugables con el turno actual y estado de la ronda
  useEffect(() => {
    const rondaActual = estadoMesaCliente?.partidaActual?.rondaActual;
    const esMiTurno = rondaActual?.currentPlayerId === miIdJugadorSocketRef.current;
    const rondaEnProgreso = rondaActual?.estadoActual === 'enProgreso';

    // Si no es mi turno, o la ronda no está en progreso, o se está mostrando el modal de fin de ronda,
    // y todavía hay fichas marcadas como jugables, limpiarlas.
    if ((!esMiTurno || !rondaEnProgreso || finRondaInfoVisible) && playableFichaIds.length > 0) {
      // console.log(`[EFFECT_SYNC_PLAYABLE_FICHAS] Condiciones para limpiar: !esMiTurno=${!esMiTurno}, !rondaEnProgreso=${!rondaEnProgreso}, finRondaInfoVisible=${finRondaInfoVisible}. Limpiando playableFichaIds.`);
      setPlayableFichaIds([]);
    }
    // Nota: El poblar playableFichaIds cuando SÍ es mi turno lo maneja el evento 'servidor:tuTurno'.
    // Este efecto es principalmente una salvaguarda para limpiar.
  }, [
    estadoMesaCliente?.partidaActual?.rondaActual?.currentPlayerId,
    estadoMesaCliente?.partidaActual?.rondaActual?.estadoActual,
    finRondaInfoVisible,
    // No se incluye playableFichaIds en las dependencias para evitar bucles,
    // la condición playableFichaIds.length > 0 previene la llamada a setPlayableFichaIds si ya está vacío.
  ]);

  // Actualizar `resultadoRonda` para el modal basado en `finRondaData` cuando `finRondaInfoVisible`
  useEffect(() => {
    console.log(`[EFFECT_RESULTADO_RONDA] finRondaInfoVisible: ${finRondaInfoVisible}, finRondaData exists: ${!!finRondaData}`);
    if (finRondaInfoVisible && finRondaData?.resultadoPayload) {
      console.log('[EFFECT_RESULTADO_RONDA] Setting resultadoRonda from finRondaData.');
      setResultadoRonda({
        ganadorId: finRondaData.resultadoPayload.ganadorRondaId,
        nombreGanador: finRondaData.resultadoPayload.nombreGanador,
        tipoFin: finRondaData.resultadoPayload.tipoFinRonda,
      });
    } else if (!finRondaInfoVisible) {
      // Only clear resultadoRonda if not showing the end-of-round info.
      if (resultadoRonda !== null) { // Avoid an unnecessary re-render if already null
        console.log('[EFFECT_RESULTADO_RONDA] Not showing end-of-round info, clearing resultadoRonda.');
        setResultadoRonda(null);
      }
    }
  }, [finRondaInfoVisible, finRondaData]);

  // useEffect específico para actualizar manosJugadores (para la UI)
  useEffect(() => {
    if (!estadoMesaCliente?.jugadores) {
      if (manosJugadores.length > 0) {
         setManosJugadores([]);
      }
      return;
    }
    
    const jugadorIdLocal = miIdJugadorSocketRef.current;

    setManosJugadores(prevManos => {
      const prevManosMap = new Map(prevManos.map(p => [p.idJugador, p]));
      let hasChanged = false;

      const newManosArray: JugadorCliente[] = estadoMesaCliente.jugadores.map(serverPlayerInfo => {
        const existingPlayer = prevManosMap.get(serverPlayerInfo.id);
        const rondaPlayerInfo = estadoMesaCliente.partidaActual?.rondaActual?.jugadoresRonda.find(jr => jr.id === serverPlayerInfo.id);

        let updatedPlayer: JugadorCliente;

        if (serverPlayerInfo.id === jugadorIdLocal) {
          if (existingPlayer) {
            // console.log(`[MANOS_SYNC_EFFECT_DEBUG] Local player ${jugadorIdLocal} exists in prevManos. Existing numFichas: ${existingPlayer.numFichas}, existing fichas length: ${existingPlayer.fichas?.length}`);
            updatedPlayer = {
              ...existingPlayer, 
              nombre: serverPlayerInfo.nombre, 
              estaConectado: serverPlayerInfo.estaConectado, 
              ordenTurno: rondaPlayerInfo?.ordenTurnoEnRondaActual, 
              numFichas: existingPlayer.fichas.length, 
            };
          } else {
            // console.log(`[MANOS_SYNC_EFFECT_DEBUG] Local player ${jugadorIdLocal} NOT in prevManos. Initializing.`);
            updatedPlayer = {
              idJugador: serverPlayerInfo.id,
              nombre: serverPlayerInfo.nombre,
              fichas: [],
              numFichas: 0,
              estaConectado: serverPlayerInfo.estaConectado,
              ordenTurno: rondaPlayerInfo?.ordenTurnoEnRondaActual,
            };
          };
        } else {
          updatedPlayer = { 
            idJugador: serverPlayerInfo.id,
            nombre: serverPlayerInfo.nombre,
            fichas: [], 
            numFichas: rondaPlayerInfo?.numFichas ?? serverPlayerInfo.numFichas ?? 0,
            estaConectado: serverPlayerInfo.estaConectado,
            ordenTurno: rondaPlayerInfo?.ordenTurnoEnRondaActual,
          };
        };

        if (!existingPlayer ||
            existingPlayer.nombre !== updatedPlayer.nombre ||
            existingPlayer.estaConectado !== updatedPlayer.estaConectado ||
            existingPlayer.ordenTurno !== updatedPlayer.ordenTurno
        ) {
          hasChanged = true;
        }
        if (serverPlayerInfo.id !== jugadorIdLocal && existingPlayer && existingPlayer.numFichas !== updatedPlayer.numFichas) {
          hasChanged = true;
        }
        if (serverPlayerInfo.id === jugadorIdLocal && existingPlayer && 
            (existingPlayer.fichas !== updatedPlayer.fichas || existingPlayer.numFichas !== updatedPlayer.numFichas)
        ) {
          hasChanged = true;
        }
        return updatedPlayer;
      });

      if (prevManos.length !== newManosArray.length) {
        hasChanged = true;
      }

      if (hasChanged) {
        return newManosArray;
      }
      
      return prevManos; 
    });

  }, [estadoMesaCliente?.jugadores, estadoMesaCliente?.partidaActual?.rondaActual?.jugadoresRonda]);


  useEffect(() => {
    const handleResize = () => setViewportDims({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleOrientationChange = () => {
      const isPortrait = window.matchMedia("(orientation: portrait)").matches;
      const isMobileThreshold = window.innerWidth < 768;
      setShowRotateMessage(isPortrait && isMobileThreshold);
    };
    handleOrientationChange();
    window.addEventListener('resize', handleOrientationChange);
    return () => window.removeEventListener('resize', handleOrientationChange);
  }, []);

  const handleMesaDimensionsChange = useCallback((
    width: number, height: number, scale: number, translateX: number, translateY: number
  ) => {
    setMesaDims(prevDims =>
      (prevDims.width === width && prevDims.height === height && prevDims.scale === scale &&
       prevDims.translateX === translateX && prevDims.translateY === translateY)
      ? prevDims : { width, height, scale, translateX, translateY }
    );
  }, []);

  const handleMesaFichaClick = useCallback((id: string) => {
    console.log('[MESA] Ficha en mesa clickeada:', id);
  }, []);

  
  const determinarJugadaCliente = (ficha: FichaDomino, valorExtremo: number): { puedeJugar: boolean; valorConexion?: number; valorNuevoExtremo?: number } => {
    if (ficha.valorSuperior === valorExtremo) return { puedeJugar: true, valorConexion: ficha.valorSuperior, valorNuevoExtremo: ficha.valorInferior };
    if (ficha.valorInferior === valorExtremo) return { puedeJugar: true, valorConexion: ficha.valorInferior, valorNuevoExtremo: ficha.valorSuperior };
    return { puedeJugar: false };
  };

  const handleJugarFichaServidor = (extremoElegidoParam: 'izquierda' | 'derecha', fichaIdParam?: string) => {
    if (!socket || finRondaInfoVisible) return; // No permitir jugar si se muestran resultados
    const rondaActual = estadoMesaCliente?.partidaActual?.rondaActual;
    if (!rondaActual || rondaActual.estadoActual === 'terminada') return;

    if (isMyTurnTimerJustExpired && rondaActual.currentPlayerId === miIdJugadorSocketRef.current) return;
    if (rondaActual.currentPlayerId !== miIdJugadorSocketRef.current) return;
    if (autoPaseInfoCliente && autoPaseInfoCliente.jugadorId === miIdJugadorSocketRef.current) return;

    limpiarIntervaloTimer();
    setTiempoTurnoRestante(null);
    setPlayableFichaIds([]); // Limpiar fichas jugables localmente de inmediato

    const idFichaAJugar = fichaIdParam || selectedFichaInfo?.idFicha; 
    if (!idFichaAJugar) return;

    const fichaParaJugar = manosJugadores.find(m => m.idJugador === miIdJugadorSocketRef.current)?.fichas.find(f => f.id === idFichaAJugar);
    if (!fichaParaJugar || !emitEvent) return;

    if (!rondaActual.anclaFicha) {
      socket.emit('cliente:jugarFicha', { rondaId: rondaActual.rondaId, fichaId: idFichaAJugar, extremoElegido: extremoElegidoParam });
      clearFichaSelection(); 
      return;
    }

    const valorExtremoNumerico = extremoElegidoParam === 'izquierda' ? rondaActual.extremos.izquierda : rondaActual.extremos.derecha;
    if (valorExtremoNumerico === null) return;

    const jugadaDeterminada = determinarJugadaCliente(fichaParaJugar, valorExtremoNumerico);
    if (!jugadaDeterminada.puedeJugar) return;

    emitEvent('cliente:jugarFicha', { rondaId: rondaActual.rondaId, fichaId: idFichaAJugar, extremoElegido: extremoElegidoParam });
    clearFichaSelection(); 
  };

  const handlePasarTurnoServidor = () => {
    if (!socket || !emitEvent || finRondaInfoVisible) return; // No permitir pasar si se muestran resultados
    const rondaActual = estadoMesaCliente?.partidaActual?.rondaActual;
    if (!rondaActual || rondaActual.estadoActual === 'terminada' || rondaActual.currentPlayerId !== miIdJugadorSocketRef.current) return;

    if (isMyTurnTimerJustExpired && rondaActual.currentPlayerId === miIdJugadorSocketRef.current) return;
    if (autoPaseInfoCliente && autoPaseInfoCliente.jugadorId === miIdJugadorSocketRef.current) return;
    
    console.log(`[SOCKET] Emitiendo cliente:pasarTurno para ronda ${rondaActual.rondaId}`);
    limpiarIntervaloTimer();
    setTiempoTurnoRestante(null);
    setPlayableFichaIds([]); // Limpiar fichas jugables localmente de inmediato
    emitEvent('cliente:pasarTurno', { rondaId: rondaActual.rondaId });
  };

  const handleListoParaSiguientePartida = () => {
    if (socket && emitEvent && estadoMesaCliente && 
        estadoMesaCliente.estadoGeneralMesa === 'esperandoParaSiguientePartida' && 
        !finRondaInfoVisible) { // Solo permitir si no se está mostrando info de fin de ronda
      console.log(`[SOCKET] Emitiendo cliente:listoParaSiguientePartida para mesa ${estadoMesaCliente.mesaId}`);
      emitEvent('cliente:listoParaSiguientePartida', { mesaId: estadoMesaCliente.mesaId });
    }
  };

  const currentPlayerIdRonda = rondaActualParaUI?.currentPlayerId;


  const combinedFichasParaMesa = useMemo(() => {
    // Si estamos mostrando info de fin de ronda, MesaDomino usará el snapshot.
    // Este memo es para el estado normal de juego.
    if (finRondaInfoVisible && finRondaData) {
        console.log('[combinedFichasParaMesa] Using snapshot.');
        return finRondaData.fichasEnMesaSnapshot;
    }
    if (!rondaActualParaUI) return []; 
    return [
      ...(rondaActualParaUI.fichasIzquierda || []).slice().reverse(),
      ...(rondaActualParaUI.anclaFicha ? [rondaActualParaUI.anclaFicha] : []),
      ...(rondaActualParaUI.fichasDerecha || []),
    ];
  }, [rondaActualParaUI, finRondaInfoVisible, finRondaData]); // Añadida finRondaInfoVisible y finRondaData

  const posicionAnclaFija = useMemo(() => {
    // Si estamos mostrando info de fin de ronda, MesaDomino usará el snapshot.
     if (finRondaInfoVisible && finRondaData) {
        console.log('[posicionAnclaFija] Using snapshot.');
        return finRondaData.posicionAnclaSnapshot;
    }
    return rondaActualParaUI?.anclaFicha 
      ? rondaActualParaUI.anclaFicha.posicionCuadricula 
      : { fila: FILA_ANCLA_INICIAL, columna: COLUMNA_ANCLA_INICIAL };
  } , [rondaActualParaUI?.anclaFicha, finRondaInfoVisible, finRondaData]); // Añadida finRondaInfoVisible y finRondaData

  const getDesignCanvasCoordinates = useCallback((
    targetFichaPos: { fila: number; columna: number },
    currentAnclaFicha: FichaEnMesaParaLogica | null,
    currentFichasIzquierda: FichaEnMesaParaLogica[],
    currentFichasDerecha: FichaEnMesaParaLogica[]
  ): { x: number; y: number } | null => {
    const todasLasFichasEnMesaParaCalculo = [
      ...currentFichasIzquierda.slice().reverse(),
      ...(currentAnclaFicha ? [currentAnclaFicha] : []),
      ...currentFichasDerecha,
    ];

    if (todasLasFichasEnMesaParaCalculo.length === 0) {
      // Si la mesa está vacía y se pide la posición del ancla inicial, devolver el centro.
      // Esta condición es importante para el primer drop.
      const anclaInicialPos = currentAnclaFicha?.posicionCuadricula || { fila: FILA_ANCLA_INICIAL, columna: COLUMNA_ANCLA_INICIAL };
      if (targetFichaPos.fila === anclaInicialPos.fila && targetFichaPos.columna === anclaInicialPos.columna) {
        return { x: DESIGN_TABLE_WIDTH_PX / 2, y: DESIGN_TABLE_HEIGHT_PX / 2 };
      }
      return null;
    }

    const calculatedPositions: { [key: string]: { x: number; y: number; fichaLogic: FichaEnMesaParaLogica; } } = {};
    // El ancla lógica para el cálculo es la ficha ancla actual, o la primera ficha si solo hay una.
    const anclaLogicaParaCalculo = currentAnclaFicha || (todasLasFichasEnMesaParaCalculo.length === 1 ? todasLasFichasEnMesaParaCalculo[0] : null);

    if (anclaLogicaParaCalculo) {
      calculatedPositions[`${anclaLogicaParaCalculo.posicionCuadricula.fila},${anclaLogicaParaCalculo.posicionCuadricula.columna}`] = {
        x: DESIGN_TABLE_WIDTH_PX / 2,
        y: DESIGN_TABLE_HEIGHT_PX / 2,
        fichaLogic: anclaLogicaParaCalculo,
      };
    } else {
      // Si no hay ancla lógica y hay múltiples fichas, algo está mal.
      // O si la mesa está vacía y no se pide la posición del ancla inicial.
      return null;
    }
    
    let piecesToProcess = todasLasFichasEnMesaParaCalculo.filter(f =>
        !calculatedPositions[`${f.posicionCuadricula.fila},${f.posicionCuadricula.columna}`]
    );
    let iterations = 0;
    const maxIterations = todasLasFichasEnMesaParaCalculo.length * 2;

    while (piecesToProcess.length > 0 && iterations < maxIterations) {
        iterations++;
        const processedInThisIterationIds: string[] = [];

        piecesToProcess.forEach(fichaLogic => {
            const possiblePrevPositions = [
                { df: 0, dc: -1, dir: 'RightOfPrev' }, { df: 0, dc: 1,  dir: 'LeftOfPrev'  },
                { df: -1, dc: 0, dir: 'BelowPrev'   }, { df: 1, dc: 0,  dir: 'AbovePrev'   },
            ];

            let connectedToCalculated: { x: number; y: number; fichaLogic: FichaEnMesaParaLogica } | undefined;
            let connectionDirection = '';

            for (const offset of possiblePrevPositions) {
                const prevFila = fichaLogic.posicionCuadricula.fila + offset.df;
                const prevCol = fichaLogic.posicionCuadricula.columna + offset.dc;
                const prevPosKey = `${prevFila},${prevCol}`;
                const calculatedPrev = calculatedPositions[prevPosKey];

                if (calculatedPrev) {
                    connectedToCalculated = calculatedPrev;
                    connectionDirection = offset.dir;
                    break;
                }
            }

            if (connectedToCalculated) {
                const ux = connectedToCalculated.x;
                const uy = connectedToCalculated.y;
                const uIsVertical = Math.abs(connectedToCalculated.fichaLogic.rotacion % 180) === 0;
                const uActualWidth = uIsVertical ? DOMINO_WIDTH_PX : DOMINO_HEIGHT_PX;
                const uActualHeight = uIsVertical ? DOMINO_HEIGHT_PX : DOMINO_WIDTH_PX;

                const nIsVertical = Math.abs(fichaLogic.rotacion % 180) === 0;
                const nActualWidth = nIsVertical ? DOMINO_WIDTH_PX : DOMINO_HEIGHT_PX;
                const nActualHeight = nIsVertical ? DOMINO_HEIGHT_PX : DOMINO_WIDTH_PX;

                let nx = 0, ny = 0;

                switch (connectionDirection) {
                    case 'RightOfPrev':
                        nx = ux + uActualWidth / 2 + nActualWidth / 2;
                        ny = uy;
                        break;
                    case 'LeftOfPrev':
                        nx = ux - uActualWidth / 2 - nActualWidth / 2;
                        ny = uy;
                        break;
                    case 'BelowPrev':
                        nx = ux;
                        ny = uy + uActualHeight / 2 + nActualHeight / 2;
                        if (!uIsVertical && nIsVertical) { 
                            if (connectedToCalculated.fichaLogic.posicionCuadricula.fila === 7 && connectedToCalculated.fichaLogic.posicionCuadricula.columna === 1 && !(connectedToCalculated.fichaLogic.valorSuperior === connectedToCalculated.fichaLogic.valorInferior) && fichaLogic.posicionCuadricula.fila === 8 && fichaLogic.posicionCuadricula.columna === 1) {
                                nx = ux - (DOMINO_HEIGHT_PX - DOMINO_WIDTH_PX) / 2;
                            } else {
                                nx = ux + uActualWidth / 2 - nActualWidth / 2;
                            }
                        } else if (uIsVertical && !nIsVertical) {
                            nx = ux + uActualWidth / 2 - nActualWidth / 2;
                             if (connectedToCalculated.fichaLogic.posicionCuadricula.fila === 8 && connectedToCalculated.fichaLogic.posicionCuadricula.columna === 1 && fichaLogic.posicionCuadricula.fila === 9 && fichaLogic.posicionCuadricula.columna === 1) {
                                nx = ux + (DOMINO_HEIGHT_PX - DOMINO_WIDTH_PX) / 2;
                            }
                        }
                        break;
                    case 'AbovePrev':
                        nx = ux;
                        ny = uy - uActualHeight / 2 - nActualHeight / 2;
                        if (uIsVertical && !nIsVertical) { 
                            if (connectedToCalculated.fichaLogic.posicionCuadricula.fila === 4 && connectedToCalculated.fichaLogic.posicionCuadricula.columna === 1 && fichaLogic.posicionCuadricula.fila === 3 && fichaLogic.posicionCuadricula.columna === 1) {
                                nx = ux + (DOMINO_HEIGHT_PX - DOMINO_WIDTH_PX) / 2;
                            } else if (connectedToCalculated.fichaLogic.posicionCuadricula.fila === 2 && connectedToCalculated.fichaLogic.posicionCuadricula.columna === 11 && fichaLogic.posicionCuadricula.fila === 1 && fichaLogic.posicionCuadricula.columna === 11) {
                                nx = ux - (DOMINO_HEIGHT_PX - DOMINO_WIDTH_PX) / 2;
                            }
                        } else if (!uIsVertical && nIsVertical) { 
                            if (connectedToCalculated.fichaLogic.posicionCuadricula.fila === 3 && connectedToCalculated.fichaLogic.posicionCuadricula.columna === 11 && fichaLogic.posicionCuadricula.fila === 2 && fichaLogic.posicionCuadricula.columna === 11) {
                                nx = ux + (DOMINO_HEIGHT_PX - DOMINO_WIDTH_PX) / 2;
                            } else {
                                nx = ux - uActualWidth / 2 + nActualWidth / 2;
                            }
                        }
                        break;
                }
                if (connectedToCalculated.fichaLogic.posicionCuadricula.fila === 6 && connectedToCalculated.fichaLogic.posicionCuadricula.columna === 11 && !uIsVertical &&
                    fichaLogic.posicionCuadricula.fila === 7 && fichaLogic.posicionCuadricula.columna === 11 && nIsVertical) {
                    nx = ux - DOMINO_HEIGHT_PX / 4;
                }

                calculatedPositions[`${fichaLogic.posicionCuadricula.fila},${fichaLogic.posicionCuadricula.columna}`] = { x: nx, y: ny, fichaLogic };
                processedInThisIterationIds.push(fichaLogic.id);
            }
        });
        piecesToProcess = piecesToProcess.filter(f => !processedInThisIterationIds.includes(f.id));
        if(processedInThisIterationIds.length === 0 && piecesToProcess.length > 0) break;
    }

    const targetKey = `${targetFichaPos.fila},${targetFichaPos.columna}`;
    if (calculatedPositions[targetKey]) {
      return { x: calculatedPositions[targetKey].x, y: calculatedPositions[targetKey].y };
    }
    return null;
  }, [posicionAnclaFija, anclaFicha, fichasIzquierda, fichasDerecha]); // Dependencias originales

  const getScreenCoordinatesOfConnectingEdge = useCallback((
    fichaPos: { fila: number; columna: number },
    fichaRot: number,
  ): { x: number; y: number } | null => {
    const currentRonda = estadoMesaClienteRef.current?.partidaActual?.rondaActual; // Usar ref para estado más actual
    if (!mesaRef.current || !currentRonda?.infoExtremos?.izquierda?.pos || !currentRonda?.infoExtremos?.derecha?.pos) return null;

    // Usar las fichas actuales de la mesa para el cálculo, no las del snapshot
    const currentAncla = currentRonda.anclaFicha;
    const currentIzquierda = currentRonda.fichasIzquierda;
    const currentDerecha = currentRonda.fichasDerecha;

    const designCoords = getDesignCanvasCoordinates(fichaPos, currentAncla, currentIzquierda, currentDerecha);
    if (!designCoords) return null;

    let designEdgeX = designCoords.x;
    let designEdgeY = designCoords.y;

    const esVertical = Math.abs(fichaRot % 180) === 0;
    const esExtremoIzquierdoLogico = currentRonda.infoExtremos.izquierda.pos.fila === fichaPos.fila && currentRonda.infoExtremos.izquierda.pos.columna === fichaPos.columna;

    if (esVertical) {
      designEdgeY += (esExtremoIzquierdoLogico ? -1 : 1) * (DOMINO_HEIGHT_PX / 4);
    } else {
      designEdgeX += (esExtremoIzquierdoLogico ? -1 : 1) * (DOMINO_HEIGHT_PX / 4);
    }

    const mesaRect = mesaRef.current.getBoundingClientRect();
    const screenX = (designEdgeX * mesaDims.scale + mesaDims.translateX) + mesaRect.left;
    const screenY = (designEdgeY * mesaDims.scale + mesaDims.translateY) + mesaRect.top;

    return { x: screenX, y: screenY };
  }, [getDesignCanvasCoordinates, mesaDims]); // estadoMesaClienteRef es una ref, no necesita estar en dependencias

  const handleFichaDragEnd = (
    fichaId: string,
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const currentRonda = estadoMesaClienteRef.current?.partidaActual?.rondaActual; // Usar ref
    if (!currentRonda || currentRonda.currentPlayerId !== miIdJugadorSocketRef.current || 
        isMyTurnTimerJustExpired || finRondaInfoVisible || // Añadido chequeo de finRondaInfoVisible
        (autoPaseInfoCliente && autoPaseInfoCliente.jugadorId === miIdJugadorSocketRef.current)) {
        return;
    }

    if (!currentRonda.anclaFicha && (currentRonda.fichasIzquierda?.length === 0) && (currentRonda.fichasDerecha?.length === 0)) {
      if (mesaRef.current) {
        const mesaRect = mesaRef.current.getBoundingClientRect();
        if (info.point.x >= mesaRect.left && info.point.x <= mesaRect.right &&
            info.point.y >= mesaRect.top && info.point.y <= mesaRect.bottom) {
          setTimeout(() => handleJugarFichaServidor('derecha', fichaId), 50);
        }
      }
      return;
    }

    let extremoDetectado: 'izquierda' | 'derecha' | null = null;
    const dropX = info.point.x;
    const dropY = info.point.y;
    const umbralDeDrop = DOMINO_HEIGHT_PX * mesaDims.scale * 2.5;

    let distIzquierdo = Infinity;
    if (currentRonda.infoExtremos?.izquierda?.pos) {
      const puntoConexionIzquierdo = getScreenCoordinatesOfConnectingEdge(
        currentRonda.infoExtremos.izquierda.pos,
        currentRonda.infoExtremos.izquierda.rot,
      );
      if (puntoConexionIzquierdo) {
        distIzquierdo = Math.sqrt(Math.pow(dropX - puntoConexionIzquierdo.x, 2) + Math.pow(dropY - puntoConexionIzquierdo.y, 2));
      }
    }

    let distDerecho = Infinity;
    if (currentRonda.infoExtremos?.derecha?.pos) {
      const puntoConexionDerecho = getScreenCoordinatesOfConnectingEdge(
        currentRonda.infoExtremos.derecha.pos,
        currentRonda.infoExtremos.derecha.rot,
      );
      if (puntoConexionDerecho) {
        distDerecho = Math.sqrt(Math.pow(dropX - puntoConexionDerecho.x, 2) + Math.pow(dropY - puntoConexionDerecho.y, 2));
      }
    }

    if (distIzquierdo < umbralDeDrop && distIzquierdo <= distDerecho) {
      extremoDetectado = 'izquierda';
    } else if (distDerecho < umbralDeDrop) {
      extremoDetectado = 'derecha';
    }

    if (extremoDetectado) {
      setTimeout(() => handleJugarFichaServidor(extremoDetectado!, fichaId), 50);
    }
  };

  let fichaSeleccionadaActual: FichaDomino | undefined;
  if (selectedFichaInfo && miIdJugadorSocketRef.current) { 
    const manoOrigen = manosJugadores.find(m => m.idJugador === miIdJugadorSocketRef.current);
    if (manoOrigen) {
      // console.log('[FICHA_SELECCIONADA_ACTUAL_DEBUG] manoOrigen.fichas:', manoOrigen.fichas.map(f => f.id), 'buscando idFicha:', selectedFichaInfo.idFicha);
      const foundFicha = manoOrigen.fichas.find(f => f.id === selectedFichaInfo.idFicha);
      // console.log('[FICHA_SELECCIONADA_ACTUAL_DEBUG] foundFicha:', foundFicha ? foundFicha.id : 'undefined');
      fichaSeleccionadaActual = foundFicha;
    }
  } else {
    fichaSeleccionadaActual = undefined;
  }

  if (!playerAuthReady || !estadoMesaCliente) { 
    return <div className="flex items-center justify-center min-h-screen">Cargando datos de la mesa...</div>;
  }

  // if (mano1 && mano1.idJugador === miIdJugadorSocketRef.current) {
  //   console.log(`[JuegoPage->ManoJugadorComponent] Passing fichaSeleccionada prop: ${selectedFichaInfo?.idFicha} to mano1 (local player)`);
  // }

  return (
    <div className="min-h-screen bg-table-wood flex flex-col">
      {showRotateMessage && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.95)', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', zIndex: 10000, padding: '20px' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '20px' }}><path d="M16.466 7.5C15.643 4.237 13.952 2 12 2 9.239 2 7 6.477 7 12s2.239 10 5 10c.342 0 .677-.069 1-.2M10.534 16.5C11.357 19.763 13.048 22 15 22c2.761 0 5-4.477 5-10s-2.239-10-5-10c-.342 0-.677-.069-1 .2"/></svg>
          <h2 style={{ fontSize: '1.5em', marginBottom: '10px' }}>Por favor, rota tu dispositivo</h2>
          <p>Para una mejor experiencia, usa el modo horizontal.</p>
        </div>
      )}
      
      <main className="flex-grow relative flex justify-center items-center w-full h-screen overflow-hidden">
        <MesaDomino
          fichasEnMesa={finRondaInfoVisible && finRondaData ? finRondaData.fichasEnMesaSnapshot : combinedFichasParaMesa}
          ref={mesaRef}
          posicionAnclaFija={finRondaInfoVisible && finRondaData ? finRondaData.posicionAnclaSnapshot : posicionAnclaFija}
          onFichaClick={handleMesaFichaClick} 
          onMesaDimensionsChange={handleMesaDimensionsChange}
          fichaAnimandose={fichaAnimandose}
          jugadoresInfo={estadoMesaCliente.jugadores.map(j => ({id: j.id, ordenTurno: j.ordenTurnoEnRondaActual}))}
          miIdJugador={miIdJugadorSocketRef.current}
        />
        {/* <DebugInfoOverlay 
          viewportWidth={viewportDims.width} viewportHeight={viewportDims.height}
          mesaWidth={mesaDims.width} mesaHeight={mesaDims.height} mesaScale={mesaDims.scale}
          dominoConstWidth={DOMINO_WIDTH_PX} dominoConstHeight={DOMINO_HEIGHT_PX}
        /> */}
        

        {/* Renderizar la mano del jugador local */}
        {miIdJugadorSocketRef.current && manosJugadores.find(m => m.idJugador === miIdJugadorSocketRef.current) && (
           <motion.div 
            className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-[1fr_auto_1fr] items-end gap-x-2 px-2 pb-1" // Aumentado z-index
            initial={{ y: 150 }} animate={{ y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 25 }}
          >
            <div className="w-full"></div> {/* Espacio para info izquierda (si existiera) */}
            <div className="flex justify-center">
              <ManoJugadorComponent
                key={`mano-local-${manoVersion}-${manosJugadores.find(m => m.idJugador === miIdJugadorSocketRef.current)?.fichas.length}-${selectedFichaInfo?.idFicha || 'no-sel'}`}
                fichas={manosJugadores.find(m => m.idJugador === miIdJugadorSocketRef.current)?.fichas || []}
                fichaSeleccionada={selectedFichaInfo?.idFicha} 
                onFichaClick={selectFicha} 
                idJugadorMano={miIdJugadorSocketRef.current}
                layoutDirection="row"
                isLocalPlayer={true}
                playableFichaIds={playableFichaIds}
                onFichaDragEnd={handleFichaDragEnd}
              />
            </div>
            <div className="w-full"></div> {/* Espacio para info derecha (si existiera) */}
          </motion.div>
        )}

      </main>

      {/* Renderizar la información de los jugadores (incluido el local) */}
      <PlayerInfoLayout
        manosJugadores={manosJugadores}
        miIdJugadorSocket={miIdJugadorSocketRef.current}
        estadoMesaCliente={estadoMesaCliente}
        rondaActualParaUI={rondaActualParaUI}
        tiempoTurnoRestante={tiempoTurnoRestante}
        duracionTurnoActualConfigurada={duracionTurnoActualConfigurada}
        autoPaseInfoCliente={autoPaseInfoCliente}
        finRondaInfoVisible={finRondaInfoVisible}
        finRondaData={finRondaData}
      />

      {/* Modal de Fin de Ronda */}
      {finRondaInfoVisible && finRondaData?.resultadoPayload && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-40 p-4"> 
          <motion.div
            className="bg-yellow-50 border-2 border-yellow-500 p-4 sm:p-6 rounded-lg shadow-2xl text-center max-w-md w-full" 
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}>
            <p className="text-xl sm:text-2xl font-bold text-yellow-800 mb-2">
              {estadoMesaCliente?.partidaActual?.tipoJuego === 'rondaUnica' ? 'Partida Finalizada' : 'Ronda Finalizada'}
            </p>
            <p className="text-md sm:text-lg font-medium text-yellow-700 mb-1">
              {finRondaData.resultadoPayload.tipoFinRonda === 'trancado' ? 'Resultado: Trancado' : 
               (finRondaData.resultadoPayload.ganadorRondaId ? 'Resultado: Dominó' : 'Resultado: Empate (Trancado sin ganador)')}
            </p>
            <p className="text-lg sm:text-xl font-semibold text-yellow-700 mb-4">
              Ganador: {finRondaData.resultadoPayload.nombreGanador || finRondaData.resultadoPayload.ganadorRondaId || 'N/A'}
            </p>

            {finRondaData.resultadoPayload.tipoFinRonda === 'trancado' && 
             finRondaData.resultadoPayload.puntuaciones && 
             finRondaData.resultadoPayload.puntuaciones.length > 0 && (
              <div className="mt-4 pt-3 border-t border-yellow-300">
                <h4 className="text-md sm:text-lg font-semibold text-yellow-700 mb-2">Puntos (Fichas Restantes):</h4>
                <ul className="text-left text-sm sm:text-base text-yellow-600 space-y-1 max-h-40 overflow-y-auto px-2">
                  {finRondaData.resultadoPayload.puntuaciones?.map(score => {
                    const jugadorInfo = estadoMesaCliente?.jugadores.find(j => j.id === score.jugadorId);
                    return (
                      <li key={score.jugadorId} className="flex justify-between">
                        <span className="truncate pr-2">{jugadorInfo?.nombre || score.jugadorId}</span>
                        <span className="font-medium">{score.puntos} puntos</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </motion.div>
        </div>
      )}


      {/* Mensaje de Transición a Nueva Partida */}
      {mensajeTransicion && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <motion.div
            className="text-xl sm:text-2xl font-bold p-6 sm:p-8 bg-white shadow-xl rounded-lg text-gray-800"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {mensajeTransicion}
          </motion.div>
        </div>
      )}
    </div>
  );
}
