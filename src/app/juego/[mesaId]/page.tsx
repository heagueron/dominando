// /home/heagueron/jmu/dominando/src/app/juego/[mesaId]/page.tsx
'use client';

// import { PanInfo } from 'framer-motion'; // Ya no se usa aquí
import { motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { usePlayerHandLogic } from '@/hooks/usePlayerHandLogic'; // UsePlayerHandLogicReturn ya no se usa aquí
import { useDominoSocket } from '@/hooks/useDominoSocket'; // Asegúrate que la ruta sea correcta
import MesaDomino from '@/components/domino/MesaDomino';
import ManoJugadorComponent from '@/components/domino/ManoJugador'; // Mantener esta importación
import {
 //FichaDomino as FichaDominoType, // Renombrar para evitar conflicto con la interfaz local
 //FichaDomino,
 FichaEnMesaParaLogica,
 // determinarJugadaCliente, // Ya no se usa aquí
} from '@/utils/dominoUtils';

//import { DESIGN_TABLE_WIDTH_PX, DESIGN_TABLE_HEIGHT_PX, DOMINO_WIDTH_PX, DOMINO_HEIGHT_PX } from '@/utils/dominoConstants';
import {
  FILA_ANCLA_INICIAL,
  COLUMNA_ANCLA_INICIAL,
  // getDesignCanvasCoordinates, // Ya no se usa aquí
} from '@/utils/posicionamientoUtils';
// import DebugInfoOverlay from '@/components/debug/DebugInfoOverlay'; // Comentado para prueba
import PlayerInfoLayout from '@/components/juego/PlayerInfoLayout'; // Importar el nuevo componente
import DominoModals from '@/components/juego/DominoModals'; // Importar el nuevo componente de modales (ya actualizado)

// Importar tipos desde el nuevo archivo centralizado
//import { JugadorCliente, EstadoMesaPublicoCliente, EstadoRondaPublicoCliente, FinDeRondaPayloadCliente, TeUnisteAMesaPayloadCliente, TuManoPayloadCliente, TuTurnoPayloadCliente, FinDePartidaPayloadCliente, TipoJuegoSolicitado, JugadorPublicoInfoCliente, EstadoPartidaPublicoCliente } from '@/types/domino';
import { JugadorCliente, EstadoMesaPublicoCliente, FinDeRondaPayloadCliente, TeUnisteAMesaPayloadCliente, TuManoPayloadCliente, TuTurnoPayloadCliente, FinDePartidaPayloadCliente, TipoJuegoSolicitado} from '@/types/domino';
// EstadoRondaPublicoCliente ya no se usa directamente aquí para tipar estados locales
import { formatPlayerNameForTitle } from '@/utils/stringUtils'; // Importar la función movida
import { useDominoStore } from '@/store/dominoStore'; // Importar el store de Zustand
import { useDominoRonda } from '@/hooks/useDominoRonda'; // Importar el nuevo hook de ronda

// const DURACION_TURNO_SEGUNDOS = 15; // Ya no se usa aquí, el hook tiene su default
const TIEMPO_VISUALIZACION_FIN_RONDA_MS_CLIENTE = 10000; // 10 segundos


export default function JuegoPage() {
  // Leer estadoMesaCliente del store de Zustand
  const estadoMesaCliente = useDominoStore((state) => state.estadoMesaCliente);
  // Obtener la acción para actualizar estadoMesaCliente del store
  const setEstadoMesaClienteStore = useDominoStore((state) => state.setEstadoMesaCliente);

  // Leer estados de jugador y mano del store de Zustand
  const miIdJugadorSocketFromStore = useDominoStore((state) => state.miIdJugadorSocket);
  const manosJugadoresFromStore = useDominoStore((state) => state.manosJugadores);
  const playableFichaIdsFromStore = useDominoStore((state) => state.playableFichaIds);

  // Obtener acciones para actualizar jugador y mano del store
  const setMiIdJugadorSocketStore = useDominoStore((state) => state.setMiIdJugadorSocket);
  const setManosJugadoresStore = useDominoStore((state) => state.setManosJugadores);
  const setPlayableFichaIdsStore = useDominoStore((state) => state.setPlayableFichaIds);

  const [viewportDims, setViewportDims] = useState({ width: 0, height: 0 });
  const [mesaDims, setMesaDims] = useState({ width: 0, height: 0, scale: 1, translateX: 0, translateY: 0 });
  const [showRotateMessage, setShowRotateMessage] = useState(false);
  // const [resultadoRonda, setResultadoRonda] ... (se mueve más abajo, después del hook)
  // const [autoPaseInfoCliente, setAutoPaseInfoCliente] = useState<EstadoRondaPublicoCliente['autoPaseInfo'] | null>(null); // Movido a useDominoRonda
  // const [isMyTurnTimerJustExpired, setIsMyTurnTimerJustExpired] = useState(false); // Movido a useDominoRonda
  const [manoVersion, setManoVersion] = useState(0); // Para forzar re-render de la mano si es necesario
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
  
  // const [playerAuthReady, setPlayerAuthReady] = useState(false); // Se reemplaza por lógica de autoConnectForSocket

  const audioFichaJugadaRef = useRef<HTMLAudioElement | null>(null);
  // const prevIdUltimaFichaJugadaRef = useRef<string | null | undefined>(null); // Movido a useDominoRonda

  const prevPropsForSocketRef = useRef<{ userId: string | null, nombre: string | null, autoConnect: boolean } | null>(null);
  const initialAuthReportedRef = useRef(false);
  const miIdJugadorSocketRef = useRef<string | null>(miIdJugadorSocketFromStore);

  const [resultadoRonda, setResultadoRonda] = useState<{
    ganadorId?: string;
    nombreGanador?: string;
    tipoFin: 'domino' | 'trancado';
  } | null>(null);

  // Inicializar la ref con el valor actual del store.
  const estadoMesaClienteRef = useRef(useDominoStore.getState().estadoMesaCliente);
  useEffect(() => {
    estadoMesaClienteRef.current = estadoMesaCliente;
  }, [estadoMesaCliente]);

  // Sincronizar la ref miIdJugadorSocketRef con el valor del store si es necesario,
  // aunque se establece principalmente en handleTeUnisteAMesa.
  useEffect(() => {
    miIdJugadorSocketRef.current = miIdJugadorSocketFromStore;
  }, [miIdJugadorSocketFromStore]);

  useEffect(() => {
    // Inicializar el reproductor de audio una vez
    audioFichaJugadaRef.current = new Audio('/sounds/ficha_jugada.mp3'); 
    audioFichaJugadaRef.current.load(); // Pre-cargar para mejor rendimiento
    console.log('[AUDIO_EFFECT] Audio player for ficha_colocada initialized.');
  }, []);


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
    }
    // setPlayerAuthReady(true); // Ya no se usa este estado. La conexión se basa en finalUserIdRef y finalNombreJugadorRef
  }, [router, mesaIdFromUrl]); // Añadidas dependencias

  // Las props para el socket ahora dependen directamente de las refs que se llenan en el primer useEffect
  const userIdForSocket = finalUserIdRef.current;
  const nombreJugadorForSocket = finalNombreJugadorRef.current;
  // Conectar automáticamente si tenemos userId y nombre, y la mesaId de la URL es válida
  const autoConnectForSocket = !!(userIdForSocket && nombreJugadorForSocket && mesaIdFromUrl && mesaIdFromUrl.trim() !== '');

  useEffect(() => {
    const defaultTitle = "Juego - Dominando";
    const currentMesaIdForTitle = authoritativeMesaIdRef.current;

    if (autoConnectForSocket && finalNombreJugadorRef.current) { // Usar autoConnectForSocket
      const shortName = formatPlayerNameForTitle(finalNombreJugadorRef.current);
      const mesaSuffix = currentMesaIdForTitle ? ` ${currentMesaIdForTitle.slice(-3)}` : "";
      document.title = shortName ? `${shortName} - Juego${mesaSuffix}` : `Juego${mesaSuffix} - Dominando`;
    } else {
      document.title = defaultTitle;
    }
  }, [autoConnectForSocket, estadoMesaCliente, finalNombreJugadorRef, authoritativeMesaIdRef]); // Actualizadas dependencias


  useEffect(() => {
    console.log('[JUEGO_PAGE] Props para useDominoSocket (evaluados):', {
      userId: userIdForSocket,
      nombreJugador: nombreJugadorForSocket,
      autoConnectForSocket: autoConnectForSocket,
      finalUserIdRefCurrent: finalUserIdRef.current,
      finalNombreJugadorRefCurrent: finalNombreJugadorRef.current,
    });
  }, [userIdForSocket, nombreJugadorForSocket, autoConnectForSocket]);

  useEffect(() => {
    if (autoConnectForSocket && !initialAuthReportedRef.current) { // Usar autoConnectForSocket
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
          autoConnectForSocket, // Usar autoConnectForSocket
          finalUserIdRefCurrent: finalUserIdRef.current,
          finalNombreJugadorRefCurrent: finalNombreJugadorRef.current,
        });
      }
      prevPropsForSocketRef.current = currentProps;
    }
  }, [userIdForSocket, nombreJugadorForSocket, autoConnectForSocket]);

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

  // Usar el nuevo hook useDominoRonda PRIMERO, ya que usePlayerHandLogic depende de sus valores
  const {
    tiempoTurnoRestante,
    duracionTurnoActualConfigurada,
    autoPaseInfoCliente,
    isMyTurnTimerJustExpired,
    fichaAnimandose, // Este es el que se usará para la UI
    handleFichaDragEnd,
    handleJugarFichaServidor,
    // getScreenCoordinatesOfConnectingEdge, // No se usa directamente en page.tsx, sino dentro del hook
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
    clearFichaSelection: () => clearSelection(), // clearSelection viene de usePlayerHandLogic, se pasará después
    finRondaInfoVisible,
    audioFichaJugadaRef,
    estadoMesaClienteRef,
  });

  // AHORA llamar a usePlayerHandLogic, ya que los valores de useDominoRonda están disponibles
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
      } else {
        authoritativeMesaIdRef.current = payload.mesaId;
      }
      miIdJugadorSocketRef.current = payload.tuJugadorIdEnPartida;
      setMiIdJugadorSocketStore(payload.tuJugadorIdEnPartida); // Usar la acción del store
      setEstadoMesaClienteStore(payload.estadoMesa); // Usar la acción del store

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

  const handleEstadoMesaActualizado = useCallback((payload: { estadoMesa: EstadoMesaPublicoCliente }) => {
    //console.log('[SOCKET] Evento servidor:estadoMesaActualizado recibido para mesaId:', payload.estadoMesa.mesaId);
    setEstadoMesaClienteStore(payload.estadoMesa); // Usar la acción del store
  }, [setEstadoMesaClienteStore]);

  const handleTuMano = useCallback((payload: TuManoPayloadCliente) => {
    console.log(`[SOCKET] Evento servidor:tuMano recibido. Payload:`, payload);
    if (miIdJugadorSocketRef.current) {
      const jugadorIdLocal = miIdJugadorSocketRef.current;
      const currentEstadoMesa = estadoMesaClienteRef.current; 
      setManosJugadoresStore((prevManos: JugadorCliente[]) => { // Usar la acción del store y tipar prevManos
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
  }, [setManosJugadoresStore]); 

  const handleTuManoActualizada = useCallback((payload: TuManoPayloadCliente) => {
    console.log(`[SOCKET] Evento servidor:tuManoActualizada recibido. Payload:`, payload);
    if (miIdJugadorSocketRef.current) {
      setManosJugadoresStore(prevManos => // Usar la acción del store
        prevManos.map(mano =>
          mano.idJugador === miIdJugadorSocketRef.current
            ? { ...mano, fichas: payload.fichas, numFichas: payload.fichas.length }
            : mano
        )
      );
    }
  }, [setManosJugadoresStore]); 
  
  const handleTuTurno = useCallback((payload: TuTurnoPayloadCliente) => {
    //console.log('[SOCKET] Evento servidor:tuTurno recibido:', payload);
    if (payload.currentPlayerId === miIdJugadorSocketRef.current) {
      setPlayableFichaIdsStore(payload.playableFichaIds);
      // La lógica de duracionTurnoTotal y isMyTurnTimerJustExpired se maneja en useDominoRonda
      setManoVersion(prev => prev + 1);
    } else {
      setPlayableFichaIdsStore([]);
    }
  }, [setPlayableFichaIdsStore, setManoVersion]); // Quitar dependencias movidas al hook

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
    clearSelection(); // Usar clearSelection directamente del hook usePlayerHandLogic
    setPlayableFichaIdsStore([]); // Usar la acción del store
    // Los estados de timer, auto-pase, isMyTurnTimerJustExpired, fichaAnimandose se limpian en useDominoRonda
    // setResultadoRonda(null); // Se maneja en el useEffect de finRondaInfoVisible

    if (finRondaDisplayTimerRef.current) {
      clearTimeout(finRondaDisplayTimerRef.current);
    }
    finRondaDisplayTimerRef.current = setTimeout(() => {
      console.log('[handleFinDeRonda] Timer de fin de ronda completado. Ocultando información.');
      setFinRondaInfoVisible(false);
    }, TIEMPO_VISUALIZACION_FIN_RONDA_MS_CLIENTE);

    setManoVersion(prev => prev + 1); // Para refrescar la mano local si es necesario (ej. si se vació)
  }, [clearSelection, setPlayableFichaIdsStore, estadoMesaClienteRef]); // clearSelection es ahora una dependencia

  const handleFinDePartida = useCallback((payload: FinDePartidaPayloadCliente) => {
    console.log('[SOCKET] Evento servidor:finDePartida recibido:', payload);
    // No es necesario setResultadoRonda(null) aquí, el useEffect de estadoMesaCliente lo manejará
    // o el estado finRondaInfoVisible controlará la visibilidad del modal.
  }, []);

  const handleErrorDePartida = useCallback((payload: { mensaje: string }) => {
    console.error('[SOCKET] Error de partida/mesa:', payload.mensaje);
  }, []);

  useEffect(() => {
    if (!socket || !autoConnectForSocket) return;  // Usar autoConnectForSocket

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
    autoConnectForSocket, // Usar autoConnectForSocket
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

  // useEffect para manejar la visualización del mensaje de transición y limpieza de finRondaData
  useEffect(() => {
    if (!estadoMesaCliente) {
      console.log('[EFFECT_ESTADO_MESA] estadoMesaCliente is null. Cleaning up all states.');
      // setAutoPaseInfoCliente(null); // Movido a useDominoRonda
      // setResultadoRonda(null); // Se maneja en su propio effect
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

    // Lógica de salvaguarda para finRondaInfoVisible si el estado del servidor cambia
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

    // Manejar el estado de transición
    if (estadoMesaCliente.estadoGeneralMesa === 'transicionNuevaRonda') {
      if (!mensajeTransicion) setMensajeTransicion("Empezando nueva partida...");
      if (finRondaInfoVisible) setFinRondaInfoVisible(false); // Asegurar que el modal de fin de ronda se oculte
      if (finRondaDisplayTimerRef.current) {
        clearTimeout(finRondaDisplayTimerRef.current);
        finRondaDisplayTimerRef.current = null;
      }
      // Estados de ronda activa (timer, autoPase, etc.) se limpian en useDominoRonda
      // setPlayableFichaIdsStore([]); // Se limpia en useDominoRonda o en el handler de finDeRonda
    } else if (mensajeTransicion && ((estadoMesaCliente.estadoGeneralMesa === 'partidaEnProgreso' && rondaActual) || estadoMesaCliente.estadoGeneralMesa === 'esperandoJugadores')) {
      // Si estábamos en transición y ahora la partida ha comenzado o volvimos a esperar, limpiar el mensaje
      setMensajeTransicion(null);
    }
  }, [
    estadoMesaCliente, 
    finRondaInfoVisible, 
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
    // Si no es mi turno, o la ronda no está en progreso, o se está mostrando el modal de fin de ronda,
    // y todavía hay fichas marcadas como jugables, limpiarlas.
    if ((!esMiTurnoFromRondaHook || !rondaEnProgresoFromRondaHook || finRondaInfoVisible) && playableFichaIdsFromStore.length > 0) {
      setPlayableFichaIdsStore([]); // Usar la acción del store
    }
  }, [
    esMiTurnoFromRondaHook, // Usar valor del hook de ronda
    rondaEnProgresoFromRondaHook, // Usar valor del hook de ronda
    finRondaInfoVisible,
    playableFichaIdsFromStore.length, // Depender de la longitud para re-evaluar si cambia
    setPlayableFichaIdsStore // Acción del store es estable
  ]);

  // Actualizar `resultadoRonda` para el modal basado en `finRondaData` cuando `finRondaInfoVisible`
  useEffect(() => {
    console.log(`[EFFECT_RESULTADO_RONDA] finRondaInfoVisible: ${finRondaInfoVisible}, finRondaData exists: ${!!finRondaData}`);
    if (finRondaInfoVisible && finRondaData?.resultadoPayload) {
      console.log('[EFFECT_RESULTADO_RONDA] Setting resultadoRonda from finRondaData.');
      setResultadoRonda({
        ganadorId: finRondaData.resultadoPayload.ganadorRondaId,
        nombreGanador: finRondaData.resultadoPayload.nombreGanador,
        tipoFin: finRondaData.resultadoPayload.tipoFinRonda, // Asegúrate que tipoFinRonda exista en el payload
      });
    } else if (!finRondaInfoVisible) {
      // Only clear resultadoRonda if not showing the end-of-round info.
      // No necesitamos 'localResultadoRonda', comparamos directamente con el estado 'resultadoRonda'
      if (resultadoRonda !== null) { 
        console.log('[EFFECT_RESULTADO_RONDA] Not showing end-of-round info, clearing resultadoRonda.');
        setResultadoRonda(null);
      }
    }
  }, [finRondaInfoVisible, finRondaData]); // REMOVED resultadoRonda from dependencies

  // useEffect específico para actualizar manosJugadores (para la UI)
  useEffect(() => {
    if (!estadoMesaCliente?.jugadores) {
      if (manosJugadoresFromStore.length > 0) { // Usar el valor del store
         setManosJugadoresStore([]); // Usar la acción del store
      }
      return;
    }
    
    const jugadorIdLocal = miIdJugadorSocketRef.current;
    setManosJugadoresStore(prevManos => { // Usar la acción del store
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

  }, [
    estadoMesaCliente?.jugadores, 
    estadoMesaCliente?.partidaActual?.rondaActual?.jugadoresRonda, 
    setManosJugadoresStore // Acción del store es estable
  ]);


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

  // La función getDesignCanvasCoordinates ha sido movida a posicionamientoUtils.ts
  // El useCallback que la envolvía ya no es necesario aquí si la función es importada directamente
  // y se llama con los argumentos correctos.
  // Si necesitas memoizar la *llamada* a getDesignCanvasCoordinates, puedes hacerlo con useMemo:
  // const designCoordsForSpecificPurpose = useMemo(() => getDesignCanvasCoordinates(...), [...dependencies]);

  // Las funciones handleJugarFichaServidor, getScreenCoordinatesOfConnectingEdge, handleFichaDragEnd ahora vienen de useDominoRonda

  if (!autoConnectForSocket || !estadoMesaCliente) { // Usar autoConnectForSocket
    return <div className="flex items-center justify-center min-h-screen">Cargando datos de la mesa...</div>;
  }


  return (
    <div className="min-h-screen bg-table-wood flex flex-col">
      <main className="flex-grow relative flex justify-center items-center w-full h-screen overflow-hidden">
        <MesaDomino
          fichasEnMesa={finRondaInfoVisible && finRondaData ? finRondaData.fichasEnMesaSnapshot : combinedFichasParaMesa}
          ref={mesaRef}
          posicionAnclaFija={finRondaInfoVisible && finRondaData ? finRondaData.posicionAnclaSnapshot : posicionAnclaFija}
          onFichaClick={handleMesaFichaClick} 
          onMesaDimensionsChange={handleMesaDimensionsChange} // Esta función se mantiene en page.tsx
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
        {miIdJugadorSocketRef.current && manosJugadoresFromStore.find(m => m.idJugador === miIdJugadorSocketRef.current) && ( // Usar manosJugadoresFromStore
           <motion.div 
            className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-[1fr_auto_1fr] items-end gap-x-2 px-2 pb-1" // Aumentado z-index
            initial={{ y: 150 }} animate={{ y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 25 }}
          >
            <div className="w-full"></div> {/* Espacio para info izquierda (si existiera) */}
            <div className="flex justify-center">
              <ManoJugadorComponent
                key={`mano-local-${manoVersion}-${manosJugadoresFromStore.find(m => m.idJugador === miIdJugadorSocketRef.current)?.fichas.length}-${selectedFichaInfo?.idFicha || 'no-sel'}-${playableFichaIdsFromStore.length}`}
                fichas={manosJugadoresFromStore.find(m => m.idJugador === miIdJugadorSocketRef.current)?.fichas || []} // Usar manosJugadoresFromStore
                fichaSeleccionada={selectedFichaInfo?.idFicha} 
                onFichaClick={selectFicha} 
                idJugadorMano={miIdJugadorSocketRef.current}
                layoutDirection="row"
                isLocalPlayer={true}
                playableFichaIds={playableFichaIdsFromStore} // Usar playableFichaIdsFromStore
                onFichaDragEnd={handleFichaDragEnd}
              />
            </div>
            <div className="w-full"></div> {/* Espacio para info derecha (si existiera) */}
          </motion.div>
        )}

      </main>

      {/* Renderizar la información de los jugadores (incluido el local) */}
      <PlayerInfoLayout
        manosJugadores={manosJugadoresFromStore} // Usar manosJugadoresFromStore
        miIdJugadorSocket={miIdJugadorSocketRef.current}
        estadoMesaCliente={estadoMesaCliente}
        rondaActualParaUI={rondaActualParaUI}
        tiempoTurnoRestante={tiempoTurnoRestante}
        duracionTurnoActualConfigurada={duracionTurnoActualConfigurada}
        autoPaseInfoCliente={autoPaseInfoCliente}
        finRondaInfoVisible={finRondaInfoVisible}
        finRondaData={finRondaData}
      />

      {/* Renderizar todos los modales */}
      <DominoModals
        showRotateMessage={showRotateMessage}
        finRondaInfoVisible={finRondaInfoVisible}
        finRondaData={finRondaData ? { resultadoPayload: finRondaData.resultadoPayload } : null}
        estadoMesaCliente={estadoMesaCliente}
        mensajeTransicion={mensajeTransicion}
      />
    </div>
  );
}
