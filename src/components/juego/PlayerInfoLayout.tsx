// PlayerInfoLayout.tsx
import React, { useMemo } from 'react';
import ContenedorInfoJugador from '@/components/jugador/ContenedorInfoJugador';
// Importar tipos desde el nuevo archivo centralizado
import { EstadoRondaPublicoCliente, FinDeRondaPayloadCliente, JugadorPublicoInfoCliente, GameMode } from '@/types/domino';
import { FichaEnMesaParaLogica } from '@/utils/dominoUtils'; // Importar el tipo necesario

interface PlayerInfoLayoutProps {
  miIdJugadorSocket: string | null;
  // Granular props from estadoMesaCliente
  jugadoresMesa: JugadorPublicoInfoCliente[] | undefined;
  gameMode: GameMode | null | undefined;
  partidaActualPuntuaciones: { jugadorId: string, puntos: number }[] | undefined;
  rondaActualCurrentPlayerId: string | null | undefined;
  // Original props
  tiempoTurnoRestante: number | null;
  duracionTurnoActualConfigurada: number;
  autoPaseInfoCliente: EstadoRondaPublicoCliente['autoPaseInfo'] | null;
  finRondaInfoVisible: boolean;
  finRondaData: {
    resultadoPayload: FinDeRondaPayloadCliente;
    fichasEnMesaSnapshot: FichaEnMesaParaLogica[];
    posicionAnclaSnapshot: { fila: number; columna: number };
  } | null;
}

