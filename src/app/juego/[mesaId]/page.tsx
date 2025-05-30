// /home/heagueron/jmu/dominando/src/app/juego/[mesaId]/page.tsx
'use client';

import { PanInfo } from 'framer-motion';
import { motion } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import { useParams, useRouter } from 'next/navigation';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import MesaDomino from '@/components/domino/MesaDomino';
import ManoJugadorComponent from '@/components/domino/ManoJugador';
import {
 FichaDomino,
 FichaEnMesaParaLogica,
} from '@/utils/dominoUtils';

import { DESIGN_TABLE_WIDTH_PX, DESIGN_TABLE_HEIGHT_PX, DOMINO_WIDTH_PX, DOMINO_HEIGHT_PX } from '@/utils/dominoConstants';
import {
  FILA_ANCLA_INICIAL,
  COLUMNA_ANCLA_INICIAL
} from '@/utils/posicionamientoUtils';
import DebugInfoOverlay from '@/components/debug/DebugInfoOverlay';
import ContenedorInfoJugador from '@/components/jugador/ContenedorInfoJugador';

// Tipos para el estado del cliente
interface JugadorCliente {
  idJugador: string;
  nombre?: string;
  fichas: FichaDomino[];
  numFichas?: number;
  estaConectado?: boolean;
  ordenTurno?: number;
}

interface FichaSeleccionadaInfo {
  idFicha: string;
  idJugadorMano: string;
}

const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:3001';
const DURACION_TURNO_SEGUNDOS = 15;

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

interface EstadoRondaPublicoCliente {
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

interface EstadoMesaPublicoCliente {
  mesaId: string;
  jugadores: JugadorPublicoInfoCliente[];
  configuracionJuego: {
    tipoJuego: TipoJuegoSolicitado;
    maxJugadores: number;
    fichasPorJugadorOriginal: number;
    duracionTurnoSegundos: number;
  };
  partidaActualId: string | null;
  estadoGeneralMesa: 'esperandoJugadores' | 'partidaEnProgreso' | 'esperandoParaSiguientePartida' | 'configurandoNuevaPartida';
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

interface FinDeRondaPayloadCliente {
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
}

interface FinDePartidaPayloadCliente {
  partidaId: string;
  mesaId: string;
  ganadorPartidaId?: string;
  puntuacionesFinalesPartida: { jugadorId: string, puntos: number }[];
}


export default function JuegoPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [estadoMesaCliente, setEstadoMesaCliente] = useState<EstadoMesaPublicoCliente | null>(null);
  const miIdJugadorSocketRef = useRef<string | null>(null);
  const [miIdJugadorSocket, setMiIdJugadorSocket] = useState<string | null>(null);

  const [manosJugadores, setManosJugadores] = useState<JugadorCliente[]>([]);
  const [anclaFicha, setAnclaFicha] = useState<FichaEnMesaParaLogica | null>(null);
  const [fichasIzquierda, setFichasIzquierda] = useState<FichaEnMesaParaLogica[]>([]);
  const [fichasDerecha, setFichasDerecha] = useState<FichaEnMesaParaLogica[]>([]);
  const [extremos, setExtremos] = useState<{ izquierda: number | null, derecha: number | null }>({ izquierda: null, derecha: null });
  const [infoExtremos, setInfoExtremos] = useState<any>({ izquierda: null, derecha: null });

  const [fichaSeleccionada, setFichaSeleccionada] = useState<FichaSeleccionadaInfo | undefined>();
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
  const [manoVersion, setManoVersion] = useState(0);
  const [manosAlFinalizarRonda, setManosAlFinalizarRonda] = useState<Array<{ jugadorId: string; fichas: FichaDomino[] }> | null>(null);
  const [fichaAnimandose, setFichaAnimandose] = useState<{ id: string; jugadorIdOrigen: string; } | null>(null);

  const mesaRef = useRef<HTMLDivElement>(null);
  const params = useParams();
  const router = useRouter();
  const mesaIdFromUrl = params.mesaId as string;
  const authoritativeMesaIdRef = useRef<string>(mesaIdFromUrl);

