// /home/heagueron/jmu/dominando/src/components/jugador/ContenedorInfoJugador.tsx
'use client';
import FichaDomino from '@/components/domino/FichaDomino'; // <--- IMPORTAR DominoFicha
import { FichaDomino as TipoFichaDomino } from '@/utils/dominoUtils';
import React from 'react';

interface ContenedorInfoJugadorProps {
  nombreJugador?: string;
  avatarUrl?: string; 
  esTurnoActual: boolean;
  tiempoRestante?: number | null;
  duracionTotalTurno?: number;
  posicion: 'abajo' | 'arriba' | 'izquierda' | 'derecha';
  numFichas?: number; 
  autoPaseInfo?: { 
    jugadorId: string;
    estado: 'esperando_confirmacion_paso' | 'mostrando_mensaje_paso';
  } | null;
  idJugadorProp: string; 
  fichasRestantesAlFinalizar?: TipoFichaDomino[];
  mostrarFichasFinales?: boolean;
  className?: string;
}

const AvatarPlaceholder: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`bg-gray-300 rounded-full flex items-center justify-center overflow-hidden ${className}`}>
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
  idJugadorProp,
  fichasRestantesAlFinalizar,
  mostrarFichasFinales,
  className = '',
}) => {
  const mostrarBarra = esTurnoActual && typeof tiempoRestante === 'number' && typeof duracionTotalTurno === 'number' && duracionTotalTurno > 0 && 
                       (!autoPaseInfo || autoPaseInfo.jugadorId !== idJugadorProp); 

  const mostrarMensajePaso = autoPaseInfo?.jugadorId === idJugadorProp && autoPaseInfo?.estado === 'mostrando_mensaje_paso'; 

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

  const fichaSizeClass = 'w-[23px] h-[46px] sm:w-[23px] sm:h-[46px] md:w-[23px] md:h-[46px] lg:w-[40px] lg:h-[80px] xl:w-[40px] xl:h-[80px] 2xl:w-[40px] 2xl:h-[80px]';

  const renderInfoBoxContent = () => {
    // Esta función ahora solo renderiza el contenido principal del cuadro de información.

    if (posicion === 'arriba' || posicion === 'abajo') { // Modificado para incluir 'abajo'
      return (
        <div className={`flex ${posicion === 'arriba' ? 'items-start' : 'items-center'} gap-2 p-2 bg-black bg-opacity-20 rounded-lg shadow-md`}>
          <div className="flex-shrink-0">
            <div className="relative">
              <AvatarPlaceholder className="w-10 h-10 md:w-12 md:h-12 lg:w-16 lg:h-16" />
              {mostrarMensajePaso && <MensajePasoOverlay />}
              {typeof numFichas === 'number' && !mostrarFichasFinales && (
                <FichaCountEar count={numFichas} side="left" />
              )}
            </div>
          </div>
          <div className={`flex ${posicion === 'arriba' ? 'flex-row items-start' : 'flex-col justify-center'} overflow-hidden`}>
            <div className="flex flex-col justify-center">
              <p className="text-xs sm:text-sm md:text-base font-semibold text-white truncate" title={nombreJugador}>
                {nombreJugador}
              </p>
              {mostrarBarra && tiempoRestante !== null && duracionTotalTurno && (
                <BarraProgresoTurno tiempoRestante={tiempoRestante} duracionTotalTurno={duracionTotalTurno} />
              )}
            </div>
            {/* La llamada a renderFichasRestantes se elimina de aquí */}
          </div>
        </div>
      );
    }

    if (posicion === 'izquierda' || posicion === 'derecha') {
      return (
        <div className={`flex flex-col items-center gap-1 p-2 bg-black bg-opacity-20 rounded-lg shadow-md`}>
          <div className="relative flex-shrink-0">
            <AvatarPlaceholder className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14" />
            {mostrarMensajePaso && <MensajePasoOverlay />}
            {posicion === 'derecha' && typeof numFichas === 'number' && !mostrarFichasFinales && (
              <FichaCountEar count={numFichas} side="left" />
            )}
            {posicion === 'izquierda' && typeof numFichas === 'number' && !mostrarFichasFinales && (
              <FichaCountEar count={numFichas} side="right" />
            )}
          </div>
          <div className="flex flex-col items-center overflow-hidden w-full">
            <p className="text-xs sm:text-sm font-semibold text-white text-center truncate w-full" title={nombreJugador}>
              {nombreJugador}
            </p>
            {mostrarBarra && tiempoRestante !== null && duracionTotalTurno && (
              <div className="w-full px-1">
                <BarraProgresoTurno tiempoRestante={tiempoRestante} duracionTotalTurno={duracionTotalTurno} />
              </div>
            )}
            {/* La llamada a renderFichasRestantes se elimina de aquí */}
          </div>
        </div>
      );
    }
    return null;
  };

  const renderFichasRestantesAbsolutas = () => {
    if (!mostrarFichasFinales || !fichasRestantesAlFinalizar || fichasRestantesAlFinalizar.length === 0 || posicion === 'abajo') {
      return null;
    }

    const fichaScale = 0.70; // Escala más pequeña para las fichas reveladas (se mantiene)
    // Eliminar el fondo negro (bg-black/60) y ajustar las clases flex/gap/overflow
    let containerClasses = "absolute flex gap-px p-0.5 rounded shadow-lg z-20"; // Eliminado flex-wrap de la base
    // Ajustar max-width/max-height para controlar el tamaño del contenedor de fichas reveladas
    // y permitir scroll si es necesario (overflow-auto si se desea)

    if (posicion === 'arriba') {
      // Fichas a la izquierda del contenedor de información
      // El contenedor de información (padre relativo) está centrado en la parte superior.
      containerClasses += " right-[100%] mr-1 top-1/2 -translate-y-1/2 max-w-[150px] max-h-20 justify-start items-center flex-row flex-nowrap overflow-x-auto"; // Aumentada max-h a max-h-20 (80px)
    } else if (posicion === 'izquierda' || posicion === 'derecha') { // Estos ya estaban en flex-row
      // Fichas encima del contenedor de información
      containerClasses += " bottom-full left-1/2 -translate-x-1/2 mb-1 max-w-[160px] max-h-[50px] justify-center items-center";
    } else {
      return null; // No mostrar para 'abajo' o si la posición no coincide
    }

    return (
      <div className={containerClasses} style={{ gap: '1px' }}> {/* gap-px y style={{ gap: '1px' }} son redundantes, puedes dejar solo uno */}
        {fichasRestantesAlFinalizar.map(ficha => (
          <div key={ficha.id} className="flex-shrink-0"> {/* Evitar que las fichas se encojan demasiado */}
            <FichaDomino
              id={ficha.id}
              valorSuperior={ficha.valorSuperior}
              valorInferior={ficha.valorInferior}
              scale={fichaScale}
              arrastrable={false}
              sizeClass={fichaSizeClass} // Se puede pasar la clase base, pero 'scale' determinará el tamaño
              // rotacion={posicion === 'arriba' ? 90 : 0} // Opcional: rotar fichas para el jugador de arriba si se apilan verticalmente
            />
          </div>
        ))}
      </div>
    );
  };

  // El componente principal ahora devuelve un div relativo que contiene el cuadro de información y las fichas restantes (si aplica)
  return (
    <div className={`relative ${className}`}>
      {renderInfoBoxContent()}
      {renderFichasRestantesAbsolutas()}
    </div>
  );
};

export default ContenedorInfoJugador;
