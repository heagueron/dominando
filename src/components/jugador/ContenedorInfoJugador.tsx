'use client';

import React from 'react';

interface ContenedorInfoJugadorProps {
  nombreJugador?: string;
  avatarUrl?: string; // Para futura implementación de avatares personalizados
  esTurnoActual: boolean;
  tiempoRestante?: number | null;
  duracionTotalTurno?: number;
  posicion: 'abajo' | 'arriba' | 'izquierda' | 'derecha';
  numFichas?: number; // Nueva prop para el conteo de fichas
  autoPaseInfo?: { // Información sobre el estado de auto-pase
    jugadorId: string;
    estado: 'esperando_confirmacion_paso' | 'mostrando_mensaje_paso';
  } | null;
  idJugadorProp: string; // <--- AÑADIR ESTA PROP
  className?: string;
}

const AvatarPlaceholder: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`bg-gray-300 rounded-full flex items-center justify-center overflow-hidden ${className}`}> {/* Base classes applied here */}
    <svg className="w-3/4 h-3/4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  </div>
);

const BarraProgresoTurno: React.FC<{ tiempoRestante: number; duracionTotalTurno: number }> = ({
  tiempoRestante,
  duracionTotalTurno,
}) => {
  if (duracionTotalTurno <= 0) return null;
  const porcentaje = Math.max(0, Math.min(100, (tiempoRestante / duracionTotalTurno) * 100));

  return (
    <div className="w-full bg-gray-600 rounded-full h-2.5 md:h-3 my-1 md:my-0">
      <div
        // Cambiamos transition-all a transition-width y ajustamos la duración a 1000ms (1 segundo)
        className="bg-yellow-400 h-2.5 md:h-3 rounded-full transition-width duration-1000 ease-linear"
        style={{ width: `${porcentaje}%` }}
      ></div>
    </div>
  );
};

const ContenedorInfoJugador: React.FC<ContenedorInfoJugadorProps> = ({
  nombreJugador = "Jugador",
  esTurnoActual,
  tiempoRestante,
  duracionTotalTurno,
  posicion,
  numFichas,
  autoPaseInfo,
  idJugadorProp, // <--- RECIBIR LA PROP
  className = '',
}) => {
  // La barra de progreso solo se muestra si es el turno actual Y no estamos en un proceso de auto-pase para este jugador
  const mostrarBarra = esTurnoActual && typeof tiempoRestante === 'number' && typeof duracionTotalTurno === 'number' && duracionTotalTurno > 0 && 
                       (!autoPaseInfo || autoPaseInfo.jugadorId !== idJugadorProp); // <--- USAR idJugadorProp

  const mostrarMensajePaso = autoPaseInfo?.jugadorId === idJugadorProp && autoPaseInfo?.estado === 'mostrando_mensaje_paso'; // <--- USAR idJugadorProp

  const FichaCountEar: React.FC<{ count: number; side: 'left' | 'right' }> = ({ count, side }) => (
    <div
      className={`absolute top-1/2 -translate-y-1/2 
                  bg-white border border-red-400 text-red-500 
                  rounded-sm text-xs sm:text-sm px-1.5 py-0.5 shadow-sm z-10
                  ${side === 'left' ? 'right-full mr-1' : 'left-full ml-1'}`}
    >
      {count}
    </div>
  );

  const MensajePasoOverlay: React.FC = () => (
    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
      <span className="text-white font-bold text-sm md:text-base">Paso</span>
    </div>
  );

  if (posicion === 'abajo' || posicion === 'arriba') {
    return (
      <div className={`flex items-center gap-2 p-2 bg-black bg-opacity-20 rounded-lg shadow-md ${className}`}>
        <div className="relative flex-shrink-0">
          <AvatarPlaceholder className="w-10 h-10 md:w-12 md:h-12 lg:w-16 lg:h-16" />
          {/* Mostrar mensaje "Paso" para jugador de arriba o abajo (local) */}
          {mostrarMensajePaso && (posicion === 'arriba' || posicion === 'abajo') && <MensajePasoOverlay />}
          {posicion === 'arriba' && typeof numFichas === 'number' && (
            <FichaCountEar count={numFichas} side="left" />
          )}
        </div>
        <div className="flex flex-col justify-center overflow-hidden">
          <p className="text-xs sm:text-sm md:text-base font-semibold text-white truncate" title={nombreJugador}>
            {nombreJugador}
          </p>
          {mostrarBarra && tiempoRestante !== null && duracionTotalTurno && (
            <BarraProgresoTurno tiempoRestante={tiempoRestante} duracionTotalTurno={duracionTotalTurno} />
          )}
        </div>
      </div>
    );
  }

  if (posicion === 'izquierda' || posicion === 'derecha') {
    return (
      <div className={`flex flex-col items-center gap-1 p-2 bg-black bg-opacity-20 rounded-lg shadow-md ${className}`}>
        <div className="relative flex-shrink-0">
          <AvatarPlaceholder className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14" />
          {/* Oreja para Jugador 2 (derecha), a la izquierda del avatar */}
          {posicion === 'derecha' && typeof numFichas === 'number' && (
            <FichaCountEar count={numFichas} side="left" />
          )}
          {mostrarMensajePaso && <MensajePasoOverlay />}
          {/* Oreja para Jugador 4 (izquierda), a la derecha del avatar */}
          {posicion === 'izquierda' && typeof numFichas === 'number' && (
            <FichaCountEar count={numFichas} side="right" />
          )}
        </div>

        <p className="text-xs sm:text-sm font-semibold text-white text-center truncate w-full" title={nombreJugador}>
          {nombreJugador}
        </p>
        {mostrarBarra && tiempoRestante !== null && duracionTotalTurno && (
          <div className="w-full px-1">
            <BarraProgresoTurno tiempoRestante={tiempoRestante} duracionTotalTurno={duracionTotalTurno} />
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default ContenedorInfoJugador;