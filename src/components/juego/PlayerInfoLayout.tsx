// PlayerInfoLayout.tsx
import React, { useMemo } from 'react';
import ContenedorInfoJugador from '@/components/jugador/ContenedorInfoJugador';
// Importar tipos desde el nuevo archivo centralizado
import { JugadorCliente, EstadoMesaPublicoCliente, EstadoRondaPublicoCliente, FinDeRondaPayloadCliente } from '@/types/domino';
import { FichaEnMesaParaLogica } from '@/utils/dominoUtils'; // Importar el tipo necesario

interface PlayerInfoLayoutProps {
  manosJugadores: JugadorCliente[];
  miIdJugadorSocket: string | null;
  estadoMesaCliente: EstadoMesaPublicoCliente | null;
  rondaActualParaUI: EstadoRondaPublicoCliente | undefined;
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

const PlayerInfoLayout: React.FC<PlayerInfoLayoutProps> = ({
  manosJugadores,
  miIdJugadorSocket,
  estadoMesaCliente,
  rondaActualParaUI,
  tiempoTurnoRestante,
  duracionTurnoActualConfigurada,
  autoPaseInfoCliente,
  finRondaInfoVisible,
  finRondaData,
}) => {

  const posicionesVisuales = useMemo(() => {
    const posiciones: { [key: string]: JugadorCliente | undefined } = {
      abajo: undefined,
      izquierda: undefined,
      arriba: undefined,
      derecha: undefined,
    };

    if (!miIdJugadorSocket || !estadoMesaCliente || !manosJugadores || !estadoMesaCliente.partidaActual) {
      return posiciones;
    }

    // Filtrar solo los jugadores que tienen un seatIndex definido (participan en la partida actual)
    // y que están en la lista de manosJugadores (que es el estado local del cliente para la UI)
    const jugadoresEnPartidaConMano = manosJugadores.filter(j => 
      typeof j.seatIndex === 'number' && 
      estadoMesaCliente.partidaActual?.jugadoresParticipantesIds.includes(j.idJugador)
    );
    const numTotalJugadoresEnPartida = jugadoresEnPartidaConMano.length;

    const miJugadorInfo = jugadoresEnPartidaConMano.find(j => j.idJugador === miIdJugadorSocket);
    const miSeatIndex = miJugadorInfo?.seatIndex;

    if (miJugadorInfo && typeof miSeatIndex === 'number' && numTotalJugadoresEnPartida > 0) {
      posiciones.abajo = miJugadorInfo;

      const otrosJugadores = jugadoresEnPartidaConMano.filter(j => j.idJugador !== miIdJugadorSocket);

      // Ordenar los otros jugadores por su seatIndex para una asignación predecible,
      // aunque la lógica de abajo los colocará correctamente por su seatIndex relativo.
      otrosJugadores.sort((a, b) => (a.seatIndex ?? Infinity) - (b.seatIndex ?? Infinity));

      otrosJugadores.forEach(jugador => {
        if (typeof jugador.seatIndex === 'number') {
          // La diferencia de asientos determina la posición relativa
          const diff = (jugador.seatIndex - miSeatIndex + numTotalJugadoresEnPartida) % numTotalJugadoresEnPartida;
          
          if (numTotalJugadoresEnPartida === 2) {
            if (diff === 1) posiciones.arriba = jugador;
          } else if (numTotalJugadoresEnPartida === 3) {
            // Para 3 jugadores: Asumimos: 0 (yo), 1 (izquierda), 2 (derecha)
            // Si miSeatIndex es 0: jugador con seatIndex 1 va a la izquierda (diff 1)
            //                       jugador con seatIndex 2 va a la derecha (diff 2)
            // Si miSeatIndex es 1: jugador con seatIndex 2 va a la izquierda (diff 1)
            //                       jugador con seatIndex 0 va a la derecha (diff 2)
            // Si miSeatIndex es 2: jugador con seatIndex 0 va a la izquierda (diff 1)
            //                       jugador con seatIndex 1 va a la derecha (diff 2)
            if (diff === 1) posiciones.izquierda = jugador; 
            else if (diff === 2) posiciones.derecha = jugador; 
          } else if (numTotalJugadoresEnPartida === 4) {
            if (diff === 1) posiciones.izquierda = jugador;
            else if (diff === 2) posiciones.arriba = jugador;
            else if (diff === 3) posiciones.derecha = jugador;
          }
        }
      });
    }
    return posiciones;
  }, [manosJugadores, miIdJugadorSocket, estadoMesaCliente]);

  if (!estadoMesaCliente) {
    return null; // No renderizar si no hay estado de mesa
  }

  // Mapeo de posiciones lógicas a clases de Tailwind y props para ContenedorInfoJugador
  const layoutConfig: Record<string, { 
    containerClasses: string; 
    contentWrapperClasses?: string; 
    contenedorInfoClassName: string;
    infoPos: 'abajo' | 'arriba' | 'izquierda' | 'derecha';
  }> = {
    abajo: { 
      containerClasses: "fixed bottom-0 left-0 right-0 z-20 grid grid-cols-[1fr_auto_1fr] items-end gap-x-2 px-2 pb-1",
      contentWrapperClasses: "flex justify-center",
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
      contentWrapperClasses: "flex justify-center col-start-2",
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
        if (!config) return null; // Si por alguna razón la posición no está en layoutConfig

        const esJugadorLocalAbajo = posKey === 'abajo' && jugador.idJugador === miIdJugadorSocket;
        const jugadorInfoDelServidor = estadoMesaCliente?.jugadores.find(j => j.id === jugador.idJugador);

        return (
          <div key={jugador.idJugador + '-' + posKey} className={config.containerClasses}>
            {(posKey === 'abajo' || posKey === 'arriba') && <div className="w-full"></div>} {/* Espaciadores para grid de 3 columnas */}
            
            <div className={config.contentWrapperClasses || ""}>
              <ContenedorInfoJugador
                idJugadorProp={jugador.idJugador}
                nombreJugador={jugador.nombre}
                avatarUrl={jugadorInfoDelServidor?.image || undefined}
                esTurnoActual={!!(rondaActualParaUI && jugador.idJugador === rondaActualParaUI.currentPlayerId && !finRondaInfoVisible)}
                tiempoRestante={tiempoTurnoRestante}
                duracionTotalTurno={duracionTurnoActualConfigurada}
                posicion={config.infoPos}
                autoPaseInfo={autoPaseInfoCliente}
                numFichas={esJugadorLocalAbajo ? undefined : jugador.numFichas}
                fichasRestantesAlFinalizar={
                  finRondaInfoVisible && finRondaData?.resultadoPayload?.manosFinales && !esJugadorLocalAbajo
                    ? finRondaData.resultadoPayload.manosFinales.find(m => m.jugadorId === jugador.idJugador)?.fichas
                    : undefined
                }
                mostrarFichasFinales={finRondaInfoVisible && !esJugadorLocalAbajo}
                className={config.contenedorInfoClassName}
              />
            </div>
            
            {/* Para el jugador local (abajo), el espacio de la mano se maneja en JuegoPage, aquí solo un div para el grid si es necesario */}
            {posKey === 'abajo' && esJugadorLocalAbajo && (
              <div className="flex justify-center">
                {/* Este div es parte del grid de 3 columnas para la posición 'abajo'. La mano real se renderiza en JuegoPage.tsx */}
              </div>
            )}
            {(posKey === 'abajo' || posKey === 'arriba') && <div className="w-full"></div>} {/* Espaciadores para grid de 3 columnas */}
          </div>
        );
      })}
    </>
  );
};

export default PlayerInfoLayout;
