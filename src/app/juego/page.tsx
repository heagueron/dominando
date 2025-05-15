// /home/heagueron/projects/dominando/src/app/juego/page.tsx
'use client';

import { motion } from 'framer-motion';
import React, { useState, useEffect } from 'react';
import MesaDomino from '@/components/domino/MesaDomino';
import ManoJugadorComponent from '@/components/domino/ManoJugador';
import {
 FichaDomino,
 generarYRepartirFichas,
 ManoDeJugador as TipoManoDeJugador,
} from '@/utils/dominoUtils';

interface FichaEnMesaParaLogica extends FichaDomino {
  posicionCuadricula: { fila: number; columna: number };
  rotacion: number;
}

interface FichaSeleccionadaInfo {
  idFicha: string;
  idJugadorMano: string;
}

const FILA_ANCLA_INICIAL = 5;
const COLUMNA_ANCLA_INICIAL = 5;

// --- Función Auxiliar para Calcular Rotación de Fichas Horizontales No Dobles ---
const calcularRotacionHorizontalNoDoble = (
  ficha: FichaDomino,
  extremoElegido: 'izquierda' | 'derecha',
  valorConexionEnFicha: number // El valor en `ficha` que hace match con el extremo
): number => {
  // Si jugamos en el extremo DERECHO de la cadena, el lado IZQUIERDO de la nueva ficha debe conectar.
  // Visualmente: [LadoConecta][OtroLado]
  if (extremoElegido === 'derecha') {
    if (valorConexionEnFicha === ficha.valorSuperior) {
      // Queremos que S (valorSuperior) quede a la IZQUIERDA. Rotación: -90 ([S][I])
      return -90;
    } else { // valorConexionEnFicha === ficha.valorInferior
      // Queremos que I (valorInferior) quede a la IZQUIERDA. Rotación: 90 ([I][S])
      return 90;
    }
  }
  // Si jugamos en el extremo IZQUIERDO de la cadena, el lado DERECHO de la nueva ficha debe conectar.
  // Visualmente: [OtroLado][LadoConecta]
  else { // extremoElegido === 'izquierda'
    if (valorConexionEnFicha === ficha.valorSuperior) {
      // Queremos que S (valorSuperior) quede a la DERECHA. Rotación: 90 ([I][S])
      return 90;
    } else { // valorConexionEnFicha === ficha.valorInferior
      // Queremos que I (valorInferior) quede a la DERECHA. Rotación: -90 ([S][I])
      return -90;
    }
  }
};
// --- Fin Función Auxiliar ---

