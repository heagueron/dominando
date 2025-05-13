'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import FichaDomino from './FichaDomino';
import { FichaDomino as TipoFichaDomino } from '@/utils/dominoUtils'; // Renombrar si hay conflicto
import { DOMINO_WIDTH_PX, DOMINO_HEIGHT_PX, DESIGN_TABLE_WIDTH_PX, DESIGN_TABLE_HEIGHT_PX } from '@/utils/dominoConstants';

interface FichaParaLogica extends TipoFichaDomino {
  posicionCuadricula: { fila: number; columna: number };
  rotacion: number;
}

interface FichaRenderizable extends FichaParaLogica {
  x: number; // centro x
  y: number; // centro y
}

interface MesaDominoProps {
  fichasEnMesa: FichaParaLogica[]; // Recibe las fichas con info lógica
  onFichaClick: (id: string) => void;
  // Podrías necesitar pasar fichaSeleccionada si quieres resaltar en la mesa
}

const MesaDomino: React.FC<MesaDominoProps> = ({ fichasEnMesa, onFichaClick }) => {
  const [fichasCalculadas, setFichasCalculadas] = useState<FichaRenderizable[]>([]);
  const [scaleFactor, setScaleFactor] = useState(1);
  const mesaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const designWidth = DESIGN_TABLE_WIDTH_PX;
    const designHeight = DESIGN_TABLE_HEIGHT_PX;
    const nuevasFichasCalculadas: FichaRenderizable[] = [];

    const updateScale = () => {
      if (mesaRef.current) {
        const currentMesaWidth = mesaRef.current.offsetWidth;
        setScaleFactor(currentMesaWidth / DESIGN_TABLE_WIDTH_PX);
      }
    };
    updateScale();

    fichasEnMesa.forEach((fichaLogic, index) => {
      let nx: number, ny: number;
      const nRot = fichaLogic.rotacion;
      // const nEsDoble = fichaLogic.valorSuperior === fichaLogic.valorInferior; // No se usa directamente aquí, pero podría ser útil

      const nActualWidth = (nRot === 0) ? DOMINO_WIDTH_PX : DOMINO_HEIGHT_PX;
      const nActualHeight = (nRot === 0) ? DOMINO_HEIGHT_PX : DOMINO_WIDTH_PX;

      if (index === 0) {
        nx = designWidth / 2;
        ny = designHeight / 2;
      } else {
        const ultimaFichaCalculada = nuevasFichasCalculadas[index - 1];
        const ultimaFichaLogica = fichasEnMesa[index - 1];

        const ux = ultimaFichaCalculada.x;
        const uy = ultimaFichaCalculada.y;
        const uRot = ultimaFichaCalculada.rotacion;

        const uActualWidth = (uRot === 0) ? DOMINO_WIDTH_PX : DOMINO_HEIGHT_PX;
        const uActualHeight = (uRot === 0) ? DOMINO_HEIGHT_PX : DOMINO_WIDTH_PX;

        if (fichaLogic.posicionCuadricula.columna > ultimaFichaLogica.posicionCuadricula.columna) { // Derecha
          nx = ux + uActualWidth / 2 + nActualWidth / 2;
          ny = uy;
          // Podrías necesitar ajustes aquí si la ficha anterior (u) es vertical y la nueva (n) es horizontal
          // para alinear, por ejemplo, los bordes superiores o inferiores.
          // Ejemplo: si uRot === 0 (Vertical) y nRot === 90 (Horizontal)
          // if (uRot === 0 && nRot === 90) {
          //   ny = uy - (uActualHeight / 2) + (nActualHeight / 2); // Alinear borde superior de n con borde superior de u
          // }
        } else if (fichaLogic.posicionCuadricula.columna < ultimaFichaLogica.posicionCuadricula.columna) { // Izquierda
          nx = ux - uActualWidth / 2 - nActualWidth / 2;
          ny = uy;
          // Similar al caso "Derecha", podrías necesitar ajustes de 'ny'
          // Ejemplo: si uRot === 0 (Vertical) y nRot === 90 (Horizontal)
          // if (uRot === 0 && nRot === 90) {
          //   ny = uy - (uActualHeight / 2) + (nActualHeight / 2); // Alinear borde superior de n con borde superior de u
          // }
        } else if (fichaLogic.posicionCuadricula.fila > ultimaFichaLogica.posicionCuadricula.fila) { // Abajo
          nx = ux; // Por defecto, centrar X
          ny = uy + uActualHeight / 2 + nActualHeight / 2;

          // AJUSTE ESPECÍFICO: Si la ficha anterior (u) era horizontal y la nueva (n) es vertical
          if (uRot === 90 && nRot === 0) { // Ficha de arriba (u) es Horizontal, Ficha nueva (n) es Vertical
            // Alinear borde derecho de n (Vertical) con borde derecho de u (Horizontal)
            nx = ux + (uActualWidth / 2) - (nActualWidth / 2);
          }
          // Considera también el caso inverso: u es Vertical (0) y n es Horizontal (90)
          // if (uRot === 0 && nRot === 90) {
          //   // Aquí, la ficha 'n' horizontal se colocaría centrada debajo de 'u' vertical.
          //   // Si necesitas otra alineación (ej. borde izquierdo de n con borde izquierdo de u):
          //   // nx = ux - (uActualWidth / 2) + (nActualWidth / 2);
          // }
        } else { // Arriba (fichaLogic.posicionCuadricula.fila < ultimaFichaLogica.posicionCuadricula.fila)
          nx = ux; // Por defecto, centrar X
          ny = uy - uActualHeight / 2 - nActualHeight / 2;

          // AJUSTE ESPECÍFICO: Si la ficha anterior (u) era horizontal y la nueva (n) es vertical
          if (uRot === 90 && nRot === 0) { // Ficha de abajo (u) es Horizontal, Ficha nueva (n) es Vertical
            // Alinear borde izquierdo de n (Vertical) con borde izquierdo de u (Horizontal)
            // Fórmula: ux (centro de u) - (ancho_u / 2) + (ancho_n / 2)
            nx = ux - (uActualWidth / 2) + (nActualWidth / 2);
          }
          // Considera también el caso inverso: u es Vertical (0) y n es Horizontal (90)
          // if (uRot === 0 && nRot === 90) {
          //   // Aquí, la ficha 'n' horizontal se colocaría centrada encima de 'u' vertical.
          //   // Si necesitas otra alineación:
          //   // nx = ux - (uActualWidth / 2) + (nActualWidth / 2);
          // }
        }
      }
      nuevasFichasCalculadas.push({ ...fichaLogic, x: nx, y: ny });
    });

    setFichasCalculadas(nuevasFichasCalculadas);

    const resizeObserver = new ResizeObserver(updateScale);
    if (mesaRef.current) {
      resizeObserver.observe(mesaRef.current);
    }

    return () => {
      if (mesaRef.current) {
        resizeObserver.unobserve(mesaRef.current);
      }
    };
  }, [fichasEnMesa]);

  return (
    <div
      ref={mesaRef}
      className="bg-green-700 shadow-lg rounded-md relative"
      style={{
        width: 'min(calc(100vh - 220px), 90vw)',
        aspectRatio: '1 / 1',
        border: '8px solid #7e4a35',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${DESIGN_TABLE_WIDTH_PX}px`,
          height: `${DESIGN_TABLE_HEIGHT_PX}px`,
          position: 'relative',
          transform: `scale(${scaleFactor})`,
          transformOrigin: 'top left',
        }}
      >
        {fichasCalculadas.map((ficha) => {
          const fichaOriginalWidth = (ficha.rotacion === 0) ? DOMINO_WIDTH_PX : DOMINO_HEIGHT_PX;
          const fichaOriginalHeight = (ficha.rotacion === 0) ? DOMINO_HEIGHT_PX : DOMINO_WIDTH_PX;
          return (
            <div
              key={ficha.id}
              style={{
                position: 'absolute',
                left: `${ficha.x - fichaOriginalWidth / 2}px`,
                top: `${ficha.y - fichaOriginalHeight / 2}px`,
                width: `${fichaOriginalWidth}px`,
                height: `${fichaOriginalHeight}px`,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <FichaDomino
                id={ficha.id}
                valorSuperior={ficha.valorSuperior}
                valorInferior={ficha.valorInferior}
                rotacion={ficha.rotacion}
                onClick={() => onFichaClick(ficha.id)}
                arrastrable={false}
                esEnMano={false}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MesaDomino;
