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
  // Log para depuración
  console.log("Renderizando MesaDomino con fichas:", fichasEnMesa);
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

  // Ya no necesitamos calcular posiciones en píxeles, ya que usamos CSS Grid para posicionar las fichas

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

        {/* Contenedor principal que incluye cuadrícula y fichas */}
        <div
          className="absolute inset-0"
          style={{
            display: 'grid',
            gridTemplateRows: `repeat(${FILAS}, 1fr)`,
            gridTemplateColumns: `repeat(${COLUMNAS}, 1fr)`,
            width: '100%',
            height: '100%',
            padding: '10px',
            position: 'relative',
            gridAutoFlow: 'dense', // Asegura que las celdas se llenen correctamente
          }}
          id="contenedor-principal"
        >
          {Array.from({ length: FILAS * COLUMNAS }).map((_, index) => {
            const fila = Math.floor(index / COLUMNAS) + 1;
            const columna = (index % COLUMNAS) + 1;

            // Destacar la celda central (5,5)
            const esCentroCuadricula = fila === 5 && columna === 5;

            return (
              <div
                key={`celda-${fila}-${columna}`}
                id={`celda-${fila}-${columna}`}
                data-fila={fila}
                data-columna={columna}
                className={`celda relative border flex items-center justify-center ${
                  esCentroCuadricula
                    ? 'border-yellow-400 border-opacity-90 bg-yellow-400 bg-opacity-10'
                    : 'border-white border-opacity-30'
                }`}
                style={{
                  aspectRatio: '1/1', // Asegura que las celdas sean cuadradas
                  position: 'relative',
                }}
              >
                <span className={`text-xs sm:text-sm md:text-base pointer-events-none ${
                  esCentroCuadricula
                    ? 'text-yellow-400 text-opacity-70 font-bold'
                    : 'text-white text-opacity-50'
                }`}>
                  <small>{fila},{columna}</small>
                </span>
              </div>
            );
          })}
        </div>

        {/* Fichas en la mesa - Versión simplificada para depuración */}
        {fichasEnMesa.map((ficha, index) => {
          console.log(`Renderizando ficha ${ficha.id} en posición (${ficha.posicionCuadricula.fila}, ${ficha.posicionCuadricula.columna})`);

          // Obtener la celda correspondiente a la posición de la ficha
          const celdaId = `celda-${ficha.posicionCuadricula.fila}-${ficha.posicionCuadricula.columna}`;
          console.log(`Buscando celda con ID: ${celdaId}`);

          return (
            <div
              key={ficha.id}
              className="ficha-en-celda absolute"
              style={{
                // Posicionamiento absoluto para depuración
                top: `calc((100% / ${FILAS}) * ${ficha.posicionCuadricula.fila - 1} + 10px)`,
                left: `calc((100% / ${COLUMNAS}) * ${ficha.posicionCuadricula.columna - 1} + 10px)`,
                width: `calc(100% / ${COLUMNAS})`,
                height: `calc(100% / ${FILAS})`,
                zIndex: 30,
              }}
            >
              <div
                className="w-full h-full flex items-center justify-center"
                onClick={() => onFichaClick && onFichaClick(ficha.id)}
              >
                <FichaDomino
                  valorSuperior={ficha.valorSuperior}
                  valorInferior={ficha.valorInferior}
                  rotacion={ficha.rotacion}
                  // Añadir un borde para depuración
                  // seleccionada={true}
                />
              </div>
              
            </div>
          );
        })}

        {/* Mensaje cuando no hay fichas */}
        {fichasEnMesa.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-white text-opacity-70 text-lg">
              Selecciona una ficha y haz clic en "Jugar Ficha" para comenzar
            </p>
          </div>
        )}

        {/* Ya no necesitamos este mensaje, lo hemos movido arriba */}
      </motion.div>
    </div>
  );
};

export default MesaDomino;
