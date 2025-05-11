import React from 'react';
import { motion } from 'framer-motion';
import FichaDomino from './FichaDomino';

interface FichaEnMesa {
  id: string;
  valorSuperior: number;
  valorInferior: number;
  posicionX: number;
  posicionY: number;
  rotacion: number;
}

interface MesaDominoProps {
  fichasEnMesa: FichaEnMesa[];
  onFichaClick?: (id: string) => void;
}

const MesaDomino: React.FC<MesaDominoProps> = ({ fichasEnMesa, onFichaClick }) => {
  // Estado para mantener la mesa cuadrada
  const [mesaSize, setMesaSize] = React.useState({ width: 600, height: 600 });

  // Efecto para ajustar el tamaño de la mesa cuando cambia el tamaño de la ventana
  React.useEffect(() => {
    const handleResize = () => {
      // Obtener el ancho disponible (con un máximo para pantallas grandes)
      const availableWidth = Math.min(window.innerWidth * 0.9, 800);
      // Obtener la altura disponible (considerando el espacio para la mano del jugador)
      const availableHeight = window.innerHeight * 0.7;
      // Usar el valor más pequeño para mantener la mesa cuadrada
      const size = Math.min(availableWidth, availableHeight);
      setMesaSize({ width: size, height: size });
    };

    // Llamar al handler inicialmente
    handleResize();

    // Agregar listener para cambios de tamaño
    window.addEventListener('resize', handleResize);

    // Limpiar el listener cuando el componente se desmonte
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex justify-center items-center w-full">
      <motion.div
        className="mesa-domino relative overflow-hidden rounded-lg"
        style={{
          width: `${mesaSize.width}px`,
          height: `${mesaSize.height}px`,
          maxWidth: '100%',
          maxHeight: '70vh'
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Textura de la mesa */}
        <div className="absolute inset-0 bg-table-wood opacity-90">
          {/* Patrón de vetas de madera (opcional) */}
          <div className="absolute inset-0 opacity-20 bg-repeat" />
        </div>

        {/* Borde de la mesa */}
        <div className="absolute inset-2 border-4 border-table-wood-dark rounded-lg opacity-50" />

        {/* Fichas en la mesa */}
        {fichasEnMesa.map((ficha) => (
          <motion.div
            key={ficha.id}
            className="absolute"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: 1,
              scale: 1,
              x: ficha.posicionX,
              y: ficha.posicionY,
              rotate: ficha.rotacion
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onClick={() => onFichaClick && onFichaClick(ficha.id)}
          >
            <FichaDomino
              valorSuperior={ficha.valorSuperior}
              valorInferior={ficha.valorInferior}
            />
          </motion.div>
        ))}

        {/* Mensaje cuando no hay fichas */}
        {fichasEnMesa.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-domino-white text-xl font-medium">
              Esperando a que comience el juego...
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default MesaDomino;
