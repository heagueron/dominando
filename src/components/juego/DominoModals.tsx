// DominoModals.tsx
import React from 'react';
import { motion } from 'framer-motion';
// Importar tipos desde el nuevo archivo centralizado
import { FinDeRondaPayloadCliente, EstadoMesaPublicoCliente, GameMode, FinDePartidaPayloadCliente } from '@/types/domino';

interface DominoModalsProps {
  showRotateMessage: boolean;
  finRondaInfoVisible: boolean;
  finRondaData: {
    resultadoPayload: FinDeRondaPayloadCliente;
    // No necesitamos fichasEnMesaSnapshot ni posicionAnclaSnapshot aquí, ya que el modal no los usa directamente.
  } | null;
  estadoMesaCliente: EstadoMesaPublicoCliente | null; // Para info de jugadores en FinDeRondaModal
  mensajeTransicion: string | null;
  finPartidaData: FinDePartidaPayloadCliente | null; // Nuevo prop para el modal de fin de partida
}

const DominoModals: React.FC<DominoModalsProps> = ({
  showRotateMessage,
  finRondaInfoVisible,
  finRondaData,
  estadoMesaCliente,
  mensajeTransicion,
  finPartidaData, // Nuevo prop
}) => {
  return (
    <>
      {/* Modal de Rotar Dispositivo */}
      {showRotateMessage && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.95)', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', zIndex: 10000, padding: '20px' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '20px' }}><path d="M16.466 7.5C15.643 4.237 13.952 2 12 2 9.239 2 7 6.477 7 12s2.239 10 5 10c.342 0 .677-.069 1-.2M10.534 16.5C11.357 19.763 13.048 22 15 22c2.761 0 5-4.477 5-10s-2.239-10-5-10c-.342 0-.677-.069-1 .2"/></svg>
          <h2 style={{ fontSize: '1.5em', marginBottom: '10px' }}>Por favor, rota tu dispositivo</h2>
          <p>Para una mejor experiencia, usa el modo horizontal.</p>
        </div>
      )}

      {/* Modal de Fin de Ronda */}
      {finRondaInfoVisible && finRondaData?.resultadoPayload && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-40 p-4">
          <motion.div
            className="bg-yellow-50 border-2 border-yellow-500 p-4 sm:p-6 rounded-lg shadow-2xl text-center max-w-md w-full"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}>
            <p className="text-xl sm:text-2xl font-bold text-yellow-800 mb-2">
              {estadoMesaCliente?.partidaActual?.gameMode === GameMode.SINGLE_ROUND ? 'Partida Finalizada' : 'Ronda Finalizada'}
            </p>
            <p className="text-md sm:text-lg font-medium text-yellow-700 mb-1">
              {finRondaData.resultadoPayload.tipoFinRonda === 'trancado' ? 'Resultado: Trancado' :
               (finRondaData.resultadoPayload.ganadorRondaId ? 'Resultado: Dominó' : 'Resultado: Empate (Trancado sin ganador)')}
            </p>
            <p className="text-lg sm:text-xl font-semibold text-yellow-700 mb-4">
              Ganador: {finRondaData.resultadoPayload.nombreGanador || finRondaData.resultadoPayload.ganadorRondaId || 'N/A'}
            </p>

            {finRondaData.resultadoPayload.tipoFinRonda === 'trancado' &&
             finRondaData.resultadoPayload.puntuaciones &&
             finRondaData.resultadoPayload.puntuaciones.length > 0 &&
             estadoMesaCliente?.partidaActual?.gameMode === GameMode.SINGLE_ROUND && ( // Only show round points for SINGLE_ROUND
              <div className="mt-4 pt-3 border-t border-yellow-300">
                <h4 className="text-md sm:text-lg font-semibold text-yellow-700 mb-2">Puntos (Fichas Restantes):</h4>
                <ul className="text-left text-sm sm:text-base text-yellow-600 space-y-1 max-h-40 overflow-y-auto px-2">
                  {finRondaData.resultadoPayload.puntuaciones?.map(score => {
                    const jugadorInfo = estadoMesaCliente?.jugadores.find(j => j.id === score.jugadorId);
                    return (
                      <li key={`round-score-${score.jugadorId}`} className="flex justify-between">
                        <span className="truncate pr-2">{jugadorInfo?.nombre || score.jugadorId}</span>
                        <span className="font-medium">{score.puntos} puntos</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Mostrar puntuaciones acumuladas de la partida completa */}
             {(estadoMesaCliente?.partidaActual?.gameMode === GameMode.FULL_GAME || finRondaData.resultadoPayload.puntuacionesPartidaActualizadas) &&
             (finRondaData.resultadoPayload.puntuacionesPartidaActualizadas || estadoMesaCliente?.partidaActual?.puntuacionesPartida) &&
             ((finRondaData.resultadoPayload.puntuacionesPartidaActualizadas?.length || 0) > 0 || (estadoMesaCliente?.partidaActual?.puntuacionesPartida?.length || 0) > 0) && (
              <div className="mt-4 pt-3 border-t border-yellow-300">
                <h4 className="text-md sm:text-lg font-semibold text-yellow-700 mb-2">Puntuación Acumulada:</h4>
                <ul className="text-left text-sm sm:text-base text-yellow-600 space-y-1 max-h-40 overflow-y-auto px-2">
                  {(finRondaData.resultadoPayload.puntuacionesPartidaActualizadas || estadoMesaCliente!.partidaActual!.puntuacionesPartida)
                    .sort((a, b) => b.puntos - a.puntos) // Sort by points descending
                    .map(score => {
                      const jugadorInfo = estadoMesaCliente?.jugadores.find(j => j.id === score.jugadorId);
                      return (
                        <li key={`game-score-${score.jugadorId}`} className="flex justify-between">
                          <span className="truncate pr-2">{jugadorInfo?.nombre || score.jugadorId}</span>
                          <span className="font-medium">{score.puntos} puntos</span>
                        </li>
                      );
                    })}
                </ul>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Modal de Fin de Partida (Game Over) */}
      {finPartidaData && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <motion.div
            className="bg-green-50 border-2 border-green-500 p-4 sm:p-6 rounded-lg shadow-2xl text-center max-w-md w-full"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <p className="text-xl sm:text-2xl font-bold text-green-800 mb-2">¡Partida Terminada!</p>
            <p className="text-lg sm:text-xl font-semibold text-green-700 mb-4">
              Ganador de la Partida: {estadoMesaCliente?.jugadores.find(j => j.id === finPartidaData.ganadorPartidaId)?.nombre || finPartidaData.ganadorPartidaId || 'N/A'}
            </p>
            <div className="mt-4 pt-3 border-t border-green-300">
              <h4 className="text-md sm:text-lg font-semibold text-green-700 mb-2">Puntuaciones Finales:</h4>
              <ul className="text-left text-sm sm:text-base text-green-600 space-y-1 max-h-40 overflow-y-auto px-2">
                {finPartidaData.puntuacionesFinalesPartida
                  .sort((a, b) => b.puntos - a.puntos) // Sort by points descending
                  .map(score => {
                    const jugadorInfo = estadoMesaCliente?.jugadores.find(j => j.id === score.jugadorId);
                    return (
                      <li key={`final-game-score-${score.jugadorId}`} className="flex justify-between">
                        <span className="truncate pr-2">{jugadorInfo?.nombre || score.jugadorId}</span>
                        <span className="font-medium">{score.puntos} puntos</span>
                      </li>
                    );
                  })}
              </ul>
            </div>
          </motion.div>
        </div>
      )}

      {/* Mensaje de Transición a Nueva Partida/Ronda */}
      {mensajeTransicion && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <motion.div
            className="text-xl sm:text-2xl font-bold p-6 sm:p-8 bg-white shadow-xl rounded-lg text-gray-800"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {mensajeTransicion}
          </motion.div>
        </div>
      )}
    </>
  );
};

export default DominoModals;