export default function JuegoPage() {
  const [manosJugadores, setManosJugadores] = useState<TipoManoDeJugador[]>([]);
  const [fichasSobrantes, setFichasSobrantes] = useState<FichaDomino[]>([]);
  
  const [anclaFicha, setAnclaFicha] = useState<FichaEnMesaParaLogica | null>(null);
  const [fichasIzquierda, setFichasIzquierda] = useState<FichaEnMesaParaLogica[]>([]);
  const [fichasDerecha, setFichasDerecha] = useState<FichaEnMesaParaLogica[]>([]);
  const [fichaSeleccionada, setFichaSeleccionada] = useState<FichaSeleccionadaInfo | undefined>();

  const [extremos, setExtremos] = useState<{ izquierda: number | null, derecha: number | null }>({
    izquierda: null,
    derecha: null,
  });

  const [infoExtremos, setInfoExtremos] = useState<{
    izquierda: { pos: { fila: number, columna: number }, rot: number } | null,
    derecha: { pos: { fila: number, columna: number }, rot: number } | null,
  }>({ izquierda: null, derecha: null });

  useEffect(() => {
    const { manos, sobrantes } = generarYRepartirFichas(4, 7);
    setManosJugadores(manos);
    console.log("[PAGE] Manos generadas:", manos);
    setFichasSobrantes(sobrantes);
  }, []);

  const handleFichaClick = (idFicha: string, idJugadorMano: string) => {
    if (fichaSeleccionada && fichaSeleccionada.idFicha === idFicha && fichaSeleccionada.idJugadorMano === idJugadorMano) {
      setFichaSeleccionada(undefined); // Deseleccionar si se hace clic en la misma ficha
    } else {
      setFichaSeleccionada({ idFicha, idJugadorMano });
    }
  };

  const determinarJugada = (
    ficha: FichaDomino,
    valorExtremo: number
  ): { puedeJugar: boolean; valorConexion?: number; valorNuevoExtremo?: number } => {
    if (ficha.valorSuperior === valorExtremo) {
      return { puedeJugar: true, valorConexion: ficha.valorSuperior, valorNuevoExtremo: ficha.valorInferior };
    }
    if (ficha.valorInferior === valorExtremo) {
      return { puedeJugar: true, valorConexion: ficha.valorInferior, valorNuevoExtremo: ficha.valorSuperior };
    }
    return { puedeJugar: false };
  };

  const handleJugarFicha = (extremoElegido: 'izquierda' | 'derecha') => {
    if (!fichaSeleccionada) return;

    const manoDelJugador = manosJugadores.find(m => m.idJugador === fichaSeleccionada.idJugadorMano);
    if (!manoDelJugador) {
      console.error(`[PAGE] No se encontró la mano del jugador ${fichaSeleccionada.idJugadorMano}`);
      return;
    }
    const fichaParaJugar = manoDelJugador.fichas.find(f => f.id === fichaSeleccionada.idFicha);

    if (!fichaParaJugar) return;

    console.log(`[PAGE] ===== INICIO HANDLE JUGAR FICHA (${fichaParaJugar.id} de mano ${fichaSeleccionada.idJugadorMano}) EN EXTREMO: ${extremoElegido} =====`);

    const esDoble = fichaParaJugar.valorSuperior === fichaParaJugar.valorInferior;
    let rotacionCalculada: number;
    let nuevaPosicion: { fila: number; columna: number };

    if (!anclaFicha) { // Primera ficha del juego
      nuevaPosicion = { fila: FILA_ANCLA_INICIAL, columna: COLUMNA_ANCLA_INICIAL };
      // La primera ficha no doble se rota -90, las dobles 0.
      rotacionCalculada = esDoble ? 0 : -90;
      console.log(`[PAGE] Primera ficha: nuevaPosicion=(${nuevaPosicion.fila},${nuevaPosicion.columna}), rotacionCalculada=${rotacionCalculada}`);
      const nuevaFichaAncla: FichaEnMesaParaLogica = {
        ...fichaParaJugar,
        posicionCuadricula: nuevaPosicion,
        rotacion: rotacionCalculada,
      };
      setAnclaFicha(nuevaFichaAncla); // Establecer la ancla
      setExtremos(esDoble ? {
          izquierda: nuevaFichaAncla.valorSuperior,
          derecha: nuevaFichaAncla.valorSuperior
        } : {
          izquierda: nuevaFichaAncla.valorSuperior,
          derecha: nuevaFichaAncla.valorInferior
        });
      setInfoExtremos({
        izquierda: { pos: nuevaPosicion, rot: rotacionCalculada },
        derecha: { pos: nuevaPosicion, rot: rotacionCalculada }
      });
      // fichasIzquierda y fichasDerecha permanecen vacíos
    } else { // Fichas SUBSECUENTES
      const valorExtremoActual = extremoElegido === 'izquierda' ? extremos.izquierda : extremos.derecha; // Valor del extremo al que conectamos
      const infoExtremoActual = extremoElegido === 'izquierda' ? infoExtremos.izquierda : infoExtremos.derecha;

      if (valorExtremoActual === null || !infoExtremoActual) {
        console.error("[PAGE] Error: Extremo no válido o información de extremo faltante.");
        return;
      }

      const jugadaDeterminada = determinarJugada(fichaParaJugar, valorExtremoActual);
      if (!jugadaDeterminada.puedeJugar || jugadaDeterminada.valorConexion === undefined || jugadaDeterminada.valorNuevoExtremo === undefined) {
        console.warn(`[PAGE] Movimiento inválido intentado.`);
        return;
      }

      const uPos = infoExtremoActual.pos;
      const uRot = infoExtremoActual.rot;
      console.log(`[PAGE] Conectando a: uPos=(${uPos.fila},${uPos.columna}), uRot=${uRot}. Ficha nueva ${esDoble ? 'DOBLE' : 'NO DOBLE'}`);


      // --- LÓGICA DE GIRO EN BORDES DE FILA 5 ---
      if (uPos.fila === FILA_ANCLA_INICIAL && extremoElegido === 'derecha' && uPos.columna === 9) {
        nuevaPosicion = { fila: uPos.fila + 1, columna: uPos.columna }; // Celda (6,9)
        if (jugadaDeterminada.valorConexion === fichaParaJugar.valorSuperior) {
          rotacionCalculada = 0;
        } else {
          rotacionCalculada = 180;
        }
        console.log(`[PAGE] Giro en borde DERECHO (5,9)->(6,9): nuevaPos=(${nuevaPosicion.fila},${nuevaPosicion.columna}), rotCalc=${rotacionCalculada}`);
      } else if (uPos.fila === FILA_ANCLA_INICIAL && extremoElegido === 'izquierda' && uPos.columna === 1) {
        nuevaPosicion = { fila: uPos.fila - 1, columna: uPos.columna }; // Celda (4,1)
        if (jugadaDeterminada.valorConexion === fichaParaJugar.valorInferior) {
          rotacionCalculada = 0;
        } else {
          rotacionCalculada = 180;
        }
        console.log(`[PAGE] Giro en borde IZQUIERDO (5,1)->(4,1): nuevaPos=(${nuevaPosicion.fila},${nuevaPosicion.columna}), rotCalc=${rotacionCalculada}`);
      } else {
        // --- LÓGICA DE CAMINO Y ROTACIÓN GENERAL (no hubo giro en borde) ---
        if (extremoElegido === 'derecha') { // Crecimiento a la derecha (no en borde de giro 5,9)
          if (uRot === 90 || uRot === -90) { // Conectando a HORIZONTAL
            nuevaPosicion = { fila: uPos.fila, columna: uPos.columna + 1 };
          } else { // uRot === 0 // Conectando a VERTICAL
            nuevaPosicion = { fila: uPos.fila, columna: uPos.columna + 1 };
            if (esDoble) {
              nuevaPosicion = { fila: uPos.fila + 1, columna: uPos.columna };
            }
          }
        } else { // extremoElegido === 'izquierda' // Crecimiento a la izquierda (no en borde de giro 5,1)
          if (uRot === 90 || uRot === -90) { // Conectando a HORIZONTAL (no en borde de giro 5,1)
            nuevaPosicion = { fila: uPos.fila, columna: uPos.columna - 1 };
          } else { // uRot === 0 // Conectando a VERTICAL
            nuevaPosicion = { fila: uPos.fila, columna: uPos.columna - 1 };
            if (esDoble) {
              nuevaPosicion = { fila: uPos.fila - 1, columna: uPos.columna };
            }
          }
        }
        console.log(`[PAGE] Posición (no giro borde) calculada para nueva ficha: (${nuevaPosicion.fila},${nuevaPosicion.columna})`);

        if (esDoble) {
          rotacionCalculada = 0;
          console.log(`[PAGE]   Ficha es DOBLE (no giro borde). rotCalc=0`);
        } else {
          if ((uRot === 90 || uRot === -90) && nuevaPosicion.fila !== uPos.fila) { // Giro en "T"
            rotacionCalculada = 0;
            console.log(`[PAGE]   Giro T (H->V) (no giro borde): uRot=${uRot}. rotCalc=0`);
          } else if (uRot === 0 && nuevaPosicion.fila !== uPos.fila) { // Giro V->V (no doble)
            rotacionCalculada = 0;
            console.log(`[PAGE]   Giro (V->V no-doble) (no giro borde): uRot=${uRot}. rotCalc=0`);
          } else { // Colocación Horizontal
            rotacionCalculada = calcularRotacionHorizontalNoDoble(
              fichaParaJugar,
              extremoElegido,
              jugadaDeterminada.valorConexion // valorConexion está garantizado por la guarda anterior
            );
            console.log(`[PAGE]   Colocación Horizontal (no giro borde). rotCalc=${rotacionCalculada} (de calcularRotacionHorizontalNoDoble)`);
          }
        }
      }
      console.log(`[PAGE] FINAL antes de crear ficha: nuevaPos=(${nuevaPosicion.fila},${nuevaPosicion.columna}), rotCalc=${rotacionCalculada}`);
      
      const nuevaFichaEnMesa: FichaEnMesaParaLogica = {
        ...fichaParaJugar,
        posicionCuadricula: nuevaPosicion,
        rotacion: rotacionCalculada,
      };

      // Añadir la ficha al array de rama correcto y actualizar el extremo correspondiente
      if (extremoElegido === 'izquierda') {
        setFichasIzquierda(prevFichas => [nuevaFichaEnMesa, ...prevFichas]); // Añadir al principio
        setExtremos(prev => ({ ...prev, izquierda: jugadaDeterminada.valorNuevoExtremo! }));
        setInfoExtremos(prev => ({ ...prev, izquierda: { pos: nuevaPosicion, rot: rotacionCalculada } }));
      } else { // extremoElegido === 'derecha'
        setFichasDerecha(prevFichas => [...prevFichas, nuevaFichaEnMesa]); // Añadir al final
        setExtremos(prev => ({ ...prev, derecha: jugadaDeterminada.valorNuevoExtremo! }));
        setInfoExtremos(prev => ({ ...prev, derecha: { pos: nuevaPosicion, rot: rotacionCalculada } }));
      }
    }

    if (fichaSeleccionada) {
      const { idFicha, idJugadorMano } = fichaSeleccionada;
      setManosJugadores(prevManos =>
        prevManos.map(mano =>
          mano.idJugador === idJugadorMano
            ? { ...mano, fichas: mano.fichas.filter(f => f.id !== idFicha) }
            : mano
        ));
      setFichaSeleccionada(undefined);
    }
    console.log(`[PAGE] ===== FIN HANDLE JUGAR FICHA =====`);
  };

  // Combinar las fichas para pasarlas a MesaDomino en el orden visual correcto
  const combinedFichasParaMesa: FichaEnMesaParaLogica[] = [
    ...fichasIzquierda.slice().reverse(), // Invertir la rama izquierda para que vaya del extremo al centro
    ...(anclaFicha ? [anclaFicha] : []), // Añadir la ancla si existe
    ...fichasDerecha, // La rama derecha ya está en orden
  ];

  // Obtener la ficha seleccionada de la mano correcta para mostrar en la UI
  let fichaRealmenteSeleccionada: FichaDomino | undefined = undefined;
  if (fichaSeleccionada) {
    const manoOrigen = manosJugadores.find(m => m.idJugador === fichaSeleccionada.idJugadorMano);
    if (manoOrigen) {
      fichaRealmenteSeleccionada = manoOrigen.fichas.find(f => f.id === fichaSeleccionada.idFicha);
    }
  }

  const fichaSeleccionadaActual = fichaRealmenteSeleccionada;

  let puedeJugarIzquierda = false;
  let textoBotonIzquierda = "Punta Izquierda";
  let puedeJugarDerecha = false;
  let textoBotonDerecha = "Punta Derecha";
  let mostrarJuegoCerrado = false;

  if (fichaSeleccionadaActual) {
    if (!anclaFicha) { // Si no hay ancla, es la primera jugada
      puedeJugarIzquierda = true;
      textoBotonIzquierda = `Jugar ${fichaSeleccionadaActual.valorSuperior}-${fichaSeleccionadaActual.valorInferior}`;
      puedeJugarDerecha = false; // Para la primera ficha, solo hay un botón que actúa como "jugar"
    } else {
      if (extremos.izquierda !== null) {
        puedeJugarIzquierda = determinarJugada(fichaSeleccionadaActual, extremos.izquierda).puedeJugar;
        textoBotonIzquierda = `Punta Izquierda (${extremos.izquierda})`;
      } else {
         puedeJugarIzquierda = false;
      }
      if (extremos.derecha !== null) {
        puedeJugarDerecha = determinarJugada(fichaSeleccionadaActual, extremos.derecha).puedeJugar;
        textoBotonDerecha = `Punta Derecha (${extremos.derecha})`;
      } else {
        puedeJugarDerecha = false;
      }
      if (!puedeJugarIzquierda && !puedeJugarDerecha) {
        mostrarJuegoCerrado = true;
      }
    }
  }

  const manoJugador1 = manosJugadores.find(m => m.idJugador === "jugador1");
  const manoJugador2 = manosJugadores.find(m => m.idJugador === "jugador2");
  const manoJugador3 = manosJugadores.find(m => m.idJugador === "jugador3");
  const manoJugador4 = manosJugadores.find(m => m.idJugador === "jugador4");

  return (
    <div className="min-h-screen bg-table-wood flex flex-col">
      <header className="bg-domino-black text-domino-white p-2 sm:p-3">
        <h1 className="text-xl sm:text-2xl font-bold text-center">Dominando</h1>
      </header>
      <main className="flex-grow relative flex justify-center items-center p-4">
        <MesaDomino
          fichasEnMesa={combinedFichasParaMesa} // Pasar el array combinado
          posicionAnclaFija={anclaFicha ? anclaFicha.posicionCuadricula : { fila: FILA_ANCLA_INICIAL, columna: COLUMNA_ANCLA_INICIAL }}
          onFichaClick={(id) => console.log('[MESA] Ficha en mesa clickeada:', id)}
        />
        {fichaSeleccionadaActual && (
          <div className="absolute top-4 right-4 flex flex-col gap-2 items-end p-2 bg-black bg-opacity-75 rounded shadow-lg z-10">
            <p className="text-white text-sm font-semibold">Jugar: {fichaSeleccionadaActual.valorSuperior}-{fichaSeleccionadaActual.valorInferior}</p>
            {!anclaFicha ? ( // Si no hay ancla, es la primera jugada
               <button 
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-3 rounded text-sm w-full text-center"
                onClick={() => handleJugarFicha('derecha')} // Primera jugada siempre es "derecha" conceptualmente
              >
                {textoBotonIzquierda} 
              </button>
            ) : mostrarJuegoCerrado ? (
              <div className="bg-red-600 text-white font-bold py-2 px-3 rounded text-sm w-full text-center">
                No se puede jugar esta ficha
              </div>
            ) : (
              <div className="flex gap-2">
                {puedeJugarIzquierda && (
                  <button
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-3 rounded text-sm"
                    onClick={() => handleJugarFicha('izquierda')}
                  >
                    {textoBotonIzquierda}
                  </button>
                )}
                {puedeJugarDerecha && (
                  <button
                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-3 rounded text-sm"
                    onClick={() => handleJugarFicha('derecha')}
                  >
                    {textoBotonDerecha}
                  </button>
                )}
              </div>
            )}
            <button onClick={() => setFichaSeleccionada(undefined)} className="text-xs text-gray-300 hover:text-white mt-1">Cancelar selección</button>
          </div>
        )}
      </main>

      {/* Mano del Jugador Principal (Abajo) */}
      {manoJugador1 && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 z-20 flex justify-center"
          initial={{ y: 120 }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        >
          <ManoJugadorComponent
            fichas={manoJugador1.fichas}
            fichaSeleccionada={fichaSeleccionada?.idFicha}
            onFichaClick={handleFichaClick}
            idJugadorMano={manoJugador1.idJugador}
            className="max-w-full"
          />
        </motion.div>
      )}

      {/* Mano del Jugador 2 (Izquierda) */}
      {manoJugador2 && (
        <div className="fixed left-2 top-1/2 -translate-y-1/2 z-20 p-1 bg-domino-black bg-opacity-10 rounded-md max-h-[80vh]">
          <ManoJugadorComponent
            fichas={manoJugador2.fichas}
            fichaSeleccionada={fichaSeleccionada?.idFicha}
            onFichaClick={handleFichaClick}
            idJugadorMano={manoJugador2.idJugador}
            layoutDirection="col"
          />
        </div>
      )}

      {/* Mano del Jugador 3 (Arriba) */}
      {manoJugador3 && (
         <div className="fixed top-16 left-1/2 -translate-x-1/2 z-20 p-1 bg-domino-black bg-opacity-10 rounded-md max-w-[80vw]">
          <ManoJugadorComponent
            fichas={manoJugador3.fichas}
            fichaSeleccionada={fichaSeleccionada?.idFicha}
            onFichaClick={handleFichaClick}
            idJugadorMano={manoJugador3.idJugador}
            layoutDirection="row"
          />
        </div>
      )}

      {/* Mano del Jugador 4 (Derecha) */}
      {manoJugador4 && (
        <div className="fixed right-2 top-1/2 -translate-y-1/2 z-20 p-1 bg-domino-black bg-opacity-10 rounded-md max-h-[80vh]">
          <ManoJugadorComponent
            fichas={manoJugador4.fichas}
            fichaSeleccionada={fichaSeleccionada?.idFicha}
            onFichaClick={handleFichaClick}
            idJugadorMano={manoJugador4.idJugador}
            layoutDirection="col"
          />
        </div>
      )}
    </div>
  );
}
