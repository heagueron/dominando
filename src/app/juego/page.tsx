// /home/heagueron/jmu/dominando/src/app/juego/page.tsx
'use client';

import { PanInfo } from 'framer-motion'; // Importar PanInfo
import { motion } from 'framer-motion';
import { io, Socket } from 'socket.io-client'; // Correct import for client
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import MesaDomino from '@/components/domino/MesaDomino';
import ManoJugadorComponent from '@/components/domino/ManoJugador';
import {
 FichaDomino,
 FichaEnMesaParaLogica,
 // generarYRepartirFichas, // Comentado, la lógica se mueve al servidor
 ManoDeJugador as TipoManoDeJugadorOriginal, // Renombrado para evitar confusión
 determinarGanadorJuegoTrancado,
} from '@/utils/dominoUtils';

import { DESIGN_TABLE_WIDTH_PX, DESIGN_TABLE_HEIGHT_PX, DOMINO_WIDTH_PX, DOMINO_HEIGHT_PX } from '@/utils/dominoConstants';
import {
  // calcularPosicionRotacionSiguienteFicha, // Lógica se mueve al servidor
  configurarPrimeraFicha, // Podría ser útil para la primera ficha si el cliente la coloca visualmente primero
  FILA_ANCLA_INICIAL,
  // COLUMNA_BORDE_IZQUIERDO, // Usado en posicionamiento, que se mueve al servidor
  COLUMNA_ANCLA_INICIAL
} from '@/utils/posicionamientoUtils';
// import { determinarPrimerJugador } from '@/utils/turnosUtils'; // Lógica se mueve al servidor
import DebugInfoOverlay from '../../components/debug/DebugInfoOverlay';
import ContenedorInfoJugador from '@/components/jugador/ContenedorInfoJugador'; // NUEVA IMPORTACIÓN

// Tipos para el estado del cliente
interface JugadorCliente extends TipoManoDeJugadorOriginal {
  idJugador: string; // Aseguramos que idJugador esté presente
  nombre?: string;
  numFichas?: number; // Para mostrar el conteo de otros jugadores
  estaConectado?: boolean;
  ordenTurno?: number;
}

interface FichaSeleccionadaInfo {
  idFicha: string;
  idJugadorMano: string;
}

// Definir la URL del servidor Socket.IO
const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:3001';


// MESA INICIAL
const DEFAULT_RONDA_ID = "default-domino-round-001"; // Renombrado
const DURACION_TURNO_SEGUNDOS = 15; // Coincidir con el servidor

// Tipos para los payloads de Socket.IO (deberían coincidir con los del servidor)
interface EstadoJuegoPayload {
  rondaId: string;
  jugadores: { id: string; nombre: string; numFichas: number; estaConectado: boolean; ordenTurno?: number }[];
  currentPlayerId: string | null;
  anclaFicha: FichaEnMesaParaLogica | null;
  fichasIzquierda: FichaEnMesaParaLogica[];
  fichasDerecha: FichaEnMesaParaLogica[];
  extremos: { izquierda: number | null; derecha: number | null };
  infoExtremos: any; // Simplificado por ahora
  estadoPartida: string;
  maxJugadores: number;
  idJugadorQueRealizoUltimaAccion?: string;
  idUltimaFichaJugada?: string;
  autoPaseInfo?: { // Añadido desde el servidor
    jugadorId: string;
    estado: 'esperando_confirmacion_paso' | 'mostrando_mensaje_paso';
  };
  creadorId: string;
  duracionTurnoActual?: number; // Añadido desde el servidor
  timestampTurnoInicio?: number; // Añadido desde el servidor
}
interface TeUnisteAPartidaPayload {
  rondaId: string;
  tuJugadorIdEnPartida: string;
  estadoJuego: EstadoJuegoPayload;
}
interface JugadorSeUnioPayload {
  jugador: { id: string; nombre: string; numFichas: number; estaConectado: boolean; ordenTurno?: number };
}
interface TuManoPayload {
  fichas: FichaDomino[];
}
interface JugadorSeDesconectoPayload {
  jugadorId: string;
  mensaje: string;
  jugadoresActualizados?: { id: string; nombre: string; numFichas: number; estaConectado: boolean; ordenTurno?: number }[];
}
// Payload para cliente:jugarFicha
export interface JugarFichaPayloadCliente {
  partidaId: string; // El cliente debe enviar el ID de la partida
  rondaId: string;
  extremoElegido: 'izquierda' | 'derecha';
}

// Payload para servidor:tuTurno (definido en el cliente para claridad)
interface TuTurnoPayloadCliente {
  currentPlayerId: string;
  duracionTurnoTotal?: number; // Añadido para el temporizador
  playableFichaIds: string[];
}

