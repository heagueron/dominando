import React from 'react';
import { motion } from 'framer-motion';
import { DOMINO_WIDTH_PX, DOMINO_HEIGHT_PX } from '@/utils/dominoConstants';

interface FichaDominoProps {
  id: string;
  valorSuperior: number;
  valorInferior: number;
  rotacion?: number;
  seleccionada?: boolean;
  onClick?: () => void;
  arrastrable?: boolean;
  esEnMano?: boolean;
  isPlayable?: boolean; // Indica si la ficha es jugable en el turno actual (solo relevante si esEnMano)
  sizeClass?: string; // Nueva prop para clases de tamaño
}

const FichaDomino: React.FC<FichaDominoProps> = ({
  // id, // Destructurado pero no usado directamente en el renderizado de puntos
  valorSuperior,
  valorInferior,
  rotacion = 0,
  seleccionada = false,
  onClick,
  arrastrable = false,
  esEnMano = false, // Destructurado y usado en la lógica de clases
  isPlayable = true, // Por defecto, una ficha es jugable a menos que se especifique lo contrario
  sizeClass = 'w-[48px] h-[96px] sm:w-[64px] sm:h-[128px]', // Clases de tamaño por defecto (ejemplo: 48x96px en móvil, 64x128px en sm+)
}) => {
  const renderizarPuntos = (valor: number) => {
    const posiciones = {
      0: [],
      1: [{ top: '50%', left: '50%' }],
      2: [
        { top: '25%', left: '25%' },
        { top: '75%', left: '75%' },
      ],
      3: [
        { top: '25%', left: '25%' },
        { top: '50%', left: '50%' },
        { top: '75%', left: '75%' },
      ],
      4: [
        { top: '25%', left: '25%' },
        { top: '25%', left: '75%' },
        { top: '75%', left: '25%' },
        { top: '75%', left: '75%' },
      ],
      5: [
        { top: '25%', left: '25%' },
        { top: '25%', left: '75%' },
        { top: '50%', left: '50%' },
        { top: '75%', left: '25%' },
        { top: '75%', left: '75%' },
      ],
      6: [
        { top: '25%', left: '25%' },
        { top: '25%', left: '75%' },
        { top: '50%', left: '25%' },
        { top: '50%', left: '75%' },
        { top: '75%', left: '25%' },
        { top: '75%', left: '75%' },
      ],
    };

    return (
      <React.Fragment>
        {posiciones[valor as keyof typeof posiciones].map((pos, index) => (
          <div
            key={index}
            className="punto-domino absolute w-[0.25em] h-[0.25em] sm:w-[0.3em] sm:h-[0.3em] md:w-[0.35em] md:h-[0.35em] lg:w-[0.4em] lg:h-[0.4em] xl:w-[0.45em] xl:h-[0.45em]"
            style={{
              top: pos.top,
              left: pos.left,
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}
      </React.Fragment>
    );
  };

  const fichaDominoVariants = {
    normal: {
      scale: 1,
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', // Sombra más sutil
    },
    seleccionada: {
      scale: 1.15, // Ajuste ligero de escala para selección
      boxShadow: '0 6px 12px rgba(0, 0, 0, 0.2)',
    },
  };

  // console.log(`Renderizando ficha ${valorSuperior}/${valorInferior} con rotación ${rotacion}°`);

  const baseClasses = `
    ficha-domino relative cursor-pointer bg-white rounded
    ${sizeClass}
    ${seleccionada ? 'ring-2 ring-yellow-400 bg-yellow-200' : ''} // Highlight selected ficha with ring and background color
    
  `;


  return (
    <motion.div
      className={baseClasses}
      style={{
        transformOrigin: 'center center',
      }}
      onClick={isPlayable ? onClick : undefined} // Solo permitir clic si la ficha es jugable
      drag={arrastrable}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.1} // Menos elasticidad para un arrastre más firme
      whileTap={{ scale: arrastrable ? 1.1 : 1 }} // Solo escalar al tapear si es arrastrable
      variants={fichaDominoVariants}
      initial="normal"
      animate={{
        ...(seleccionada ? fichaDominoVariants.seleccionada : fichaDominoVariants.normal),
        rotate: rotacion,
      }}
    >
      {/* Estructura interna de la ficha */}
      {/* La línea divisoria siempre es horizontal en la estructura base */}
      {/* Al girar la ficha, toda esta estructura girará con ella */}

      {/* Mitad superior */}
      <div className="absolute top-0 left-0 w-full h-1/2 border-b border-gray-400 flex items-center justify-center">
        <div className="relative w-full h-full">
          {renderizarPuntos(valorSuperior)}
        </div>
      </div>

      {/* Mitad inferior */}
      <div className="absolute bottom-0 left-0 w-full h-1/2 flex items-center justify-center">
        <div className="relative w-full h-full">
          {renderizarPuntos(valorInferior)}
        </div>
      </div>
    </motion.div>

  );
};

export default FichaDomino;
