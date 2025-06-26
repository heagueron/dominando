// DominoModals.tsx
import React from 'react';
import { motion } from 'framer-motion';
// Importar tipos desde el nuevo archivo centralizado
import { FinDeRondaPayloadCliente, EstadoMesaPublicoCliente, FinDePartidaPayloadCliente, GameMode } from '@/types/domino';

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
  onPlayAgain: () => void; // NUEVA PROP: Función para manejar el clic en "Jugar de Nuevo"
}

const DominoModals: React.FC<DominoModalsProps> = ({
  showRotateMessage,
  finRondaInfoVisible,
  finRondaData,
  estadoMesaCliente,
  mensajeTransicion,
  finPartidaData, // Nuevo prop
  onPlayAgain, // Desestructurar la nueva prop
}) => {
  // Añadimos un log para ver el payload completo cuando el modal se renderiza
  if (finRondaInfoVisible && finRondaData) {
    console.log('[DominoModals] Renderizando modal. Payload completo recibido:', JSON.stringify(finRondaData.resultadoPayload, null, 2));
  }

  const isSingleRoundMode = estadoMesaCliente?.partidaActual?.gameMode === GameMode.SINGLE_ROUND;
  const isTrancado = finRondaData?.resultadoPayload.tipoFinRonda === 'trancado';

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

      {/* Modal de Fin de Ronda (Rediseñado) */}
      {finRondaInfoVisible && finRondaData?.resultadoPayload && ( // Asegurarse de que el modal de fin de partida no esté activo
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-40 p-4">
          <motion.div
            className="bg-yellow-50 border-2 border-yellow-500 p-4 sm:p-6 rounded-lg shadow-2xl text-center max-w-lg w-full bg-opacity-30"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}>
            {/* Fila 1: Título */}
            <h2 className="text-2xl sm:text-3xl font-bold text-yellow-800 mb-4">
                {isSingleRoundMode ? 'Fin de la Ronda - Partida' : 'Fin de la Ronda'}
            </h2>

            {/* Fila 2: Ganador y Puntos (Layout condicional) */}
            {isSingleRoundMode ? (
              // Layout para Ronda Única: Ganador centrado
              <div className="flex flex-col items-center mb-6">
                <p className="text-md sm:text-lg font-semibold text-yellow-700 mb-1">Ganador</p>
                <div className="bg-yellow-100 border border-yellow-400 rounded-md p-2 w-full max-w-[250px] truncate">
                  <p className="text-lg sm:text-xl font-bold text-yellow-900">
                    {finRondaData.resultadoPayload.nombreGanador || finRondaData.resultadoPayload.ganadorRondaId || 'N/A'}
                  </p>
                </div>
              </div>
            ) : (
              // Layout para Partida Completa: 2 columnas
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Columna A: Ganador */}
                <div className="flex flex-col items-center">
                  <p className="text-md sm:text-lg font-semibold text-yellow-700 mb-1">Ganador</p>
                  <div className="bg-yellow-100 border border-yellow-400 rounded-md p-2 w-full max-w-[200px] truncate">
                    <p className="text-lg sm:text-xl font-bold text-yellow-900">
                      {finRondaData.resultadoPayload.nombreGanador || finRondaData.resultadoPayload.ganadorRondaId || 'N/A'}
                    </p>
                  </div>
                </div>
                {/* Columna B: Puntos */}
                <div className="flex flex-col items-center">
                  <p className="text-md sm:text-lg font-semibold text-yellow-700 mb-1">Puntos</p>
                  <div className="bg-yellow-100 border border-yellow-400 rounded-md p-2 w-full max-w-[150px] truncate">
                    <p className="text-lg sm:text-xl font-bold text-yellow-900">
                      {finRondaData.resultadoPayload.puntosGanadosEstaRonda ?? 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Conditional display for block (tranque) */}
            {isTrancado || !isSingleRoundMode ? ( // Show this section if trancado OR if it's FULL_GAME
                <>
                    {/* Fila 3: Línea de Separación */}
                    <hr className="border-t-2 border-yellow-300 my-4" />

                    {/* Fila 4: Título "Puntos de la Ronda - Partida" */}
                    <h3 className="text-xl sm:text-2xl font-bold text-yellow-800 mb-4">
                        {isSingleRoundMode ? 'Puntos de la Ronda - Partida' : 'Puntos de la Partida'}
                    </h3>

                    {/* Fila 5: Tabla de Puntos (condicional según el modo de juego) */}
                    {isSingleRoundMode ? (
                        // Table for SINGLE_ROUND (Jugador, Total)
                        (finRondaData.resultadoPayload.puntuaciones && finRondaData.resultadoPayload.puntuaciones.length > 0) ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full bg-yellow-100 border border-yellow-300 rounded-lg text-sm sm:text-base">
                                    <thead>
                                        <tr className="bg-yellow-200 text-yellow-800">
                                            <th className="py-2 px-3 text-left">Jugador</th>
                                            <th className="py-2 px-3 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {finRondaData.resultadoPayload.puntuaciones
                                            .sort((a, b) => a.puntos - b.puntos) // Sort by points ascending for block
                                            .map(score => {
                                                const jugadorInfo = estadoMesaCliente?.jugadores.find(j => j.id === score.jugadorId);
                                                return (
                                                    <tr key={score.jugadorId} className="border-t border-yellow-200">
                                                        <td className="py-2 px-3 text-left font-medium text-yellow-900 truncate">{jugadorInfo?.nombre || score.jugadorId}</td>
                                                        <td className="py-2 px-3 text-right text-gray-900 font-bold">{score.puntos}</td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-yellow-700">No hay puntuaciones de ronda disponibles.</p>
                        )
                    ) : (
                        // Table for FULL_GAME (Jugador, Previos, Total) - current implementation
                        (finRondaData.resultadoPayload.puntuacionesPartidaActualizadas && finRondaData.resultadoPayload.puntuacionesPartidaActualizadas.length > 0) ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full bg-yellow-100 border border-yellow-300 rounded-lg text-sm sm:text-base">
                                    <thead>
                                        <tr className="bg-yellow-200 text-yellow-800">
                                            <th className="py-2 px-3 text-left">Jugador</th>
                                            <th className="py-2 px-3 text-right">Previos</th>
                                            <th className="py-2 px-3 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {finRondaData.resultadoPayload.puntuacionesPartidaActualizadas
                                            .sort((a, b) => b.puntos - a.puntos) // Sort by total points descending
                                            .map(currentScore => {
                                                const jugadorInfo = estadoMesaCliente?.jugadores.find(j => j.id === currentScore.jugadorId);
                                                const previousScore = finRondaData.resultadoPayload.puntuacionesPartidaPrevias?.find(p => p.jugadorId === currentScore.jugadorId)?.puntos ?? 0;
                                                return (
                                                    <tr key={currentScore.jugadorId} className="border-t border-yellow-200">
                                                        <td className="py-2 px-3 text-left font-medium text-yellow-900 truncate">{jugadorInfo?.nombre || currentScore.jugadorId}</td>
                                                        <td className="py-2 px-3 text-right text-gray-900">{previousScore}</td>
                                                        <td className="py-2 px-3 text-right font-bold text-gray-900">{currentScore.puntos}</td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-yellow-700">No hay puntuaciones de partida disponibles.</p>
                        )
                    )}
                </>
            ) : null} {/* If not trancado AND isSingleRoundMode, don't show this section */}

            {/* Declaración del ganador de la partida (si aplica) */}
            {estadoMesaCliente?.partidaActual?.ganadorPartidaId && (
                <motion.div
                    className="mt-6 p-3 bg-yellow-200 border border-yellow-500 rounded-lg shadow-md"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.3 }}
                >
                    <p className="text-lg sm:text-xl font-bold text-yellow-900">
                        ¡{estadoMesaCliente.jugadores.find(j => j.id === estadoMesaCliente.partidaActual?.ganadorPartidaId)?.nombre || 'Un jugador'} ha ganado la partida!
                    </p>
                </motion.div>
            )}
          </motion.div>
        </div>
      )}

      {/* Modal de Fin de Partida (Game Over) */}
      {finPartidaData && estadoMesaCliente?.estadoGeneralMesa === 'esperandoParaSiguientePartida' && (
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
              {/* Botón "Jugar de Nuevo" para FULL_GAME */}
              {estadoMesaCliente?.partidaActual?.gameMode === GameMode.FULL_GAME && (
                <button
                  onClick={onPlayAgain} // Llama a la función pasada por prop
                  className="mt-6 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-md">Jugar de Nuevo</button>)}
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
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-40 p-4">
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
