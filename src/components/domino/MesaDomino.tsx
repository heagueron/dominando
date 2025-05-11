import React from 'react';
import { motion } from 'framer-motion';
import FichaDomino from './FichaDomino';

// Definición de la posición en la cuadrícula
interface PosicionCuadricula {
  fila: number;
  columna: number;
}

interface FichaEnMesa {
  id: string;
  valorSuperior: number;
  valorInferior: number;
  posicionCuadricula: PosicionCuadricula; // Nueva propiedad para la posición en la cuadrícula
  rotacion: number;
}

interface MesaDominoProps {
  fichasEnMesa: FichaEnMesa[];
  onFichaClick?: (id: string) => void;
}

const MesaDomino: React.FC<MesaDominoProps> = ({ fichasEnMesa, onFichaClick }) => {
  // Estado para mantener la mesa cuadrada
  const [mesaSize, setMesaSize] = React.useState({ width: 800, height: 800 });

  // Configuración de la cuadrícula
  const FILAS = 9;
  const COLUMNAS = 9;

  // Efecto para ajustar el tamaño de la mesa cuando cambia el tamaño de la ventana
  React.useEffect(() => {
    const handleResize = () => {
      // Obtener el ancho disponible (con un máximo más grande para pantallas grandes)
      const availableWidth = Math.min(window.innerWidth * 0.9, 1500);
      // Obtener la altura disponible (considerando el espacio para la mano del jugador)
      // Usamos un porcentaje mayor para aprovechar más espacio
      const heightPercentage = window.innerHeight > 900 ? 0.85 : 0.8;
      const availableHeight = window.innerHeight * heightPercentage;
      // Usar el valor más pequeño para mantener la mesa cuadrada
      const size = Math.min(availableWidth, availableHeight);
      setMesaSize({ width: size, height: size });

      // Simplemente actualizamos el tamaño de la mesa
      // El tamaño de las celdas se calculará dinámicamente en la función calcularPosicionPixeles
    };

    // Llamar al handler inicialmente
    handleResize();

    // Agregar listener para cambios de tamaño
    window.addEventListener('resize', handleResize);

    // Limpiar el listener cuando el componente se desmonte
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Función para convertir posición de cuadrícula a coordenadas en píxeles
  const calcularPosicionPixeles = (posicionCuadricula: PosicionCuadricula) => {
    // Calculamos el tamaño de cada celda basado en el tamaño de la mesa
    const anchoCelda = mesaSize.width / COLUMNAS;
    const altoCelda = mesaSize.height / FILAS;

    // Calculamos las coordenadas en píxeles (centro de la celda)
    // Restamos 1 porque las posiciones de la cuadrícula son base 1 (1-9), pero los índices son base 0 (0-8)
    const x = ((posicionCuadricula.columna - 1) * anchoCelda) + (anchoCelda / 2);
    const y = ((posicionCuadricula.fila - 1) * altoCelda) + (altoCelda / 2);

    return { x, y };
  };

  return (
    <div className="flex justify-center items-center w-full">
      <motion.div
        className="mesa-domino relative overflow-hidden rounded-lg"
        style={{
          width: `${mesaSize.width}px`,
          height: `${mesaSize.height}px`,
          maxWidth: '100%',
          maxHeight: '80vh',
          marginBottom: '-20px' // Reducir el espacio entre la mesa y la mano del jugador
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

        {/* Cuadrícula */}
        <div className="absolute inset-0 grid" style={{
          gridTemplateRows: `repeat(${FILAS}, 1fr)`,
          gridTemplateColumns: `repeat(${COLUMNAS}, 1fr)`,
          padding: '10px',
          pointerEvents: 'none' // Para que no interfiera con los clics en las fichas
        }}>
          {Array.from({ length: FILAS * COLUMNAS }).map((_, index) => {
            const fila = Math.floor(index / COLUMNAS) + 1;
            const columna = (index % COLUMNAS) + 1;

            // Destacar la celda central (5,5)
            const esCentroCuadricula = fila === 5 && columna === 5;

            return (
              <div
                key={`celda-${fila}-${columna}`}
                className={`border flex items-center justify-center ${
                  esCentroCuadricula
                    ? 'border-yellow-400 border-opacity-70'
                    : 'border-white border-opacity-20'
                }`}
              >
                <span className={`text-xs sm:text-sm md:text-base ${
                  esCentroCuadricula
                    ? 'text-yellow-400 text-opacity-70 font-bold'
                    : 'text-white text-opacity-50'
                }`}>
                  {fila},{columna}
                </span>
              </div>
            );
          })}
        </div>

        {/* Fichas en la mesa */}
        {fichasEnMesa.map((ficha) => {
          // Calcular la posición en píxeles basada en la posición de la cuadrícula
          const posicionPixeles = calcularPosicionPixeles(ficha.posicionCuadricula);

          return (
            <motion.div
              key={ficha.id}
              className="absolute"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: 1,
                scale: 1,
                x: posicionPixeles.x,
                y: posicionPixeles.y,
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
          );
        })}

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
