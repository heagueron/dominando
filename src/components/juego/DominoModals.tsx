// DominoModals.tsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { calcularPuntosMano } from '@/utils/dominoUtils';
// Importar tipos desde el nuevo archivo centralizado
import { FinDeRondaPayloadCliente, EstadoMesaPublicoCliente, FinDePartidaPayloadCliente, GameMode } from '@/types/domino';
import ProgressTimerBar from '@/components/common/ProgressTimerBar';

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
  onSalirDeMesa: () => void; // NUEVA PROP: Función para manejar el clic en "Salir"
  onVerLobby: () => void; // NUEVA PROP: Función para ir al lobby sin salir de la mesa
}

const DominoModals: React.FC<DominoModalsProps> = ({
  showRotateMessage,
  finRondaInfoVisible,
  finRondaData,
  estadoMesaCliente,
  mensajeTransicion,
  finPartidaData, // Nuevo prop
  onPlayAgain, // Desestructurar la nueva prop
  onSalirDeMesa, // Desestructurar la nueva prop
  onVerLobby, // Desestructurar la nueva prop
}) => {
  // Añadimos un log para ver el payload completo cuando el modal se renderiza
  /*if (finRondaInfoVisible && finRondaData) {
    console.log('[DominoModals] Renderizando modal. Payload completo recibido:', JSON.stringify(finRondaData.resultadoPayload, null, 2));
  }*/

  const isSingleRoundMode = estadoMesaCliente?.partidaActual?.gameMode === GameMode.SINGLE_ROUND;
  const isTrancado = finRondaData?.resultadoPayload.tipoFinRonda === 'trancado';

  // Estado y efecto para la barra regresiva del modal de transición
  const [transitionTimer, setTransitionTimer] = useState<number | null>(null);
  const transitionTimerActive = Boolean(
    mensajeTransicion &&
    estadoMesaCliente?.reinicioTimerRemainingSeconds !== undefined &&
    estadoMesaCliente.reinicioTimerRemainingSeconds > 0 &&
    estadoMesaCliente?.jugadores && estadoMesaCliente.jugadores.length >= 2 // Solo mostrar barra si hay 2 o más jugadores
  );

  useEffect(() => {
    if (transitionTimerActive) {
      const initial = typeof estadoMesaCliente?.reinicioTimerRemainingSeconds === 'number' ? estadoMesaCliente.reinicioTimerRemainingSeconds : 20;
      setTransitionTimer(initial);
      const interval = setInterval(() => {
        setTransitionTimer(prev => {
          if (prev === null) return null;
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setTransitionTimer(null);
    }
  }, [transitionTimerActive, estadoMesaCliente?.reinicioTimerRemainingSeconds, mensajeTransicion]);

  return (
    <>
      {/* Modal de Rotar Dispositivo */}
      {showRotateMessage && (
        <div id="girar-mobile" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.95)', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', zIndex: 10000, padding: '20px' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '20px' }}><path d="M16.466 7.5C15.643 4.237 13.952 2 12 2 9.239 2 7 6.477 7 12s2.239 10 5 10c.342 0 .677-.069 1-.2M10.534 16.5C11.357 19.763 13.048 22 15 22c2.761 0 5-4.477 5-10s-2.239-10-5-10c-.342 0-.677-.069-1 .2"/></svg>
          <h2 style={{ fontSize: '1.5em', marginBottom: '10px' }}>Por favor, rota tu dispositivo</h2>
          <p>Para una mejor experiencia, usa el modo horizontal.</p>
          <span style={{ position: 'absolute', bottom: '10px', left: '10px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px', fontFamily: 'monospace' }}>
            girar-mobile
          </span>
        </div>
      )}

      {/* Modal de Fin de Ronda (Rediseñado) */}
      {finRondaInfoVisible && finRondaData?.resultadoPayload && ( // Asegurarse de que el modal de fin de partida no esté activo
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-40 p-4">
          <motion.div
            id="fin-ronda"
            className="bg-yellow-50 border-2 border-yellow-500 p-4 sm:p-6 rounded-lg shadow-2xl text-center max-w-lg w-full bg-opacity-30 relative"
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
              <>
                <div className="flex flex-col items-center mb-6">
                  <p className="text-md sm:text-lg font-semibold text-yellow-700 mb-1">Ganador</p>
                  <div className="bg-yellow-100 border border-yellow-400 rounded-md p-2 w-full max-w-[250px] truncate">
                    <p className="text-lg sm:text-xl font-bold text-yellow-900">
                      {finRondaData.resultadoPayload.nombreGanador || finRondaData.resultadoPayload.ganadorRondaId || 'N/A'}
                    </p>
                  </div>
                </div>
                {/* Botones de acción para SINGLE_ROUND */}
                <div className="mt-4">
                  <button onClick={onPlayAgain} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg text-lg transition-transform transform hover:scale-105 shadow-md mb-3">Jugar de Nuevo</button>
                  <div className="flex space-x-4">
                    <button onClick={onSalirDeMesa} className="w-full bg-red-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg transition-colors">Salir de la Mesa</button>
                  </div>
                </div>
              </>
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
                        // Table for SINGLE_ROUND (Jugador, Total) - Using manosFinales for 'trancado'
                        (finRondaData.resultadoPayload.manosFinales && finRondaData.resultadoPayload.manosFinales.length > 0) ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full bg-yellow-100 border border-yellow-300 rounded-lg text-sm sm:text-base">
                                    <thead>
                                        <tr className="bg-yellow-200 text-yellow-800">
                                            <th className="py-2 px-3 text-left">Jugador</th>
                                            <th className="py-2 px-3 text-right">Puntos</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {finRondaData.resultadoPayload.manosFinales
                                            .map(mano => {
                                                // Buscar la info del jugador en el array de puntuaciones, que sí contiene los nombres
                                                const jugadorInfo = finRondaData.resultadoPayload.puntuaciones.find(p => p.jugadorId === mano.jugadorId);
                                                const puntos = calcularPuntosMano(mano.fichas);
                                                return {
                                                    jugadorId: mano.jugadorId,
                                                    nombre: jugadorInfo?.nombre || mano.jugadorId, // Usar el nombre encontrado o el ID como fallback
                                                    puntos: puntos,
                                                };
                                            })
                                            .sort((a, b) => a.puntos - b.puntos) // Sort by points ascending for block
                                            .map(score => (
                                                <tr key={score.jugadorId} className="border-t border-yellow-200">
                                                    <td className="py-2 px-3 text-left font-medium text-yellow-900 truncate">{score.nombre}</td>
                                                    <td className="py-2 px-3 text-right font-bold text-gray-900">{score.puntos}</td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-yellow-700">No hay información de manos finales disponible.</p>
                        )
                    ) : (
                        // Table for FULL_GAME (Jugador, Previos, Ronda, Total)
                        (finRondaData.resultadoPayload.puntuaciones && finRondaData.resultadoPayload.puntuaciones.length > 0) ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full bg-yellow-100 border border-yellow-300 rounded-lg text-sm sm:text-base">
                                    <thead>
                                        <tr className="bg-yellow-200 text-yellow-800">
                                            <th className="py-2 px-3 text-left">Jugador</th>
                                            <th className="py-2 px-3 text-right">Previos</th>
                                            <th className="py-2 px-3 text-right">Ronda</th>
                                            <th className="py-2 px-3 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {finRondaData.resultadoPayload.puntuaciones
                                            .sort((a, b) => b.puntosAcumulados - a.puntosAcumulados) // Sort by total points descending
                                            .map(score => (
                                                <tr key={score.jugadorId} className="border-t border-yellow-200">
                                                    <td className="py-2 px-3 text-left font-medium text-yellow-900 truncate">{score.nombre}</td>
                                                    <td className="py-2 px-3 text-right text-gray-900">{score.puntosPrevios}</td>
                                                    <td className="py-2 px-3 text-right text-gray-900">{score.puntosRonda}</td>
                                                    <td className="py-2 px-3 text-right font-bold text-gray-900">{score.puntosAcumulados}</td>
                                                </tr>
                                            ))}
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
            <span className="absolute bottom-2 left-2 text-xs text-yellow-800 opacity-60 font-mono">
              fin-ronda
            </span>
          </motion.div>
        </div>
      )}

      {/* Modal de Fin de Partida (Game Over) */}
      {finPartidaData && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <motion.div
            id="fin-ronda-partida"
            className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md text-center text-gray-800 relative"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {/* Fila 1: Título */}
            <h2 className="text-3xl font-bold mb-2 text-gray-900">Partida Terminada</h2>
            {/* Fila 2: Ganador */}
            <p className="text-xl mb-4">
              Ganador: <span className="font-semibold text-yellow-600">{estadoMesaCliente?.jugadores.find(j => j.id === finPartidaData.ganadorPartidaId)?.nombre || 'N/A'}</span>
            </p>
            {/* Fila 3: Separador */}
            <hr className="my-4" />

            {/* Fila 4: Tabla de Puntos Finales */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Puntuaciones Finales</h3>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="p-2">Jugador</th>
                    <th className="p-2 text-right">Puntos</th>
                  </tr>
                </thead>
                <tbody>
                  {finPartidaData.puntuacionesFinalesPartida
                    .sort((a, b) => b.puntos - a.puntos)
                    .map(({ jugadorId, puntos }) => (
                      <tr key={jugadorId} className="border-b border-gray-200">
                        <td className="p-2 truncate">{estadoMesaCliente?.jugadores.find(j => j.id === jugadorId)?.nombre || 'Desconocido'}</td>
                        <td className="p-2 text-right font-bold">{puntos}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Fila 5: Botón "Jugar de Nuevo" */}
            <button onClick={onPlayAgain} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg text-lg transition-transform transform hover:scale-105 shadow-md mb-3">Jugar de Nuevo</button>
            
            {/* Fila 6: Botón "Ver Lobby" y "Salir" */}
            <div className="flex space-x-4">
              <button onClick={onVerLobby} className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg transition-colors">Ver Lobby</button>
              <button onClick={onSalirDeMesa} className="w-full bg-red-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg transition-colors">Salir de la Mesa</button>
            </div>
            <span className="absolute bottom-2 left-2 text-xs text-gray-500 font-mono">
              fin-ronda-partida
            </span>
          </motion.div>
        </div>
      )}

      {/* Mensaje de Transición a Nueva Partida/Ronda */}
      {mensajeTransicion && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-40 p-4">
          <motion.div
            id="transicion"
            className="text-center p-6 sm:p-8 bg-white shadow-xl rounded-lg text-gray-800 relative"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <p className="text-xl sm:text-2xl font-bold mb-6">
              {mensajeTransicion}
            </p>
            {transitionTimer !== null && transitionTimer > 0 && estadoMesaCliente?.jugadores && estadoMesaCliente.jugadores.length >= 2 && (
              <div className="w-full px-4 mb-4">
                <ProgressTimerBar
                  tiempoRestante={transitionTimer}
                  duracionTotal={20}
                />
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={onSalirDeMesa} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg">
                Salir de la Mesa
              </button>
            </div>
            <span className="absolute bottom-2 left-2 text-xs text-gray-500 font-mono">
              transicion
            </span>
          </motion.div>
        </div>
      )}
    </>
  );
};

export default DominoModals;
