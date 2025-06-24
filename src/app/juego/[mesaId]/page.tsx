// page.tsx
'use client';

import { motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { usePlayerHandLogic } from '@/hooks/usePlayerHandLogic';
import { useDominoSocket } from '@/hooks/useDominoSocket';
import MesaDomino from '@/components/domino/MesaDomino';
import ManoJugadorComponent from '@/components/domino/ManoJugador';
import { FichaEnMesaParaLogica } from '@/utils/dominoUtils';
import { FiMaximize, FiMinimize } from 'react-icons/fi';

import { FILA_ANCLA_INICIAL, COLUMNA_ANCLA_INICIAL } from '@/utils/posicionamientoUtils';

import PlayerInfoLayout from '@/components/juego/PlayerInfoLayout';
import DominoModals from '@/components/juego/DominoModals';
import { useSession } from 'next-auth/react';
import Navbar from '@/components/layout/Navbar';

import { JugadorCliente, EstadoMesaPublicoCliente, FinDeRondaPayloadCliente, TeUnisteAMesaPayloadCliente, TuManoPayloadCliente, TuTurnoPayloadCliente, FinDePartidaPayloadCliente, GameMode, MatchCategory, EstadoRondaPublicoCliente } from '@/types/domino';
import { formatPlayerNameForTitle } from '@/utils/stringUtils';
import { useDominoStore } from '@/store/dominoStore';
import { useDominoRonda } from '@/hooks/useDominoRonda';

const TIEMPO_VISUALIZACION_FIN_RONDA_MS_CLIENTE = 10000;

export default function JuegoPage() {
  // Leer estados y acciones del store de Zustand
  const estadoMesaCliente = useDominoStore((state) => state.estadoMesaCliente);
  const setEstadoMesaClienteStore = useDominoStore((state) => state.setEstadoMesaCliente);
  const miIdJugadorSocketFromStore = useDominoStore((state) => state.miIdJugadorSocket);
  const manosJugadoresFromStore = useDominoStore((state) => state.manosJugadores);
  const playableFichaIdsFromStore = useDominoStore((state) => state.playableFichaIds);
  const setMiIdJugadorSocketStore = useDominoStore((state) => state.setMiIdJugadorSocket);
  const setManosJugadoresStore = useDominoStore((state) => state.setManosJugadores);
  const setPlayableFichaIdsStore = useDominoStore((state) => state.setPlayableFichaIds);

  // Estados locales
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_viewportDims, setViewportDims] = useState({ width: 0, height: 0 });
  const [mesaDims, setMesaDims] = useState({ width: 0, height: 0, scale: 1, translateX: 0, translateY: 0 });
  const [showRotateMessage, setShowRotateMessage] = useState(false); // Restaurado
  const [manoVersion, setManoVersion] = useState(0); // Para forzar re-render de la mano si es necesario

  // Estados para manejar la visualización del fin de ronda
  const [finRondaInfoVisible, setFinRondaInfoVisible] = useState(false);
  const [finRondaData, setFinRondaData] = useState<{
    resultadoPayload: FinDeRondaPayloadCliente; // Directamente el payload del servidor
    fichasEnMesaSnapshot: FichaEnMesaParaLogica[];
    posicionAnclaSnapshot: { fila: number; columna: number };
  } | null>(null);
  const [finPartidaData, setFinPartidaData] = useState<FinDePartidaPayloadCliente | null>(null);
  const finRondaDisplayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [mensajeTransicion, setMensajeTransicion] = useState<string | null>(null);

  const mesaRef = useRef<HTMLDivElement>(null);
  const params = useParams();
  const router = useRouter();
  const mesaIdFromUrl = params.mesaId as string;
  const authoritativeMesaIdRef = useRef<string>(mesaIdFromUrl);

  const { data: session, status: sessionStatus } = useSession(); // Usar NextAuth

  // Estados locales para userId y nombreJugador que se usarán para el socket
  const [gameUserId, setGameUserId] = useState<string | null>(null);
  const [gameNombreJugador, setGameNombreJugador] = useState<string | null>(null);
  const [gameUserImageUrl, setGameUserImageUrl] = useState<string | null>(null); // Estado para la imagen
  const [isUserDataReady, setIsUserDataReady] = useState(false);
  const tipoJuegoSolicitadoRef = useRef<GameMode | null>(null);

  const audioFichaJugadaRef = useRef<HTMLAudioElement | null>(null);

  const miIdJugadorSocketRef = useRef<string | null>(null); // Inicializar como null, se llenará desde el store/evento
  const [resultadoRonda, setResultadoRonda] = useState<{
    ganadorId?: string;
    nombreGanador?: string;
    tipoFin: 'domino' | 'trancado';
  } | null>(null);

  // Estado para pantalla completa
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Función para alternar el modo de pantalla completa
  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
      } catch (err) {
        if (err instanceof Error) {
          console.error(`Error al intentar entrar en pantalla completa: ${err.message} (${err.name})`);
        } else {
          console.error('Error al intentar entrar en pantalla completa:', err);
        }
      }
    } else {
      if (document.exitFullscreen) {
        try {
          await document.exitFullscreen();
        } catch (err) {
          if (err instanceof Error) {
            console.error(`Error al intentar salir de pantalla completa: ${err.message} (${err.name})`);
          } else {
            console.error('Error al intentar salir de pantalla completa:', err);
          }
        }
      }
    }
  }, []);

  // Efecto para escuchar cambios en el estado de pantalla completa y resize/orientation
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const updateLayoutStates = () => {
      setViewportDims({ width: window.innerWidth, height: window.innerHeight });
      const isPortrait = window.matchMedia("(orientation: portrait)").matches;
      const isMobileThreshold = window.innerWidth < 768; // Umbral para considerar "móvil"
      setShowRotateMessage(isPortrait && isMobileThreshold);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    window.addEventListener('resize', updateLayoutStates);
    
    // Para cambios de orientación que no siempre disparan 'resize' en algunos dispositivos
    if (window.screen && window.screen.orientation) {
        window.screen.orientation.addEventListener('change', updateLayoutStates);
    }

    updateLayoutStates(); // Llamada inicial

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      window.removeEventListener('resize', updateLayoutStates);
      if (window.screen && window.screen.orientation) {
        window.screen.orientation.removeEventListener('change', updateLayoutStates);
      }
    };
  }, []);

  // Inicializar la ref con el valor actual del store.
  const estadoMesaClienteRef = useRef(estadoMesaCliente);
  useEffect(() => {
    estadoMesaClienteRef.current = estadoMesaCliente;
  }, [estadoMesaCliente]);

  // Sincronizar la ref miIdJugadorSocketRef con el valor del store
  useEffect(() => {
    miIdJugadorSocketRef.current = miIdJugadorSocketFromStore;
  }, [miIdJugadorSocketFromStore]);

  useEffect(() => {
    audioFichaJugadaRef.current = new Audio('/sounds/ficha_jugada.mp3');
    audioFichaJugadaRef.current.load();
    console.log('[AUDIO_EFFECT] Audio player for ficha_colocada initialized.');
  }, []);

  useEffect(() => {
    authoritativeMesaIdRef.current = mesaIdFromUrl;
  }, [mesaIdFromUrl]);

  // Efecto para inicializar datos del jugador
  useEffect(() => {
    console.log(`[JUEGO_PAGE_EFFECT_USER_INIT] Entrando. Session status: ${sessionStatus}`);

    if (sessionStatus === 'loading') {
      console.log('[JUEGO_PAGE_EFFECT_USER_INIT] Sesión de NextAuth cargando...');
      return;
    }

    if (!mesaIdFromUrl || typeof mesaIdFromUrl !== 'string' || mesaIdFromUrl.trim() === '') {
      console.error('[JUEGO_PAGE_EFFECT_USER_INIT] No hay mesaId válido en la URL. Redirigiendo al lobby.');
      router.push('/lobby');
      return;
    }

    if (sessionStatus === 'unauthenticated' || !session?.user) {
      console.error('[JUEGO_PAGE_EFFECT_USER_INIT] Usuario no autenticado. Redirigiendo a signin.');
      router.push(`/auth/signin?callbackUrl=/juego/${mesaIdFromUrl}`);
      return;
    }

    // Usuario autenticado y mesaId presente
    const currentUserId = session.user.id;
    const currentNombreJugador = session.user.name || session.user.email || `Jugador ${currentUserId.slice(-4)}`;
    const currentImageUrl = session.user.image || null;

    console.log(`[JUEGO_PAGE_EFFECT_USER_INIT] Usuario autenticado: userId=${currentUserId}, nombreJugador=${currentNombreJugador}, imageUrl=${currentImageUrl}`);
    setGameUserId(currentUserId);
    setGameNombreJugador(currentNombreJugador);
    setGameUserImageUrl(currentImageUrl);
    setIsUserDataReady(true);

    tipoJuegoSolicitadoRef.current = sessionStorage.getItem('jmu_tipoJuegoSolicitado') as GameMode | null;

  }, [mesaIdFromUrl, session, sessionStatus, router]);

  // Obtener el socket y sus funciones del store
  const { socket, isConnected, emitEvent, registerEventHandlers, unregisterEventHandlers, initializeSocketIfNeeded } = useDominoSocket();
  const initialJoinAttemptedRef = useRef(false);

  useEffect(() => {
    const defaultTitle = "Juego - FullDomino";
    const currentMesaIdForTitle = authoritativeMesaIdRef.current;

    if (isConnected && gameNombreJugador) {
      const shortName = formatPlayerNameForTitle(gameNombreJugador);
      const mesaSuffix = currentMesaIdForTitle ? ` ${currentMesaIdForTitle.slice(-3)}` : "";
      document.title = shortName ? `${shortName} - Juego${mesaSuffix}` : `Juego${mesaSuffix} - FullDomino`;
    } else {
      document.title = defaultTitle;
    }
  }, [isConnected, estadoMesaCliente, gameNombreJugador, authoritativeMesaIdRef]);

  // Effect para inicializar el socket y unirse a la mesa
  useEffect(() => {
    const mesaId = authoritativeMesaIdRef.current;
    console.log('[JUEGO_PAGE_SOCKET_FLOW] Effect triggered.', { userId: gameUserId, nombreJugador: gameNombreJugador, mesaId, isConnected, initialJoinAttempted: initialJoinAttemptedRef.current, isUserDataReady });

    if (isUserDataReady && gameUserId && gameNombreJugador && gameUserImageUrl !== undefined && mesaId) {
      if (!isConnected) {
        console.log('[JUEGO_PAGE_SOCKET_FLOW] Info disponible, socket no conectado. Llamando initializeSocketIfNeeded.');
        initializeSocketIfNeeded(gameUserId, gameNombreJugador, gameUserImageUrl);
      } else if (!initialJoinAttemptedRef.current) { // Solo intentar unirse si está conectado y no se ha intentado antes
        console.log('[JUEGO_PAGE_SOCKET_FLOW] Socket conectado e info disponible. Intentando unirse a la mesa:', mesaId);
        initialJoinAttemptedRef.current = true;
        // Al recargar la página, solo tenemos el GameMode. Asumimos FREE_PLAY.
        // El servidor ya debería tener al jugador en la mesa y esto es solo para re-sincronizar.
        emitEvent('cliente:unirseAMesa', {
          gameMode: tipoJuegoSolicitadoRef.current || GameMode.SINGLE_ROUND, // Fallback a SINGLE_ROUND si no hay nada en sessionStorage
          matchCategory: MatchCategory.FREE_PLAY, // Asumimos FREE_PLAY al recargar
          nombreJugador: gameNombreJugador,
        });
      }
    }
  }, [isConnected, initializeSocketIfNeeded, emitEvent, gameUserId, gameNombreJugador, gameUserImageUrl, isUserDataReady, authoritativeMesaIdRef]);

  const rondaActualParaUI: EstadoRondaPublicoCliente | undefined = estadoMesaCliente?.partidaActual?.rondaActual;

  const {
    tiempoTurnoRestante,
    duracionTurnoActualConfigurada,
    autoPaseInfoCliente,
    isMyTurnTimerJustExpired,
    fichaAnimandose,
    handleFichaDragEnd,
    esMiTurno: esMiTurnoFromRondaHook,
    rondaEnProgreso: rondaEnProgresoFromRondaHook,
    isAutoPasoForMe: isAutoPasoForMeFromRondaHook,
  } = useDominoRonda({
    estadoMesaCliente,
    miIdJugadorSocket: miIdJugadorSocketFromStore,
    miIdJugadorSocketRef,
    manosJugadores: manosJugadoresFromStore,
    playableFichaIds: playableFichaIdsFromStore,
    setPlayableFichaIdsStore,
    socket,
    emitEvent,
    mesaRef,
    mesaDims,
    clearFichaSelection: () => clearSelection(),
    finRondaInfoVisible,
    audioFichaJugadaRef,
    estadoMesaClienteRef,
  });

  const { selectedFichaInfo, selectFicha, clearSelection } = usePlayerHandLogic({
    idJugadorMano: miIdJugadorSocketFromStore,
    isMyTurn: esMiTurnoFromRondaHook,
    isRoundActive: rondaEnProgresoFromRondaHook,
    isMyTurnTimerJustExpired: isMyTurnTimerJustExpired,
    isAutoPasoForMe: isAutoPasoForMeFromRondaHook,
    currentPlayableFichaIds: playableFichaIdsFromStore,
  });

  const stableEmitEvent = useCallback(emitEvent, [emitEvent]);

  const handleTeUnisteAMesa = useCallback((payload: TeUnisteAMesaPayloadCliente) => {
      console.log('[SOCKET] Evento servidor:teUnisteAMesa recibido:', payload);
      if (payload.mesaId !== authoritativeMesaIdRef.current) {
        console.warn(`[SOCKET] El mesaId del servidor (${payload.mesaId}) no coincide con el de la URL/ref actual (${authoritativeMesaIdRef.current}). Se usará el del servidor (${payload.mesaId}).`);
        authoritativeMesaIdRef.current = payload.mesaId;
      }
      miIdJugadorSocketRef.current = payload.tuJugadorIdEnPartida;
      setMiIdJugadorSocketStore(payload.tuJugadorIdEnPartida);
      setEstadoMesaClienteStore(payload.estadoMesa);

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
  }, [setMiIdJugadorSocketStore, setEstadoMesaClienteStore, stableEmitEvent, socket]);

  const emitListoParaManoIfReady = useCallback((mesaState: EstadoMesaPublicoCliente) => {
    const miId = miIdJugadorSocketRef.current;
    const mesaId = authoritativeMesaIdRef.current;

    if (mesaState?.partidaActual?.gameMode === GameMode.FULL_GAME &&
        mesaState.partidaActual.estadoPartida === 'rondaTerminadaEsperandoSiguiente' &&
        miId && mesaId) {
      console.log('[CLIENT] Estado de partida es "rondaTerminadaEsperandoSiguiente". Señalando listo para la próxima ronda.');
      stableEmitEvent('cliente:listoParaMano', {
        mesaId: mesaId,
        jugadorId: miId
      });
    }
  }, [stableEmitEvent]);

  const handleEstadoMesaActualizado = useCallback((payload: { estadoMesa: EstadoMesaPublicoCliente }) => {
    setEstadoMesaClienteStore(payload.estadoMesa);
    emitListoParaManoIfReady(payload.estadoMesa); // Emit listoParaMano based on the new state
  }, [setEstadoMesaClienteStore, emitListoParaManoIfReady]);

  const handleTuMano = useCallback((payload: TuManoPayloadCliente) => {
    console.log(`[SOCKET] Evento servidor:tuMano recibido. Payload:`, payload);
    if (miIdJugadorSocketRef.current) {
      const jugadorIdLocal = miIdJugadorSocketRef.current;
      const currentEstadoMesa = estadoMesaClienteRef.current;
      setManosJugadoresStore((prevManos: JugadorCliente[]) => {
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
            ordenTurno: jugadorInfoGeneral?.ordenTurnoEnRondaActual,
            seatIndex: jugadorInfoGeneral?.seatIndex,
            image: jugadorInfoGeneral?.image,
          };
          return [...prevManos, nuevoJugador];
        }
      });
    }
  }, [setManosJugadoresStore, estadoMesaClienteRef]);

  const handleTuManoActualizada = useCallback((payload: TuManoPayloadCliente) => {
    console.log(
      `[DEBUG_JUEGO_PAGE] Evento servidor:tuManoActualizada recibido. Jugador Local: ${miIdJugadorSocketRef.current}. Nueva mano:`,
      payload.fichas.map(f => f.id),
      `Turno actual (según rondaHook): ${esMiTurnoFromRondaHook ? 'MÍO' : 'OTRO'}`
    );
    if (miIdJugadorSocketRef.current) {
      setManosJugadoresStore(prevManos =>
        prevManos.map(mano =>
          mano.idJugador === miIdJugadorSocketRef.current
            ? { ...mano, fichas: payload.fichas, numFichas: payload.fichas.length }
            : mano
        )
      );
    }
  }, [setManosJugadoresStore, esMiTurnoFromRondaHook]);

  const handleTuTurno = useCallback((payload: TuTurnoPayloadCliente) => {
    if (payload.currentPlayerId === miIdJugadorSocketRef.current) {
      setPlayableFichaIdsStore(payload.playableFichaIds);
      setManoVersion(prev => prev + 1);
    } else {
      setPlayableFichaIdsStore([]);
    }
  }, [setPlayableFichaIdsStore, setManoVersion]);

  const handleFinDeRonda = useCallback((payload: FinDeRondaPayloadCliente) => {
    console.log('[SOCKET] Evento servidor:finDeRonda recibido:', payload);
    const currentEstadoMesa = estadoMesaClienteRef.current;
    let fichasEnMesaSnapshotParaFin: FichaEnMesaParaLogica[] = [];
    let posicionAnclaSnapshotParaFin: { fila: number; columna: number } = { fila: FILA_ANCLA_INICIAL, columna: COLUMNA_ANCLA_INICIAL };

    // Use payload's board state for snapshot
    if (payload.anclaFicha || (payload.fichasIzquierda && payload.fichasIzquierda.length > 0) || (payload.fichasDerecha && payload.fichasDerecha.length > 0)) {
        fichasEnMesaSnapshotParaFin = [
            ...(payload.fichasIzquierda || []).slice().reverse(),
            ...(payload.anclaFicha ? [payload.anclaFicha] : []),
            ...(payload.fichasDerecha || []),
        ];
        if (payload.anclaFicha) {
            posicionAnclaSnapshotParaFin = payload.anclaFicha.posicionCuadricula;
        } else if (fichasEnMesaSnapshotParaFin.length > 0) {
            posicionAnclaSnapshotParaFin = fichasEnMesaSnapshotParaFin[0].posicionCuadricula;
        }
    } else if (currentEstadoMesa?.partidaActual?.rondaActual) {
        const currentRondaFallback = currentEstadoMesa.partidaActual.rondaActual;
        fichasEnMesaSnapshotParaFin = [
            ...(currentRondaFallback.fichasIzquierda || []).slice().reverse(),
            ...(currentRondaFallback.anclaFicha ? [currentRondaFallback.anclaFicha] : []),
            ...(currentRondaFallback.fichasDerecha || []),
        ];
        if (currentRondaFallback.anclaFicha) {
            posicionAnclaSnapshotParaFin = currentRondaFallback.anclaFicha.posicionCuadricula;
        }
    }

    setFinRondaData({
      resultadoPayload: payload,
      fichasEnMesaSnapshot: fichasEnMesaSnapshotParaFin,
      posicionAnclaSnapshot: posicionAnclaSnapshotParaFin,
    });
    setFinRondaInfoVisible(true);
    clearSelection();
    setPlayableFichaIdsStore([]);

    if (finRondaDisplayTimerRef.current) clearTimeout(finRondaDisplayTimerRef.current);
    finRondaDisplayTimerRef.current = setTimeout(() => {
      setFinRondaInfoVisible(false);
      // The logic to emit cliente:listoParaMano is now handled by handleEstadoMesaActualizado
    }, TIEMPO_VISUALIZACION_FIN_RONDA_MS_CLIENTE);
    setManoVersion(prev => prev + 1);
  }, [clearSelection, setPlayableFichaIdsStore, estadoMesaClienteRef, stableEmitEvent]);

  const finPartidaDisplayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const handleFinDePartida = useCallback((payload: FinDePartidaPayloadCliente) => {
    console.log('[SOCKET] Evento servidor:finDePartida recibido:', payload);
    setFinPartidaData(payload);
    // Clear any existing timer
    if (finPartidaDisplayTimerRef.current) clearTimeout(finPartidaDisplayTimerRef.current);
    // Show modal for a few seconds, then clear
    finPartidaDisplayTimerRef.current = setTimeout(() => {
      setFinPartidaData(null);
      // After showing game end, if it's a full game, we might transition to lobby or wait for rematch
      // The server will handle the state transition, client just reacts.
    }, TIEMPO_VISUALIZACION_FIN_RONDA_MS_CLIENTE); // Use same duration for now  
  
  }, []);

  const handleErrorDePartida = useCallback((payload: { mensaje: string }) => {
    console.error('[SOCKET] Error de partida/mesa:', payload.mensaje);
  }, []);

  useEffect(() => {
    if (!socket || !isConnected) return;
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
    return () => unregisterEventHandlers(Object.keys(eventHandlers));
  }, [
    socket, isConnected, registerEventHandlers, unregisterEventHandlers,
    handleTeUnisteAMesa, handleEstadoMesaActualizado, handleTuMano,
    handleTuManoActualizada, handleTuTurno, handleFinDeRonda,
    handleFinDePartida, handleErrorDePartida
  ]);

  useEffect(() => {
    if (!estadoMesaCliente) {
      setFinRondaInfoVisible(false);
      setFinRondaData(null);
      if (finRondaDisplayTimerRef.current) {
        clearTimeout(finRondaDisplayTimerRef.current);
        finRondaDisplayTimerRef.current = null;
      }
      return;
    }
    const partidaActual = estadoMesaCliente.partidaActual;
    const rondaActual = partidaActual?.rondaActual;

    if (finRondaInfoVisible && (!rondaActual || rondaActual.rondaId !== finRondaData?.resultadoPayload.rondaId)) {
      setFinRondaInfoVisible(false);
      if (finRondaDisplayTimerRef.current) {
        clearTimeout(finRondaDisplayTimerRef.current);
        finRondaDisplayTimerRef.current = null;
      }
    }

    // Logic for transition messages
    if (estadoMesaCliente.estadoGeneralMesa === 'transicionNuevaRonda') { // For SINGLE_ROUND auto-restart
      if (!mensajeTransicion) setMensajeTransicion("Iniciando nueva partida...");
      if (finRondaInfoVisible) setFinRondaInfoVisible(false); // Hide round end modal during transition
      if (finRondaDisplayTimerRef.current) { clearTimeout(finRondaDisplayTimerRef.current); finRondaDisplayTimerRef.current = null; }
    } else if (estadoMesaCliente.partidaActual?.estadoPartida === 'rondaTerminadaEsperandoSiguiente') { // For FULL_GAME waiting for next round
      if (!mensajeTransicion) setMensajeTransicion("Esperando jugadores para la próxima ronda...");
      if (finRondaInfoVisible) setFinRondaInfoVisible(false); // Hide round end modal during transition
      if (finRondaDisplayTimerRef.current) { clearTimeout(finRondaDisplayTimerRef.current); finRondaDisplayTimerRef.current = null; }
    } else if (estadoMesaCliente.estadoGeneralMesa === 'esperandoParaSiguientePartida') { // For FULL_GAME after game over, waiting for rematch
      if (!mensajeTransicion) setMensajeTransicion("Partida finalizada. Esperando para jugar de nuevo...");
      if (finRondaInfoVisible) setFinRondaInfoVisible(false); // Hide round end modal
      if (finRondaDisplayTimerRef.current) { clearTimeout(finRondaDisplayTimerRef.current); finRondaDisplayTimerRef.current = null; }
    }
    // Clear transition message once game is in progress or waiting for players (initial state)
    else if (mensajeTransicion && (
      (estadoMesaCliente.estadoGeneralMesa === 'partidaEnProgreso' && rondaActual) ||
      estadoMesaCliente.estadoGeneralMesa === 'esperandoJugadores')) {
      setMensajeTransicion(null);
    }
  }, [estadoMesaCliente, finRondaInfoVisible, mensajeTransicion, finRondaData]);

  useEffect(() => {
    return () => {
      if (finRondaDisplayTimerRef.current) clearTimeout(finRondaDisplayTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const noEsMiTurnoOFinDeJuego = !esMiTurnoFromRondaHook || !rondaEnProgresoFromRondaHook || finRondaInfoVisible;
    if (noEsMiTurnoOFinDeJuego && playableFichaIdsFromStore.length > 0) {
      setPlayableFichaIdsStore([]);
    }
  }, [esMiTurnoFromRondaHook, rondaEnProgresoFromRondaHook, finRondaInfoVisible, playableFichaIdsFromStore, setPlayableFichaIdsStore]);

  useEffect(() => {
    if (finRondaInfoVisible && finRondaData?.resultadoPayload) {
      const newResultado = {
        ganadorId: finRondaData.resultadoPayload.ganadorRondaId,
        nombreGanador: finRondaData.resultadoPayload.nombreGanador,
        tipoFin: finRondaData.resultadoPayload.tipoFinRonda,
      };
      if (!resultadoRonda || resultadoRonda.ganadorId !== newResultado.ganadorId || resultadoRonda.nombreGanador !== newResultado.nombreGanador || resultadoRonda.tipoFin !== newResultado.tipoFin) {
        setResultadoRonda(newResultado);
      }
    } else if (!finRondaInfoVisible && resultadoRonda !== null) {
      setResultadoRonda(null);
    }
  }, [finRondaInfoVisible, finRondaData, resultadoRonda]);

  // useEffect específico para actualizar manosJugadores (para la UI)
  useEffect(() => {
    if (!estadoMesaCliente || !miIdJugadorSocketFromStore) {
      if (manosJugadoresFromStore.length > 0) {
         setManosJugadoresStore([]);
      }
      return;
    }

    const currentMesaState = estadoMesaCliente;
    const jugadorIdLocal = miIdJugadorSocketFromStore;

    setManosJugadoresStore(prevManos => {
      const prevManosMap = new Map(prevManos.map(p => [p.idJugador, p]));
      const newManosArray: JugadorCliente[] = currentMesaState.jugadores.map(serverPlayerInfo => {
        const existingPlayer = prevManosMap.get(serverPlayerInfo.id);
        const rondaPlayerInfo = currentMesaState.partidaActual?.rondaActual?.jugadoresRonda.find(jr => jr.id === serverPlayerInfo.id);

        return {
            idJugador: serverPlayerInfo.id,
            nombre: serverPlayerInfo.nombre,
            fichas: serverPlayerInfo.id === jugadorIdLocal ? (existingPlayer?.fichas || []) : [],
            numFichas: serverPlayerInfo.id === jugadorIdLocal ? (existingPlayer?.fichas.length || 0) : (rondaPlayerInfo?.numFichas ?? serverPlayerInfo.numFichas ?? 0),
            estaConectado: serverPlayerInfo.estaConectado,
            ordenTurno: rondaPlayerInfo?.ordenTurnoEnRondaActual,
            seatIndex: serverPlayerInfo.seatIndex,
            image: serverPlayerInfo.image,
        };
      });

      const contentChanged = prevManos.length !== newManosArray.length ||
                             prevManos.some((prevPlayer, index) => {
                               const newPlayer = newManosArray[index];
                               if (!newPlayer) return true;
                               return prevPlayer.idJugador !== newPlayer.idJugador ||
                                      prevPlayer.nombre !== newPlayer.nombre ||
                                      prevPlayer.estaConectado !== newPlayer.estaConectado ||
                                      prevPlayer.ordenTurno !== newPlayer.ordenTurno ||
                                      prevPlayer.seatIndex !== newPlayer.seatIndex ||
                                      prevPlayer.numFichas !== newPlayer.numFichas ||
                                      prevPlayer.image !== newPlayer.image;
                             });
      if (contentChanged) {
         console.log('[MANOS_SYNC_EFFECT] Content of newManosArray before setting to store:', JSON.stringify(newManosArray.map(j => ({id: j.idJugador, nombre: j.nombre, seatIndex: j.seatIndex, image: j.image, ordenTurno: j.ordenTurno}))));
         console.log('[MANOS_SYNC_EFFECT] Player info content changed. Updating manosJugadoresStore.');
         return newManosArray;
      }
      return prevManos;
    });
  }, [estadoMesaCliente, miIdJugadorSocketFromStore, setManosJugadoresStore, manosJugadoresFromStore]);

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

  const combinedFichasParaMesa = useMemo(() => {
    if (finRondaInfoVisible && finRondaData) {
        return finRondaData.fichasEnMesaSnapshot;
    }
    if (!rondaActualParaUI) return [];
    return [
      ...(rondaActualParaUI.fichasIzquierda || []).slice().reverse(),
      ...(rondaActualParaUI.anclaFicha ? [rondaActualParaUI.anclaFicha] : []),
      ...(rondaActualParaUI.fichasDerecha || []),
    ];
  }, [rondaActualParaUI, finRondaInfoVisible, finRondaData]);

  const posicionAnclaFija = useMemo(() => {
     if (finRondaInfoVisible && finRondaData) {
        return finRondaData.posicionAnclaSnapshot;
    }
    return rondaActualParaUI?.anclaFicha
      ? rondaActualParaUI.anclaFicha.posicionCuadricula
      : { fila: FILA_ANCLA_INICIAL, columna: COLUMNA_ANCLA_INICIAL };
  } , [rondaActualParaUI?.anclaFicha, finRondaInfoVisible, finRondaData]);

  const isLoadingInitialData = sessionStatus === 'loading' || !isUserDataReady || !isConnected || !estadoMesaCliente || !estadoMesaCliente.jugadores || estadoMesaCliente.jugadores.length === 0;

  if (isLoadingInitialData) {
    return (
      <div className="min-h-screen flex flex-col bg-table-wood">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <p className="text-white text-xl">
            {sessionStatus === 'loading' || !isUserDataReady ? 'Cargando datos del jugador...' :
             !isConnected ? 'Conectando al servidor del juego...' :
             !estadoMesaCliente ? 'Cargando datos de la mesa...' :
             (!estadoMesaCliente.jugadores || estadoMesaCliente.jugadores.length === 0) ? 'Esperando jugadores...' :
             'Cargando...'}
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-table-wood flex flex-col">
      <button
        onClick={toggleFullscreen}
        className="fixed top-2 right-2 z-50 p-2 bg-gray-700 text-white rounded-full hover:bg-gray-600 transition-colors"
        aria-label={isFullscreen ? "Salir de pantalla completa" : "Entrar en pantalla completa"}
      >
        {isFullscreen ? <FiMinimize size={20} /> : <FiMaximize size={20} />}
      </button>

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

        {miIdJugadorSocketRef.current && manosJugadoresFromStore.find(m => m.idJugador === miIdJugadorSocketRef.current) && (
           <motion.div
            className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-[1fr_auto_1fr] items-end gap-x-2 px-2 pb-1"
            initial={{ y: 150 }} animate={{ y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 25 }}
          >
            <div className="w-full"></div>
            <div className="flex justify-center">
              <ManoJugadorComponent
                key={`mano-local-${miIdJugadorSocketRef.current || 'no-id'}-${manoVersion}`}
                fichas={manosJugadoresFromStore.find(m => m.idJugador === miIdJugadorSocketRef.current)?.fichas || []}
                fichaSeleccionada={selectedFichaInfo?.idFicha}
                onFichaClick={selectFicha}
                layoutDirection="row"
                isLocalPlayer={true}
                playableFichaIds={playableFichaIdsFromStore}
                onFichaDragEnd={handleFichaDragEnd}
              />
            </div>
            <div className="w-full"></div>
          </motion.div>
        )}
      </main>

      <PlayerInfoLayout
        manosJugadores={manosJugadoresFromStore}
        miIdJugadorSocket={miIdJugadorSocketFromStore}
        estadoMesaCliente={estadoMesaCliente}
        rondaActualParaUI={rondaActualParaUI}
        tiempoTurnoRestante={tiempoTurnoRestante}
        duracionTurnoActualConfigurada={duracionTurnoActualConfigurada}
        autoPaseInfoCliente={autoPaseInfoCliente}
        finRondaInfoVisible={finRondaInfoVisible}
        finRondaData={finRondaData}
      />

      <DominoModals
        showRotateMessage={showRotateMessage} // Restaurado para usar el estado
        finRondaInfoVisible={finRondaInfoVisible}
        finRondaData={finRondaData ? { resultadoPayload: finRondaData.resultadoPayload } : null}
        finPartidaData={finPartidaData}
        estadoMesaCliente={estadoMesaCliente}
        mensajeTransicion={mensajeTransicion}
      />
    </div>
  );
}
