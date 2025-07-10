// DominoModals.tsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FinDeRondaPayloadCliente, EstadoMesaPublicoCliente, FinDePartidaPayloadCliente, GameMode } from '@/types/domino';
import ProgressTimerBar from '@/components/common/ProgressTimerBar';
import SingleRoundEndModal from './SingleRoundEndModal';
import FullGameEndModal from './FullGameEndModal';

interface DominoModalsProps {
  showRotateMessage: boolean;
  finRondaInfoVisible: boolean;
  finRondaData: {
    resultadoPayload: FinDeRondaPayloadCliente;
  } | null;
  estadoMesaCliente: EstadoMesaPublicoCliente | null;
  mensajeTransicion: string | null;
  finPartidaData: FinDePartidaPayloadCliente | null;
  onPlayAgain: () => void;
  onSalirDeMesa: () => void;
  onVerLobby: () => void;
}

const DominoModals: React.FC<DominoModalsProps> = ({
  showRotateMessage,
  finRondaInfoVisible,
  finRondaData,
  estadoMesaCliente,
  mensajeTransicion,
  finPartidaData,
  onPlayAgain,
  onSalirDeMesa,
  onVerLobby,
}) => {
  const [transitionTimer, setTransitionTimer] = useState<number | null>(null);
  const transitionTimerActive = Boolean(
    mensajeTransicion &&
    estadoMesaCliente?.reinicioTimerRemainingSeconds !== undefined &&
    estadoMesaCliente.reinicioTimerRemainingSeconds > 0 &&
    estadoMesaCliente?.jugadores && estadoMesaCliente.jugadores.length >= 2
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

  const isSingleRoundMode = estadoMesaCliente?.partidaActual?.gameMode === GameMode.SINGLE_ROUND;

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

      {/* Modales de Fin de Ronda */}
      {finRondaInfoVisible && finRondaData?.resultadoPayload && (
        isSingleRoundMode ? (
          <SingleRoundEndModal 
            finRondaData={finRondaData}
            onPlayAgain={onPlayAgain}
            onSalirDeMesa={onSalirDeMesa}
          />
        ) : (
          <FullGameEndModal 
            finRondaData={finRondaData}
            estadoMesaCliente={estadoMesaCliente}
          />
        )
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
            <h2 className="text-3xl font-bold mb-2 text-gray-900">Partida Terminada</h2>
            <p className="text-xl mb-4">
              Ganador: <span className="font-semibold text-yellow-600">{estadoMesaCliente?.jugadores.find(j => j.id === finPartidaData.ganadorPartidaId)?.nombre || 'N/A'}</span>
            </p>
            <hr className="my-4" />
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
                    ))
                  }
                </tbody>
              </table>
            </div>
            <button onClick={onPlayAgain} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg text-lg transition-transform transform hover:scale-105 shadow-md mb-3">Jugar de Nuevo</button>
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

