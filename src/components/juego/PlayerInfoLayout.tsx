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

  // Lógica para determinar la posición visual de cada jugador
  const { mano1, mano2, mano3, mano4 } = useMemo(() => {
    let mano1: JugadorCliente | undefined, mano2: JugadorCliente | undefined, mano3: JugadorCliente | undefined, mano4: JugadorCliente | undefined;

    if (miIdJugadorSocket && estadoMesaCliente) {
      const localPlayerId = miIdJugadorSocket;
      const localPlayer = manosJugadores.find(j => j.idJugador === localPlayerId);

      if (localPlayer) {
        mano1 = localPlayer;

        const numJugadoresEnRonda = estadoMesaCliente.partidaActual?.rondaActual?.jugadoresRonda.length || 0;

        if (typeof localPlayer.ordenTurno === 'number' && numJugadoresEnRonda >= 2 && numJugadoresEnRonda <= 4) {
          const ordenLocal = localPlayer.ordenTurno;

          const targetOrdenMano2 = (ordenLocal + 1) % numJugadoresEnRonda;
          const targetOrdenMano3 = (ordenLocal + 2) % numJugadoresEnRonda;
          const targetOrdenMano4 = (ordenLocal + 3) % numJugadoresEnRonda;

          mano2 = manosJugadores.find(j => j.idJugador !== localPlayerId && j.ordenTurno === targetOrdenMano2);

          if (numJugadoresEnRonda > 2) {
            mano3 = manosJugadores.find(j => j.idJugador !== localPlayerId && j.ordenTurno === targetOrdenMano3);
          }
          if (numJugadoresEnRonda > 3) {
            mano4 = manosJugadores.find(j => j.idJugador !== localPlayerId && j.ordenTurno === targetOrdenMano4);
          }

        } else {
          // Fallback visual si no hay orden de turno o número de jugadores inesperado
          const otrosJugadores = manosJugadores.filter(j => j.idJugador !== localPlayerId);
          if (otrosJugadores.length >= 1) mano2 = otrosJugadores[0];
          if (otrosJugadores.length >= 2) mano3 = otrosJugadores[1];
          if (otrosJugadores.length >= 3) mano4 = otrosJugadores[2];
        }
      }
    }

    return { mano1, mano2, mano3, mano4 };
  }, [manosJugadores, miIdJugadorSocket, estadoMesaCliente]); // Dependencias para recalcular si cambian

  if (!estadoMesaCliente) {
    return null; // No renderizar si no hay estado de mesa
  }

  return (
    <>
      {/* Jugador Local (Abajo) - Mano 1 */}
      {mano1 && mano1.idJugador === miIdJugadorSocket && (
        <div className="fixed bottom-0 left-0 right-0 z-20 grid grid-cols-[1fr_auto_1fr] items-end gap-x-2 px-2 pb-1">
          <div className="flex justify-center">
            <ContenedorInfoJugador
              idJugadorProp={mano1.idJugador}
              nombreJugador={mano1.nombre}
              esTurnoActual={!!(rondaActualParaUI && mano1.idJugador === rondaActualParaUI.currentPlayerId && !finRondaInfoVisible)}
              tiempoRestante={tiempoTurnoRestante}
              duracionTotalTurno={duracionTurnoActualConfigurada}
              posicion="abajo"
              autoPaseInfo={autoPaseInfoCliente}
              className="max-w-[180px] sm:max-w-[220px] md:max-w-xs"
              // Fichas restantes no se muestran para el jugador local aquí
            />
          </div>
          {/* El espacio para la mano del jugador local se renderiza en JuegoPage */}
          <div className="flex justify-center">
             {/* Placeholder para la mano del jugador local */}
          </div>
          <div className="w-full"></div>
        </div>
      )}

      {/* Oponente 1 (Derecha) - Mano 2 */}
      {mano2 && estadoMesaCliente && (
        <div className="fixed right-0 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
          <ContenedorInfoJugador
            idJugadorProp={mano2.idJugador}
            nombreJugador={mano2.nombre}
            esTurnoActual={!!(rondaActualParaUI && mano2.idJugador === rondaActualParaUI.currentPlayerId && !finRondaInfoVisible)}
            tiempoRestante={tiempoTurnoRestante}
            duracionTotalTurno={duracionTurnoActualConfigurada}
            posicion="derecha"
            autoPaseInfo={autoPaseInfoCliente}
            numFichas={mano2.numFichas}
            fichasRestantesAlFinalizar={
              finRondaInfoVisible && finRondaData?.resultadoPayload?.manosFinales
                ? finRondaData.resultadoPayload.manosFinales.find(m => m.jugadorId === mano2?.idJugador)?.fichas
                : undefined
            }
            mostrarFichasFinales={finRondaInfoVisible}
            className="mb-2 w-28 md:w-36"
          />
        </div>
      )}

      {/* Oponente 2 (Arriba) - Mano 3 */}
      {mano3 && estadoMesaCliente && (
         <div className="fixed top-2 left-0 right-0 z-20 grid grid-cols-3 items-start gap-2 px-2 pt-1">
          <div className="w-full"></div>
          <div className="flex justify-center">
            <ContenedorInfoJugador
              idJugadorProp={mano3.idJugador}
              nombreJugador={mano3.nombre}
              esTurnoActual={!!(rondaActualParaUI && mano3.idJugador === rondaActualParaUI.currentPlayerId && !finRondaInfoVisible)}
              tiempoRestante={tiempoTurnoRestante}
              duracionTotalTurno={duracionTurnoActualConfigurada}
              posicion="arriba"
              autoPaseInfo={autoPaseInfoCliente}
              numFichas={mano3.numFichas}
              fichasRestantesAlFinalizar={
                finRondaInfoVisible && finRondaData?.resultadoPayload?.manosFinales
                  ? finRondaData.resultadoPayload.manosFinales.find(m => m.jugadorId === mano3?.idJugador)?.fichas
                  : undefined
              }
              mostrarFichasFinales={finRondaInfoVisible}
              className="max-w-xs"
            />
          </div>
          <div className="w-full"></div>
        </div>
      )}

      {/* Oponente 3 (Izquierda) - Mano 4 */}
      {mano4 && estadoMesaCliente && (
        <div className="fixed left-0 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
          <ContenedorInfoJugador
            idJugadorProp={mano4.idJugador}
            nombreJugador={mano4.nombre}
            esTurnoActual={!!(rondaActualParaUI && mano4.idJugador === rondaActualParaUI.currentPlayerId && !finRondaInfoVisible)}
            tiempoRestante={tiempoTurnoRestante}
            duracionTotalTurno={duracionTurnoActualConfigurada}
            posicion="izquierda"
            autoPaseInfo={autoPaseInfoCliente}
            numFichas={mano4.numFichas}
            fichasRestantesAlFinalizar={
              finRondaInfoVisible && finRondaData?.resultadoPayload?.manosFinales
                ? finRondaData.resultadoPayload.manosFinales.find(m => m.jugadorId === mano4?.idJugador)?.fichas
                : undefined
            }
            mostrarFichasFinales={finRondaInfoVisible}
            className="mb-2 w-28 md:w-36"
          />
        </div>
      )}
    </>
  );
};

export default PlayerInfoLayout;