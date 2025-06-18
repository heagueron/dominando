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
  // Log de las props recibidas por el componente
  console.log('[PlayerInfoLayout RENDER] Props recibidas:', { 
    manosJugadores, 
    miIdJugadorSocket, 
    estadoMesaClienteIsEmpty: !estadoMesaCliente,
    estadoMesaClienteJugadoresCount: estadoMesaCliente?.jugadores?.length 
  });

  const posicionesVisuales = useMemo(() => {
    console.log('[PlayerInfoLayout useMemo] Calculando posicionesVisuales. Props dentro de useMemo:', { 
      manosJugadores, 
      miIdJugadorSocket, 
      estadoMesaClienteIsEmpty: !estadoMesaCliente,
      partidaActualExists: !!estadoMesaCliente?.partidaActual // Aunque ya no es crítico para la guarda principal
    });

    const posiciones: { [key: string]: JugadorCliente | undefined } = {
      abajo: undefined,
      izquierda: undefined,
      arriba: undefined,
      derecha: undefined,
    };

    if (!miIdJugadorSocket || !estadoMesaCliente || !manosJugadores || manosJugadores.length === 0) {
      console.log('[PlayerInfoLayout useMemo] Guard clause triggered. Returning empty posiciones.', {
        hasMiId: !!miIdJugadorSocket,
        hasEstadoMesa: !!estadoMesaCliente,
        manosJugadoresLength: manosJugadores?.length
      });
      return posiciones;
    }

    const jugadoresConSeatAsignado = manosJugadores.filter(j => 
      typeof j.seatIndex === 'number'
    );
    console.log('[PlayerInfoLayout useMemo] jugadoresConSeatAsignado (filtrados de manosJugadores):', JSON.stringify(jugadoresConSeatAsignado.map(j => ({id: j.idJugador, seatIndex: j.seatIndex, nombre: j.nombre}))));
    
    const numTotalJugadoresEnPartida = jugadoresConSeatAsignado.length;
    console.log('[PlayerInfoLayout useMemo] numTotalJugadoresEnPartida:', numTotalJugadoresEnPartida);

    const miJugadorInfo = jugadoresConSeatAsignado.find(j => j.idJugador === miIdJugadorSocket);
    console.log('[PlayerInfoLayout useMemo] miJugadorInfo (encontrado en jugadoresConSeatAsignado):', miJugadorInfo ? JSON.stringify({id: miJugadorInfo.idJugador, seatIndex: miJugadorInfo.seatIndex, nombre: miJugadorInfo.nombre}) : 'No encontrado');
    
    const miSeatIndex = miJugadorInfo?.seatIndex;
    console.log('[PlayerInfoLayout useMemo] miSeatIndex:', miSeatIndex);

    if (miJugadorInfo && typeof miSeatIndex === 'number' && numTotalJugadoresEnPartida > 0) {
      posiciones.abajo = miJugadorInfo;
      console.log('[PlayerInfoLayout useMemo] Jugador local asignado a "abajo":', JSON.stringify(miJugadorInfo));

      const otrosJugadores = jugadoresConSeatAsignado.filter(j => j.idJugador !== miIdJugadorSocket);
      console.log('[PlayerInfoLayout useMemo] otrosJugadores (para posicionar):', JSON.stringify(otrosJugadores.map(j => ({id: j.idJugador, seatIndex: j.seatIndex, nombre: j.nombre}))));

      otrosJugadores.sort((a, b) => (a.seatIndex ?? Infinity) - (b.seatIndex ?? Infinity));

      otrosJugadores.forEach(jugador => {
        if (typeof jugador.seatIndex === 'number') {
          const diff = (jugador.seatIndex - miSeatIndex + numTotalJugadoresEnPartida) % numTotalJugadoresEnPartida;
          console.log(`[PlayerInfoLayout useMemo] Procesando otro jugador: ${jugador.nombre}, seatIndex: ${jugador.seatIndex}, diff con miSeatIndex (${miSeatIndex}): ${diff}`);
          
          if (numTotalJugadoresEnPartida === 2) {
            if (diff === 1) { posiciones.arriba = jugador; console.log(`  Asignado a "arriba"`); }
          } else if (numTotalJugadoresEnPartida === 3) {
            if (diff === 1) { posiciones.izquierda = jugador; console.log(`  Asignado a "izquierda"`); }
            else if (diff === 2) { posiciones.derecha = jugador; console.log(`  Asignado a "derecha"`); }
          } else if (numTotalJugadoresEnPartida === 4) {
            if (diff === 1) { posiciones.izquierda = jugador; console.log(`  Asignado a "izquierda"`); }
            else if (diff === 2) { posiciones.arriba = jugador; console.log(`  Asignado a "arriba"`); }
            else if (diff === 3) { posiciones.derecha = jugador; console.log(`  Asignado a "derecha"`); }
          }
        }
      });
    } else {
      console.warn('[PlayerInfoLayout useMemo] No se pudo asignar jugador local a "abajo" o no hay suficientes jugadores.', {
        miJugadorInfoExists: !!miJugadorInfo, 
        miSeatIndex, 
        numTotalJugadoresEnPartida
      });
    }
    console.log('[PlayerInfoLayout useMemo] Posiciones finales calculadas:', JSON.stringify(Object.fromEntries(Object.entries(posiciones).map(([k,v]) => [k, v ? {id:v.idJugador, nombre:v.nombre, seatIndex: v.seatIndex} : undefined]))));
    return posiciones;
  }, [manosJugadores, miIdJugadorSocket, estadoMesaCliente]);

  if (!estadoMesaCliente) {
    console.log('[PlayerInfoLayout RENDER] estadoMesaCliente es null, no se renderiza nada.');
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

        const esJugadorLocalAbajo = posKey === 'abajo' && jugador.idJugador === miIdJugadorSocket;
        const jugadorInfoDelServidor = estadoMesaCliente?.jugadores.find(j => j.id === jugador.idJugador);

        // Manejo especial para el jugador local en la posición "abajo"
        if (esJugadorLocalAbajo) {
          return (
            <div key={jugador.idJugador + '-' + posKey} className={config.containerClasses}>
              {/* Columna 1: Información del jugador local */}
              <div className="flex justify-center items-end"> {/* Alinea el contenido al centro de esta celda */}
                <ContenedorInfoJugador
                  idJugadorProp={jugador.idJugador}
                  nombreJugador={jugador.nombre}
                  avatarUrl={jugadorInfoDelServidor?.image || undefined}
                  esTurnoActual={!!(rondaActualParaUI && jugador.idJugador === rondaActualParaUI.currentPlayerId && !finRondaInfoVisible)}
                  tiempoRestante={tiempoTurnoRestante}
                  duracionTotalTurno={duracionTurnoActualConfigurada}
                  posicion={config.infoPos}
                  autoPaseInfo={autoPaseInfoCliente}
                  numFichas={undefined} // No mostrar para el jugador local aquí
                  fichasRestantesAlFinalizar={undefined} // No aplica para el jugador local aquí
                  mostrarFichasFinales={false} // No aplica para el jugador local aquí
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
          <div key={jugador.idJugador + '-' + posKey} className={config.containerClasses}>
            {posKey === 'arriba' && <div className="w-full"></div>} {/* Espaciador izquierdo para el jugador de arriba */}
            
            <div className={config.contentWrapperClasses || (posKey === 'izquierda' || posKey === 'derecha' ? "flex flex-col items-center" : "")}>
              <ContenedorInfoJugador
                idJugadorProp={jugador.idJugador}
                nombreJugador={jugador.nombre}
                avatarUrl={jugadorInfoDelServidor?.image || undefined}
                esTurnoActual={!!(rondaActualParaUI && jugador.idJugador === rondaActualParaUI.currentPlayerId && !finRondaInfoVisible)}
                tiempoRestante={tiempoTurnoRestante}
                duracionTotalTurno={duracionTurnoActualConfigurada}
                posicion={config.infoPos}
                autoPaseInfo={autoPaseInfoCliente}
                numFichas={jugador.numFichas}
                fichasRestantesAlFinalizar={
                  finRondaInfoVisible && finRondaData?.resultadoPayload?.manosFinales
                    ? finRondaData.resultadoPayload.manosFinales.find(m => m.jugadorId === jugador.idJugador)?.fichas
                    : undefined
                }
                mostrarFichasFinales={finRondaInfoVisible}
                className={config.contenedorInfoClassName}
              />
            </div>
            
            {posKey === 'arriba' && <div className="w-full"></div>} {/* Espaciador derecho para el jugador de arriba */}
          </div>
        );
      })}
    </>
  );
};

export default PlayerInfoLayout;
