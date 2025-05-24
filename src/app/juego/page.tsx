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

// Tipos para el estado del cliente
interface JugadorCliente extends TipoManoDeJugadorOriginal {
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

// Tipos para los payloads de Socket.IO (deberían coincidir con los del servidor)
// Estos son ejemplos, idealmente se compartirían desde un paquete común o se definirían con más cuidado.
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
  creadorId: string;
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
  // const [fichasSobrantes, setFichasSobrantes] = useState<FichaDomino[]>([]); // Gestionado por el servidor
  const [anclaFicha, setAnclaFicha] = useState<FichaEnMesaParaLogica | null>(null);
  const [fichasIzquierda, setFichasIzquierda] = useState<FichaEnMesaParaLogica[]>([]); // Usando tu nombre de estado
  const [fichasDerecha, setFichasDerecha] = useState<FichaEnMesaParaLogica[]>([]); // Usando tu nombre de estado
  const [fichaSeleccionada, setFichaSeleccionada] = useState<FichaSeleccionadaInfo | undefined>();
  
  const [tiempoTurnoRestante, setTiempoTurnoRestante] = useState<number | null>(null); // Nuevo estado para el timer
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null); // Ref para el intervalo del timer
  const [extremos, setExtremos] = useState<{ izquierda: number | null, derecha: number | null }>({ // Usando tu nombre de estado
    izquierda: null,
    derecha: null,
  });
  
  const [infoExtremos, setInfoExtremos] = useState<any>({ izquierda: null, derecha: null }); // Simplificado
  const [viewportDims, setViewportDims] = useState({ width: 0, height: 0 });
  const [mesaDims, setMesaDims] = useState({ width: 0, height: 0, scale: 1, translateX: 0, translateY: 0 }); // Añadir translateX, translateY
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
  // const [pasesConsecutivos, setPasesConsecutivos] = useState(0); // Gestionado por el servidor

  
  const [fichaAnimandose, setFichaAnimandose] = useState<{
    id: string;
    jugadorIdOrigen: string;
  } | null>(null);

  const mesaRef = useRef<HTMLDivElement>(null); // Ref para el componente MesaDomino

  // Función para limpiar el intervalo del temporizador
  const limpiarIntervaloTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);


  // Efecto para la conexión Socket.IO
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
      transports: ['websocket'], // Forzar websocket
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
      // Logueamos el mensaje y el objeto de error completo para inspección
      console.error('[SOCKET] Error de conexión:', err.message, err);
    });

    newSocket.on('servidor:teUnisteAPartida', (payload: TeUnisteAPartidaPayload) => {
      console.log('[SOCKET] Evento servidor:teUnisteAPartida recibido:', payload);
      miIdJugadorSocketRef.current = payload.tuJugadorIdEnPartida; // Actualizar el ref
      setMiIdJugadorSocket(payload.tuJugadorIdEnPartida);
      // Actualizar estado con información pública
      setManosJugadores(payload.estadoJuego.jugadores.map(j => ({
        idJugador: j.id,
        fichas: [], // Las fichas reales vendrán en 'servidor:tuMano' o 'servidor:estadoJuegoActualizado'
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
      // setPasesConsecutivos(0); // Reset en el cliente
      // setResultadoMano(null); // Reset en el cliente
    });

    newSocket.on('servidor:jugadorSeUnio', (payload: JugadorSeUnioPayload) => {
      console.log('[SOCKET] Evento servidor:jugadorSeUnio recibido:', payload);
      setManosJugadores(prevManos => {
        // Evitar duplicados si el evento llega por alguna razón para un jugador ya existente
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
      if (miIdJugadorSocketRef.current) { // Usar el ref aquí
        setManosJugadores(prevManos => {
          const nuevasManos = prevManos.map(mano =>
            mano.idJugador === miIdJugadorSocketRef.current // Usar el ref aquí
              ? { ...mano, fichas: payload.fichas, numFichas: payload.fichas.length }
              : mano
          );
          console.log('[SOCKET] Manos actualizadas después de tuMano:', nuevasManos.find(m => m.idJugador === miIdJugadorSocketRef.current));
          return nuevasManos;
        });
      } else {
        console.warn("[SOCKET] servidor:tuMano recibido, pero miIdJugadorSocket es null en el momento del procesamiento.");
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
          console.log('[SOCKET] Manos actualizadas después de tuManoActualizada:', nuevasManos.find(m => m.idJugador === miIdJugadorSocketRef.current));
          return nuevasManos;
        });
      } else {
        console.warn("[SOCKET] servidor:tuManoActualizada recibido, pero miIdJugadorSocketRef.current es null.");
      }
    });

    newSocket.on('servidor:jugadorSeDesconecto', (payload: JugadorSeDesconectoPayload) => {
      console.log('[SOCKET] Evento servidor:jugadorSeDesconecto recibido:', payload);
      if (payload.jugadoresActualizados) {
        // Reconstruir la lista de manos de jugadores basada en la lista actualizada del servidor.
        // Esto es crucial cuando un jugador es removido de la partida (estado 'esperandoJugadores').
        const nuevosManosJugadores = payload.jugadoresActualizados.map(j => ({
          idJugador: j.id,
          // Si es el jugador local, intentamos preservar sus fichas (aunque en 'esperandoJugadores' deberían estar vacías).
          // Para otros jugadores, o si no hay fichas previas, se usa un array vacío.
          fichas: miIdJugadorSocketRef.current === j.id ? (manosJugadores.find(mj => mj.idJugador === j.id)?.fichas || []) : [],
          nombre: j.nombre,
          numFichas: j.numFichas,
          estaConectado: j.estaConectado,
          ordenTurno: j.ordenTurno,
        }));
        console.log('[SOCKET] Actualizando manosJugadores tras desconexión (lista completa):', nuevosManosJugadores);
        setManosJugadores(nuevosManosJugadores);
      } else {
        // Si solo se marca como desconectado (juego en curso)
        setManosJugadores(prevManos =>
          prevManos.map(mano =>
            mano.idJugador === payload.jugadorId ? { ...mano, estaConectado: false } : mano
          ));
      }
    });
    
    newSocket.on('servidor:estadoJuegoActualizado', (payload: EstadoJuegoPayload) => {
        console.log('[SOCKET] Evento servidor:estadoJuegoActualizado recibido:', payload);
        // Actualizar la lista de jugadores (especialmente numFichas y estado de conexión)
        setManosJugadores(prevManos => payload.jugadores.map(serverJugador => {
            const clienteJugador = prevManos.find(j => j.idJugador === serverJugador.id);
            return {
                idJugador: serverJugador.id, // ID del jugador del servidor
                fichas: clienteJugador?.idJugador === miIdJugadorSocketRef.current ? (clienteJugador.fichas || []) : [], // Mantener fichas del jugador local si es él
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
        setExtremos(payload.extremos);
        setInfoExtremos(payload.infoExtremos);

        // Lógica para animación de ficha jugada por otro jugador
        if (payload.idUltimaFichaJugada && 
          payload.idJugadorQueRealizoUltimaAccion &&
          payload.idJugadorQueRealizoUltimaAccion !== miIdJugadorSocketRef.current) {
        
        console.log(`[ANIM] Ficha ${payload.idUltimaFichaJugada} jugada por ${payload.idJugadorQueRealizoUltimaAccion} se animará.`);
        setFichaAnimandose({ 
          id: payload.idUltimaFichaJugada, 
          jugadorIdOrigen: payload.idJugadorQueRealizoUltimaAccion 
        });
        // Limpiar después de un tiempo para que la animación no se repita en re-renders
        setTimeout(() => setFichaAnimandose(null), 700); // Ajustar duración
      }

        // setPasesConsecutivos(payload.pasesConsecutivos || 0); // Si el servidor lo envía
        // setResultadoMano(null); // Si una nueva mano comienza, limpiar resultado anterior
    });

    newSocket.on('servidor:errorDePartida', (payload: { mensaje: string }) => {
      console.error('[SOCKET] Error de partida:', payload.mensaje);
      // Aquí podrías mostrar un toast o alerta al usuario
    });

    newSocket.on('servidor:tuTurno', (payload: TuTurnoPayloadCliente) => {
      console.log('[SOCKET] Evento servidor:tuTurno recibido:', payload);
      // Solo actualizar playableFichaIds si el turno es de este cliente
      if (payload.currentPlayerId === miIdJugadorSocketRef.current) {
        setPlayableFichaIds(payload.playableFichaIds);
        console.log('[SOCKET] Es mi turno. Fichas jugables:', payload.playableFichaIds, 'Duración:', payload.duracionTurnoTotal);
        if (payload.duracionTurnoTotal && payload.duracionTurnoTotal > 0) {
          setTiempoTurnoRestante(payload.duracionTurnoTotal);
          limpiarIntervaloTimer(); // Limpiar cualquier timer anterior
          timerIntervalRef.current = setInterval(() => {
            setTiempoTurnoRestante(prevTiempo => {
              if (prevTiempo === null || prevTiempo <= 1) {
                limpiarIntervaloTimer();
                return 0;
              }
              return prevTiempo - 1;
            });
          }, 1000);
        }
      } else {
        // Si no es mi turno, limpiar mis fichas jugables (por si acaso)
        setPlayableFichaIds([]);
        setTiempoTurnoRestante(null); // No es mi turno, no hay tiempo restante para mí
        limpiarIntervaloTimer();
      }
    });

    newSocket.on('servidor:finDeMano', (payload: FinDeManoPayloadCliente) => {
      console.log('[SOCKET] Evento servidor:finDeMano recibido:', payload);
      setCurrentPlayerId(null); // Nadie tiene el turno si la mano terminó
      setPlayableFichaIds([]); // No hay fichas jugables
      setFichaSeleccionada(undefined); // Limpiar cualquier ficha seleccionada

      limpiarIntervaloTimer(); // Limpiar timer al finalizar la mano
      let jugadoresFinalesParaEstado: { [jugadorId: string]: { fichas: FichaDomino[], puntos: number } } | undefined = undefined;
      if (payload.tipoFin === 'trancado' && payload.puntuaciones) {
        jugadoresFinalesParaEstado = {};
        payload.puntuaciones.forEach(p => {
          jugadoresFinalesParaEstado![p.jugadorId] = {
            fichas: [], // No tenemos las fichas exactas del oponente, solo los puntos
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

    // TODO: Añadir listeners para otros eventos del servidor:
    // - servidor:jugadaInvalida

    return () => {
      console.log('[SOCKET] Desconectando socket...');
      newSocket.disconnect();
      limpiarIntervaloTimer(); // Limpiar timer al desmontar
      setSocket(null);
    };
  }, []); // <--- CAMBIAR DEPENDENCIA A ARRAY VACÍO

  // Efectos para UI (resize, orientation)
  useEffect(() => {
    const handleResize = () => setViewportDims({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleOrientationChange = () => {
      const isPortrait = window.matchMedia("(orientation: portrait)").matches;
      const isMobileThreshold = window.innerWidth < 768; // md breakpoint
      setShowRotateMessage(isPortrait && isMobileThreshold);
    };
    handleOrientationChange(); // Initial check
    window.addEventListener('resize', handleOrientationChange); // Update on resize
    return () => window.removeEventListener('resize', handleOrientationChange);
  }, []);

  const handleMesaDimensionsChange = useCallback((
    width: number, 
    height: number, 
    scale: number, 
    translateX: number, // Nuevo parámetro
    translateY: number  // Nuevo parámetro
  ) => {
    setMesaDims(prevDims =>
      (prevDims.width === width && 
       prevDims.height === height && 
       prevDims.scale === scale &&
       prevDims.translateX === translateX && // Comparar también translateX
       prevDims.translateY === translateY)   // Comparar también translateY
      ? prevDims
      : { width, height, scale, translateX, translateY } // Guardar los nuevos valores
    );
  }, []);

  // Memoizar onFichaClick para MesaDomino
  const handleMesaFichaClick = useCallback((id: string) => {
    console.log('[MESA] Ficha en mesa clickeada:', id);
    // Aquí podrías añadir lógica si necesitas hacer algo cuando se hace clic en una ficha de la mesa
  }, []);


  // Lógica de UI para seleccionar ficha (sigue siendo relevante en cliente)
  const handleFichaClick = (idFicha: string, idJugadorMano: string) => {
    if (resultadoMano) return;

    console.log('[HANDLE_FICHA_CLICK] Intentando seleccionar ficha:', {
      idFicha,
      idJugadorMano,
      miId: miIdJugadorSocketRef.current,
      turnoActual: currentPlayerId,
    });

    if (idJugadorMano !== miIdJugadorSocketRef.current || idJugadorMano !== currentPlayerId) {
      console.log(`Clic ignorado: idJugadorMano=${idJugadorMano}, miId=${miIdJugadorSocketRef.current}, currentTurn=${currentPlayerId}`);
      return;
    }
    
    // Usar playableFichaIds del estado para validar si la ficha es clickeable
    if (!playableFichaIds.includes(idFicha)) {
      console.log(`[HANDLE_FICHA_CLICK] Ficha ${idFicha} no está en la lista de jugables. Clic ignorado.`);
      return;
    }
    
    console.log(`[HANDLE_FICHA_CLICK] Ficha ${idFicha} por ${idJugadorMano} es válida para selección. Estableciendo fichaSeleccionada.`);

    setFichaSeleccionada(prev =>
      (prev && prev.idFicha === idFicha && prev.idJugadorMano === idJugadorMano)
        ? undefined
        : { idFicha, idJugadorMano }
    );
  };
  
  // Determinar jugada (esta lógica se moverá al servidor, pero el cliente puede tener una versión para UI)
  const determinarJugadaCliente = (ficha: FichaDomino, valorExtremo: number): { puedeJugar: boolean; valorConexion?: number; valorNuevoExtremo?: number } => {
    if (ficha.valorSuperior === valorExtremo) return { puedeJugar: true, valorConexion: ficha.valorSuperior, valorNuevoExtremo: ficha.valorInferior };
    if (ficha.valorInferior === valorExtremo) return { puedeJugar: true, valorConexion: ficha.valorInferior, valorNuevoExtremo: ficha.valorSuperior };
    return { puedeJugar: false };
  };


  // Lógica para enviar acciones al servidor
  const handleJugarFichaServidor = (
    extremoElegidoParam: 'izquierda' | 'derecha',
    fichaIdParam?: string // Parámetro opcional para la ficha a jugar (usado por drag-and-drop)
  ) => {
    if (!socket) return;
    if (currentPlayerId !== miIdJugadorSocketRef.current) {
      console.warn("[JUGAR_FICHA] Intento de jugar fuera de turno.");
      return;
    }

    limpiarIntervaloTimer(); // Limpiar timer al realizar una jugada
    setTiempoTurnoRestante(null); // Resetear visualmente el contador

    const idFichaAJugar = fichaIdParam || fichaSeleccionada?.idFicha;
    const extremoElegido = extremoElegidoParam;

    if (!idFichaAJugar) {
      console.warn("[JUGAR_FICHA] No hay ficha seleccionada o provista para jugar.");
      return;
    }

    // Validaciones preliminares en cliente (opcional, el servidor es la autoridad)
    const fichaParaJugar = manosJugadores.find(m => m.idJugador === miIdJugadorSocketRef.current)?.fichas.find(f => f.id === idFichaAJugar);
    if (!fichaParaJugar) return;

    // Si es la primera ficha
    if (!anclaFicha) {
        socket.emit('cliente:jugarFicha', { rondaId: DEFAULT_RONDA_ID, fichaId: idFichaAJugar, extremoElegido });
        setFichaSeleccionada(undefined); // Limpiar selección después de emitir
        return;
    }

    // Si no es la primera ficha, verificar si se puede jugar en el extremo elegido
    const valorExtremoNumerico = extremoElegido === 'izquierda' ? extremos.izquierda : extremos.derecha;
    if (valorExtremoNumerico === null) {
        console.warn("[PAGE] Intento de jugar en un extremo nulo.");
        return;
    }
    const jugadaDeterminada = determinarJugadaCliente(fichaParaJugar, valorExtremoNumerico);
    if (!jugadaDeterminada.puedeJugar) {
        console.warn(`[PAGE] Ficha ${fichaParaJugar.id} no se puede jugar en ${extremoElegido} (${valorExtremoNumerico}) según el cliente.`);
        // Podrías mostrar un mensaje al usuario, pero el servidor tendrá la última palabra.
        // No emitir si el cliente ya sabe que no es jugable en ese extremo.
        return;
    }

    // La regla de "jugar por el extremo más corto cuando ambos extremos son iguales" se ha eliminado del cliente.
    // El servidor tendrá la última palabra si esa regla aún se aplica allí.
    
    console.log(`[SOCKET] Emitiendo cliente:jugarFicha`, { rondaId: DEFAULT_RONDA_ID, fichaId: idFichaAJugar, extremoElegido });
    socket.emit('cliente:jugarFicha', { rondaId: DEFAULT_RONDA_ID, fichaId: idFichaAJugar, extremoElegido });
    setFichaSeleccionada(undefined); // Limpiar selección después de emitir
  };

  const handlePasarTurnoServidor = () => {
    if (!socket || currentPlayerId !== miIdJugadorSocketRef.current) return;
    console.log(`[SOCKET] Emitiendo cliente:pasarTurno`);
    limpiarIntervaloTimer(); // Limpiar timer al pasar turno
    setTiempoTurnoRestante(null); // Resetear visualmente el contador
    socket.emit('cliente:pasarTurno', { rondaId: DEFAULT_RONDA_ID });
  };

  // Mover la definición de posicionAnclaFija aquí, antes de que se use en los useCallback
  const posicionAnclaFija = useMemo(() => 
    anclaFicha ? anclaFicha.posicionCuadricula : { fila: FILA_ANCLA_INICIAL, columna: COLUMNA_ANCLA_INICIAL }
  , [anclaFicha]);

  // Función para calcular las coordenadas X, Y en el lienzo de diseño de MesaDomino
  // Esta función replicaría la lógica de posicionamiento de MesaDomino.tsx
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
      // Si no hay fichas en la mesa, y estamos preguntando por la posición del ancla (primera ficha)
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
        fichaLogic: anclaLogicaParaCalculo, // Corregido: usar fichaLogic
      };
    } else {
      console.error("[getDesignCanvasCoordinates] No se pudo determinar la ficha ancla para el cálculo inicial.");
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
                        if (!uIsVertical && nIsVertical) { // H -> V (T-shape or L-shape)
                            if (connectedToCalculated.fichaLogic.posicionCuadricula.fila === 7 && connectedToCalculated.fichaLogic.posicionCuadricula.columna === 1 && !(connectedToCalculated.fichaLogic.valorSuperior === connectedToCalculated.fichaLogic.valorInferior) && fichaLogic.posicionCuadricula.fila === 8 && fichaLogic.posicionCuadricula.columna === 1) {
                                nx = ux - (DOMINO_HEIGHT_PX - DOMINO_WIDTH_PX) / 2; // L-shape (8,1)V from (7,1)H
                            } else {
                                nx = ux + uActualWidth / 2 - nActualWidth / 2; // T-shape
                            }
                        } else if (uIsVertical && !nIsVertical) { // V -> H
                            nx = ux + uActualWidth / 2 - nActualWidth / 2;
                             if (connectedToCalculated.fichaLogic.posicionCuadricula.fila === 8 && connectedToCalculated.fichaLogic.posicionCuadricula.columna === 1 && fichaLogic.posicionCuadricula.fila === 9 && fichaLogic.posicionCuadricula.columna === 1) {
                                nx = ux + (DOMINO_HEIGHT_PX - DOMINO_WIDTH_PX) / 2; // L-shape (9,1)H from (8,1)V
                            }
                        }
                        break;
                    case 'AbovePrev':
                        nx = ux;
                        ny = uy - uActualHeight / 2 - nActualHeight / 2;
                        if (uIsVertical && !nIsVertical) { // V -> H
                            if (connectedToCalculated.fichaLogic.posicionCuadricula.fila === 4 && connectedToCalculated.fichaLogic.posicionCuadricula.columna === 1 && fichaLogic.posicionCuadricula.fila === 3 && fichaLogic.posicionCuadricula.columna === 1) {
                                nx = ux + (DOMINO_HEIGHT_PX - DOMINO_WIDTH_PX) / 2; // L-shape (3,1)H from (4,1)V
                            } else if (connectedToCalculated.fichaLogic.posicionCuadricula.fila === 2 && connectedToCalculated.fichaLogic.posicionCuadricula.columna === 11 && fichaLogic.posicionCuadricula.fila === 1 && fichaLogic.posicionCuadricula.columna === 11) {
                                nx = ux - (DOMINO_HEIGHT_PX - DOMINO_WIDTH_PX) / 2; // L-shape (1,11)H from (2,11)V
                            }
                        } else if (!uIsVertical && nIsVertical) { // H -> V
                            if (connectedToCalculated.fichaLogic.posicionCuadricula.fila === 3 && connectedToCalculated.fichaLogic.posicionCuadricula.columna === 11 && fichaLogic.posicionCuadricula.fila === 2 && fichaLogic.posicionCuadricula.columna === 11) {
                                nx = ux + (DOMINO_HEIGHT_PX - DOMINO_WIDTH_PX) / 2; // L-shape (2,11)V from (3,11)H
                            } else {
                                nx = ux - uActualWidth / 2 + nActualWidth / 2; // T-shape
                            }
                        }
                        break;
                }
                 // Ajuste específico para el giro de (6,11)H a (7,11)V
                if (connectedToCalculated.fichaLogic.posicionCuadricula.fila === 6 && connectedToCalculated.fichaLogic.posicionCuadricula.columna === 11 && !uIsVertical &&
                    fichaLogic.posicionCuadricula.fila === 7 && fichaLogic.posicionCuadricula.columna === 11 && nIsVertical) {
                    nx = ux - DOMINO_HEIGHT_PX / 4;
                }

                calculatedPositions[`${fichaLogic.posicionCuadricula.fila},${fichaLogic.posicionCuadricula.columna}`] = { x: nx, y: ny, fichaLogic };
                processedInThisIterationIds.push(fichaLogic.id);
            }
        });
        piecesToProcess = piecesToProcess.filter(f => !processedInThisIterationIds.includes(f.id));
        if(processedInThisIterationIds.length === 0 && piecesToProcess.length > 0) break; // Evitar bucle infinito
    }

    const targetKey = `${targetFichaPos.fila},${targetFichaPos.columna}`;
    if (calculatedPositions[targetKey]) {
      return { x: calculatedPositions[targetKey].x, y: calculatedPositions[targetKey].y };
    }

    console.warn(`[getDesignCanvasCoordinates] No se pudo calcular la posición para ${targetFichaPos.fila},${targetFichaPos.columna}`);
    return null;
  }, [posicionAnclaFija]); // Dependencia de posicionAnclaFija (que es constante)

  const getScreenCoordinatesOfConnectingEdge = useCallback((
    fichaPos: { fila: number; columna: number }, // Posición de la ficha de extremo
    fichaRot: number,
    // valorExtremo: number, // El valor numérico del extremo
    // esExtremoIzquierdo: boolean // Para saber qué lado de la ficha es el conector
  ): { x: number; y: number } | null => {
    if (!mesaRef.current || !infoExtremos.izquierda || !infoExtremos.derecha) return null; // Asegurar que infoExtremos tenga datos

    const designCoords = getDesignCanvasCoordinates(fichaPos, anclaFicha, fichasIzquierda, fichasDerecha);
    if (!designCoords) return null;

    let designEdgeX = designCoords.x;
    let designEdgeY = designCoords.y;

    const esVertical = Math.abs(fichaRot % 180) === 0;
    const esExtremoIzquierdoLogico = infoExtremos.izquierda.pos.fila === fichaPos.fila && infoExtremos.izquierda.pos.columna === fichaPos.columna;

    // Ajustar al centro del borde conector
    if (esVertical) { // Ficha vertical
      // Si es el extremo izquierdo lógico Y su valor superior conecta (o es el ancla y es el lado superior)
      // O si es el extremo derecho lógico Y su valor inferior conecta (o es el ancla y es el lado inferior)
      // Esta lógica necesita ser más precisa basada en qué valor de la ficha es el extremo.
      // Por ahora, una simplificación:
      designEdgeY += (esExtremoIzquierdoLogico ? -1 : 1) * (DOMINO_HEIGHT_PX / 4); // Aproximadamente el centro de la mitad superior/inferior
    } else { // Ficha horizontal
      // Similar lógica para horizontal
      designEdgeX += (esExtremoIzquierdoLogico ? -1 : 1) * (DOMINO_HEIGHT_PX / 4); // DOMINO_HEIGHT_PX porque es la longitud de la ficha horizontal
    }

    // console.log(`[getScreenEdge] Ficha ${fichaPos.fila},${fichaPos.columna} (rot ${fichaRot}): DesignCenter (${designCoords.x.toFixed(2)},${designCoords.y.toFixed(2)}), DesignEdge (${designEdgeX.toFixed(2)},${designEdgeY.toFixed(2)})`);

    const mesaRect = mesaRef.current.getBoundingClientRect();
    const screenX = (designEdgeX * mesaDims.scale + mesaDims.translateX) + mesaRect.left;
    const screenY = (designEdgeY * mesaDims.scale + mesaDims.translateY) + mesaRect.top;

    return { x: screenX, y: screenY };
  }, [getDesignCanvasCoordinates, anclaFicha, fichasIzquierda, fichasDerecha, mesaDims, posicionAnclaFija]);

  const handleFichaDragEnd = (
    fichaId: string,
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo // info.point.x, info.point.y son las coordenadas de pantalla donde se soltó
  ) => {
    if (currentPlayerId !== miIdJugadorSocketRef.current) {
      console.log("[DRAG_END] No es el turno del jugador local. Ignorando drag end.");
      return;
    }
    if (resultadoMano) {
      console.log("[DRAG_END] La mano ya ha terminado. Ignorando drag end.");
      return;
    }

    console.log(`[DRAG_END] Ficha ${fichaId} soltada. Coordenadas: (${info.point.x.toFixed(2)}, ${info.point.y.toFixed(2)})`);

    // Lógica para la primera ficha
    if (!anclaFicha && fichasIzquierda.length === 0 && fichasDerecha.length === 0) {
      // Verificar si se soltó sobre la mesa (aproximado)
      if (mesaRef.current) {
        const mesaRect = mesaRef.current.getBoundingClientRect();
        if (info.point.x >= mesaRect.left && info.point.x <= mesaRect.right &&
            info.point.y >= mesaRect.top && info.point.y <= mesaRect.bottom) {
          
          console.log(`[DRAG_END] Primera ficha ${fichaId} soltada sobre la mesa. Intentando jugar...`);
          // Llamar directamente a handleJugarFichaServidor con la ficha y un extremo por defecto
          // El servidor manejará que es la primera ficha.
          // El timeout puede seguir siendo útil para que la animación de "soltar" se vea antes del cambio de estado del servidor.
          setTimeout(() => handleJugarFichaServidor('derecha', fichaId), 50);

        } else {
          console.log(`[DRAG_END] Primera ficha ${fichaId} soltada fuera de la mesa.`);
          // La ficha debería volver a la mano automáticamente por las constraints de framer-motion
        }
      }
      return;
    }

    // Lógica para cuando YA HAY FICHAS en la mesa
    let extremoDetectado: 'izquierda' | 'derecha' | null = null;
    const dropX = info.point.x;
    const dropY = info.point.y;
    const umbralDeDrop = DOMINO_HEIGHT_PX * mesaDims.scale * 2.5; // Umbral (ej. 1.5 veces la altura de una ficha escalada)

    let distIzquierdo = Infinity;
    if (infoExtremos.izquierda && infoExtremos.izquierda.pos) {
      const puntoConexionIzquierdo = getScreenCoordinatesOfConnectingEdge(
        infoExtremos.izquierda.pos,
        infoExtremos.izquierda.rot,
        // infoExtremos.izquierda.valorExtremo,
        // true
      );
      if (puntoConexionIzquierdo) {
        distIzquierdo = Math.sqrt(Math.pow(dropX - puntoConexionIzquierdo.x, 2) + Math.pow(dropY - puntoConexionIzquierdo.y, 2));
        console.log(`[DRAG_END] Distancia al extremo izquierdo (${infoExtremos.izquierda.pos.fila},${infoExtremos.izquierda.pos.columna}): ${distIzquierdo.toFixed(2)} (Umbral: ${umbralDeDrop.toFixed(2)})`);
      }
    }

    let distDerecho = Infinity;
    if (infoExtremos.derecha && infoExtremos.derecha.pos) {
      const puntoConexionDerecho = getScreenCoordinatesOfConnectingEdge(
        infoExtremos.derecha.pos,
        infoExtremos.derecha.rot,
        // infoExtremos.derecha.valorExtremo,
        // false
      );
      if (puntoConexionDerecho) {
        distDerecho = Math.sqrt(Math.pow(dropX - puntoConexionDerecho.x, 2) + Math.pow(dropY - puntoConexionDerecho.y, 2));
        console.log(`[DRAG_END] Distancia al extremo derecho (${infoExtremos.derecha.pos.fila},${infoExtremos.derecha.pos.columna}): ${distDerecho.toFixed(2)} (Umbral: ${umbralDeDrop.toFixed(2)})`);
      }
    }

    if (distIzquierdo < umbralDeDrop && distIzquierdo <= distDerecho) {
      extremoDetectado = 'izquierda';
    } else if (distDerecho < umbralDeDrop) {
      extremoDetectado = 'derecha';
    }

    if (extremoDetectado) {
      console.log(`[DRAG_END] Ficha ${fichaId} soltada cerca del extremo: ${extremoDetectado}`);
      setTimeout(() => handleJugarFichaServidor(extremoDetectado!, fichaId), 50);
    } else {
      console.log(`[DRAG_END] Ficha ${fichaId} soltada en una zona no válida para extremos existentes.`);
    }
  };


  const combinedFichasParaMesa = useMemo(() => [
    ...fichasIzquierda.slice().reverse(),
    ...(anclaFicha ? [anclaFicha] : []),
    ...fichasDerecha,
  ], [fichasIzquierda, anclaFicha, fichasDerecha]);

  let fichaSeleccionadaActual: FichaDomino | undefined;
  if (fichaSeleccionada && miIdJugadorSocketRef.current) { // Usar ref aquí
    const manoOrigen = manosJugadores.find(m => m.idJugador === miIdJugadorSocketRef.current); // Usar ref aquí
    if (manoOrigen) fichaSeleccionadaActual = manoOrigen.fichas.find(f => f.id === fichaSeleccionada.idFicha);
  }

  let puedeJugarIzquierda = false, textoBotonIzquierda = "Punta Izquierda";
  let puedeJugarDerecha = false, textoBotonDerecha = "Punta Derecha";

  /*console.log('[RENDER_BOTONES_CHECK]', {
    hasFichaSeleccionadaActual: !!fichaSeleccionadaActual,
    hasFichaSeleccionada: !!fichaSeleccionada,
    idJugadorManoFichaSel: fichaSeleccionada?.idJugadorMano,
    currentPlayerId,
    miId: miIdJugadorSocketRef.current,
    anclaFichaPresente: !!anclaFicha,
    extremos,
  }); */

  if (fichaSeleccionadaActual && fichaSeleccionada && fichaSeleccionada.idJugadorMano === currentPlayerId && fichaSeleccionada.idJugadorMano === miIdJugadorSocketRef.current){
    if (!anclaFicha) { // Primera ficha
      puedeJugarIzquierda = true; // Se usa el botón izquierdo para jugar la primera ficha
      textoBotonIzquierda = `Jugar ${fichaSeleccionadaActual.valorSuperior}-${fichaSeleccionadaActual.valorInferior}`;
      puedeJugarDerecha = false; // No hay extremo derecho para la primera ficha
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
  const fichasDelJugadorActualCount = manosJugadores.find(m => m.idJugador === currentPlayerId)?.numFichas ?? 0;
  
  // Condición para mostrar el botón "Pasar Turno"
  // Es mi turno, ya hay fichas en la mesa (anclaFicha no es null),
  // no tengo fichas jugables (playableFichaIds está vacío), y aún tengo fichas en mi mano.
  const esMiTurnoYNoPuedoJugar = currentPlayerId === miIdJugadorSocketRef.current && anclaFicha && playableFichaIds.length === 0 && (jugadorLocal?.fichas.length ?? 0) > 0;


  // Asignación de manos a posiciones visuales (jugador1, jugador2, etc.)
  // Esto dependerá de cómo el servidor asigne los `ordenTurno` y cómo el cliente quiera mapearlos a posiciones.
  // Por ahora, asumimos que el primer jugador en `manosJugadores` es "jugador1" visualmente si es este cliente.
  // Y los demás se asignan en orden. Esta lógica necesitará ser más robusta.
  
  let mano1: JugadorCliente | undefined, mano2: JugadorCliente | undefined, mano3: JugadorCliente | undefined, mano4: JugadorCliente | undefined;
  let pIds1: string[] = [], pIds2: string[] = [], pIds3: string[] = [], pIds4: string[] = [];

  if (miIdJugadorSocketRef.current && manosJugadores.length > 0) {
    const miIndice = manosJugadores.findIndex(j => j.idJugador === miIdJugadorSocketRef.current);
    if (miIndice !== -1) {
        // Reordenar `manosJugadores` para que el jugador local (miIdJugadorSocket) siempre sea `mano1`
        const reordenados = [
            ...manosJugadores.slice(miIndice),
            ...manosJugadores.slice(0, miIndice)
        ];
        mano1 = reordenados[0]; // Jugador local
        mano2 = reordenados[1]; // Jugador a la derecha del local
        mano3 = reordenados[2]; // Jugador en frente del local
        mano4 = reordenados[3]; // Jugador a la izquierda del local

        // Asignar playableFichaIds a la mano del jugador local (mano1)
        if (mano1 && mano1.idJugador === miIdJugadorSocketRef.current && mano1.idJugador === currentPlayerId) pIds1 = playableFichaIds;
        // pIds para otros jugadores no son relevantes para la UI de selección de ficha
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
      <main className="flex-grow relative flex justify-center items-center p-4">
        <MesaDomino
          fichasEnMesa={combinedFichasParaMesa}
          ref={mesaRef}
          posicionAnclaFija={posicionAnclaFija} // Usar la variable memoizada
          onFichaClick={handleMesaFichaClick} // Usar la función memoizada
          onMesaDimensionsChange={handleMesaDimensionsChange} // Esta ya está con useCallback
          fichaAnimandose={fichaAnimandose}
          jugadoresInfo={manosJugadores.map(j => ({id: j.idJugador, ordenTurno: j.ordenTurno}))} // Pasar info de jugadores para la animación
          miIdJugador={miIdJugadorSocketRef.current}
        />
        <DebugInfoOverlay
          viewportWidth={viewportDims.width} viewportHeight={viewportDims.height}
          mesaWidth={mesaDims.width} mesaHeight={mesaDims.height} mesaScale={mesaDims.scale}
          dominoConstWidth={DOMINO_WIDTH_PX} dominoConstHeight={DOMINO_HEIGHT_PX}
        />
        {currentPlayerId && <div className="absolute bottom-4 right-4 text-white bg-black bg-opacity-75 p-2 rounded shadow-lg z-10">Turno de: {manosJugadores.find(j=>j.idJugador === currentPlayerId)?.nombre || currentPlayerId}</div>}
        
        <div className="absolute bottom-16 left-4 text-white bg-black bg-opacity-75 p-2 rounded shadow-lg z-10 text-xs">
          <p>Mi ID: {miIdJugadorSocketRef.current}</p>
          Jugadores:
          <ul>
            {manosJugadores.map(j => (
              <li key={j.idJugador} className={j.idJugador === currentPlayerId ? 'font-bold' : ''}>
                {j.nombre} ({j.idJugador.slice(-4)}): {j.numFichas} fichas {j.estaConectado ? '(C)' : '(D)'} {j.ordenTurno}
              </li>
            ))}
          </ul>
        </div>

        {fichaSeleccionadaActual && fichaSeleccionada && fichaSeleccionada.idJugadorMano === currentPlayerId && fichaSeleccionada.idJugadorMano === miIdJugadorSocketRef.current && (
          <div className="absolute top-4 right-4 flex flex-col gap-2 items-end p-2 bg-black bg-opacity-75 rounded shadow-lg z-10">
            <p className="text-white text-sm font-semibold">Jugar: {fichaSeleccionadaActual.valorSuperior}-{fichaSeleccionadaActual.valorInferior}</p>
            {!anclaFicha ? ( // Si es la primera ficha, solo un botón para jugar (el extremo es manejado por el servidor)
               <button className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-3 rounded text-sm w-full text-center" onClick={() => handleJugarFichaServidor('derecha', fichaSeleccionada.idFicha)}>
                {textoBotonIzquierda}
              </button>
            ) : ( // No es la primera ficha
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
                {/* Si no puede jugar en ningún extremo pero tiene ficha seleccionada (esto no debería pasar si playableFichaIds funciona) */}
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

         {/* Indicador de Tiempo de Turno */}
         {currentPlayerId === miIdJugadorSocketRef.current && tiempoTurnoRestante !== null && tiempoTurnoRestante > 0 && !resultadoMano && (
          <div className="absolute top-4 right-4 bg-yellow-500 text-white p-2 rounded-full shadow-lg text-lg font-bold animate-pulse z-30">
            {tiempoTurnoRestante}s
          </div>
        )}

        
        {esMiTurnoYNoPuedoJugar && !resultadoMano && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            <button onClick={handlePasarTurnoServidor} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg text-lg shadow-md">
              Pasar Turno
            </button>
          </div>
        )}
      </main>

      {/* Mano del Jugador Principal (Abajo) - jugador local */}
      {mano1 && mano1.idJugador === miIdJugadorSocketRef.current && (
        <motion.div className="fixed bottom-0 left-0 right-0 z-20 flex justify-center" initial={{ y: 120 }} animate={{ y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
          <ManoJugadorComponent
            fichas={mano1.fichas} // Fichas reales
            fichaSeleccionada={fichaSeleccionada?.idFicha}
            onFichaClick={handleFichaClick}
            idJugadorMano={mano1.idJugador}
            layoutDirection="row"
            isLocalPlayer={true} // This is the local player's hand
            playableFichaIds={pIds1}
            onFichaDragEnd={handleFichaDragEnd} // Pasar el handler de drag end
            // numFichas={mano1.numFichas} // Ya se infiere de mano1.fichas.length
          />
        </motion.div>
      )}

      {/* Mano del Jugador Derecha (Visualmente) */}
      {mano2 && (
        <div className="fixed right-0 top-1/2 -translate-y-1/2 z-20 bg-domino-black bg-opacity-10 rounded-md max-h-[80vh]">
          <ManoJugadorComponent
            fichas={[]} // No mostrar fichas reales
            onFichaClick={() => {}} // No interactuable
            idJugadorMano={mano2.idJugador}
            isLocalPlayer={false} // Not the local player
            layoutDirection="col"
            numFichas={mano2.numFichas}
          />
        </div>
      )}
      
      {/* Mano del Jugador Arriba (Visualmente) */}
      {mano3 && (
         <div className="fixed top-16 left-1/2 -translate-x-1/2 z-20 p-1 bg-domino-black bg-opacity-10 rounded-md max-w-[80vw]">
          <ManoJugadorComponent
            fichas={[]}
            onFichaClick={() => {}}
            idJugadorMano={mano3.idJugador}
            isLocalPlayer={false} // Not the local player
            layoutDirection="row"
            numFichas={mano3.numFichas}
          />
        </div>
      )}

      {/* Mano del Jugador Izquierda (Visualmente) */}
      {mano4 && (
        <div className="fixed left-0 top-1/2 -translate-y-1/2 z-20 bg-domino-black bg-opacity-10 rounded-md max-h-[80vh]">
          <ManoJugadorComponent
            fichas={[]}
            onFichaClick={() => {}}
            idJugadorMano={mano4.idJugador}
            isLocalPlayer={false} // Not the local player
            layoutDirection="col"
            numFichas={mano4.numFichas}
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
            {/* Aquí podrías añadir un botón para "Siguiente Mano" o "Ver Puntuaciones" */}
          </motion.div>
        </div>
      )}
    </div>
  );
}
