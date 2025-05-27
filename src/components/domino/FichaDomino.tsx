import React from 'react';
import { motion, PanInfo } from 'framer-motion';
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
  scale?: number; // Nueva prop para escalar la ficha
  onDragEndCallback?: (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void; // Nueva prop
}

const FichaDomino: React.FC<FichaDominoProps> = ({
  id, // Ahora usaremos el id para la lógica de renderizado temporal
  valorSuperior,
  valorInferior,
  rotacion = 0,
  seleccionada = false,
  onClick,
  arrastrable = false,
  esEnMano = false, // Destructurado y usado en la lógica de clases
  isPlayable = true, // Por defecto, una ficha es jugable a menos que se especifique lo contrario
  scale = 1, // Default scale is 1 (original size)
  onDragEndCallback, // Nueva prop
}) => {
  // TEMPORAL: Determinar si es una ficha "extendida" basándose en el prefijo del ID o el valor
  const esFichaExtendida = valorSuperior > 6 || valorInferior > 6;

  // Ajustar dragConstraints: si está en mano y es arrastrable, permitir arrastre libre.
  const dragConstraintsValue = esEnMano && arrastrable ? false : { left: 0, right: 0, top: 0, bottom: 0 }; // Keep this logic

  const renderizarPuntosTradicionales = (valor: number) => {
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
      <div className="w-full h-full relative"> {/* Wrapper to contain dots */}
        {posiciones[valor as keyof typeof posiciones].map((pos, index) => (
          <div
            // key={index} // Using index as key is okay here as the list is static per ficha value
            key={`dot-${valor}-${index}`} // More unique key
            className="punto-domino absolute w-[0.25em] h-[0.25em] sm:w-[0.3em] sm:h-[0.3em] md:w-[0.35em] md:h-[0.35em] lg:w-[0.4em] lg:h-[0.4em] xl:w-[0.45em] xl:h-[0.45em]"
            style={{
              top: pos.top,
              left: pos.left,
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}
      </div>
    );
  };

  const renderizarValorNumerico = (valor: number) => {
    return (
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <span className="text-black font-bold text-lg sm:text-xl md:text-2xl">
          {valor}
        </span>
      </div>
    );
  };

  // Elegir la función de renderizado apropiada
  const renderizarValor = esFichaExtendida ? renderizarValorNumerico : renderizarPuntosTradicionales;

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
    ${seleccionada ? 'ring-2 ring-yellow-400 bg-yellow-200' : ''} // Highlight selected ficha with ring and background color
    
  `;


  return (
    <motion.div
      className={baseClasses}
      style={{
        fontSize: `${16 * scale}px`, // Scale font size for em units (adjust 16px base if needed)
        width: `${DOMINO_WIDTH_PX * scale}px`,
        height: `${DOMINO_HEIGHT_PX * scale}px`,
        transformOrigin: 'center center',
      }}
      onClick={isPlayable ? onClick : undefined} // Solo permitir clic si la ficha es jugable
      drag={arrastrable && isPlayable} // Solo permitir drag si es arrastrable Y jugable
      dragConstraints={dragConstraintsValue}
      dragSnapToOrigin={true} // <-- AÑADIR ESTA LÍNEA
      dragElastic={0.1} // Menos elasticidad para un arrastre más firme
      whileTap={{ scale: arrastrable ? 1.1 : 1 }} // Solo escalar al tapear si es arrastrable
      onDragEnd={arrastrable && isPlayable ? onDragEndCallback : undefined} // Llamar al callback solo si es arrastrable y jugable
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
          {renderizarValor(valorSuperior)}
        </div>
      </div>

      {/* Mitad inferior */}
      <div className="absolute bottom-0 left-0 w-full h-1/2 flex items-center justify-center">
        <div className="relative w-full h-full">
          {renderizarValor(valorInferior)}
        </div>
      </div>

      {/* Adorno central tipo semi-esfera dorada */}
      <div
        className={`
          absolute rounded-full shadow-inner
          // Remove Tailwind em classes here, use inline style based on scale
          // w-[0.3em] h-[0.3em]
          // sm:w-[0.36em] sm:h-[0.36em]
          // md:w-[0.42em] md:h-[0.42em]
          // lg:w-[0.48em] lg:h-[0.48em]
        `}
        style={{
          top: '50%', // Center vertically
          left: '50%', // Center horizontally
          transform: 'translate(-50%, -50%)', // Final centering using transform
          // Gradiente radial para simular una esfera dorada con iluminación
          // Ajusta estos colores para obtener el "dorado tenue" deseado
          backgroundImage: `radial-gradient(circle at 35% 35%, hsl(50, 100%, 80%) 0%, hsl(45, 70%, 60%) 40%, hsl(40, 80%, 40%) 100%)`,
          width: `${Math.max(3, 5 * scale)}px`, // Calculate size based on scale
          height: `${Math.max(3, 5 * scale)}px`, // Calculate size based on scale
          boxShadow: 'inset 0px 1px 2px rgba(0,0,0,0.3), 0px 1px 1px rgba(255,255,255,0.2)', // Sombra interna y un leve brillo externo
        }}
      ></div>


    </motion.div>

  );
};

export default FichaDomino;
