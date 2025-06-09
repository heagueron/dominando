import { useState, useEffect, useCallback, useRef } from 'react';
import { PanInfo } from 'framer-motion';
import { Socket } from 'socket.io-client';

import {
  EstadoMesaPublicoCliente,
  EstadoRondaPublicoCliente,
  JugadorCliente,
} from '@/types/domino'; // Asegúrate de que la ruta sea correcta
import { determinarJugadaCliente } from '@/utils/dominoUtils'; // Asegúrate de que la ruta sea correcta
import { DOMINO_HEIGHT_PX } from '@/utils/dominoConstants'; // Asegúrate de que la ruta sea correcta
import { getDesignCanvasCoordinates } from '@/utils/posicionamientoUtils'; // Asegúrate de que la ruta sea correcta

// Definir la duración del turno por defecto si no viene del servidor
const DURACION_TURNO_SEGUNDOS_DEFAULT = 15;

interface UseDominoRondaProps {
  estadoMesaCliente: EstadoMesaPublicoCliente | null;
  miIdJugadorSocket: string | null; // Valor del estado (para dependencias de efectos)
  miIdJugadorSocketRef: React.RefObject<string | null>; // Referencia (para usar en callbacks)
  manosJugadores: JugadorCliente[]; // Mano del jugador local (del store)
  playableFichaIds: string[]; // Fichas jugables (del store)
  setPlayableFichaIdsStore: (ids: string[]) => void; // Acción para actualizar fichas jugables
  socket: Socket | null;
  emitEvent: <T>(eventName: string, data: T) => void; 
  mesaRef: React.RefObject<HTMLDivElement | null>; // Referencia al div de la mesa, puede ser null
  mesaDims: { width: number; height: number; scale: number; translateX: number; translateY: number }; // Dimensiones y escala de la mesa
  clearFichaSelection: () => void; // Función para limpiar la selección de ficha (del hook de mano)
  finRondaInfoVisible: boolean; // Estado para saber si se está mostrando la info de fin de ronda
  audioFichaJugadaRef: React.RefObject<HTMLAudioElement | null>; // Referencia al audio player
  estadoMesaClienteRef: React.RefObject<EstadoMesaPublicoCliente | null>; // Referencia al estado global (para usar en callbacks)
}

