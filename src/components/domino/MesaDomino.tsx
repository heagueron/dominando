// /home/heagueron/projects/dominando/src/components/domino/MesaDomino.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import FichaDomino from './FichaDomino';
import { FichaDomino as TipoFichaDomino } from '@/utils/dominoUtils';
import { DOMINO_WIDTH_PX, DOMINO_HEIGHT_PX, DESIGN_TABLE_WIDTH_PX, DESIGN_TABLE_HEIGHT_PX } from '@/utils/dominoConstants';

interface FichaParaLogica extends TipoFichaDomino {
  posicionCuadricula: { fila: number; columna: number };
  rotacion: number;
}

interface FichaRenderizable extends FichaParaLogica {
  x: number; // centro x en el lienzo de diseño
  y: number; // centro y en el lienzo de diseño
}

interface MesaDominoProps {
  fichasEnMesa: FichaParaLogica[];
  posicionAnclaFija: { fila: number; columna: number }; // La celda lógica que debe permanecer centrada
  onFichaClick: (id: string) => void;
}

const MesaDomino: React.FC<MesaDominoProps> = ({ fichasEnMesa, posicionAnclaFija, onFichaClick }) => {
  const [fichasCalculadas, setFichasCalculadas] = useState<FichaRenderizable[]>([]);
  const [canvasTransform, setCanvasTransform] = useState({ x: 0, y: 0, scale: 1 });
  const mesaRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    console.log(`[MESA] useEffect triggered. posicionAnclaFija: (${posicionAnclaFija.fila},${posicionAnclaFija.columna}), Fichas en mesa: ${fichasEnMesa.length}`);
    const designWidth = DESIGN_TABLE_WIDTH_PX;
    const designHeight = DESIGN_TABLE_HEIGHT_PX;
    let currentScaleFactor = canvasTransform.scale; 
    const nuevasFichasCalculadas: FichaRenderizable[] = [];
    
    fichasEnMesa.forEach((fichaLogic, index) => {
      let nx: number, ny: number;
      const nRot = fichaLogic.rotacion;
      // Corrected dimension calculation based on rotation
      const nIsVertical = Math.abs(nRot % 180) === 0;
      const nActualWidth = nIsVertical ? DOMINO_WIDTH_PX : DOMINO_HEIGHT_PX;
      const nActualHeight = nIsVertical ? DOMINO_HEIGHT_PX : DOMINO_WIDTH_PX;


      console.log(`[MESA] Procesando ficha ${fichaLogic.id} (idx ${index}): cuad=(${fichaLogic.posicionCuadricula.fila},${fichaLogic.posicionCuadricula.columna}), rot=${nRot}`);

      if (index === 0) {
        // La primera ficha del array fichasEnMesa (que es un extremo de la cadena)
        // se coloca en el centro del lienzo de diseño como punto de partida para el cálculo.
        nx = designWidth / 2;
        ny = designHeight / 2;

       
        console.log(`[MESA]   Ficha ${fichaLogic.id} (idx 0) en lienzo: nx final=${nx.toFixed(2)}, ny=${ny.toFixed(2)}`);
      } else {
        // Las fichas subsiguientes se posicionan RELATIVO a la ficha ANTERIORMENTE CALCULADA Y AÑADIDA a nuevasFichasCalculadas.
        const ultimaFichaCalculada = nuevasFichasCalculadas[index - 1]; 
        // Y la dirección se determina por la diferencia de posicionCuadricula con la ficha lógica anterior en el array de page.tsx
        const ultimaFichaLogica = fichasEnMesa[index - 1]; 

        const ux = ultimaFichaCalculada.x; // x de la ficha anterior en el lienzo
        const uy = ultimaFichaCalculada.y; // y de la ficha anterior en el lienzo
        const uRot = ultimaFichaCalculada.rotacion; // rotación de la ficha anterior en el lienzo

        // Corrected dimension calculation for the previous piece
        const uIsVertical = Math.abs(uRot % 180) === 0;
        const uActualWidth = uIsVertical ? DOMINO_WIDTH_PX : DOMINO_HEIGHT_PX;
        const uActualHeight = uIsVertical ? DOMINO_HEIGHT_PX : DOMINO_WIDTH_PX;
        
        console.log(`[MESA]   Procesando ${fichaLogic.id} rel. a ${ultimaFichaCalculada.id}`);
        console.log(`[MESA]     Prev: ${ultimaFichaCalculada.id} at (${ultimaFichaCalculada.posicionCuadricula.fila},${ultimaFichaCalculada.posicionCuadricula.columna}) rot=${uRot}, ux=${ux.toFixed(2)}, uy=${uy.toFixed(2)}, uH=${uActualHeight}, uW=${uActualWidth}`);
        console.log(`[MESA]     Curr: ${fichaLogic.id} at (${fichaLogic.posicionCuadricula.fila},${fichaLogic.posicionCuadricula.columna}) rot=${nRot}, nH=${nActualHeight}, nW=${nActualWidth}`);
        console.log(`[MESA]     fichaLogic.pc=(${fichaLogic.posicionCuadricula.fila},${fichaLogic.posicionCuadricula.columna}), ultimaFichaLogica.pc=(${ultimaFichaLogica.posicionCuadricula.fila},${ultimaFichaLogica.posicionCuadricula.columna})`);


        if (fichaLogic.posicionCuadricula.columna > ultimaFichaLogica.posicionCuadricula.columna) { // Derecha
          console.log(`[MESA]     Calculando Derecha: ux=${ux}, uActualWidth=${uActualWidth}, nActualWidth=${nActualWidth}`);
          nx = ux + uActualWidth / 2 + nActualWidth / 2;
          ny = uy;
          console.log(`[MESA]     Dirección: Derecha. nx=${nx}, ny=${ny}`);
        } else if (fichaLogic.posicionCuadricula.columna < ultimaFichaLogica.posicionCuadricula.columna) { // Izquierda
          console.log(`[MESA]     Calculando Izquierda: ux=${ux}, uActualWidth=${uActualWidth}, nActualWidth=${nActualWidth}`);
          nx = ux - uActualWidth / 2 - nActualWidth / 2;
          ny = uy;
          console.log(`[MESA]     Dirección: Izquierda. nx=${nx}, ny=${ny}`);
        } else if (fichaLogic.posicionCuadricula.fila > ultimaFichaLogica.posicionCuadricula.fila) { // Abajo
          nx = ux; 
          ny = uy + uActualHeight / 2 + nActualHeight / 2;
          console.log(`[MESA]     Dirección: Abajo. Base: nx=${nx.toFixed(2)}, ny=${ny.toFixed(2)}`);
          console.log(`[MESA]       uy_prev=${uy.toFixed(2)}, uActualHeight_prev=${uActualHeight}, nActualHeight_curr=${nActualHeight}`);
          console.log(`[MESA]       ny_calc = ${uy.toFixed(2)} + ${uActualHeight/2} + ${nActualHeight/2} = ${ny.toFixed(2)}`);
          
          // Ajuste para T-Shape o L-Shape: si la anterior (u) era horizontal y la nueva (n) es vertical
          if (!uIsVertical && nIsVertical) { // U (anterior) es Horizontal, N (actual) es Vertical
            // Check for specific (7,1) -> (8,1) L-shape adjustment
            if (ultimaFichaLogica.posicionCuadricula.fila === 7 &&
                ultimaFichaLogica.posicionCuadricula.columna === 1 && // Previous piece is (7,1)
                ! (ultimaFichaLogica.valorSuperior === ultimaFichaLogica.valorInferior) && // And (7,1) is NOT a double (hence horizontal)
                fichaLogic.posicionCuadricula.fila === 8 && // Current piece is (8,1)
                fichaLogic.posicionCuadricula.columna === 1 &&
                nIsVertical) { // Current piece is Vertical
                
                // Para alinear bordes izquierdos de (7,1)H y (8,1)V:
                // nx_nuevo = ux - (DOMINO_HEIGHT_PX - DOMINO_WIDTH_PX) / 2
                const desplazamiento = (DOMINO_HEIGHT_PX - DOMINO_WIDTH_PX) / 2;
                nx = ux - desplazamiento; // nx was initially ux, move left by 'desplazamiento'
                console.log(`[MESA]       AJUSTE "L" ALIGN-LEFT (8,1)V from (7,1)H: nx ajustado a ${nx.toFixed(2)} (desplazado -${desplazamiento.toFixed(2)})`);
            } else if (!uIsVertical && nIsVertical) { // Generic T-shape adjustment for other H->V "Abajo" connections
                // Generic T-shape adjustment for other H->V "Abajo" connections
                // Alinea borde derecho de N con borde derecho de U
                nx = ux + uActualWidth / 2 - nActualWidth / 2; 
                console.log(`[MESA]       Ajuste T (Abajo H->V): nx ajustado a ${nx.toFixed(2)}`);
            }
          } else if (uIsVertical && !nIsVertical && fichaLogic.posicionCuadricula.columna === ultimaFichaLogica.posicionCuadricula.columna) {
            // Caso T-Invertida: U es Stem (vertical), N es Bar (horizontal)
            nx = ux + (nActualWidth / 2) - (uActualWidth / 2); // Desplaza la Bar (N) a la derecha del Stem (U) para alinear bordes izquierdos
            console.log(`[MESA]       Ajuste T-Invertida (Abajo V->H): nx de Bar ajustado a ${nx.toFixed(2)}`);
          } else if (uIsVertical && nIsVertical) {
            console.log(`[MESA]       Apilamiento Vertical (V->V). nx=${nx.toFixed(2)}`);
          }

          // NUEVO AJUSTE: (8,1)V -> (9,1)H
          if (ultimaFichaLogica.posicionCuadricula.fila === 8 &&
              ultimaFichaLogica.posicionCuadricula.columna === 1 && // Previous piece is (8,1)
              uIsVertical && // And (8,1) is Vertical
              fichaLogic.posicionCuadricula.fila === 9 && // Current piece is (9,1)
              fichaLogic.posicionCuadricula.columna === 1 &&
              !nIsVertical) { // Current piece is Horizontal
              
              // Para alinear bordes izquierdos de (8,1)V y (9,1)H:
              // nx_nuevo = ux + (DOMINO_HEIGHT_PX - DOMINO_WIDTH_PX) / 2
              const desplazamiento = (DOMINO_HEIGHT_PX - DOMINO_WIDTH_PX) / 2;
              nx = ux + desplazamiento; // nx was initially ux, move right by 'desplazamiento'
              console.log(`[MESA]       AJUSTE "L" ALIGN-LEFT (9,1)H from (8,1)V: nx ajustado a ${nx.toFixed(2)} (desplazado +${desplazamiento.toFixed(2)})`);
          }
        } else { // Arriba (fichaLogic.posicionCuadricula.fila < ultimaFichaLogica.posicionCuadricula.fila)
          nx = ux; 
          ny = uy - uActualHeight / 2 - nActualHeight / 2;
          console.log(`[MESA]     Dirección: Arriba. Base: nx=${nx.toFixed(2)}, ny=${ny.toFixed(2)}`);
          console.log(`[MESA]       uy_prev=${uy.toFixed(2)}, uActualHeight_prev=${uActualHeight}, nActualHeight_curr=${nActualHeight}`);
          console.log(`[MESA]       ny_calc = ${uy.toFixed(2)} - ${uActualHeight/2} - ${nActualHeight/2} = ${ny.toFixed(2)}`);
          // Ajuste para T-Shape invertida: si la anterior (u) era horizontal y la nueva (n) es vertical
          if (!uIsVertical && nIsVertical) { // U es Bar (horizontal), N es Stem (vertical)
            nx = ux - uActualWidth / 2 + nActualWidth / 2; // Alinea borde izquierdo de N con borde izquierdo de U
            console.log(`[MESA]       Ajuste T (Arriba H->V): nx ajustado a ${nx.toFixed(2)}`);
          } else if (uIsVertical && nIsVertical) {
            console.log(`[MESA]       Apilamiento Vertical (V->V). nx=${nx.toFixed(2)}`);
          }
        }
        
        // AJUSTE ESPECIAL para ficha horizontal en (7,11) conectando a (6,11) vertical
        if (ultimaFichaCalculada && 
          ultimaFichaLogica.posicionCuadricula.fila === 6 &&
          ultimaFichaLogica.posicionCuadricula.columna === 11 && 
          (Math.abs(ultimaFichaLogica.rotacion % 180) === 0) && 
          fichaLogic.posicionCuadricula.fila === 7 &&
          fichaLogic.posicionCuadricula.columna === 11 && 
          (Math.abs(fichaLogic.rotacion % 180) === 90) 
        ) {
          // Para formar la "L con base a la izquierda", el centro de (6,11) [ux]
          // debe alinearse con el centro de la mitad derecha de la ficha (7,11) [nx_nuevo + DOMINO_HEIGHT_PX / 4].
          // Entonces, nx_nuevo = ux - DOMINO_HEIGHT_PX / 4.
          const desplazamiento = DOMINO_HEIGHT_PX / 4; 
          nx = ux - desplazamiento; // Mover el centro de la ficha (7,11) a la izquierda.
          console.log(`[MESA]     AJUSTE "L" HORIZONTAL (7,11): ux=${ux.toFixed(2)}, nx original era ${ux.toFixed(2)}, desplazado en -${desplazamiento.toFixed(2)}, nuevo nx=${nx.toFixed(2)}`);
        }
      }
      console.log(`[MESA]   Ficha ${fichaLogic.id}: nxFinal=${nx.toFixed(2)}, nyFinal=${ny.toFixed(2)}`);

      nuevasFichasCalculadas.push({ ...fichaLogic, x: nx, y: ny });
    });
    setFichasCalculadas(nuevasFichasCalculadas);

    // Después de calcular las posiciones de todas las fichas en el lienzo
    // (donde la primera ficha del array está en el centro del lienzo),
    // calculamos la traslación necesaria para que la `posicionAnclaFija`
    // aparezca en el centro del viewport.
    const updateTransform = () => {
      if (mesaRef.current) {
        const currentMesaWidth = mesaRef.current.offsetWidth;
        currentScaleFactor = currentMesaWidth / designWidth;
        
        let translateX = 0;
        let translateY = 0;

        if (nuevasFichasCalculadas.length > 0) {
          const fichaAnclaEnCalculadas = nuevasFichasCalculadas.find(
            f => f.posicionCuadricula.fila === posicionAnclaFija.fila && f.posicionCuadricula.columna === posicionAnclaFija.columna
          );

          if (fichaAnclaEnCalculadas) {
            console.log(`[MESA] Ficha Ancla encontrada: ${fichaAnclaEnCalculadas.id} en lienzo (x=${fichaAnclaEnCalculadas.x}, y=${fichaAnclaEnCalculadas.y})`);
            const viewportCenterX = mesaRef.current.offsetWidth / 2;
            const viewportCenterY = mesaRef.current.offsetHeight / 2;

            // Nueva fórmula para translateX y translateY
            translateX = viewportCenterX - (fichaAnclaEnCalculadas.x * currentScaleFactor);
            translateY = viewportCenterY - (fichaAnclaEnCalculadas.y * currentScaleFactor);

            // Recalcular AnchorVisualPos con la nueva fórmula de translateX/Y para el log
            const anchorVisualX = (fichaAnclaEnCalculadas.x * currentScaleFactor) + translateX;
            const anchorVisualY = (fichaAnclaEnCalculadas.y * currentScaleFactor) + translateY;
            console.log(`[MESA] DEBUG CENTRADO: ViewportCenter=(${viewportCenterX.toFixed(2)}, ${viewportCenterY.toFixed(2)}), AnchorVisualPos=(${anchorVisualX.toFixed(2)}, ${anchorVisualY.toFixed(2)})`);
            console.log(`[MESA] DEBUG CENTRADO: DiffX=${(viewportCenterX - anchorVisualX).toFixed(2)}, DiffY=${(viewportCenterY - anchorVisualY).toFixed(2)}`);

          } else {
            console.log(`[MESA] Ficha Ancla (${posicionAnclaFija.fila},${posicionAnclaFija.columna}) NO encontrada en nuevasFichasCalculadas. Usando translateX/Y = 0.`);
          }
        }
        
        setCanvasTransform({ x: translateX, y: translateY, scale: currentScaleFactor });
        console.log(`[MESA] updateTransform: scale=${currentScaleFactor}, translateX=${translateX}, translateY=${translateY}`);
      }
    };
    updateTransform();

    const resizeObserver = new ResizeObserver(updateTransform);
    if (mesaRef.current) {
      resizeObserver.observe(mesaRef.current);
    }
    return () => {
      if (mesaRef.current) {
        resizeObserver.unobserve(mesaRef.current);
      }
    };
  }, [fichasEnMesa, posicionAnclaFija, canvasTransform.scale, DESIGN_TABLE_HEIGHT_PX, DESIGN_TABLE_WIDTH_PX]);

  return (
    <div
      ref={mesaRef}
      className="bg-green-700 shadow-lg rounded-md relative"
      style={{
        width: 'min(calc(100vh - 220px), 90vw)',
        aspectRatio: `${DESIGN_TABLE_WIDTH_PX} / ${DESIGN_TABLE_HEIGHT_PX}`, // Ajuste para el nuevo aspect ratio
        border: '8px solid #7e4a35',
        overflow: 'hidden', // Muy importante
      }}
    >
      {/* Líneas guía para el centro visual de la mesa */}
      <div style={{
        position: 'absolute',
        top: '0',
        bottom: '0',
        left: '50%',
        width: '1px',
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        transform: 'translateX(-50%)',
        zIndex: 1, // Para que esté encima del lienzo pero debajo de las fichas si es necesario
      }} />
      <div style={{
        position: 'absolute',
        left: '0',
        right: '0',
        top: '50%',
        height: '1px',
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        transform: 'translateY(-50%)',
        zIndex: 1,
      }} />
      <div // Este es el lienzo de diseño de tamaño fijo que se escalará y trasladará
        style={{
          width: `${DESIGN_TABLE_WIDTH_PX}px`,
          height: `${DESIGN_TABLE_HEIGHT_PX}px`,
          position: 'relative',
          transform: `translate(${canvasTransform.x}px, ${canvasTransform.y}px) scale(${canvasTransform.scale})`,
          // Para que la traslación funcione como se espera (mover el (0,0) del lienzo),
          transformOrigin: 'top left', 
        }}
      >
        {fichasCalculadas.map((ficha) => {
          const fichaOriginalWidth = (ficha.rotacion === 0 || Math.abs(ficha.rotacion % 180) === 0) ? DOMINO_WIDTH_PX : DOMINO_HEIGHT_PX;
          const fichaOriginalHeight = (ficha.rotacion === 0 || Math.abs(ficha.rotacion % 180) === 0) ? DOMINO_HEIGHT_PX : DOMINO_WIDTH_PX;
          return (
            <div
              key={ficha.id}
              style={{
                position: 'absolute',
                left: `${ficha.x - fichaOriginalWidth / 2}px`, // ficha.x es el centro
                top: `${ficha.y - fichaOriginalHeight / 2}px`,  // ficha.y es el centro
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