const PlayerInfoLayout: React.FC<PlayerInfoLayoutProps> = React.memo(({
  miIdJugadorSocket,
  // Granular props
  jugadoresMesa,
  gameMode,
  partidaActualPuntuaciones,
  rondaActualCurrentPlayerId,
  // Original props
  tiempoTurnoRestante,
  duracionTurnoActualConfigurada,
  autoPaseInfoCliente,
  finRondaInfoVisible,
  finRondaData,
}) => {
  // Log de las props recibidas por el componente
  /*console.log('[PlayerInfoLayout RENDER] Props recibidas:', { 
    manosJugadoresLength: manosJugadores?.length, 
    miIdJugadorSocket, 
    jugadoresMesaLength: jugadoresMesa?.length,
    partidaActualGameMode,
    rondaActualCurrentPlayerId,
    tiempoTurnoRestante,
    finRondaInfoVisible,
  });*/

  const posicionesVisuales = useMemo(() => {
    const posiciones: { [key: string]: JugadorPublicoInfoCliente | undefined } = {
      abajo: undefined,
      izquierda: undefined,
      arriba: undefined,
      derecha: undefined,
    };

    if (!miIdJugadorSocket || !jugadoresMesa || jugadoresMesa.length === 0) {
      return posiciones;
    }

    const jugadoresConSeatAsignado = jugadoresMesa.filter(j => typeof j.seatIndex === 'number');
    const numTotalJugadoresEnPartida = jugadoresConSeatAsignado.length;
    const miJugadorInfo = jugadoresConSeatAsignado.find(j => j.id === miIdJugadorSocket);
    const miSeatIndex = miJugadorInfo?.seatIndex;

    if (miJugadorInfo && typeof miSeatIndex === 'number' && numTotalJugadoresEnPartida > 0) {
      posiciones.abajo = miJugadorInfo;

      const otrosJugadores = jugadoresConSeatAsignado.filter(j => j.id !== miIdJugadorSocket);
      otrosJugadores.sort((a, b) => (a.seatIndex ?? Infinity) - (b.seatIndex ?? Infinity));

      otrosJugadores.forEach(jugador => {
        if (typeof jugador.seatIndex === 'number') {
          const diff = (jugador.seatIndex - miSeatIndex + numTotalJugadoresEnPartida) % numTotalJugadoresEnPartida;
          
          if (numTotalJugadoresEnPartida === 2) {
            if (diff === 1) { posiciones.arriba = jugador; }
          } else if (numTotalJugadoresEnPartida === 3) {
            if (diff === 1) { posiciones.izquierda = jugador; }
            else if (diff === 2) { posiciones.derecha = jugador; }
          } else if (numTotalJugadoresEnPartida === 4) {
            if (diff === 1) { posiciones.izquierda = jugador; }
            else if (diff === 2) { posiciones.arriba = jugador; }
            else if (diff === 3) { posiciones.derecha = jugador; }
          }
        }
      });
    } else {
      // Si el jugador local no está en la partida (ej. está esperando), igual mostramos a los demás.
      const jugadoresEnPartidaActiva = jugadoresMesa.filter(j => j.estadoJugadorEnMesa !== 'EsperandoPuesto');
      // Lógica de posicionamiento para observadores (simplificada, podría mejorarse)
      if (jugadoresEnPartidaActiva.length > 0) {
        posiciones.abajo = jugadoresEnPartidaActiva[0];
        if (jugadoresEnPartidaActiva[1]) posiciones.arriba = jugadoresEnPartidaActiva[1];
        if (jugadoresEnPartidaActiva[2]) posiciones.izquierda = jugadoresEnPartidaActiva[2];
        if (jugadoresEnPartidaActiva[3]) posiciones.derecha = jugadoresEnPartidaActiva[3];
      }
    }
    return posiciones;
  }, [jugadoresMesa, miIdJugadorSocket]);

  // Check if jugadoresMesa is null or undefined before proceeding
  if (!jugadoresMesa) {
    //console.log('[PlayerInfoLayout RENDER] jugadoresMesa es undefined, no se renderiza nada.');
    return null; 
  }
  
  if (!posicionesVisuales.abajo && miIdJugadorSocket) {
    console.warn('[PlayerInfoLayout RENDER] No se encontró jugador local (posicionesVisuales.abajo) para renderizar. Esto es inesperado si el jugador está en la mesa.');
  }

  const layoutConfig: Record<string, { 
    containerClasses: string; 
    contentWrapperClasses?: string; 
    contenedorInfoClassName: string;
    infoPos: 'abajo' | 'arriba' | 'izquierda' | 'derecha';
  }> = {
    abajo: { 
      containerClasses: "fixed bottom-0 left-0 right-0 z-20 grid grid-cols-[1fr_auto_1fr] items-end gap-x-2 px-2 pb-1",
      // contentWrapperClasses no se usará para el jugador local en 'abajo', se maneja directamente.
      contenedorInfoClassName: "max-w-[180px] sm:max-w-[220px] md:max-w-xs",
      infoPos: 'abajo' 
    },
    izquierda: { 
      containerClasses: "fixed left-0 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center",
      contenedorInfoClassName: "mb-2 w-28 md:w-36",
      infoPos: 'izquierda'
    },
    arriba: { 
      containerClasses: "fixed top-2 left-0 right-0 z-20 grid grid-cols-3 items-start gap-2 px-2 pt-1",
      contentWrapperClasses: "flex justify-center col-start-2", // Para centrar el ContenedorInfoJugador del oponente de arriba
      contenedorInfoClassName: "max-w-xs",
      infoPos: 'arriba'
    },
    derecha: { 
      containerClasses: "fixed right-0 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center",
      contenedorInfoClassName: "mb-2 w-28 md:w-36",
      infoPos: 'derecha'
    },
  };

  return (
    <>
      {Object.entries(posicionesVisuales).map(([posKey, jugador]) => {
        if (!jugador) return null;

        const config = layoutConfig[posKey];
        if (!config) return null;

        const esJugadorLocalAbajo = posKey === 'abajo' && jugador.id === miIdJugadorSocket;
        const jugadorInfoDelServidor = jugadoresMesa?.find(j => j.id === jugador.id);
        const puntosPartidaActual = partidaActualPuntuaciones?.find(p => p.jugadorId === jugador.id)?.puntos;
        const esJugadorEnEspera = jugadorInfoDelServidor?.estadoJugadorEnMesa === 'EsperandoPuesto';

        // Manejo especial para el jugador local en la posición "abajo"
        if (esJugadorLocalAbajo) {
          return (
            <div key={jugador.id + '-' + posKey} className={`${config.containerClasses} ${esJugadorEnEspera ? 'opacity-60' : ''}`}>
              {/* Columna 1: Información del jugador local */}
              <div className="flex justify-center items-end"> {/* Alinea el contenido al centro de esta celda */}
                <ContenedorInfoJugador
                  idJugadorProp={jugador.id}
                  nombreJugador={jugador.nombre}
                  avatarUrl={jugadorInfoDelServidor?.image || undefined}
                  gameMode={gameMode || undefined}
                  esTurnoActual={!!(rondaActualCurrentPlayerId && jugador.id === rondaActualCurrentPlayerId && !finRondaInfoVisible)}
                  tiempoRestante={tiempoTurnoRestante}
                  duracionTotalTurno={duracionTurnoActualConfigurada}
                  posicion={config.infoPos}
                  autoPaseInfo={autoPaseInfoCliente}
                  numFichas={jugador.numFichas} // No mostrar para el jugador local aquí
                  fichasRestantesAlFinalizar={undefined} // No aplica para el jugador local aquí
                  puntosPartidaActual={puntosPartidaActual} // Pasamos la nueva prop
                  mostrarFichasFinales={false} // No aplica para el jugador local aquí
                  estadoJugadorEnMesa={jugadorInfoDelServidor?.estadoJugadorEnMesa}
                  className={config.contenedorInfoClassName}
                />
              </div>
              {/* Columna 2: Espacio para la mano del jugador (renderizada por JuegoPage.tsx) */}
              <div className="flex justify-center">
                {/* Este espacio será ocupado por ManoJugadorComponent desde JuegoPage.tsx */}
              </div>
              {/* Columna 3: Vacía */}
              <div className="w-full"></div>
            </div>
          );
        }

        // Renderizado para otros jugadores (arriba, izquierda, derecha)
        return (
          <div key={jugador.id + '-' + posKey} className={`${config.containerClasses} ${esJugadorEnEspera ? 'opacity-60' : ''}`}>
            {posKey === 'arriba' && <div className="w-full"></div>} {/* Espaciador izquierdo para el jugador de arriba */}
            
            <div className={config.contentWrapperClasses || (posKey === 'izquierda' || posKey === 'derecha' ? "flex flex-col items-center" : "")}>
              <ContenedorInfoJugador
                idJugadorProp={jugador.id}
                nombreJugador={jugador.nombre}
                avatarUrl={jugadorInfoDelServidor?.image || undefined}
                gameMode={gameMode || undefined}
                esTurnoActual={!!(rondaActualCurrentPlayerId && jugador.id === rondaActualCurrentPlayerId && !finRondaInfoVisible)}
                tiempoRestante={tiempoTurnoRestante}
                duracionTotalTurno={duracionTurnoActualConfigurada}
                posicion={config.infoPos}
                autoPaseInfo={autoPaseInfoCliente}
                numFichas={jugador.numFichas}
                fichasRestantesAlFinalizar={
                  finRondaInfoVisible && finRondaData?.resultadoPayload?.manosFinales
                    ? finRondaData.resultadoPayload.manosFinales.find(m => m.jugadorId === jugador.id)?.fichas
                    : undefined
                }
                puntosPartidaActual={puntosPartidaActual} // Pasamos la nueva prop
                mostrarFichasFinales={finRondaInfoVisible}
                estadoJugadorEnMesa={jugadorInfoDelServidor?.estadoJugadorEnMesa}
                className={config.contenedorInfoClassName}
              />
            </div>
            
            {posKey === 'arriba' && <div className="w-full"></div>} {/* Espaciador derecho para el jugador de arriba */}
          </div>
        );
      })}
    </>
  );
});

PlayerInfoLayout.displayName = 'PlayerInfoLayout';

export default PlayerInfoLayout;
