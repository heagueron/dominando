import React from 'react';
import { motion, PanInfo } from 'framer-motion'; // Importar PanInfo
import FichaDomino from './FichaDomino';

interface FichaEnMano {
  id: string;
  valorSuperior: number;
  valorInferior: number;
}

interface ManoJugadorProps {
  fichas: FichaEnMano[];
  fichaSeleccionada?: string;
  onFichaClick: (idFicha: string, idJugadorMano: string) => void;
  idJugadorMano: string;
  playableFichaIds?: string[];
  className?: string;
  layoutDirection?: 'row' | 'col';
  numFichas?: number;
  isLocalPlayer?: boolean; // New prop to indicate if this is the local player's hand
  onFichaDragEnd?: (fichaId: string, event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void; // Nueva prop para drag & drop
}

const ManoJugador: React.FC<ManoJugadorProps> = ({
  fichas,
  fichaSeleccionada,
  onFichaClick,
  idJugadorMano,
  playableFichaIds = [],
  numFichas,
  className = "",
  layoutDirection = 'row', // Default to row
  isLocalPlayer = false, // Default to false
  onFichaDragEnd, // Nueva prop
}) => {
  console.log(`[ManoJugador ${idJugadorMano}] Render. Received playableFichaIds:`, playableFichaIds);

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
              return (
                <motion.div
                  key={ficha.id}
                  whileHover={{ y: isFichaPlayable ? -25 : -5 }}
                  whileTap={{ scale: 1.05 }}
                  variants={{
                    initial: { opacity: 0, y: 50 },
                    normal: { opacity: 1, y: 0 },
                    playable: { opacity: 1, y: -20 },
                  }}
                  initial="initial"
                  animate={isFichaPlayable ? 'playable' : 'normal'}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                >
                  <FichaDomino
                    id={ficha.id}
                    valorSuperior={ficha.valorSuperior}
                    valorInferior={ficha.valorInferior}
                    seleccionada={ficha.id === fichaSeleccionada}
                    onClick={() => onFichaClick(ficha.id, idJugadorMano)}
                    arrastrable={isLocalPlayer && isFichaPlayable} // CORRECCIÓN: Hacerla condicional
                    esEnMano={true}
                    isPlayable={isFichaPlayable}
                    sizeClass={fichaSizeClass}
                    onDragEndCallback={isLocalPlayer && onFichaDragEnd ? (event, info) => onFichaDragEnd(ficha.id, event, info) : undefined}
                  />
                </motion.div>
              );
            })}
          </div>
        )
      )}
    </motion.div>
  );
};

export default ManoJugador;