interface UseDominoRondaReturn {
  tiempoTurnoRestante: number | null;
  duracionTurnoActualConfigurada: number;
  autoPaseInfoCliente: EstadoRondaPublicoCliente['autoPaseInfo'] | null;
  isMyTurnTimerJustExpired: boolean;
  fichaAnimandose: { id: string; jugadorIdOrigen: string; } | null;
  handleFichaDragEnd: (fichaId: string, event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
  handleJugarFichaServidor: (extremoElegidoParam: 'izquierda' | 'derecha', fichaIdParam?: string) => void;
  getScreenCoordinatesOfConnectingEdge: (fichaPos: { fila: number; columna: number }, fichaRot: number) => { x: number; y: number } | null;
  esMiTurno: boolean;
  rondaEnProgreso: boolean;
  isAutoPasoForMe: boolean;
}

export const useDominoRonda = ({
  estadoMesaCliente,
  miIdJugadorSocket,
  miIdJugadorSocketRef,
  manosJugadores,
  //playableFichaIds,
  setPlayableFichaIdsStore,
  socket,
  emitEvent,
  mesaRef,
  mesaDims,
  clearFichaSelection,
  finRondaInfoVisible,
  audioFichaJugadaRef,
  estadoMesaClienteRef,
}: UseDominoRondaProps): UseDominoRondaReturn => {

  const [tiempoTurnoRestante, setTiempoTurnoRestante] = useState<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [duracionTurnoActualConfigurada, setDuracionTurnoActualConfigurada] = useState<number>(DURACION_TURNO_SEGUNDOS_DEFAULT);
  const [autoPaseInfoCliente, setAutoPaseInfoCliente] = useState<EstadoRondaPublicoCliente['autoPaseInfo'] | null>(null);
  const [isMyTurnTimerJustExpired, setIsMyTurnTimerJustExpired] = useState(false);
  const [fichaAnimandose, setFichaAnimandose] = useState<{ id: string; jugadorIdOrigen: string; } | null>(null);
  const prevIdUltimaFichaJugadaRef = useRef<string | null | undefined>(null);

  const rondaActual = estadoMesaCliente?.partidaActual?.rondaActual;

  // Derived states
  const esMiTurno = !!(rondaActual && rondaActual.currentPlayerId === miIdJugadorSocket && !finRondaInfoVisible);
  const rondaEnProgreso = !!(rondaActual && rondaActual.estadoActual !== 'terminada' && !finRondaInfoVisible);
  const isAutoPasoForMe = !!(autoPaseInfoCliente && autoPaseInfoCliente.jugadorId === miIdJugadorSocket);

  const limpiarIntervaloTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  // Effect para sincronizar isMyTurnTimerJustExpired con el cambio de turno
  useEffect(() => {
    const currentPlayerIdRonda = rondaActual?.currentPlayerId;
    if (currentPlayerIdRonda !== miIdJugadorSocketRef.current) {
      setIsMyTurnTimerJustExpired(false);
    }
  }, [rondaActual?.currentPlayerId, miIdJugadorSocketRef]); // Depende del ID del jugador actual en la ronda y la ref local

  // Effect para manejar el timer del turno
  useEffect(() => {
    // Limpiar cualquier timer previo al inicio del efecto
    limpiarIntervaloTimer();

    if (!rondaActual || rondaActual.estadoActual !== 'enProgreso' || finRondaInfoVisible) {
      setTiempoTurnoRestante(null);
      return;
    }

    // Actualizar duración configurada si el servidor la envía y es diferente
    if (rondaActual.duracionTurnoActual && rondaActual.duracionTurnoActual !== duracionTurnoActualConfigurada) {
      setDuracionTurnoActualConfigurada(rondaActual.duracionTurnoActual);
    }

    // Iniciar timer solo si es un turno activo (no auto-pase)
    if (rondaActual.currentPlayerId && rondaActual.timestampTurnoInicio &&
        (!rondaActual.autoPaseInfo || rondaActual.autoPaseInfo.jugadorId !== rondaActual.currentPlayerId)) {

      const tiempoTranscurridoSegundos = Math.floor((Date.now() - rondaActual.timestampTurnoInicio) / 1000);
      // Usar duracionTurnoActualConfigurada que ya tiene el valor del servidor o el default
      const restanteCalculado = Math.max(0, duracionTurnoActualConfigurada - tiempoTranscurridoSegundos);
      setTiempoTurnoRestante(restanteCalculado);

      if (restanteCalculado > 0) {
        timerIntervalRef.current = setInterval(() => {
          setTiempoTurnoRestante(prevTiempo => {
            if (prevTiempo === null || prevTiempo <= 1) {
              limpiarIntervaloTimer(); // Limpia este intervalo específico
              // Si el timer llega a 0 y es mi turno, marcar como expirado
              // Usar la ref para obtener el estado más actual de la ronda dentro del callback del intervalo
              const currentRondaInInterval = estadoMesaClienteRef.current?.partidaActual?.rondaActual;
              if (currentRondaInInterval?.currentPlayerId === miIdJugadorSocketRef.current) {
                  setIsMyTurnTimerJustExpired(true);
              }
              return 0;
            }
            return prevTiempo - 1;
          });
        }, 1000);
      } else {
          // Si el tiempo ya expiró al recibir el estado
          if (rondaActual.currentPlayerId === miIdJugadorSocketRef.current) {
              // No es necesario llamar a setIsMyTurnTimerJustExpired aquí si ya se maneja con prevTiempo <=1
              // o si el estado inicial ya lo refleja. Pero si es necesario, asegurarse que no cause bucles.
              // Nota: setManoVersion ya no está aquí
          }
      }
    } else {
      setTiempoTurnoRestante(null); // No active turn or auto-pass message showing
    }

    // Cleanup function for the effect
    return () => {
      limpiarIntervaloTimer();
    };

  }, [
    rondaActual, // Añadido: el objeto completo como dependencia
    finRondaInfoVisible,
    miIdJugadorSocketRef,
    limpiarIntervaloTimer, // Dependencia del useCallback
    duracionTurnoActualConfigurada, // Necesaria porque se usa en cálculos y se actualiza
    estadoMesaClienteRef, // Necesaria por su uso en el intervalo
  ]);

  // Effect para manejar autoPaseInfoCliente
  useEffect(() => {
    setAutoPaseInfoCliente(rondaActual?.autoPaseInfo || null);
  }, [rondaActual?.autoPaseInfo]);

  // Effect para manejar animación de ficha y sonido
  useEffect(() => {
    const idActualUltimaFicha = rondaActual?.idUltimaFichaJugada;
    const idJugadorUltimaAccion = rondaActual?.idJugadorQueRealizoUltimaAccion;
    const estadoActualRonda = rondaActual?.estadoActual; // Cache para estabilidad y legibilidad

    // Lógica de animación (solo durante juego activo y si no es mi jugada)
    const debeAnimar = 
        estadoActualRonda === 'enProgreso' &&
        idActualUltimaFicha &&
        idJugadorUltimaAccion &&
        idJugadorUltimaAccion !== miIdJugadorSocketRef.current &&
        !finRondaInfoVisible;

    if (debeAnimar) {
      setFichaAnimandose({
        id: idActualUltimaFicha!, // Known to be defined due to debeAnimar check
        jugadorIdOrigen: idJugadorUltimaAccion! // Known to be defined
      });
      // Limpiar animación después de un tiempo
      const animationTimer = setTimeout(() => {
        setFichaAnimandose(null);
      }, 700);
      return () => clearTimeout(animationTimer); // Cleanup for this specific timer if the effect re-runs
    } else {
      // Si las condiciones para animar no se cumplen, asegurarse de que no haya animación activa.
      setFichaAnimandose(null); // Si ya era null, React lo maneja eficientemente.
    }

    // Lógica para reproducir sonido de ficha jugada (solo durante juego activo)
    if (estadoActualRonda === 'enProgreso') {
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

  }, [
    rondaActual?.idUltimaFichaJugada,
    rondaActual?.idJugadorQueRealizoUltimaAccion,
    rondaActual?.estadoActual,
    miIdJugadorSocketRef,
    finRondaInfoVisible,
    audioFichaJugadaRef,
    // fichaAnimandose // <-- REMOVED: This was causing the infinite loop
  ]);

  // Función para obtener las coordenadas en pantalla de un extremo de ficha en la mesa
  const getScreenCoordinatesOfConnectingEdge = useCallback((
    fichaPos: { fila: number; columna: number },
    fichaRot: number,
  ): { x: number; y: number } | null => {
    const currentEstado = estadoMesaClienteRef.current; // Usar ref para estado más actual
    const currentRonda = currentEstado?.partidaActual?.rondaActual;

    if (!mesaRef.current || !currentRonda?.infoExtremos?.izquierda?.pos || !currentRonda?.infoExtremos?.derecha?.pos) return null;

    // Usar las fichas actuales de la mesa para el cálculo
    const currentAncla = currentRonda.anclaFicha;
    const currentIzquierda = currentRonda.fichasIzquierda;
    const currentDerecha = currentRonda.fichasDerecha;

    // Llamar a la función de utilidad importada
    const designCoords = getDesignCanvasCoordinates(
      fichaPos,
      currentAncla,
      currentIzquierda,
      currentDerecha
    );
    if (!designCoords) return null;

    let designEdgeX = designCoords.x;
    let designEdgeY = designCoords.y;

    //const esVertical = Math.abs(fichaRot % 180) === 0;
    // Determinar si la posición de la ficha corresponde al extremo lógico izquierdo o derecho
    // Esto es crucial para saber hacia dónde "sobresale" el punto de conexión
    const esExtremoIzquierdoLogico = currentRonda.infoExtremos.izquierda.pos.fila === fichaPos.fila && currentRonda.infoExtremos.izquierda.pos.columna === fichaPos.columna;

    // Ajustar la posición del punto de conexión según la orientación y el extremo lógico
    // El punto de conexión está en el centro del lado corto de la ficha.
    // Si es vertical (rot 0 o 180), el lado corto es horizontal. El ajuste es en Y.
    // Si es horizontal (rot 90 o 270), el lado corto es vertical. El ajuste es en X.
    // La dirección del ajuste depende de si es el extremo izquierdo o derecho lógico.
    // Si es el extremo izquierdo lógico, el punto de conexión está hacia el "inicio" de la cadena.
    // Si es el extremo derecho lógico, el punto de conexión está hacia el "fin" de la cadena.
    // En el sistema de coordenadas de diseño, el origen (0,0) está en la esquina superior izquierda.
    // Fichas verticales (rot 0/180): El lado corto está arriba/abajo.
    //   Extremo izquierdo lógico (normalmente arriba): Ajuste hacia arriba (Y negativa).
    //   Extremo derecho lógico (normalmente abajo): Ajuste hacia abajo (Y positiva).
    // Fichas horizontales (rot 90/270): El lado corto está izquierda/derecha.
    //   Extremo izquierdo lógico (normalmente izquierda): Ajuste hacia izquierda (X negativa).
    //   Extremo derecho lógico (normalmente derecha): Ajuste hacia derecha (X positiva).

    // La rotación 0 es vertical, 90 horizontal, 180 vertical, 270 horizontal.
    // La función getDesignCanvasCoordinates ya devuelve el centro de la ficha.
    // Necesitamos movernos medio ancho de ficha en la dirección del lado corto.
    // El lado corto tiene la dimensión DOMINO_HEIGHT_PX.
    const halfShortSide = DOMINO_HEIGHT_PX / 2; // Medio ancho de la ficha

    // Determinar la dirección del ajuste basado en la rotación y si es el extremo izquierdo/derecho lógico
    // Rotación 0 (Vertical): Extremo izquierdo lógico (arriba) -> -Y; Extremo derecho lógico (abajo) -> +Y
    // Rotación 90 (Horizontal): Extremo izquierdo lógico (izquierda) -> -X; Extremo derecho lógico (derecha) -> +X
    // Rotación 180 (Vertical): Extremo izquierdo lógico (abajo) -> +Y; Extremo derecho lógico (arriba) -> -Y
    // Rotación 270 (Horizontal): Extremo izquierdo lógico (derecha) -> +X; Extremo derecho lógico (izquierda) -> -X

    // Simplificando:
    // Si es vertical (0, 180): Ajuste en Y. Dirección: -1 si es extremo izquierdo lógico y rot 0, o extremo derecho lógico y rot 180. +1 en otros casos.
    // Si es horizontal (90, 270): Ajuste en X. Dirección: -1 si es extremo izquierdo lógico y rot 90, o extremo derecho lógico y rot 270. +1 en otros casos.

    const rotNormalizada = fichaRot % 360;

    if (rotNormalizada === 0) { // Vertical, arriba es extremo izquierdo lógico
        designEdgeY += (esExtremoIzquierdoLogico ? -1 : 1) * halfShortSide;
    } else if (rotNormalizada === 180) { // Vertical, abajo es extremo izquierdo lógico
         designEdgeY += (esExtremoIzquierdoLogico ? 1 : -1) * halfShortSide;
    } else if (rotNormalizada === 90) { // Horizontal, izquierda es extremo izquierdo lógico
         designEdgeX += (esExtremoIzquierdoLogico ? -1 : 1) * halfShortSide;
    } else if (rotNormalizada === 270) { // Horizontal, derecha es extremo izquierdo lógico
         designEdgeX += (esExtremoIzquierdoLogico ? 1 : -1) * halfShortSide;
    }

    const mesaRect = mesaRef.current.getBoundingClientRect();
    const screenX = (designEdgeX * mesaDims.scale + mesaDims.translateX) + mesaRect.left;
    const screenY = (designEdgeY * mesaDims.scale + mesaDims.translateY) + mesaRect.top;

    return { x: screenX, y: screenY };
  }, [mesaDims, mesaRef, estadoMesaClienteRef]); // Depende de las dimensiones/escala de la mesa y la ref del estado

  // Función para enviar la jugada al servidor
  const handleJugarFichaServidor = useCallback((extremoElegidoParam: 'izquierda' | 'derecha', fichaIdParam?: string) => {
    const currentEstado = estadoMesaClienteRef.current; // Usar ref
    const currentRonda = currentEstado?.partidaActual?.rondaActual; // Usar ref
    const jugadorIdLocal = miIdJugadorSocketRef.current; // Usar ref

    if (!socket || finRondaInfoVisible || !currentRonda || currentRonda.estadoActual === 'terminada' || !jugadorIdLocal) {
        console.warn('[handleJugarFichaServidor] No se puede jugar: socket no listo, fin de ronda visible, no hay ronda activa, o falta jugadorId.');
        return;
    }

    // Validaciones de turno y estado local
    if (isMyTurnTimerJustExpired && currentRonda.currentPlayerId === jugadorIdLocal) {
        console.warn('[handleJugarFichaServidor] No se puede jugar: el tiempo de tu turno ha expirado.');
        return;
    }
    if (currentRonda.currentPlayerId !== jugadorIdLocal) {
        console.warn('[handleJugarFichaServidor] No se puede jugar: no es tu turno.');
        return;
    }
    if (autoPaseInfoCliente && autoPaseInfoCliente.jugadorId === jugadorIdLocal) {
         console.warn('[handleJugarFichaServidor] No se puede jugar: estás en auto-pase.');
         return;
    }

    // Limpiar estados locales relacionados con el turno/jugada
    limpiarIntervaloTimer();
    setTiempoTurnoRestante(null);
    setPlayableFichaIdsStore([]); // Limpiar fichas jugables localmente de inmediato usando el store
    clearFichaSelection(); // Limpiar selección local de ficha

    const idFichaAJugar = fichaIdParam; // fichaIdParam viene de handleFichaDragEnd
    if (!idFichaAJugar) {
        console.error('[handleJugarFichaServidor] No se proporcionó ID de ficha para jugar.');
        return;
    }

    // Encontrar la ficha en la mano del jugador local (usando el estado del store)
    const manoLocal = manosJugadores.find(m => m.idJugador === jugadorIdLocal);
    const fichaParaJugar = manoLocal?.fichas.find(f => f.id === idFichaAJugar);

    if (!fichaParaJugar) {
        console.error(`[handleJugarFichaServidor] Ficha con ID ${idFichaAJugar} no encontrada en la mano local.`);
        return;
    }

    // Validar jugada en el cliente (aunque el servidor hará la validación final)
    if (currentRonda.anclaFicha) {
        const valorExtremoNumerico = extremoElegidoParam === 'izquierda' ? currentRonda.extremos.izquierda : currentRonda.extremos.derecha;
        if (valorExtremoNumerico === null) {
            console.warn(`[handleJugarFichaServidor] Extremo ${extremoElegidoParam} no tiene un valor numérico válido.`);
            return;
        }
        const jugadaDeterminada = determinarJugadaCliente(fichaParaJugar, valorExtremoNumerico);
        if (!jugadaDeterminada.puedeJugar) {
            console.warn(`[handleJugarFichaServidor] La ficha ${fichaParaJugar.valorSuperior}-${fichaParaJugar.valorInferior} no se puede jugar en el extremo ${extremoElegidoParam} (valor ${valorExtremoNumerico}).`);
            return;
        }
    } else {
        // Si no hay ancla, cualquier ficha se puede jugar en cualquier extremo (normalmente solo 'derecha' se usa para la primera ficha)
        // No se necesita validación adicional aquí, el servidor validará si es la primera jugada.
    }

    console.log(`[handleJugarFichaServidor] Emitiendo 'cliente:jugarFicha' - fichaId: ${idFichaAJugar}, extremo: ${extremoElegidoParam}, rondaId: ${currentRonda.rondaId}`);
    emitEvent('cliente:jugarFicha', {
        rondaId: currentRonda.rondaId,
        fichaId: idFichaAJugar,
        extremoElegido: extremoElegidoParam
    });

  }, [
    socket,
    emitEvent,
    finRondaInfoVisible,
    isMyTurnTimerJustExpired,
    autoPaseInfoCliente,
    limpiarIntervaloTimer,
    setTiempoTurnoRestante,
    setPlayableFichaIdsStore,
    clearFichaSelection,
    manosJugadores, // Depende de la mano para encontrar la ficha
    miIdJugadorSocketRef, // Depende de la ref del ID local
    estadoMesaClienteRef, // Depende de la ref del estado global para acceder a la ronda
  ]);

  // Función para manejar el final del arrastre de una ficha
  const handleFichaDragEnd = useCallback((
    fichaId: string,
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const currentEstado = estadoMesaClienteRef.current; 
    const currentRonda = currentEstado?.partidaActual?.rondaActual; // Usar ref
    const jugadorIdLocal = miIdJugadorSocketRef.current; // Usar ref

    // No permitir arrastrar si no es tu turno, si el timer expiró, si fin de ronda es visible, o si estás en auto-pase
    if (!currentRonda || currentRonda.currentPlayerId !== jugadorIdLocal ||
        isMyTurnTimerJustExpired || finRondaInfoVisible ||
        (autoPaseInfoCliente && autoPaseInfoCliente.jugadorId === jugadorIdLocal)) {
        console.log('[handleFichaDragEnd] Drag end ignorado: No es tu turno, timer expirado, fin de ronda visible, o auto-pase.');
        return;
    }
    
    // Log inicial con offset y point
    console.log(`[DEBUG_DRAG_END] FichaId: ${fichaId}, Offset: {x: ${info.offset.x.toFixed(2)}, y: ${info.offset.y.toFixed(2)}}, Point: {x: ${info.point.x.toFixed(2)}, y: ${info.point.y.toFixed(2)}}`);

    // Si tienes un DRAG_THRESHOLD para info.offset, asegúrate que esté aquí y loguea si se pasa o no.
    const DRAG_OFFSET_THRESHOLD = 10; // O el valor que estés usando
    if (Math.abs(info.offset.x) < DRAG_OFFSET_THRESHOLD && Math.abs(info.offset.y) < DRAG_OFFSET_THRESHOLD) {
      console.warn(`[DEBUG_DRAG_END] Offset por debajo del umbral (${DRAG_OFFSET_THRESHOLD}px). Retornando.`);
      return;
    }

    // Lógica especial para la primera ficha (cuando no hay ancla)
    if (!currentRonda.anclaFicha && (currentRonda.fichasIzquierda?.length === 0) && (currentRonda.fichasDerecha?.length === 0)) {
      if (mesaRef.current) {
        const mesaRect = mesaRef.current.getBoundingClientRect();
        // Si la ficha se soltó sobre la mesa, intentar jugar en el extremo 'derecha' (convención para la primera ficha)
        if (info.point.x >= mesaRect.left && info.point.x <= mesaRect.right &&
            info.point.y >= mesaRect.top && info.point.y <= mesaRect.bottom) {
          console.log('[handleFichaDragEnd] Primera ficha soltada sobre la mesa. Intentando jugar en extremo "derecha".');
          // Usar setTimeout para permitir que el estado de la ficha arrastrada se resetee visualmente
          setTimeout(() => handleJugarFichaServidor('derecha', fichaId), 50);
        }
      }
      return;
    }

    // Lógica para fichas subsiguientes (cuando ya hay ancla)
    let extremoDetectado: 'izquierda' | 'derecha' | null = null;
    const dropX = info.point.x;
    const dropY = info.point.y;
    // Umbral de distancia para considerar un drop válido cerca de un extremo
    const umbralDeDrop = DOMINO_HEIGHT_PX * mesaDims.scale * 2.5; // Ajustar según sea necesario

    console.log(`[DEBUG_DRAG_END] umbralDeDrop: ${umbralDeDrop.toFixed(2)}, mesaDims.scale: ${mesaDims.scale.toFixed(2)}`);

    let distIzquierdo = Infinity;
    let puntoConexionIzquierdoScreen: { x: number; y: number } | null = null;
    if (currentRonda.infoExtremos?.izquierda?.pos) {
      puntoConexionIzquierdoScreen = getScreenCoordinatesOfConnectingEdge(
        currentRonda.infoExtremos.izquierda.pos,
        currentRonda.infoExtremos.izquierda.rot,
      );
      if (puntoConexionIzquierdoScreen) {
        distIzquierdo = Math.sqrt(Math.pow(dropX - puntoConexionIzquierdoScreen.x, 2) + Math.pow(dropY - puntoConexionIzquierdoScreen.y, 2));
      }
    }
    console.log(`[DEBUG_DRAG_END] Izquierdo: puntoConexion=${puntoConexionIzquierdoScreen ? `{x: ${puntoConexionIzquierdoScreen.x.toFixed(2)}, y: ${puntoConexionIzquierdoScreen.y.toFixed(2)}}` : 'null'}, dist=${distIzquierdo.toFixed(2)}`);

    let distDerecho = Infinity;
    let puntoConexionDerechoScreen: { x: number; y: number } | null = null;
    if (currentRonda.infoExtremos?.derecha?.pos) {
      puntoConexionDerechoScreen = getScreenCoordinatesOfConnectingEdge(
        currentRonda.infoExtremos.derecha.pos,
        currentRonda.infoExtremos.derecha.rot,
      );
      if (puntoConexionDerechoScreen) {
        distDerecho = Math.sqrt(Math.pow(dropX - puntoConexionDerechoScreen.x, 2) + Math.pow(dropY - puntoConexionDerechoScreen.y, 2));
      }
    }
    console.log(`[DEBUG_DRAG_END] Derecho: puntoConexion=${puntoConexionDerechoScreen ? `{x: ${puntoConexionDerechoScreen.x.toFixed(2)}, y: ${puntoConexionDerechoScreen.y.toFixed(2)}}` : 'null'}, dist=${distDerecho.toFixed(2)}`);


    // Determinar si el drop está lo suficientemente cerca de un extremo y cuál es el más cercano
    if (distIzquierdo < umbralDeDrop && distIzquierdo <= distDerecho) {
      extremoDetectado = 'izquierda';
    } else if (distDerecho < umbralDeDrop) {
      extremoDetectado = 'derecha';
    }

    if (extremoDetectado) {
      console.log(`[handleFichaDragEnd] Ficha soltada cerca del extremo "${extremoDetectado}". Intentando jugar.`);
       // Usar setTimeout para permitir que el estado de la ficha arrastrada se resetee visualmente
      setTimeout(() => handleJugarFichaServidor(extremoDetectado!, fichaId), 50);
    } else {
        console.warn('[handleFichaDragEnd] Ficha soltada, pero no cerca de un extremo válido. (distIzquierdo >= umbralDeDrop || distDerecho >= umbralDeDrop || no es el más cercano)');
        // Si no se detectó un extremo válido, la ficha volverá a su posición original en la mano
        // gracias a la lógica de framer-motion y el hook de mano.
    }
  }, [
    mesaRef,
    mesaDims,
    getScreenCoordinatesOfConnectingEdge, // Dependencia del useCallback
    handleJugarFichaServidor, // Dependencia del useCallback
    isMyTurnTimerJustExpired,
    finRondaInfoVisible,
    autoPaseInfoCliente,
    miIdJugadorSocketRef, // Depende de la ref del ID local
    estadoMesaClienteRef, // Depende de la ref del estado global para acceder a la ronda
  ]);

  return {
    tiempoTurnoRestante,
    duracionTurnoActualConfigurada,
    autoPaseInfoCliente,
    isMyTurnTimerJustExpired,
    fichaAnimandose,
    handleFichaDragEnd,
    handleJugarFichaServidor,
    getScreenCoordinatesOfConnectingEdge,
    esMiTurno,
    rondaEnProgreso,
    isAutoPasoForMe,
  };
};