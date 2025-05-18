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
  onMesaDimensionsChange?: (width: number, height: number, scale: number) => void; // Nueva prop
}

const MesaDomino: React.FC<MesaDominoProps> = ({ fichasEnMesa, posicionAnclaFija, onFichaClick, onMesaDimensionsChange }) => {
  const [fichasCalculadas, setFichasCalculadas] = useState<FichaRenderizable[]>([]);
  const [canvasTransform, setCanvasTransform] = useState({ x: 0, y: 0, scale: 1 });
  const mesaRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    console.log(`[MESA] useEffect triggered. posicionAnclaFija: (${posicionAnclaFija.fila},${posicionAnclaFija.columna}), Fichas en mesa: ${fichasEnMesa.length}`);
    // const designWidth = DESIGN_TABLE_WIDTH_PX; // Not needed here, use constants directly
    // const designHeight = DESIGN_TABLE_HEIGHT_PX; // Not needed here, use constants directly
    
    const nuevasFichasCalculadas: FichaRenderizable[] = [];
    const calculatedPositions: { [key: string]: FichaRenderizable } = {};

    const anchorPieceLogic = fichasEnMesa.find(
        f => f.posicionCuadricula.fila === posicionAnclaFija.fila && f.posicionCuadricula.columna === posicionAnclaFija.columna
    );

    if (anchorPieceLogic) {
        const anchorNx = DESIGN_TABLE_WIDTH_PX / 2;
        const anchorNy = DESIGN_TABLE_HEIGHT_PX / 2;
        const anchorCalculated: FichaRenderizable = { ...anchorPieceLogic, x: anchorNx, y: anchorNy };
        // Add to nuevasFichasCalculadas immediately if it's the only piece or to ensure it's in the list
        // The sorting step later will handle the final order for rendering if needed.
        // For now, let's ensure it's in calculatedPositions.
        calculatedPositions[`${anchorPieceLogic.posicionCuadricula.fila},${anchorPieceLogic.posicionCuadricula.columna}`] = anchorCalculated;
        console.log(`[MESA] ANCHOR calculated: ${anchorPieceLogic.id} at (${anchorPieceLogic.posicionCuadricula.fila},${anchorPieceLogic.posicionCuadricula.columna}) visual (${anchorNx.toFixed(2)},${anchorNy.toFixed(2)})`);
    } else if (fichasEnMesa.length > 0 && fichasEnMesa.length === 1) {
         // If there's only one piece and it's not the designated anchor (e.g. first piece played IS the anchor)
         // This logic might be redundant if page.tsx always ensures the first piece's pos is posicionAnclaFija
         const firstPieceLogic = fichasEnMesa[0];
         if (firstPieceLogic.posicionCuadricula.fila === posicionAnclaFija.fila && firstPieceLogic.posicionCuadricula.columna === posicionAnclaFija.columna) {
            const firstNx = DESIGN_TABLE_WIDTH_PX / 2;
            const firstNy = DESIGN_TABLE_HEIGHT_PX / 2;
            const firstCalculated: FichaRenderizable = { ...firstPieceLogic, x: firstNx, y: firstNy };
            calculatedPositions[`${firstPieceLogic.posicionCuadricula.fila},${firstPieceLogic.posicionCuadricula.columna}`] = firstCalculated;
            console.log(`[MESA] Single piece (anchor) calculated at center: ${firstPieceLogic.id} at (${firstPieceLogic.posicionCuadricula.fila},${firstPieceLogic.posicionCuadricula.columna}) visual (${firstNx.toFixed(2)},${firstNy.toFixed(2)})`);
         } else {
            console.warn(`[MESA] Anchor piece not found, and there are pieces on the table. This might lead to incorrect positioning.`);
         }
    } else if (fichasEnMesa.length === 0) {
        // No pieces, nothing to calculate
    } else {
        console.warn(`[MESA] Anchor piece not found, and there are multiple pieces. Positioning may be incorrect.`);
    }

    let piecesToProcess = fichasEnMesa.filter(f =>
        !calculatedPositions[`${f.posicionCuadricula.fila},${f.posicionCuadricula.columna}`]
    );
    let safetyCounter = 0;

    while(piecesToProcess.length > 0 && safetyCounter < fichasEnMesa.length * 2) {
        safetyCounter++;
        const processedInThisIterationIds: string[] = [];

        piecesToProcess.forEach(fichaLogic => {
            const possiblePrevPositions = [
                { df: 0, dc: -1, dir: 'RightOfPrev' }, // Current is Right of Previous (Prev is Left of Current)
                { df: 0, dc: 1,  dir: 'LeftOfPrev'  }, // Current is Left of Previous (Prev is Right of Current)
                { df: -1, dc: 0, dir: 'BelowPrev'   }, // Current is Below Previous (Prev is Above Current)
                { df: 1, dc: 0,  dir: 'AbovePrev'   }, // Current is Above Previous (Prev is Below Current)
            ];

            let connectedToCalculatedPiece: FichaRenderizable | undefined;
            let ultimaFichaLogica: FichaParaLogica | undefined;
            let connectionDirection = '';


            for (const offset of possiblePrevPositions) {
                 const prevFila = fichaLogic.posicionCuadricula.fila + offset.df;
                 const prevCol = fichaLogic.posicionCuadricula.columna + offset.dc;
                 const prevPosKey = `${prevFila},${prevCol}`;
                 const calculatedPrev = calculatedPositions[prevPosKey];

                 if (calculatedPrev) {
                     connectedToCalculatedPiece = calculatedPrev;
                     ultimaFichaLogica = fichasEnMesa.find(f => f.posicionCuadricula.fila === prevFila && f.posicionCuadricula.columna === prevCol);
                     connectionDirection = offset.dir;
                     if (ultimaFichaLogica) break; 
                 }
            }

            if (connectedToCalculatedPiece && ultimaFichaLogica) {
                processedInThisIterationIds.push(fichaLogic.id);

                const ux = connectedToCalculatedPiece.x;
                const uy = connectedToCalculatedPiece.y;
                const uRot = connectedToCalculatedPiece.rotacion;
                const uIsVertical = Math.abs(uRot % 180) === 0;
                const uActualWidth = uIsVertical ? DOMINO_WIDTH_PX : DOMINO_HEIGHT_PX;
                const uActualHeight = uIsVertical ? DOMINO_HEIGHT_PX : DOMINO_WIDTH_PX;

                const nRot = fichaLogic.rotacion;
                const nIsVertical = Math.abs(nRot % 180) === 0;
                const nActualWidth = nIsVertical ? DOMINO_WIDTH_PX : DOMINO_HEIGHT_PX;
                const nActualHeight = nIsVertical ? DOMINO_HEIGHT_PX : DOMINO_WIDTH_PX;

                let nx: number = 0, ny: number = 0; // Initialize to avoid potential undefined

                switch (connectionDirection) {
                    case 'RightOfPrev': // Current is Right of Previous
                        console.log(`[MESA]     Calculating Right: ${fichaLogic.id} rel. to ${ultimaFichaLogica.id}`);
                        nx = ux + uActualWidth / 2 + nActualWidth / 2;
                        ny = uy;
                        break;
                    case 'LeftOfPrev': // Current is Left of Previous
                         console.log(`[MESA]     Calculating Left: ${fichaLogic.id} rel. to ${ultimaFichaLogica.id}`);
                         nx = ux - uActualWidth / 2 - nActualWidth / 2;
                         ny = uy;
                         break;
                    case 'BelowPrev': // Current is Below Previous
                         console.log(`[MESA]     Calculating Down: ${fichaLogic.id} rel. to ${ultimaFichaLogica.id}`);
                         nx = ux;
                         ny = uy + uActualHeight / 2 + nActualHeight / 2;
                         if (!uIsVertical && nIsVertical) { 
                             if (ultimaFichaLogica.posicionCuadricula.fila === 7 && ultimaFichaLogica.posicionCuadricula.columna === 1 &&
                                 ! (ultimaFichaLogica.valorSuperior === ultimaFichaLogica.valorInferior) &&
                                 fichaLogic.posicionCuadricula.fila === 8 && fichaLogic.posicionCuadricula.columna === 1) {
                                 const desplazamiento = (DOMINO_HEIGHT_PX - DOMINO_WIDTH_PX) / 2;
                                 nx = ux - desplazamiento;
                                 console.log(`[MESA]       AJUSTE "L" ALIGN-LEFT (8,1)V from (7,1)H: nx adjusted to ${nx.toFixed(2)} (desplazado -${desplazamiento.toFixed(2)})`);
                             } else {
                                 nx = ux + uActualWidth / 2 - nActualWidth / 2;
                                 console.log(`[MESA]       AJUSTE T (Down H->V): nx adjusted to ${nx.toFixed(2)}`);
                             }
                         } else if (uIsVertical && !nIsVertical) { 
                             nx = ux + (uActualWidth / 2) - (nActualWidth / 2); 
                             console.log(`[MESA]       AJUSTE T-Inverted (Down V->H): nx adjusted to ${nx.toFixed(2)}`);
                             if (ultimaFichaLogica.posicionCuadricula.fila === 8 && ultimaFichaLogica.posicionCuadricula.columna === 1 &&
                                 fichaLogic.posicionCuadricula.fila === 9 && fichaLogic.posicionCuadricula.columna === 1) {
                                 const desplazamiento = (DOMINO_HEIGHT_PX - DOMINO_WIDTH_PX) / 2;
                                 nx = ux + desplazamiento; 
                                 console.log(`[MESA]       AJUSTE "L" ALIGN-LEFT (9,1)H from (8,1)V: nx adjusted to ${nx.toFixed(2)} (desplazado +${desplazamiento.toFixed(2)})`);
                             }
                         } else if (uIsVertical && nIsVertical) { 
                             console.log(`[MESA]       Stacking Vertical (V->V). nx=${nx.toFixed(2)}`);
                         }
                         break;
                    case 'AbovePrev': // Current is Above Previous
                         console.log(`[MESA]     Calculating Up: ${fichaLogic.id} rel. to ${ultimaFichaLogica.id}`);
                         nx = ux;
                         ny = uy - uActualHeight / 2 - nActualHeight / 2;
                         // Ajuste para T-Shape o L-Shape: si la anterior (u) era vertical y la nueva (n) es horizontal
                         if (uIsVertical && !nIsVertical) { // Previous (u) is Vertical, Current (n) is Horizontal
                            // Check for specific (4,1)V -> (3,1)H L-shape adjustment
                            if (ultimaFichaLogica.posicionCuadricula.fila === 4 &&
                                ultimaFichaLogica.posicionCuadricula.columna === 1 && // Previous piece is (4,1)
                                fichaLogic.posicionCuadricula.fila === 3 && // Current piece is (3,1)
                                fichaLogic.posicionCuadricula.columna === 1) {
                                // Para alinear bordes izquierdos de (4,1)V y (3,1)H:
                                const desplazamiento = (DOMINO_HEIGHT_PX - DOMINO_WIDTH_PX) / 2;
                                nx = ux + desplazamiento; // nx was initially ux, move right by 'desplazamiento'
                                console.log(`[MESA]       AJUSTE "L" ALIGN-LEFT (3,1)H from (4,1)V: nx adjusted to ${nx.toFixed(2)} (desplazado +${desplazamiento.toFixed(2)})`);
                            } else if (ultimaFichaLogica.posicionCuadricula.fila === 2 &&
                                       ultimaFichaLogica.posicionCuadricula.columna === 11 && // Previous piece is (2,11)
                                       fichaLogic.posicionCuadricula.fila === 1 && // Current piece is (1,11) and Horizontal
                                       fichaLogic.posicionCuadricula.columna === 11) { // !nIsVertical is already true from outer if
                                // Align right edges of (2,11)V and (1,11)H
                                const desplazamiento = (DOMINO_HEIGHT_PX - DOMINO_WIDTH_PX) / 2;
                                nx = ux - desplazamiento; // nx was initially ux, move left
                                console.log(`[MESA]       AJUSTE "L" ALIGN-RIGHT (1,11)H from (2,11)V: nx adjusted to ${nx.toFixed(2)} (desplazado -${desplazamiento.toFixed(2)})`);
                            } else {
                                // Generic T-shape V->H Up (current is Horizontal, previous is Vertical)
                                console.log(`[MESA]       Potencial Ajuste T (Up V->H) sin lógica específica: nx=${nx.toFixed(2)}`);
                            }
                         } else if (!uIsVertical && nIsVertical) { // Previous (u) is Horizontal, Current (n) is Vertical
                            // Check for specific (3,11)H -> (2,11)V L-shape adjustment (align right edges)
                            if (ultimaFichaLogica.posicionCuadricula.fila === 3 &&
                                ultimaFichaLogica.posicionCuadricula.columna === 11 && // Previous piece is (3,11)
                                fichaLogic.posicionCuadricula.fila === 2 && // Current piece is (2,11) and Vertical
                                fichaLogic.posicionCuadricula.columna === 11 &&
                                nIsVertical ) { // Ensure current is vertical
                                const desplazamiento = (DOMINO_HEIGHT_PX - DOMINO_WIDTH_PX) / 2;
                                nx = ux + desplazamiento; // nx was initially ux, move right
                                console.log(`[MESA]       AJUSTE "L" ALIGN-RIGHT (2,11)V from (3,11)H: nx adjusted to ${nx.toFixed(2)} (desplazado +${desplazamiento.toFixed(2)})`);
                            } else {
                             nx = ux - uActualWidth / 2 + nActualWidth / 2; // Alinea borde izquierdo de N con borde izquierdo de U
                             console.log(`[MESA]       AJUSTE T (Up H->V): nx adjusted to ${nx.toFixed(2)}`);
                            }
                         } else if (uIsVertical && nIsVertical) { // Ambas Verticales
                             console.log(`[MESA]       Stacking Vertical (Up V->V). nx=${nx.toFixed(2)}`);
                         }
                         break;
                }

                if (ultimaFichaLogica.posicionCuadricula.fila === 6 &&
                    ultimaFichaLogica.posicionCuadricula.columna === 11 &&
                    (Math.abs(ultimaFichaLogica.rotacion % 180) === 0) &&
                    fichaLogic.posicionCuadricula.fila === 7 &&
                    fichaLogic.posicionCuadricula.columna === 11 &&
                    (Math.abs(fichaLogic.rotacion % 180) === 90)
                ) {
                    const desplazamiento = DOMINO_HEIGHT_PX / 4;
                    nx = ux - desplazamiento;
                    console.log(`[MESA]     AJUSTE "L" HORIZONTAL (7,11): ux=${ux.toFixed(2)}, nx original was ${ux.toFixed(2)}, displaced by -${desplazamiento.toFixed(2)}, new nx=${nx.toFixed(2)}`);
                }

                const fichaCalculated: FichaRenderizable = { ...fichaLogic, x: nx, y: ny };
                calculatedPositions[`${fichaLogic.posicionCuadricula.fila},${fichaLogic.posicionCuadricula.columna}`] = fichaCalculated;
                console.log(`[MESA]   Piece ${fichaLogic.id} at (${fichaLogic.posicionCuadricula.fila},${fichaLogic.posicionCuadricula.columna}) calculated: nx=${nx.toFixed(2)}, ny=${ny.toFixed(2)}`);
            }
        });

        piecesToProcess = piecesToProcess.filter(f => !processedInThisIterationIds.includes(f.id));

        if (processedInThisIterationIds.length === 0 && piecesToProcess.length > 0) {
             console.error("[MESA] ERROR: Could not calculate positions for all pieces in this iteration. Chain might be broken or logic is missing.");
             console.log("Remaining pieces to process:", piecesToProcess.map(p => `${p.id} at (${p.posicionCuadricula.fila},${p.posicionCuadricula.columna})`));
             break; 
        }
    } 

    // Populate nuevasFichasCalculadas from calculatedPositions in the order of fichasEnMesa
    // This ensures the rendering order matches the logical chain order from page.tsx
    fichasEnMesa.forEach(originalFicha => {
        const key = `${originalFicha.posicionCuadricula.fila},${originalFicha.posicionCuadricula.columna}`;
        const calculatedFicha = calculatedPositions[key];
        if (calculatedFicha) {
            nuevasFichasCalculadas.push(calculatedFicha);
        } else {
            console.warn(`[MESA] Did not find calculated position for ${originalFicha.id} at (${originalFicha.posicionCuadricula.fila},${originalFicha.posicionCuadricula.columna})`);
        }
    });

    setFichasCalculadas(nuevasFichasCalculadas);

    const updateTransform = () => {
      if (mesaRef.current) {
        const currentMesaWidth = mesaRef.current.offsetWidth;
        const currentMesaHeight = mesaRef.current.offsetHeight; 
        let currentScaleFactor = currentMesaWidth / DESIGN_TABLE_WIDTH_PX; 

        //const scaleBasedOnHeight = currentMesaHeight / DESIGN_TABLE_HEIGHT_PX;
        //currentScaleFactor = Math.min(currentScaleFactor, scaleBasedOnHeight); 

        let translateX = 0;
        let translateY = 0;

        const fichaAnclaEnCalculadas = nuevasFichasCalculadas.find( 
            f => f.posicionCuadricula.fila === posicionAnclaFija.fila && f.posicionCuadricula.columna === posicionAnclaFija.columna
        );

        if (fichaAnclaEnCalculadas) {
            console.log(`[MESA] Ficha Ancla found for centering: ${fichaAnclaEnCalculadas.id} in lienzo (x=${fichaAnclaEnCalculadas.x}, y=${fichaAnclaEnCalculadas.y})`);
            const viewportCenterX = mesaRef.current.offsetWidth / 2;
            const viewportCenterY = mesaRef.current.offsetHeight / 2;

            translateX = viewportCenterX - (fichaAnclaEnCalculadas.x * currentScaleFactor);
            translateY = viewportCenterY - (fichaAnclaEnCalculadas.y * currentScaleFactor);

            const anchorVisualX = (fichaAnclaEnCalculadas.x * currentScaleFactor) + translateX;
            const anchorVisualY = (fichaAnclaEnCalculadas.y * currentScaleFactor) + translateY;
            console.log(`[MESA] DEBUG CENTRADO: ViewportCenter=(${viewportCenterX.toFixed(2)}, ${viewportCenterY.toFixed(2)}), AnchorVisualPos=(${anchorVisualX.toFixed(2)}, ${anchorVisualY.toFixed(2)})`);
            console.log(`[MESA] DEBUG CENTRADO: DiffX=${(viewportCenterX - anchorVisualX).toFixed(2)}, DiffY=${(viewportCenterY - anchorVisualY).toFixed(2)}`);

        } else {
            console.log(`[MESA] Ficha Ancla (${posicionAnclaFija.fila},${posicionAnclaFija.columna}) NOT found in nuevasFichasCalculadas. Using translateX/Y = 0.`);
        }

        setCanvasTransform({ x: translateX, y: translateY, scale: currentScaleFactor });
        console.log(`[MESA] updateTransform: scale=${currentScaleFactor.toFixed(4)}, translateX=${translateX.toFixed(2)}, translateY=${translateY.toFixed(2)}`);
        if (onMesaDimensionsChange && mesaRef.current) {
          onMesaDimensionsChange(mesaRef.current.offsetWidth, mesaRef.current.offsetHeight, currentScaleFactor);
        }
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
  }, [fichasEnMesa, posicionAnclaFija]); // DESIGN_TABLE_WIDTH_PX and DESIGN_TABLE_HEIGHT_PX are constants

  console.log(`[MESA] Rendering. FichasCalculadas count: ${fichasCalculadas.length}`);
  if (fichasCalculadas.length > 0) {
    console.log(`[MESA] First fichaCalculada:`, fichasCalculadas[0]);
  }

  return (
    <div
      ref={mesaRef}
      className="bg-green-800 shadow-lg rounded-md relative"
      style={{
        // 1. Establecer un ancho responsivo, limitado por 80vw y el ancho de diseño.
        // Esto evita que las fichas en la mesa se escalen a más de 1x su tamaño de diseño.
        width: `min(85vw, ${DESIGN_TABLE_WIDTH_PX}px)`, // Aumentado a 85vw para dar un poco más de espacio si es posible
        // 2. Mantener la relación de aspecto del diseño. La altura se derivará de este ancho.
        aspectRatio: `${DESIGN_TABLE_WIDTH_PX} / ${DESIGN_TABLE_HEIGHT_PX}`,
        // 3. Limitar la altura máxima. Si la altura calculada por aspectRatio y el ancho
        //    excede este maxHeight, el navegador debería reducir el tamaño general
        //    (incluyendo el ancho) para ajustarse, manteniendo el aspectRatio. 
        maxHeight: 'calc(100vh - 20px)', // Reducido aún más, asumiendo mano inferior más pequeña (ajustar según sea necesario)
        
        border: '8px solid #7e4a35',
        overflow: 'hidden',
        position: 'relative', // Necesario para el posicionamiento absoluto del lienzo interno
      }}
    >

      <div 
        style={{
          width: `${DESIGN_TABLE_WIDTH_PX}px`, 
          height: `${DESIGN_TABLE_HEIGHT_PX}px`, 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          transform: `translate(${canvasTransform.x}px, ${canvasTransform.y}px) scale(${canvasTransform.scale})`,
          transformOrigin: 'top left',
        }}
      >
        {fichasCalculadas.map((ficha) => {
            const fichaOriginalWidth = (Math.abs(ficha.rotacion % 180) === 0) ? DOMINO_WIDTH_PX : DOMINO_HEIGHT_PX;
            const fichaOriginalHeight = (Math.abs(ficha.rotacion % 180) === 0) ? DOMINO_HEIGHT_PX : DOMINO_WIDTH_PX;
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
                // Asegurar que las fichas en la mesa usen las dimensiones base definidas por las constantes
                sizeClass={`w-[${DOMINO_WIDTH_PX}px] h-[${DOMINO_HEIGHT_PX}px]`}
                  arrastrable={false}
                  esEnMano={false}
                />
              </div>
            );
          }
        )}
      </div>
    </div>
  );
};

export default MesaDomino;