// Payload para cliente:pasarTurno (definido en el cliente para claridad)
interface PasarTurnoPayloadCliente {
  rondaId: string;
}

// Payload para servidor:finDeMano (definido en el cliente para claridad)
interface FinDeManoPayloadCliente {
  rondaId: string;
  ganadorId: string;
  nombreGanador: string;
  tipoFin: 'domino' | 'trancado';
  detalleAdicional?: string;
  puntuaciones?: {
    jugadorId: string;
    puntos: number;
  }[];
}

export default function JuegoPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const miIdJugadorSocketRef = useRef<string | null>(null); // Usamos un ref para acceder al valor actual en listeners
  const [miIdJugadorSocket, setMiIdJugadorSocket] = useState<string | null>(null); // El ID de este cliente en la partida

  const [manosJugadores, setManosJugadores] = useState<JugadorCliente[]>([]);
  const [anclaFicha, setAnclaFicha] = useState<FichaEnMesaParaLogica | null>(null);
  const [fichasIzquierda, setFichasIzquierda] = useState<FichaEnMesaParaLogica[]>([]);
  const [fichasDerecha, setFichasDerecha] = useState<FichaEnMesaParaLogica[]>([]);
  const [fichaSeleccionada, setFichaSeleccionada] = useState<FichaSeleccionadaInfo | undefined>();
  
  const [tiempoTurnoRestante, setTiempoTurnoRestante] = useState<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [duracionTurnoActualConfigurada, setDuracionTurnoActualConfigurada] = useState<number>(DURACION_TURNO_SEGUNDOS);
  const [extremos, setExtremos] = useState<{ izquierda: number | null, derecha: number | null }>({
    izquierda: null,
    derecha: null,
  });
  
  const [infoExtremos, setInfoExtremos] = useState<any>({ izquierda: null, derecha: null });
  const [viewportDims, setViewportDims] = useState({ width: 0, height: 0 });
  const [mesaDims, setMesaDims] = useState({ width: 0, height: 0, scale: 1, translateX: 0, translateY: 0 });
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [playableFichaIds, setPlayableFichaIds] = useState<string[]>([]);
  const [showRotateMessage, setShowRotateMessage] = useState(false);
  const [resultadoMano, setResultadoMano] = useState<{
    ganadorId: string;
    jugadoresFinales?: {
      [jugadorId: string]: { fichas: FichaDomino[], puntos: number };
    };
    tipoFin: 'domino' | 'trancado';
    detalle: string;
  } | null>(null);
  const [autoPaseInfoCliente, setAutoPaseInfoCliente] = useState<{
    jugadorId: string;
    estado: 'esperando_confirmacion_paso' | 'mostrando_mensaje_paso';
  } | null>(null);
  const [isMyTurnTimerJustExpired, setIsMyTurnTimerJustExpired] = useState(false);
  const [manoVersion, setManoVersion] = useState(0); 

  
  const [fichaAnimandose, setFichaAnimandose] = useState<{
    id: string;
    jugadorIdOrigen: string;
  } | null>(null);

  const mesaRef = useRef<HTMLDivElement>(null);

  const limpiarIntervaloTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (currentPlayerId !== miIdJugadorSocketRef.current) {
      setIsMyTurnTimerJustExpired(false);
    }
  }, [currentPlayerId]);

  useEffect(() => {
    const userId = sessionStorage.getItem('jmu_userId') || `client_${Math.random().toString(36).substring(2, 9)}`;
    const nombreJugador = sessionStorage.getItem('jmu_nombreJugador') || `Jugador ${userId.slice(-4)}`;
    sessionStorage.setItem('jmu_userId', userId);
    sessionStorage.setItem('jmu_nombreJugador', nombreJugador);

    const newSocket = io(SOCKET_SERVER_URL, {
      auth: {
        userId: userId,
        nombreJugador: nombreJugador,
      },
      transports: ['websocket'],
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('[SOCKET] Conectado al servidor:', newSocket.id);
      newSocket.emit('cliente:unirseAPartida', { rondaId: DEFAULT_RONDA_ID, nombreJugador });
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[SOCKET] Desconectado del servidor:', reason);
    });

    newSocket.on('connect_error', (err) => {
      console.error('[SOCKET] Error de conexión:', err.message, err);
    });

    newSocket.on('servidor:teUnisteAPartida', (payload: TeUnisteAPartidaPayload) => {
      console.log('[SOCKET] Evento servidor:teUnisteAPartida recibido:', payload);
      miIdJugadorSocketRef.current = payload.tuJugadorIdEnPartida;
      setMiIdJugadorSocket(payload.tuJugadorIdEnPartida);
      setManosJugadores(payload.estadoJuego.jugadores.map(j => ({
        idJugador: j.id,
        fichas: [],
        nombre: j.nombre,
        numFichas: j.numFichas,
        estaConectado: j.estaConectado,
        ordenTurno: j.ordenTurno,
      })));
      setCurrentPlayerId(payload.estadoJuego.currentPlayerId);
      setAnclaFicha(payload.estadoJuego.anclaFicha);
      setFichasIzquierda(payload.estadoJuego.fichasIzquierda);
      setFichasDerecha(payload.estadoJuego.fichasDerecha);
      setExtremos(payload.estadoJuego.extremos);
      setInfoExtremos(payload.estadoJuego.infoExtremos);
      setAutoPaseInfoCliente(payload.estadoJuego.autoPaseInfo || null);
      if (payload.estadoJuego.duracionTurnoActual) {
        setDuracionTurnoActualConfigurada(payload.estadoJuego.duracionTurnoActual);
      }
    });

    newSocket.on('servidor:jugadorSeUnio', (payload: JugadorSeUnioPayload) => {
      console.log('[SOCKET] Evento servidor:jugadorSeUnio recibido:', payload);
      setManosJugadores(prevManos => {
        if (prevManos.find(m => m.idJugador === payload.jugador.id)) return prevManos;
        return [...prevManos, {
          idJugador: payload.jugador.id,
          fichas: [],
          nombre: payload.jugador.nombre,
          numFichas: payload.jugador.numFichas,
          estaConectado: payload.jugador.estaConectado,
          ordenTurno: payload.jugador.ordenTurno,
        }];
      });
    });

    newSocket.on('servidor:tuMano', (payload: TuManoPayload) => {
      console.log(`[SOCKET] Evento servidor:tuMano recibido. miIdJugadorSocketRef.current: ${miIdJugadorSocketRef.current}. Payload:`, payload);
      if (miIdJugadorSocketRef.current) {
        setManosJugadores(prevManos => {
          const nuevasManos = prevManos.map(mano =>
            mano.idJugador === miIdJugadorSocketRef.current
              ? { ...mano, fichas: payload.fichas, numFichas: payload.fichas.length }
              : mano
          );
          return nuevasManos;
        });
      }
    });

    newSocket.on('servidor:tuManoActualizada', (payload: TuManoPayload) => {
      console.log(`[SOCKET] Evento servidor:tuManoActualizada recibido. miIdJugadorSocketRef.current: ${miIdJugadorSocketRef.current}. Payload:`, payload);
      if (miIdJugadorSocketRef.current) {
        setManosJugadores(prevManos => {
          const nuevasManos = prevManos.map(mano =>
            mano.idJugador === miIdJugadorSocketRef.current
              ? { ...mano, fichas: payload.fichas, numFichas: payload.fichas.length }
              : mano
          );
          return nuevasManos;
        });
      }
    });

    newSocket.on('servidor:jugadorSeDesconecto', (payload: JugadorSeDesconectoPayload) => {
      console.log('[SOCKET] Evento servidor:jugadorSeDesconecto recibido:', payload);
      if (payload.jugadoresActualizados) {
        const nuevosManosJugadores = payload.jugadoresActualizados.map(j => ({
          idJugador: j.id,
          fichas: miIdJugadorSocketRef.current === j.id ? (manosJugadores.find(mj => mj.idJugador === j.id)?.fichas || []) : [],
          nombre: j.nombre,
          numFichas: j.numFichas,
          estaConectado: j.estaConectado,
          ordenTurno: j.ordenTurno,
        }));
        setManosJugadores(nuevosManosJugadores);
      } else {
        setManosJugadores(prevManos =>
          prevManos.map(mano =>
            mano.idJugador === payload.jugadorId ? { ...mano, estaConectado: false } : mano
          ));
      }
    });
    
    newSocket.on('servidor:estadoJuegoActualizado', (payload: EstadoJuegoPayload) => {
        console.log('[SOCKET] Evento servidor:estadoJuegoActualizado recibido:', payload);
        setManosJugadores(prevManos => payload.jugadores.map(serverJugador => {
            const clienteJugador = prevManos.find(j => j.idJugador === serverJugador.id);
            return {
                idJugador: serverJugador.id,
                fichas: clienteJugador?.idJugador === miIdJugadorSocketRef.current ? (clienteJugador.fichas || []) : [],
                nombre: serverJugador.nombre,
                numFichas: serverJugador.numFichas,
                estaConectado: serverJugador.estaConectado,
                ordenTurno: serverJugador.ordenTurno,
            };
        }));
        setCurrentPlayerId(payload.currentPlayerId);
        setAnclaFicha(payload.anclaFicha);
        setFichasIzquierda(payload.fichasIzquierda);
        setFichasDerecha(payload.fichasDerecha);
        setAutoPaseInfoCliente(payload.autoPaseInfo || null);

        limpiarIntervaloTimer();

        if (payload.currentPlayerId && payload.duracionTurnoActual && payload.timestampTurnoInicio) {
          setDuracionTurnoActualConfigurada(payload.duracionTurnoActual);
          
          if (!payload.autoPaseInfo || payload.autoPaseInfo.jugadorId !== payload.currentPlayerId) {
            const tiempoTranscurridoSegundos = Math.floor((Date.now() - payload.timestampTurnoInicio) / 1000);
            if (payload.currentPlayerId === miIdJugadorSocketRef.current) {
                setIsMyTurnTimerJustExpired(false);
            }

            const restanteCalculado = Math.max(0, payload.duracionTurnoActual - tiempoTranscurridoSegundos);
            setTiempoTurnoRestante(restanteCalculado);

            if (restanteCalculado > 0) {
              timerIntervalRef.current = setInterval(() => {
                setTiempoTurnoRestante(prevTiempo => {
                  if (prevTiempo === null || prevTiempo <= 1) {
                    limpiarIntervaloTimer();
                    if (payload.currentPlayerId === miIdJugadorSocketRef.current) {
                        setIsMyTurnTimerJustExpired(true);
                        setManoVersion(prev => prev + 1); 
                    }
                    return 0; 
                  }
                  return prevTiempo - 1;
                });
              }, 1000);
            } else { 
                if (payload.currentPlayerId === miIdJugadorSocketRef.current) {
                    setIsMyTurnTimerJustExpired(true);
                    setManoVersion(prev => prev + 1); 
                }
            }
          } else { 
            setTiempoTurnoRestante(null); 
            if (payload.autoPaseInfo.jugadorId === miIdJugadorSocketRef.current) {
                // No se necesita setManoVersion aquí necesariamente, 
                // el cambio de autoPaseInfoCliente ya podría causar re-render.
                // Si la ficha sigue flotando en inicio de auto-pase, se podría añadir.
            }
          }
        } else {
          setTiempoTurnoRestante(null);
        }

        setExtremos(payload.extremos);
        setInfoExtremos(payload.infoExtremos);

        if (payload.idUltimaFichaJugada && 
          payload.idJugadorQueRealizoUltimaAccion &&
          payload.idJugadorQueRealizoUltimaAccion !== miIdJugadorSocketRef.current) {
        
        setFichaAnimandose({ 
          id: payload.idUltimaFichaJugada, 
          jugadorIdOrigen: payload.idJugadorQueRealizoUltimaAccion 
        });
        setTimeout(() => setFichaAnimandose(null), 700);
      }
    });

    newSocket.on('servidor:errorDePartida', (payload: { mensaje: string }) => {
      console.error('[SOCKET] Error de partida:', payload.mensaje);
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

    newSocket.on('servidor:finDeMano', (payload: FinDeManoPayloadCliente) => {
      console.log('[SOCKET] Evento servidor:finDeMano recibido:', payload);
      setCurrentPlayerId(null);
      setPlayableFichaIds([]);
      setFichaSeleccionada(undefined);
      limpiarIntervaloTimer();
      setAutoPaseInfoCliente(null);
      setIsMyTurnTimerJustExpired(false); 
      setManoVersion(prev => prev + 1); 
      let jugadoresFinalesParaEstado: { [jugadorId: string]: { fichas: FichaDomino[], puntos: number } } | undefined = undefined;
      if (payload.tipoFin === 'trancado' && payload.puntuaciones) {
        jugadoresFinalesParaEstado = {};
        payload.puntuaciones.forEach(p => {
          jugadoresFinalesParaEstado![p.jugadorId] = {
            fichas: [],
            puntos: p.puntos,
          };
        });
      }

      setResultadoMano({
        ganadorId: payload.ganadorId,
        tipoFin: payload.tipoFin,
        detalle: payload.detalleAdicional || `Ganador: ${payload.nombreGanador}`,
        jugadoresFinales: jugadoresFinalesParaEstado,
      });
    });

    return () => {
      console.log('[SOCKET] Desconectando socket...');
      newSocket.disconnect();
      limpiarIntervaloTimer();
      setSocket(null);
    };
  }, [limpiarIntervaloTimer]); 

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
    width: number, 
    height: number, 
    scale: number, 
    translateX: number,
    translateY: number
  ) => {
    setMesaDims(prevDims =>
      (prevDims.width === width && 
       prevDims.height === height && 
       prevDims.scale === scale &&
       prevDims.translateX === translateX &&
       prevDims.translateY === translateY)
      ? prevDims
      : { width, height, scale, translateX, translateY }
    );
  }, []);

  const handleMesaFichaClick = useCallback((id: string) => {
    console.log('[MESA] Ficha en mesa clickeada:', id);
  }, []);

  const handleFichaClick = (idFicha: string, idJugadorMano: string) => {
    if (resultadoMano) return;
    if (autoPaseInfoCliente && autoPaseInfoCliente.jugadorId === miIdJugadorSocketRef.current) {
        console.log("[HANDLE_FICHA_CLICK] Auto-pase en progreso para este jugador. Clic ignorado.");
        return;
    }
    if (isMyTurnTimerJustExpired && idJugadorMano === miIdJugadorSocketRef.current) {
        console.log("[HANDLE_FICHA_CLICK] Tiempo del turno acaba de expirar. Clic ignorado.");
        return;
    }

    if (idJugadorMano !== miIdJugadorSocketRef.current || miIdJugadorSocketRef.current !== currentPlayerId) {
      console.log(`[HANDLE_FICHA_CLICK] Clic ignorado: No es el turno del jugador local o no es su mano.`);
      return;
    }
    
    if (!playableFichaIds.includes(idFicha)) {
      console.log(`[HANDLE_FICHA_CLICK] Ficha ${idFicha} no está en la lista de jugables. Clic ignorado.`);
      return;
    }
    
    setFichaSeleccionada(prev =>
      (prev && prev.idFicha === idFicha && prev.idJugadorMano === idJugadorMano)
        ? undefined
        : { idFicha, idJugadorMano }
    );
  };
  
  const determinarJugadaCliente = (ficha: FichaDomino, valorExtremo: number): { puedeJugar: boolean; valorConexion?: number; valorNuevoExtremo?: number } => {
    if (ficha.valorSuperior === valorExtremo) return { puedeJugar: true, valorConexion: ficha.valorSuperior, valorNuevoExtremo: ficha.valorInferior };
    if (ficha.valorInferior === valorExtremo) return { puedeJugar: true, valorConexion: ficha.valorInferior, valorNuevoExtremo: ficha.valorSuperior };
    return { puedeJugar: false };
  };

  const handleJugarFichaServidor = (
    extremoElegidoParam: 'izquierda' | 'derecha',
    fichaIdParam?: string
  ) => {
    if (!socket) return;
    if (isMyTurnTimerJustExpired && currentPlayerId === miIdJugadorSocketRef.current) {
        console.warn("[JUGAR_FICHA] Intento de jugar ficha manualmente mientras el tiempo acaba de expirar.");
        setFichaSeleccionada(undefined); 
        return;
    }
    if (currentPlayerId !== miIdJugadorSocketRef.current) {
      console.warn("[JUGAR_FICHA] Intento de jugar fuera de turno.");
      return;
    }
    if (autoPaseInfoCliente && autoPaseInfoCliente.jugadorId === miIdJugadorSocketRef.current) {
        console.warn("[JUGAR_FICHA] Auto-pase en progreso. No se puede jugar ficha manualmente.");
        return;
    }

    limpiarIntervaloTimer();
    setTiempoTurnoRestante(null);

    const idFichaAJugar = fichaIdParam || fichaSeleccionada?.idFicha;
    const extremoElegido = extremoElegidoParam;

    if (!idFichaAJugar) {
      console.warn("[JUGAR_FICHA] No hay ficha seleccionada o provista para jugar.");
      return;
    }

    const fichaParaJugar = manosJugadores.find(m => m.idJugador === miIdJugadorSocketRef.current)?.fichas.find(f => f.id === idFichaAJugar);
    if (!fichaParaJugar) return;

    if (!anclaFicha) {
        socket.emit('cliente:jugarFicha', { rondaId: DEFAULT_RONDA_ID, fichaId: idFichaAJugar, extremoElegido });
        setFichaSeleccionada(undefined);
        return;
    }

    const valorExtremoNumerico = extremoElegido === 'izquierda' ? extremos.izquierda : extremos.derecha;
    if (valorExtremoNumerico === null) {
        console.warn("[PAGE] Intento de jugar en un extremo nulo.");
        return;
    }
    const jugadaDeterminada = determinarJugadaCliente(fichaParaJugar, valorExtremoNumerico);
    if (!jugadaDeterminada.puedeJugar) {
        console.warn(`[PAGE] Ficha ${fichaParaJugar.id} no se puede jugar en ${extremoElegido} (${valorExtremoNumerico}) según el cliente.`);
        return;
    }
    
    socket.emit('cliente:jugarFicha', { rondaId: DEFAULT_RONDA_ID, fichaId: idFichaAJugar, extremoElegido });
    setFichaSeleccionada(undefined);
  };

  const handlePasarTurnoServidor = () => {
    if (!socket || currentPlayerId !== miIdJugadorSocketRef.current) return;
    if (isMyTurnTimerJustExpired && currentPlayerId === miIdJugadorSocketRef.current) {
        console.warn("[PASAR_TURNO] Intento de pasar turno manualmente mientras el tiempo acaba de expirar.");
        return;
    }
    if (autoPaseInfoCliente && autoPaseInfoCliente.jugadorId === miIdJugadorSocketRef.current) {
        console.warn("[PASAR_TURNO] Auto-pase en progreso. No se puede pasar manualmente.");
        return;
    }
    console.log(`[SOCKET] Emitiendo cliente:pasarTurno`);
    limpiarIntervaloTimer();
    setTiempoTurnoRestante(null);
    socket.emit('cliente:pasarTurno', { rondaId: DEFAULT_RONDA_ID });
  };

  const posicionAnclaFija = useMemo(() => 
    anclaFicha ? anclaFicha.posicionCuadricula : { fila: FILA_ANCLA_INICIAL, columna: COLUMNA_ANCLA_INICIAL }
  , [anclaFicha]);

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
  }, [posicionAnclaFija]);

  const getScreenCoordinatesOfConnectingEdge = useCallback((
    fichaPos: { fila: number; columna: number },
    fichaRot: number,
  ): { x: number; y: number } | null => {
    if (!mesaRef.current || !infoExtremos.izquierda || !infoExtremos.derecha) return null;

    const designCoords = getDesignCanvasCoordinates(fichaPos, anclaFicha, fichasIzquierda, fichasDerecha);
    if (!designCoords) return null;

    let designEdgeX = designCoords.x;
    let designEdgeY = designCoords.y;

    const esVertical = Math.abs(fichaRot % 180) === 0;
    const esExtremoIzquierdoLogico = infoExtremos.izquierda.pos.fila === fichaPos.fila && infoExtremos.izquierda.pos.columna === fichaPos.columna;

    if (esVertical) {
      designEdgeY += (esExtremoIzquierdoLogico ? -1 : 1) * (DOMINO_HEIGHT_PX / 4);
    } else {
      designEdgeX += (esExtremoIzquierdoLogico ? -1 : 1) * (DOMINO_HEIGHT_PX / 4);
    }

    const mesaRect = mesaRef.current.getBoundingClientRect();
    const screenX = (designEdgeX * mesaDims.scale + mesaDims.translateX) + mesaRect.left;
    const screenY = (designEdgeY * mesaDims.scale + mesaDims.translateY) + mesaRect.top;

    return { x: screenX, y: screenY };
  }, [getDesignCanvasCoordinates, anclaFicha, fichasIzquierda, fichasDerecha, mesaDims, infoExtremos]);

  const handleFichaDragEnd = (
    fichaId: string,
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    if (currentPlayerId !== miIdJugadorSocketRef.current || isMyTurnTimerJustExpired) {
        console.log("[DRAG_END] No es el turno del jugador local o el tiempo acaba de expirar. Ignorando drag end.");
        return;
    }
    if (resultadoMano) return;
    if (autoPaseInfoCliente && autoPaseInfoCliente.jugadorId === miIdJugadorSocketRef.current) {
        console.log("[DRAG_END] Auto-pase en progreso para este jugador. Ignorando drag end.");
        return;
    }
    if (isMyTurnTimerJustExpired && currentPlayerId === miIdJugadorSocketRef.current) {
        console.log("[DRAG_END] El tiempo del turno expiró. Ignorando drag end.");
        return;
    }


    if (!anclaFicha && fichasIzquierda.length === 0 && fichasDerecha.length === 0) {
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
    if (infoExtremos.izquierda && infoExtremos.izquierda.pos) {
      const puntoConexionIzquierdo = getScreenCoordinatesOfConnectingEdge(
        infoExtremos.izquierda.pos,
        infoExtremos.izquierda.rot,
      );
      if (puntoConexionIzquierdo) {
        distIzquierdo = Math.sqrt(Math.pow(dropX - puntoConexionIzquierdo.x, 2) + Math.pow(dropY - puntoConexionIzquierdo.y, 2));
      }
    }

    let distDerecho = Infinity;
    if (infoExtremos.derecha && infoExtremos.derecha.pos) {
      const puntoConexionDerecho = getScreenCoordinatesOfConnectingEdge(
        infoExtremos.derecha.pos,
        infoExtremos.derecha.rot,
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


  const combinedFichasParaMesa = useMemo(() => [
    ...fichasIzquierda.slice().reverse(),
    ...(anclaFicha ? [anclaFicha] : []),
    ...fichasDerecha,
  ], [fichasIzquierda, anclaFicha, fichasDerecha]);

  let fichaSeleccionadaActual: FichaDomino | undefined;
  if (fichaSeleccionada && miIdJugadorSocketRef.current) {
    const manoOrigen = manosJugadores.find(m => m.idJugador === miIdJugadorSocketRef.current);
    if (manoOrigen) fichaSeleccionadaActual = manoOrigen.fichas.find(f => f.id === fichaSeleccionada.idFicha);
  }

  let puedeJugarIzquierda = false, textoBotonIzquierda = "Punta Izquierda";
  let puedeJugarDerecha = false, textoBotonDerecha = "Punta Derecha";

  if (fichaSeleccionadaActual && fichaSeleccionada && fichaSeleccionada.idJugadorMano === currentPlayerId && fichaSeleccionada.idJugadorMano === miIdJugadorSocketRef.current){
    if (!anclaFicha) {
      puedeJugarIzquierda = true;
      textoBotonIzquierda = `Jugar ${fichaSeleccionadaActual.valorSuperior}-${fichaSeleccionadaActual.valorInferior}`;
      puedeJugarDerecha = false;
    } else {
      const extremosSonIguales = extremos.izquierda !== null && extremos.izquierda === extremos.derecha;
      if (extremosSonIguales) {
        const esIzquierdaMasCorta = fichasIzquierda.length <= fichasDerecha.length;
        if (esIzquierdaMasCorta && extremos.izquierda !== null) {
          puedeJugarIzquierda = determinarJugadaCliente(fichaSeleccionadaActual, extremos.izquierda).puedeJugar;
          if(puedeJugarIzquierda) textoBotonIzquierda = `Jugar en Izquierda (${extremos.izquierda})`;
        } else if (!esIzquierdaMasCorta && extremos.derecha !== null) {
          puedeJugarDerecha = determinarJugadaCliente(fichaSeleccionadaActual, extremos.derecha).puedeJugar;
          if(puedeJugarDerecha) textoBotonDerecha = `Jugar en Derecha (${extremos.derecha})`;
        }
      } else {
        if (extremos.izquierda !== null) {
          puedeJugarIzquierda = determinarJugadaCliente(fichaSeleccionadaActual, extremos.izquierda).puedeJugar;
          if(puedeJugarIzquierda) textoBotonIzquierda = `Punta Izquierda (${extremos.izquierda})`;
        }
        if (extremos.derecha !== null) {
          puedeJugarDerecha = determinarJugadaCliente(fichaSeleccionadaActual, extremos.derecha).puedeJugar;
          if(puedeJugarDerecha) textoBotonDerecha = `Punta Derecha (${extremos.derecha})`;
        }
      }
    }
  }
  
  const jugadorLocal = manosJugadores.find(m => m.idJugador === miIdJugadorSocketRef.current);
  
  const mostrarBotonPasarManual = currentPlayerId === miIdJugadorSocketRef.current && 
                                anclaFicha && 
                                playableFichaIds.length === 0 && 
                                (jugadorLocal?.fichas.length ?? 0) > 0 && 
                                (!autoPaseInfoCliente || autoPaseInfoCliente.jugadorId !== miIdJugadorSocketRef.current) &&
                                !isMyTurnTimerJustExpired; 

  
  let mano1: JugadorCliente | undefined, mano2: JugadorCliente | undefined, mano3: JugadorCliente | undefined, mano4: JugadorCliente | undefined;
  let pIds1: string[] = [];

  if (miIdJugadorSocketRef.current && manosJugadores.length > 0) {
    const miIndice = manosJugadores.findIndex(j => j.idJugador === miIdJugadorSocketRef.current);
    if (miIndice !== -1) {
        const reordenados = [
            ...manosJugadores.slice(miIndice),
            ...manosJugadores.slice(0, miIndice)
        ];
        mano1 = reordenados[0];
        mano2 = reordenados[1];
        mano3 = reordenados[2];
        mano4 = reordenados[3];

        if (mano1 && mano1.idJugador === miIdJugadorSocketRef.current && mano1.idJugador === currentPlayerId) pIds1 = playableFichaIds;
    }
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
          jugadoresInfo={manosJugadores.map(j => ({id: j.idJugador, ordenTurno: j.ordenTurno}))}
          miIdJugador={miIdJugadorSocketRef.current}
        />
        <DebugInfoOverlay
          viewportWidth={viewportDims.width} viewportHeight={viewportDims.height}
          mesaWidth={mesaDims.width} mesaHeight={mesaDims.height} mesaScale={mesaDims.scale}
          dominoConstWidth={DOMINO_WIDTH_PX} dominoConstHeight={DOMINO_HEIGHT_PX}
        />
        
        {fichaSeleccionadaActual && fichaSeleccionada && fichaSeleccionada.idJugadorMano === currentPlayerId && fichaSeleccionada.idJugadorMano === miIdJugadorSocketRef.current && 
         (!autoPaseInfoCliente || autoPaseInfoCliente.jugadorId !== miIdJugadorSocketRef.current) &&
         !isMyTurnTimerJustExpired && ( 
          <div className="absolute top-4 right-4 flex flex-col gap-2 items-end p-2 bg-black bg-opacity-75 rounded shadow-lg z-10">
            <p className="text-white text-sm font-semibold">Jugar: {fichaSeleccionadaActual.valorSuperior}-{fichaSeleccionadaActual.valorInferior}</p>
            {!anclaFicha ? (
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
        )}

         {tiempoTurnoRestante !== null && tiempoTurnoRestante > 0 && !resultadoMano && 
          (!autoPaseInfoCliente || autoPaseInfoCliente.jugadorId !== currentPlayerId || autoPaseInfoCliente.estado !== 'mostrando_mensaje_paso') && (
          <div className="absolute top-20 right-4 bg-yellow-500 text-white p-2 rounded-full shadow-lg text-lg font-bold animate-pulse z-30">
            {tiempoTurnoRestante}s
          </div>
        )}
        
        {mostrarBotonPasarManual && !resultadoMano && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            <button onClick={handlePasarTurnoServidor} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg text-lg shadow-md">
              Pasar Turno
            </button>
          </div>
        )}
      </main>

      {mano1 && mano1.idJugador === miIdJugadorSocketRef.current && (
        <motion.div 
          className="fixed bottom-0 left-0 right-0 z-20 grid grid-cols-[1fr_auto_1fr] items-end gap-x-2 px-2 pb-1"
          initial={{ y: 150 }} animate={{ y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 25 }}
        >
          <div className="flex justify-center">
            <ContenedorInfoJugador
              idJugadorProp={mano1.idJugador}
              nombreJugador={mano1.nombre}
              esTurnoActual={mano1.idJugador === currentPlayerId}
              tiempoRestante={tiempoTurnoRestante}
              duracionTotalTurno={duracionTurnoActualConfigurada}
              posicion="abajo"
              autoPaseInfo={autoPaseInfoCliente}
              className="max-w-[180px] sm:max-w-[220px] md:max-w-xs" 
            />
          </div>
          <div className="flex justify-center">
            <ManoJugadorComponent
              key={`mano-local-${manoVersion}`} 
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

      {mano2 && (
        <div className="fixed right-0 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
          <ContenedorInfoJugador
            idJugadorProp={mano2.idJugador}
            nombreJugador={mano2.nombre}
            esTurnoActual={mano2.idJugador === currentPlayerId}
            tiempoRestante={tiempoTurnoRestante}
            duracionTotalTurno={duracionTurnoActualConfigurada}
            posicion="derecha"
            autoPaseInfo={autoPaseInfoCliente}
            numFichas={mano2.numFichas}
            className="mb-2 w-28 md:w-36"
          />
        </div>
      )}
      
      {mano3 && (
         <div className="fixed top-2 left-0 right-0 z-20 grid grid-cols-3 items-start gap-2 px-2 pt-1">
          <div className="w-full"></div>
          <div className="flex justify-center">
            <ContenedorInfoJugador
              idJugadorProp={mano3.idJugador}
              nombreJugador={mano3.nombre}
              esTurnoActual={mano3.idJugador === currentPlayerId}
              tiempoRestante={tiempoTurnoRestante}
              duracionTotalTurno={duracionTurnoActualConfigurada}
              posicion="arriba"
              autoPaseInfo={autoPaseInfoCliente}
              numFichas={mano3.numFichas}
              className="max-w-xs"
            />
          </div>
          <div className="w-full"></div>
        </div>
      )}

      {mano4 && (
        <div className="fixed left-0 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
          <ContenedorInfoJugador
            idJugadorProp={mano4.idJugador}
            nombreJugador={mano4.nombre}
            esTurnoActual={mano4.idJugador === currentPlayerId}
            tiempoRestante={tiempoTurnoRestante}
            duracionTotalTurno={duracionTurnoActualConfigurada}
            posicion="izquierda"
            autoPaseInfo={autoPaseInfoCliente}
            numFichas={mano4.numFichas}
            className="mb-2 w-28 md:w-36"
          />
        </div>
      )}

      {resultadoMano && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
          <motion.div
            className="bg-domino-white p-6 sm:p-8 rounded-xl shadow-2xl text-center max-w-md w-full"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-domino-black">¡Mano Terminada!</h2>            
            {resultadoMano.tipoFin === 'trancado' && resultadoMano.jugadoresFinales && (
              <div className="mb-4 text-left">
                <h3 className="text-xl font-semibold mb-2">Puntuaciones:</h3>
                <ul className="list-disc list-inside">
                  {Object.entries(resultadoMano.jugadoresFinales).map(([jugadorId, data]) => (
                    <li key={jugadorId} className="text-gray-700">{(manosJugadores.find(j => j.idJugador === jugadorId)?.nombre || jugadorId)}: {data.puntos} puntos</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-md sm:text-lg mb-6 text-gray-700">{resultadoMano.detalle}</p>
          </motion.div>
        </div>
      )}
    </div>
  );
}
