//import React, { useState, useEffect, useRef } from 'react';
import { motion, PanInfo } from 'framer-motion'; // Importar PanInfo
import FichaDomino from './FichaDomino';

import { EstadoJugadorEnMesa } from '@/types/domino';

interface FichaEnMano {
  id: string;
  valorSuperior: number;
  valorInferior: number;
}

interface ManoJugadorProps {
  fichas: FichaEnMano[];
  fichaSeleccionada?: string;
  onFichaClick: (idFicha: string) => void; 
  playableFichaIds?: string[];
  className?: string;
  layoutDirection?: 'row' | 'col';
  numFichas?: number;
  isLocalPlayer?: boolean; // New prop to indicate if this is the local player's hand
  onFichaDragEnd?: (fichaId: string, event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void; // Nueva prop para drag & drop
  estadoJugador?: EstadoJugadorEnMesa;
}

interface FichaEnManoViewProps {
  ficha: FichaEnMano;
  isFichaPlayable: boolean;
  isLocalPlayer: boolean;
  fichaSeleccionada?: string;
  onFichaClick: (idFicha: string) => void;
  onFichaDragEnd?: (fichaId: string, event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
  fichaSizeClass: string;
  liftAnimationDuration?: number; // ms, duración de la animación de elevación
}

const FichaEnManoView: React.FC<FichaEnManoViewProps> = ({
  ficha,
  isFichaPlayable,
  isLocalPlayer,
  fichaSeleccionada,
  onFichaClick,
  onFichaDragEnd,
  fichaSizeClass,
  //liftAnimationDuration = 500, // Coincidir con la duración de la animación 'playable'
}) => {
  // Simplificación: canDrag ahora es un valor derivado directamente.
  // La animación de "elevación" es manejada por las variantes de Framer Motion.
  // El DRAG_OFFSET_THRESHOLD en useDominoRonda se encargará de filtrar micro-drags
  // que podrían ocurrir si el usuario interactúa durante la animación de elevación.
  const canDrag = isLocalPlayer && isFichaPlayable;

  // console.log(`[FichaEnManoView RENDER ID: ${ficha.id}] isPlayable: ${isFichaPlayable}, canDrag: ${canDrag}`);
  return (
    <motion.div
      key={ficha.id}
      data-testid={`ficha-mano-${ficha.id}`}
      whileHover={{ y: isFichaPlayable ? -25 : -5 }} // Elevación al hacer hover
      whileTap={{ scale: 1.05 }} // Efecto al tapear/clickear
      variants={{
        initial: { opacity: 0, y: 50 },
        normal: { opacity: 1, y: 0 },
        playable: { opacity: 1, y: -20 }, // Variante para fichas jugables (elevadas)
      }}
      initial="initial"
      animate={isFichaPlayable ? 'playable' : 'normal'}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      // No necesitamos onAnimationComplete aquí si usamos setTimeout basado en la duración de la animación 'playable'
    >
      <FichaDomino
        id={ficha.id}
        valorSuperior={ficha.valorSuperior}
        valorInferior={ficha.valorInferior}
        seleccionada={ficha.id === fichaSeleccionada}
        onClick={() => onFichaClick(ficha.id)}
        arrastrable={canDrag} // Arrastrable si es local y jugable (canDrag ahora deriva de esto)
        esEnMano={true}
        isPlayable={isFichaPlayable} // Pasar para estilos visuales en FichaDomino si es necesario
        sizeClass={fichaSizeClass}
        onDragEndCallback={canDrag && onFichaDragEnd // Procesar drag end solo si canDrag (y por ende isFichaPlayable y isLocalPlayer) es true
          ? (event, info) => onFichaDragEnd(ficha.id, event, info) 
          : undefined
        }
      />
    </motion.div>
  ); 
};

const ManoJugador: React.FC<ManoJugadorProps> = ({
  fichas,
  fichaSeleccionada,
  onFichaClick,
  playableFichaIds = [],
  numFichas,
  className = "",
  layoutDirection = 'row', // Default to row
  isLocalPlayer = false, // Default to false
  onFichaDragEnd, // Nueva prop
  estadoJugador,
}) => {
  
  if (estadoJugador === 'EsperandoPuesto') {
    return (
      <div className="flex items-center justify-center h-24 px-4 bg-black bg-opacity-20 rounded-lg">
        <p className="text-white text-center font-semibold">Te unirás en la siguiente partida.</p>
      </div>
    );
  }
  

  const fichaSizeClass = isLocalPlayer // Use isLocalPlayer here
    ? 'w-[30px] h-[60px] sm:w-[30px] sm:h-[60px] md:w-[30px] md:h-[60px] lg:w-[48px] lg:h-[96px] xl:w-[48px] xl:h-[96px] 2xl:w-[48px] 2xl:h-[96px]'
    : 'w-[23px] h-[46px] sm:w-[23px] sm:h-[46px] md:w-[23px] md:h-[46px] lg:w-[40px] lg:h-[80px] xl:w-[40px] xl:h-[80px] 2xl:w-[40px] 2xl:h-[80px]';

  // Construir clases condicionales de forma más clara
  const conditionalClasses = [ // Use isLocalPlayer instead of esManoPrincipal
    !isLocalPlayer && numFichas !== undefined && numFichas > 0 ? 'justify-center items-center' : '',
    // TEMPORALMENTE COMENTADO PARA PRUEBA DE DRAG:
    // layoutDirection === 'row' ? 'flex-row overflow-x-auto justify-center' : 'flex-col overflow-y-auto items-center',
    layoutDirection === 'row' ? 'flex-row justify-center' : 'flex-col items-center', // Sin overflow
    isLocalPlayer ? 'rounded-t-xl' : 'rounded-md', // Apply rounded-t-xl only to the local player's hand
  ].filter(Boolean).join(' '); // Filtra cadenas vacías y une con espacios

  return (
    
    <motion.div // Use isLocalPlayer in the main rendering logic
      className={`mano-jugador-base bg-domino-black bg-opacity-10 px-1 pb-1 pt-6 rounded-lg flex gap-1 z-10 ${className} ${conditionalClasses}`}
    >
      {!isLocalPlayer ? ( // Use isLocalPlayer here
        // Lógica para OTROS jugadores (no el principal)
        numFichas !== undefined ? (
          numFichas > 0 ? (
            <p className="text-domino-white text-sm font-semibold p-2">{numFichas} Fichas</p>
          ) : ( // numFichas is 0
            <p className="text-domino-white text-xs text-center p-2">Sin Fichas</p>
          )
        ) : (
          <p className="text-domino-white text-xs text-center p-2">?</p>
        )
      ) : (
        // Lógica para el JUGADOR PRINCIPAL
        fichas.length === 0 ? ( // Check actual number of tiles for local player
          <p className="text-domino-white text-xs text-center p-2">Mano Vacía</p>
        ) : (
          <div className={`flex gap-1 ${layoutDirection === 'row' ? 'flex-row items-center' : 'flex-col items-center'}`}>
            {fichas.map((ficha) => {
              const isFichaPlayable = playableFichaIds.includes(ficha.id);
              
              return ( // Usar el nuevo componente FichaEnManoView
                
                <FichaEnManoView
                  key={ficha.id} // La key principal debe estar en el elemento iterado más externo
                  ficha={ficha}
                  isFichaPlayable={isFichaPlayable}
                  isLocalPlayer={isLocalPlayer}
                  fichaSeleccionada={fichaSeleccionada}
                  onFichaClick={onFichaClick}
                  onFichaDragEnd={onFichaDragEnd}
                  fichaSizeClass={fichaSizeClass}
                  //liftAnimationDuration={200} // Opcional: si la duración de la animación 'playable' es diferente
                  liftAnimationDuration={500} // Opcional: si la duración de la animación 'playable' es diferente
                />
              );
            })}
          </div>
        )
      )}
    </motion.div>
  );
};

export default ManoJugador;