  const limpiarIntervaloTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

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
    console.log(`[FICHA_SELECCIONADA_STATE_EFFECT_DEBUG] fichaSeleccionada state changed to: ${JSON.stringify(fichaSeleccionada)}`);
  }, [fichaSeleccionada]);


  // useEffect para la conexión del socket y listeners principales
  useEffect(() => {
    console.log('[JUEGO_PAGE_EFFECT_SOCKET_INIT] Entrando. mesaIdFromUrl:', mesaIdFromUrl);
    if (!mesaIdFromUrl || typeof mesaIdFromUrl !== 'string' || mesaIdFromUrl.trim() === '') { // Condición para mesaIdFromUrl
      console.error("[JUEGO_PAGE_EFFECT_SOCKET_INIT] No se encontró mesaId válido en la URL. Redirigiendo al lobby. mesaIdFromUrl:", mesaIdFromUrl);
      router.push('/lobby');
      return;
    }

    console.log('[JUEGO_PAGE_EFFECT_SOCKET_INIT] Intentando leer de sessionStorage.');
    const userIdFromStorage = sessionStorage.getItem('jmu_userId');
    
    const nombreJugadorFromStorage = sessionStorage.getItem('jmu_nombreJugador');  
    const tipoJuegoSolicitado = sessionStorage.getItem('jmu_tipoJuegoSolicitado') as TipoJuegoSolicitado | null;
    
    let finalUserId: string | null = null;
    let finalNombreJugador: string | null = null;

    // Intentar leer de query params primero
    const queryParams = new URLSearchParams(window.location.search);
    const uidFromQuery = queryParams.get('uid');
    const nombreFromQuery = queryParams.get('nombre');

    if (uidFromQuery && nombreFromQuery) {
      console.log('[JUEGO_PAGE_EFFECT_SOCKET_INIT] Leído de Query Params - userId:', uidFromQuery, 'nombreJugador:', nombreFromQuery);
      finalUserId = uidFromQuery;
      finalNombreJugador = nombreFromQuery;
      // Guardar en sessionStorage si se obtuvieron de query params, para persistencia en recargas
      sessionStorage.setItem('jmu_userId', finalUserId);
      sessionStorage.setItem('jmu_nombreJugador', finalNombreJugador);
      console.log('[JUEGO_PAGE_EFFECT_SOCKET_INIT] Guardado en sessionStorage desde Query Params.');
    } else {
      console.log('[JUEGO_PAGE_EFFECT_SOCKET_INIT] No se encontraron datos en Query Params, intentando sessionStorage.');
      finalUserId = userIdFromStorage;
      finalNombreJugador = nombreJugadorFromStorage;
    }
     console.log('[JUEGO_PAGE_EFFECT_SOCKET_INIT] Valores finales para conexión - userId:', finalUserId, 'nombreJugador:', finalNombreJugador);

    if (!finalUserId || !finalNombreJugador) {
      console.error("Error: Falta información del jugador (después de query y sessionStorage). Redirigiendo al lobby.");
      router.push('/lobby');
      return;
    }



    const newSocket = io(SOCKET_SERVER_URL, {
      auth: {
        userId: finalUserId, 
        nombreJugador: finalNombreJugador,
      },
      transports: ['websocket'],
    });
    setSocket(newSocket);
    console.log('[JUEGO_PAGE_EFFECT_SOCKET_INIT] Socket instance created.');

    newSocket.on('connect', () => {
      console.log('[SOCKET] Conectado al servidor:', newSocket.id, 'para mesaId:', mesaIdFromUrl);
      newSocket.emit('cliente:unirseAMesa', {
        juegoSolicitado: tipoJuegoSolicitado,
        nombreJugador: finalNombreJugador, 
        mesaId: mesaIdFromUrl // mesaIdFromUrl ya está validado arriba
      });
    });

    newSocket.on('disconnect', (reason) => console.log('[SOCKET] Desconectado del servidor:', reason));
    newSocket.on('connect_error', (err) => console.error('[SOCKET] Error de conexión:', err.message, err));

    newSocket.on('servidor:teUnisteAMesa', (payload: TeUnisteAMesaPayloadCliente) => {
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

      // ¡NUEVO! Notificar al servidor que este cliente está listo para recibir su mano/iniciar juego.
      if (newSocket.connected && payload.tuJugadorIdEnPartida && authoritativeMesaIdRef.current) {
        console.log(`[SOCKET] Cliente ${payload.tuJugadorIdEnPartida} procesó 'teUnisteAMesa'. Emitiendo 'cliente:listoParaMano' para mesa ${authoritativeMesaIdRef.current}`);
        newSocket.emit('cliente:listoParaMano', { 
          mesaId: authoritativeMesaIdRef.current,
          jugadorId: payload.tuJugadorIdEnPartida 
        });
      } else {
        console.warn('[SOCKET] No se pudo emitir cliente:listoParaMano. Socket no conectado o falta información crítica.', {
          connected: newSocket.connected,
          jugadorId: payload.tuJugadorIdEnPartida,
          mesaId: authoritativeMesaIdRef.current
        });
      }
    });

    newSocket.on('servidor:estadoMesaActualizado', (payload: { estadoMesa: EstadoMesaPublicoCliente }) => {
      console.log('[SOCKET] Evento servidor:estadoMesaActualizado recibido para mesaId:', payload.estadoMesa.mesaId);
      setEstadoMesaCliente(payload.estadoMesa);
    });

    newSocket.on('servidor:tuMano', (payload: TuManoPayloadCliente) => {
      console.log(`[SOCKET] Evento servidor:tuMano recibido. Payload:`, payload);
      if (miIdJugadorSocketRef.current) {
        const jugadorIdLocal = miIdJugadorSocketRef.current;
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
            // Player does not exist in manosJugadores yet
            // Add them with their new hand.
            const jugadorInfoGeneral = estadoMesaCliente?.jugadores.find(j => j.id === jugadorIdLocal);
            console.log(`[servidor:tuMano] Jugador local ${jugadorIdLocal} no encontrado en prevManos o sin fichas. Añadiendo/Actualizando con mano nueva.`);
            const nuevoJugador: JugadorCliente = {
              idJugador: jugadorIdLocal!, 
              nombre: jugadorInfoGeneral?.nombre || 'Yo', // Get name from estadoMesaCliente if possible
              fichas: payload.fichas, // Esta es la fuente de verdad para las fichas locales
              numFichas: payload.fichas.length,
              estaConectado: jugadorInfoGeneral?.estaConectado ?? true,
              ordenTurno: jugadorInfoGeneral?.ordenTurnoEnRondaActual
            };
            return [
              ...prevManos,
              nuevoJugador
            ];
          }
        });
      }
    });

    newSocket.on('servidor:tuManoActualizada', (payload: TuManoPayloadCliente) => {
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
    });
    
    newSocket.on('servidor:tuTurno', (payload: TuTurnoPayloadCliente) => {
      console.log('[SOCKET] Evento servidor:tuTurno recibido:', payload);
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
    });

    newSocket.on('servidor:finDeRonda', (payload: FinDeRondaPayloadCliente) => {
      console.log('[SOCKET] Evento servidor:finDeRonda recibido:', payload);
      setPlayableFichaIds([]);
      setFichaSeleccionada(undefined);
      limpiarIntervaloTimer();
      setAutoPaseInfoCliente(null);
      setIsMyTurnTimerJustExpired(false);
      setManoVersion(prev => prev + 1);
      setManosAlFinalizarRonda(payload.manosFinales || null);
    });

    newSocket.on('servidor:finDePartida', (payload: FinDePartidaPayloadCliente) => {
      console.log('[SOCKET] Evento servidor:finDePartida recibido:', payload);
      setResultadoRonda(null);
    });

    newSocket.on('servidor:errorDePartida', (payload: { mensaje: string }) => {
      console.error('[SOCKET] Error de partida/mesa:', payload.mensaje);
    });

    return () => {
      console.log('[SOCKET] Desconectando socket de la página de juego...');
      newSocket.disconnect();
      limpiarIntervaloTimer();
      setSocket(null);
    };
  }, [limpiarIntervaloTimer, mesaIdFromUrl, router]);

  // useEffect para actualizar la UI basada en estadoMesaCliente
  useEffect(() => {
    if (!estadoMesaCliente) {
      setAnclaFicha(null);
      setFichasIzquierda([]);
      setFichasDerecha([]);
      setExtremos({ izquierda: null, derecha: null });
      setInfoExtremos({ izquierda: null, derecha: null });
      setAutoPaseInfoCliente(null);
      setResultadoRonda(null);
      return;
    }

    const partidaActual = estadoMesaCliente.partidaActual;
    const rondaActual = partidaActual?.rondaActual;

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

      limpiarIntervaloTimer();
      if (rondaActual.currentPlayerId && rondaActual.duracionTurnoActual && rondaActual.timestampTurnoInicio && 
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
                const currentRondaStateForTimer = estadoMesaCliente?.partidaActual?.rondaActual;
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
        setTiempoTurnoRestante(null);
      }

      if (rondaActual.estadoActual === 'terminada') {
        setResultadoRonda({
          ganadorId: rondaActual.ganadorRondaId,
          nombreGanador: rondaActual.jugadoresRonda.find(j => j.id === rondaActual.ganadorRondaId)?.nombre || 'Desconocido',
          tipoFin: rondaActual.tipoFinRonda || 'domino',
        });
      } else {
        setResultadoRonda(null);
      }

      if (rondaActual.idUltimaFichaJugada && 
          rondaActual.idJugadorQueRealizoUltimaAccion &&
          rondaActual.idJugadorQueRealizoUltimaAccion !== miIdJugadorSocketRef.current) {
        setFichaAnimandose({ 
          id: rondaActual.idUltimaFichaJugada, 
          jugadorIdOrigen: rondaActual.idJugadorQueRealizoUltimaAccion 
        });
        setTimeout(() => setFichaAnimandose(null), 700);
      }

    } else { 
      setAnclaFicha(null);
      setFichasIzquierda([]);
      setFichasDerecha([]);
      setExtremos({ izquierda: null, derecha: null });
      setInfoExtremos({ izquierda: null, derecha: null });
      setAutoPaseInfoCliente(null);
      setResultadoRonda(null);
      limpiarIntervaloTimer();
      setTiempoTurnoRestante(null);
    }
  }, [estadoMesaCliente, limpiarIntervaloTimer]);

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
            // Local player exists: preserve their fichas and numFichas from prevManos.
            console.log(`[MANOS_SYNC_EFFECT_DEBUG] Local player ${jugadorIdLocal} exists in prevManos. Existing numFichas: ${existingPlayer.numFichas}, existing fichas length: ${existingPlayer.fichas?.length}`);
            // Only update other metadata that comes from estadoMesaCliente.
            updatedPlayer = {
              ...existingPlayer, // Crucially, this preserves existingPlayer.fichas and existingPlayer.numFichas
              nombre: serverPlayerInfo.nombre, // Update from serverPlayerInfo
              estaConectado: serverPlayerInfo.estaConectado, // Update from serverPlayerInfo
              ordenTurno: rondaPlayerInfo?.ordenTurnoEnRondaActual, // Update from rondaPlayerInfo
              // Ensure numFichas is also correctly preserved or derived if fichas are preserved
              numFichas: existingPlayer.fichas.length, // Re-derive from preserved fichas to be safe
            };
          } else {
            // Local player does not exist in prevManos (e.g., initial creation before 'servidor:tuMano')
            console.log(`[MANOS_SYNC_EFFECT_DEBUG] Local player ${jugadorIdLocal} NOT in prevManos. Initializing.`);
            // Initialize with empty fichas. 'servidor:tuMano' will populate them.
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
          // Para jugadores remotos, las fichas son siempre un array vacío en el cliente.
          updatedPlayer = { // Esta lógica para jugadores remotos parece correcta
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
        // For remote players, also check numFichas change
        if (serverPlayerInfo.id !== jugadorIdLocal && existingPlayer && existingPlayer.numFichas !== updatedPlayer.numFichas) {
          hasChanged = true;
        }
        // For local player, if the fichas array reference itself has changed (e.g., due to 'servidor:tuMano' providing a new array)
        // OR if the numFichas (which we now derive from existingPlayer.fichas.length) is different from the old numFichas,
        // it's a change.
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
        console.log('[MANOS_SYNC_EFFECT] Actualizando manosJugadores:', newManosArray.map(p => ({id: p.idJugador, nombre: p.nombre, fichasCliente: p.fichas.length, numFichasServidor: p.numFichas })));
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

  const handleFichaClick = (idFicha: string, idJugadorMano: string) => {
    const rondaActual = estadoMesaCliente?.partidaActual?.rondaActual;
    if (!rondaActual || rondaActual.estadoActual === 'terminada' || resultadoRonda) return;

    if (autoPaseInfoCliente && autoPaseInfoCliente.jugadorId === miIdJugadorSocketRef.current) return;
    if (isMyTurnTimerJustExpired && idJugadorMano === miIdJugadorSocketRef.current) return;
    if (idJugadorMano !== miIdJugadorSocketRef.current || miIdJugadorSocketRef.current !== rondaActual.currentPlayerId) return;
    if (!playableFichaIds.includes(idFicha)) return;
    
    setFichaSeleccionada(prev =>
      (prev && prev.idFicha === idFicha && prev.idJugadorMano === idJugadorMano)
        ? undefined : { idFicha, idJugadorMano }
    );

  };
  
  const determinarJugadaCliente = (ficha: FichaDomino, valorExtremo: number): { puedeJugar: boolean; valorConexion?: number; valorNuevoExtremo?: number } => {
    if (ficha.valorSuperior === valorExtremo) return { puedeJugar: true, valorConexion: ficha.valorSuperior, valorNuevoExtremo: ficha.valorInferior };
    if (ficha.valorInferior === valorExtremo) return { puedeJugar: true, valorConexion: ficha.valorInferior, valorNuevoExtremo: ficha.valorSuperior };
    return { puedeJugar: false };
  };

  const handleJugarFichaServidor = (extremoElegidoParam: 'izquierda' | 'derecha', fichaIdParam?: string) => {
    if (!socket) return;
    const rondaActual = estadoMesaCliente?.partidaActual?.rondaActual;
    if (!rondaActual || rondaActual.estadoActual === 'terminada') return;

    if (isMyTurnTimerJustExpired && rondaActual.currentPlayerId === miIdJugadorSocketRef.current) return;
    if (rondaActual.currentPlayerId !== miIdJugadorSocketRef.current) return;
    if (autoPaseInfoCliente && autoPaseInfoCliente.jugadorId === miIdJugadorSocketRef.current) return;

    limpiarIntervaloTimer();
    setTiempoTurnoRestante(null);

    const idFichaAJugar = fichaIdParam || fichaSeleccionada?.idFicha;
    if (!idFichaAJugar) return;

    const fichaParaJugar = manosJugadores.find(m => m.idJugador === miIdJugadorSocketRef.current)?.fichas.find(f => f.id === idFichaAJugar);
    if (!fichaParaJugar) return;

    if (!rondaActual.anclaFicha) {
      socket.emit('cliente:jugarFicha', { rondaId: rondaActual.rondaId, fichaId: idFichaAJugar, extremoElegido: extremoElegidoParam });
      setFichaSeleccionada(undefined);
      return;
    }

    const valorExtremoNumerico = extremoElegidoParam === 'izquierda' ? rondaActual.extremos.izquierda : rondaActual.extremos.derecha;
    if (valorExtremoNumerico === null) return;
    
    const jugadaDeterminada = determinarJugadaCliente(fichaParaJugar, valorExtremoNumerico);
    if (!jugadaDeterminada.puedeJugar) return;
    
    socket.emit('cliente:jugarFicha', { rondaId: rondaActual.rondaId, fichaId: idFichaAJugar, extremoElegido: extremoElegidoParam });
    setFichaSeleccionada(undefined);
  };

  const handlePasarTurnoServidor = () => {
    if (!socket) return;
    const rondaActual = estadoMesaCliente?.partidaActual?.rondaActual;
    if (!rondaActual || rondaActual.estadoActual === 'terminada' || rondaActual.currentPlayerId !== miIdJugadorSocketRef.current) return;

    if (isMyTurnTimerJustExpired && rondaActual.currentPlayerId === miIdJugadorSocketRef.current) return;
    if (autoPaseInfoCliente && autoPaseInfoCliente.jugadorId === miIdJugadorSocketRef.current) return;
    
    console.log(`[SOCKET] Emitiendo cliente:pasarTurno para ronda ${rondaActual.rondaId}`);
    limpiarIntervaloTimer();
    setTiempoTurnoRestante(null);
    socket.emit('cliente:pasarTurno', { rondaId: rondaActual.rondaId });
  };

  const handleListoParaSiguientePartida = () => {
    if (socket && estadoMesaCliente && estadoMesaCliente.estadoGeneralMesa === 'esperandoParaSiguientePartida') {
      console.log(`[SOCKET] Emitiendo cliente:listoParaSiguientePartida para mesa ${estadoMesaCliente.mesaId}`);
      socket.emit('cliente:listoParaSiguientePartida', { mesaId: estadoMesaCliente.mesaId });
    }
  };

  const rondaActualParaUI = estadoMesaCliente?.partidaActual?.rondaActual;
  const partidaActualParaUI = estadoMesaCliente?.partidaActual;
  const currentPlayerIdRonda = rondaActualParaUI?.currentPlayerId;


  const combinedFichasParaMesa = useMemo(() => {
    if (!rondaActualParaUI) return [];
    return [
      ...(rondaActualParaUI.fichasIzquierda || []).slice().reverse(),
      ...(rondaActualParaUI.anclaFicha ? [rondaActualParaUI.anclaFicha] : []),
      ...(rondaActualParaUI.fichasDerecha || []),
    ];
  }, [rondaActualParaUI]);

  const posicionAnclaFija = useMemo(() => 
    rondaActualParaUI?.anclaFicha ? rondaActualParaUI.anclaFicha.posicionCuadricula : { fila: FILA_ANCLA_INICIAL, columna: COLUMNA_ANCLA_INICIAL }
  , [rondaActualParaUI?.anclaFicha]);

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
      if (targetFichaPos.fila === posicionAnclaFija.fila && targetFichaPos.columna === posicionAnclaFija.columna) {
        return { x: DESIGN_TABLE_WIDTH_PX / 2, y: DESIGN_TABLE_HEIGHT_PX / 2 };
      }
      return null;
    }

    const calculatedPositions: { [key: string]: { x: number; y: number; fichaLogic: FichaEnMesaParaLogica; } } = {};
    const anclaLogicaParaCalculo = currentAnclaFicha || (todasLasFichasEnMesaParaCalculo.length === 1 ? todasLasFichasEnMesaParaCalculo[0] : null);

    if (anclaLogicaParaCalculo) {
      calculatedPositions[`${anclaLogicaParaCalculo.posicionCuadricula.fila},${anclaLogicaParaCalculo.posicionCuadricula.columna}`] = {
        x: DESIGN_TABLE_WIDTH_PX / 2,
        y: DESIGN_TABLE_HEIGHT_PX / 2,
        fichaLogic: anclaLogicaParaCalculo,
      };
    } else {
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
  }, [posicionAnclaFija, anclaFicha, fichasIzquierda, fichasDerecha]);

  const getScreenCoordinatesOfConnectingEdge = useCallback((
    fichaPos: { fila: number; columna: number },
    fichaRot: number,
  ): { x: number; y: number } | null => {
    const currentRonda = estadoMesaCliente?.partidaActual?.rondaActual;
    if (!mesaRef.current || !currentRonda?.infoExtremos?.izquierda || !currentRonda?.infoExtremos?.derecha) return null;

    const designCoords = getDesignCanvasCoordinates(fichaPos, anclaFicha, fichasIzquierda, fichasDerecha);
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
  }, [getDesignCanvasCoordinates, mesaDims, estadoMesaCliente, anclaFicha, fichasIzquierda, fichasDerecha]);

  const handleFichaDragEnd = (
    fichaId: string,
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const currentRonda = estadoMesaCliente?.partidaActual?.rondaActual;
    if (!currentRonda || currentRonda.currentPlayerId !== miIdJugadorSocketRef.current || isMyTurnTimerJustExpired || resultadoRonda || (autoPaseInfoCliente && autoPaseInfoCliente.jugadorId === miIdJugadorSocketRef.current)) {
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
  if (fichaSeleccionada && miIdJugadorSocketRef.current) {
    const manoOrigen = manosJugadores.find(m => m.idJugador === miIdJugadorSocketRef.current);
    if (manoOrigen) {
      console.log('[FICHA_SELECCIONADA_ACTUAL_DEBUG] manoOrigen.fichas:', manoOrigen.fichas.map(f => f.id), 'buscando idFicha:', fichaSeleccionada.idFicha);
      const foundFicha = manoOrigen.fichas.find(f => f.id === fichaSeleccionada.idFicha);
      console.log('[FICHA_SELECCIONADA_ACTUAL_DEBUG] foundFicha:', foundFicha ? foundFicha.id : 'undefined');
      fichaSeleccionadaActual = foundFicha;
    }
  } else {
    fichaSeleccionadaActual = undefined;
  }

  // // DEBUG LOGS PARA BOTONES DE ACCIÓN
  // if (fichaSeleccionadaActual) {
  //   // Este log ya existe y es útil
  //   console.log('[DEBUG_BOTONES] Condiciones para panel:', {
  //     fichaSeleccionadaActual: !!fichaSeleccionadaActual,
  //     fichaSeleccionada: !!fichaSeleccionada,
  //     rondaActualParaUI: !!rondaActualParaUI,
  //     idJugadorManoCorrecto: fichaSeleccionada?.idJugadorMano === rondaActualParaUI?.currentPlayerId,
  //     esMiTurnoSocketId: fichaSeleccionada?.idJugadorMano === miIdJugadorSocketRef.current,
  //     autoPaseOK: !autoPaseInfoCliente || autoPaseInfoCliente.jugadorId !== miIdJugadorSocketRef.current,
  //     timerNoExpirado: !isMyTurnTimerJustExpired,
  //     resultadoRondaNulo: !resultadoRonda,
  //   });
  //   if (rondaActualParaUI?.anclaFicha && fichaSeleccionadaActual && rondaActualParaUI.extremos.izquierda !== null) {
  //     const jugadaIzquierdaDebug = determinarJugadaCliente(fichaSeleccionadaActual, rondaActualParaUI.extremos.izquierda);
  //     console.log('[DEBUG_BOTONES] jugadaIzquierdaDebug:', jugadaIzquierdaDebug);
  //   }
  //   if (rondaActualParaUI?.anclaFicha && fichaSeleccionadaActual && rondaActualParaUI.extremos.derecha !== null) {
  //     const jugadaDerechaDebug = determinarJugadaCliente(fichaSeleccionadaActual, rondaActualParaUI.extremos.derecha);
  //     console.log('[DEBUG_BOTONES] jugadaDerechaDebug:', jugadaDerechaDebug);
  //   }
  // }

  // let puedeJugarIzquierda = false, textoBotonIzquierda = "Punta Izquierda";
  // let puedeJugarDerecha = false, textoBotonDerecha = "Punta Derecha";

  // // Log detallado de las condiciones ANTES del IF principal para los botones
  // console.log('[PRE_IF_BOTONES_DEBUG]', {
  //   is_fichaSeleccionadaActual_defined: !!fichaSeleccionadaActual,
  //   is_fichaSeleccionada_defined: !!fichaSeleccionada,
  //   is_rondaActualParaUI_defined: !!rondaActualParaUI,
  //   is_idJugadorMano_eq_currentPlayerId: fichaSeleccionada?.idJugadorMano === rondaActualParaUI?.currentPlayerId,
  //   currentPlayerId_in_ronda: rondaActualParaUI?.currentPlayerId,
  //   idJugadorMano_in_fichaSeleccionada: fichaSeleccionada?.idJugadorMano,
  //   is_idJugadorMano_eq_miIdSocket: fichaSeleccionada?.idJugadorMano === miIdJugadorSocketRef.current,
  //   miIdSocket: miIdJugadorSocketRef.current,
  //   autoPaseCheck: (!autoPaseInfoCliente || autoPaseInfoCliente.jugadorId !== miIdJugadorSocketRef.current),
  //   isMyTurnTimerJustExpired: isMyTurnTimerJustExpired,
  // });

  // if (fichaSeleccionadaActual && fichaSeleccionada && 
  //     rondaActualParaUI && 
  //     fichaSeleccionada.idJugadorMano === rondaActualParaUI.currentPlayerId && 
  //     fichaSeleccionada.idJugadorMano === miIdJugadorSocketRef.current &&
  //     (!autoPaseInfoCliente || autoPaseInfoCliente.jugadorId !== miIdJugadorSocketRef.current) &&
  //     !isMyTurnTimerJustExpired){
  //       console.log('[DEBUG_BOTONES_PANEL_LOGIC] Condición IF principal para botones es TRUE');
  //   if (!rondaActualParaUI.anclaFicha) {
  //     puedeJugarIzquierda = true;
  //     textoBotonIzquierda = `Jugar ${fichaSeleccionadaActual.valorSuperior}-${fichaSeleccionadaActual.valorInferior}`;
  //     puedeJugarDerecha = false; 
  //   } else {
  //     const extremosRonda = rondaActualParaUI.extremos;
  //     // const esIzquierdaMasCorta = (rondaActualParaUI.fichasIzquierda?.length || 0) <= (rondaActualParaUI.fichasDerecha?.length || 0);

  //     if (extremosRonda.izquierda !== null) {
  //       const jugadaIzquierda = determinarJugadaCliente(fichaSeleccionadaActual, extremosRonda.izquierda);
  //       if (jugadaIzquierda.puedeJugar) {
  //         puedeJugarIzquierda = true;
  //         textoBotonIzquierda = `Punta Izquierda (${extremosRonda.izquierda})`;
  //       }
  //     }
  //     if (extremosRonda.derecha !== null) {
  //       const jugadaDerecha = determinarJugadaCliente(fichaSeleccionadaActual, extremosRonda.derecha);
  //       if (jugadaDerecha.puedeJugar) {
  //         puedeJugarDerecha = true;
  //         textoBotonDerecha = `Punta Derecha (${extremosRonda.derecha})`;
  //       }
  //     }
  //     // Logic for "esIzquierdaMasCorta" (forcing one side if extremes are equal) removed as per user confirmation.
  //   }
  // }
  
  // console.log(`[DEBUG_BOTONES_FINAL] puedeJugarIzquierda: ${puedeJugarIzquierda} textoBotonIzquierda: ${textoBotonIzquierda}`);
  // console.log(`[DEBUG_BOTONES_FINAL] puedeJugarDerecha: ${puedeJugarDerecha} textoBotonDerecha: ${textoBotonDerecha}`);

  const jugadorLocal = manosJugadores.find(m => m.idJugador === miIdJugadorSocketRef.current);
  
  const mostrarBotonPasarManual = rondaActualParaUI && 
                                rondaActualParaUI.currentPlayerId === miIdJugadorSocketRef.current && 
                                rondaActualParaUI.anclaFicha && 
                                playableFichaIds.length === 0 && 
                                (jugadorLocal?.fichas.length ?? 0) > 0 && 
                                (!autoPaseInfoCliente || autoPaseInfoCliente.jugadorId !== miIdJugadorSocketRef.current) &&
                                !isMyTurnTimerJustExpired &&
                                rondaActualParaUI.estadoActual === 'enProgreso' &&
                                !resultadoRonda;
  
  let mano1: JugadorCliente | undefined, mano2: JugadorCliente | undefined, mano3: JugadorCliente | undefined, mano4: JugadorCliente | undefined;
  let pIds1: string[] = []; 

  // Asegurarse de que miIdJugadorSocketRef.current y estadoMesaCliente tengan datos antes de proceder
  if (miIdJugadorSocketRef.current && estadoMesaCliente) {
    const localPlayerId = miIdJugadorSocketRef.current; // Definir localPlayerId aquí para que esté en el ámbito correcto

    if (manosJugadores.length > 0) {
      console.log(`[RENDER_MANOS_VISUAL_DEBUG] Intentando encontrar localPlayerId: "${localPlayerId}"`);
      console.log(`[RENDER_MANOS_VISUAL_DEBUG] En manosJugadores (solo IDs):`, manosJugadores.map(j => j.idJugador));
      manosJugadores.forEach(j => {
        console.log(`[RENDER_MANOS_VISUAL_DEBUG] Comparando "${localPlayerId}" (tipo: ${typeof localPlayerId}) con "${j.idJugador}" (tipo: ${typeof j.idJugador})`);
      });
      const localPlayer = manosJugadores.find(j => j.idJugador === localPlayerId);

      if (localPlayer) {
        mano1 = localPlayer; // El jugador local siempre es mano1 (abajo)

        const numJugadoresEnRonda = estadoMesaCliente.partidaActual?.rondaActual?.jugadoresRonda.length || 0;

        // Intentar ordenar visualmente según el orden de turno si la información está disponible
        if (typeof localPlayer.ordenTurno === 'number' && numJugadoresEnRonda >= 2 && numJugadoresEnRonda <= 4) {
          const ordenLocal = localPlayer.ordenTurno;

          // Calcular el orden de turno objetivo para las otras posiciones visuales
          const targetOrdenMano2 = (ordenLocal + 1) % numJugadoresEnRonda; // Derecha
          const targetOrdenMano3 = (ordenLocal + 2) % numJugadoresEnRonda; // Arriba
          const targetOrdenMano4 = (ordenLocal + 3) % numJugadoresEnRonda; // Izquierda
          
          // Encontrar a los otros jugadores basándose en su ordenTurno calculado
          // Asegurarse de no seleccionar al jugador local nuevamente
          mano2 = manosJugadores.find(j => j.idJugador !== localPlayerId && j.ordenTurno === targetOrdenMano2);
          
          if (numJugadoresEnRonda > 2) { // mano3 solo tiene sentido si hay 3+ jugadores
            mano3 = manosJugadores.find(j => j.idJugador !== localPlayerId && j.ordenTurno === targetOrdenMano3);
          }
          if (numJugadoresEnRonda > 3) { // mano4 solo tiene sentido si hay 4 jugadores
            mano4 = manosJugadores.find(j => j.idJugador !== localPlayerId && j.ordenTurno === targetOrdenMano4);
          }

        } else {
          // Fallback: Si ordenTurno no está disponible o el número de jugadores no es el esperado para la lógica de turnos,
          // ordenar visualmente basándose en el orden del array (después del jugador local).
          console.warn(`[RENDER_MANOS_VISUAL] Usando orden visual de fallback. ordenTurno local: ${localPlayer.ordenTurno}, numJugadoresEnRonda: ${numJugadoresEnRonda}`);
          const otrosJugadores = manosJugadores.filter(j => j.idJugador !== localPlayerId);
          if (otrosJugadores.length >= 1) mano2 = otrosJugadores[0]; // Derecha (o el siguiente en la lista)
          if (otrosJugadores.length >= 2) mano3 = otrosJugadores[1]; // Arriba (o el segundo en la lista)
          if (otrosJugadores.length >= 3) mano4 = otrosJugadores[2]; // Izquierda (o el tercero en la lista)
        }
      } else { // localPlayer no encontrado en manosJugadores
        console.warn(`[RENDER_MANOS_VISUAL] Jugador local ${localPlayerId} no encontrado en manosJugadores para ordenamiento visual.`);
      }
    } else {
      // Este caso es para cuando manosJugadores aún podría estar vacío en un render intermedio
      console.log(`[RENDER_MANOS_VISUAL] manosJugadores está vacío. Esperando que se popule.`);
    }

    // Asignar fichas jugables si es el turno del jugador local
    // localPlayerId está disponible aquí porque se definió al inicio del bloque 'if (miIdJugadorSocketRef.current && estadoMesaCliente)'
    if (mano1 && mano1.idJugador === localPlayerId && rondaActualParaUI && mano1.idJugador === rondaActualParaUI.currentPlayerId) {
      pIds1 = playableFichaIds; 
    }
  }

  const mostrarBotonListo = estadoMesaCliente && 
                            estadoMesaCliente.estadoGeneralMesa === 'esperandoParaSiguientePartida' &&
                            partidaActualParaUI && partidaActualParaUI.estadoPartida === 'partidaTerminada' &&
                            !estadoMesaCliente.jugadores.find(j => j.id === miIdJugadorSocketRef.current)?.listoParaSiguientePartida;


  if (!estadoMesaCliente) {
    return <div className="flex items-center justify-center min-h-screen">Cargando datos de la mesa...</div>;
  }

  // Log para depurar el prop fichaSeleccionada que se pasa a ManoJugadorComponent (mano1)
  if (mano1 && mano1.idJugador === miIdJugadorSocketRef.current) {
    console.log(`[JuegoPage->ManoJugadorComponent] Passing fichaSeleccionada prop: ${fichaSeleccionada?.idFicha} to mano1 (local player)`);
  }

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
          fichasEnMesa={combinedFichasParaMesa}
          ref={mesaRef}
          posicionAnclaFija={posicionAnclaFija}
          onFichaClick={handleMesaFichaClick}
          onMesaDimensionsChange={handleMesaDimensionsChange}
          fichaAnimandose={fichaAnimandose}
          jugadoresInfo={estadoMesaCliente.jugadores.map(j => ({id: j.id, ordenTurno: j.ordenTurnoEnRondaActual}))}
          miIdJugador={miIdJugadorSocketRef.current}
        />
        <DebugInfoOverlay
          viewportWidth={viewportDims.width} viewportHeight={viewportDims.height}
          mesaWidth={mesaDims.width} mesaHeight={mesaDims.height} mesaScale={mesaDims.scale}
          dominoConstWidth={DOMINO_WIDTH_PX} dominoConstHeight={DOMINO_HEIGHT_PX}
        />
        
        {/* {fichaSeleccionadaActual && fichaSeleccionada && 
         rondaActualParaUI && fichaSeleccionada.idJugadorMano === rondaActualParaUI.currentPlayerId && 
         fichaSeleccionada.idJugadorMano === miIdJugadorSocketRef.current && 
         (!autoPaseInfoCliente || autoPaseInfoCliente.jugadorId !== miIdJugadorSocketRef.current) &&
         !isMyTurnTimerJustExpired && !resultadoRonda && ( 
          <div className="absolute top-4 right-4 flex flex-col gap-2 items-end p-2 bg-black bg-opacity-75 rounded shadow-lg z-10">
            <p className="text-white text-sm font-semibold">Jugar: {fichaSeleccionadaActual.valorSuperior}-{fichaSeleccionadaActual.valorInferior}</p>
            {!rondaActualParaUI.anclaFicha ? (
               <button className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-3 rounded text-sm w-full text-center" onClick={() => handleJugarFichaServidor('derecha', fichaSeleccionada.idFicha)}>
                {textoBotonIzquierda}
              </button>
            ) : (
              <div className="flex gap-2">
                {puedeJugarIzquierda && (
                  <button className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-3 rounded text-sm" onClick={() => handleJugarFichaServidor('izquierda', fichaSeleccionada.idFicha)}>
                    {textoBotonIzquierda}
                  </button>
                )}
                {puedeJugarDerecha && (
                  <button className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-3 rounded text-sm" onClick={() => handleJugarFichaServidor('derecha', fichaSeleccionada.idFicha)}>
                    {textoBotonDerecha}
                  </button>
                )}
                {!puedeJugarIzquierda && !puedeJugarDerecha && (
                    <div className="bg-red-600 text-white font-bold py-2 px-3 rounded text-sm w-full text-center">
                        No puedes jugar esta ficha
                    </div>
                )}
              </div>
            )}
            <button onClick={() => setFichaSeleccionada(undefined)} className="text-xs text-gray-300 hover:text-white mt-1">Cancelar selección</button>
          </div>
        )} */}

         {tiempoTurnoRestante !== null && tiempoTurnoRestante > 0 && !resultadoRonda && 
          rondaActualParaUI?.currentPlayerId && 
          (!autoPaseInfoCliente || autoPaseInfoCliente.jugadorId !== rondaActualParaUI.currentPlayerId || autoPaseInfoCliente.estado !== 'mostrando_mensaje_paso') && (
          <div className="absolute top-20 right-4 bg-yellow-500 text-white p-2 rounded-full shadow-lg text-lg font-bold animate-pulse z-30">
            {tiempoTurnoRestante}s
          </div>
        )}
        
        {mostrarBotonPasarManual && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            <button onClick={handlePasarTurnoServidor} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg text-lg shadow-md">
              Pasar Turno
            </button>
          </div>
        )}
      </main>

      {mano1 && mano1.idJugador === miIdJugadorSocketRef.current && estadoMesaCliente && (
        <motion.div 
          className="fixed bottom-0 left-0 right-0 z-20 grid grid-cols-[1fr_auto_1fr] items-end gap-x-2 px-2 pb-1"
          initial={{ y: 150 }} animate={{ y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 25 }}
        >
          <div className="flex justify-center">
            <ContenedorInfoJugador
              idJugadorProp={mano1.idJugador}
              nombreJugador={mano1.nombre}
              esTurnoActual={!!(rondaActualParaUI && mano1.idJugador === rondaActualParaUI.currentPlayerId)}
              tiempoRestante={tiempoTurnoRestante}
              duracionTotalTurno={duracionTurnoActualConfigurada}
              posicion="abajo"
              autoPaseInfo={autoPaseInfoCliente}
              className="max-w-[180px] sm:max-w-[220px] md:max-w-xs" 
            />
          </div>
          <div className="flex justify-center">
            {/* Log movido justo antes del return del componente o donde se calcula el prop */}
            <ManoJugadorComponent
              key={`mano-local-${manoVersion}-${mano1.fichas.length}`} 
              fichas={mano1.fichas}
              fichaSeleccionada={fichaSeleccionada?.idFicha}
              onFichaClick={handleFichaClick}
              idJugadorMano={mano1.idJugador}
              layoutDirection="row"
              isLocalPlayer={true}
              playableFichaIds={pIds1}
              onFichaDragEnd={handleFichaDragEnd}
            />
          </div>
          <div className="w-full"></div>
        </motion.div>
      )}

      {mano2 && estadoMesaCliente && (
        <div className="fixed right-0 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
          <ContenedorInfoJugador
            idJugadorProp={mano2.idJugador}
            nombreJugador={mano2.nombre}
            esTurnoActual={!!(rondaActualParaUI && mano2.idJugador === rondaActualParaUI.currentPlayerId)}
            tiempoRestante={tiempoTurnoRestante}
            duracionTotalTurno={duracionTurnoActualConfigurada}
            posicion="derecha"
            autoPaseInfo={autoPaseInfoCliente}
            numFichas={mano2.numFichas}
            fichasRestantesAlFinalizar={
              manosAlFinalizarRonda?.find(m => m.jugadorId === mano2?.idJugador)?.fichas
            }
            mostrarFichasFinales={!!resultadoRonda}
            className="mb-2 w-28 md:w-36"
          />
        </div>
      )}
      
      {mano3 && estadoMesaCliente && (
         <div className="fixed top-2 left-0 right-0 z-20 grid grid-cols-3 items-start gap-2 px-2 pt-1">
          <div className="w-full"></div>
          <div className="flex justify-center">
            <ContenedorInfoJugador
              idJugadorProp={mano3.idJugador}
              nombreJugador={mano3.nombre}
              esTurnoActual={!!(rondaActualParaUI && mano3.idJugador === rondaActualParaUI.currentPlayerId)}
              tiempoRestante={tiempoTurnoRestante}
              duracionTotalTurno={duracionTurnoActualConfigurada}
              posicion="arriba"
              autoPaseInfo={autoPaseInfoCliente}
              numFichas={mano3.numFichas}
              fichasRestantesAlFinalizar={
                manosAlFinalizarRonda?.find(m => m.jugadorId === mano3?.idJugador)?.fichas
              }
              mostrarFichasFinales={!!resultadoRonda}
              className="max-w-xs"
            />
          </div>
          <div className="w-full"></div>
        </div>
      )}

      {mano4 && estadoMesaCliente && (
        <div className="fixed left-0 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
          <ContenedorInfoJugador
            idJugadorProp={mano4.idJugador}
            nombreJugador={mano4.nombre}
            esTurnoActual={!!(rondaActualParaUI && mano4.idJugador === rondaActualParaUI.currentPlayerId)}
            tiempoRestante={tiempoTurnoRestante}
            duracionTotalTurno={duracionTurnoActualConfigurada}
            posicion="izquierda"
            autoPaseInfo={autoPaseInfoCliente}
            numFichas={mano4.numFichas}
            fichasRestantesAlFinalizar={
              manosAlFinalizarRonda?.find(m => m.jugadorId === mano4?.idJugador)?.fichas
            }
            mostrarFichasFinales={!!resultadoRonda}
            className="mb-2 w-28 md:w-36"
          />
        </div>
      )}

      {/* Modal de Fin de Ronda */}
      {rondaActualParaUI?.estadoActual === 'terminada' && resultadoRonda && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 p-4">
          <motion.div
            className="bg-yellow-100 border-2 border-yellow-400 p-4 sm:p-6 rounded-lg shadow-xl text-center max-w-sm w-full"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}>
            <p className="text-lg sm:text-xl font-semibold text-yellow-700">Ronda Finalizada</p>
            <p className="text-lg sm:text-xl font-semibold text-yellow-700">
              Ganador: {resultadoRonda.nombreGanador || 'N/A'}
            </p>
          </motion.div>
        </div>
      )}

      {/* Botón para Listo para Siguiente Partida */}
      {mostrarBotonListo && estadoMesaCliente && (
        <div className="fixed bottom-1/2 left-1/2 transform -translate-x-1/2 translate-y-1/2 z-50">
          <button 
            onClick={handleListoParaSiguientePartida}
            className="px-6 py-3 text-lg font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition duration-150 ease-in-out"
          >
            ¡Listo para otra partida!
          </button>
        </div>
      )}
    </div>
  );
}
