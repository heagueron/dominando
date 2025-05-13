// /home/heagueron/projects/dominando/src/app/juego/page.tsx
'use client';

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

const FILA_ANCLA_INICIAL = 5;
const COLUMNA_ANCLA_INICIAL = 5;

// --- Función Auxiliar para Calcular Rotación de Fichas Horizontales No Dobles ---
const calcularRotacionHorizontalNoDoble = (
  ficha: FichaDomino,
  extremoElegido: 'izquierda' | 'derecha',
  valorConexionEnFicha: number // El valor en `ficha` que hace match con el extremo
): number => {
  // Si jugamos en el extremo DERECHO de la cadena, el lado IZQUIERDO de la nueva ficha debe conectar.
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
  const [fichasEnManoActual, setFichasEnManoActual] = useState<FichaDomino[]>([]);
  const [fichasEnMesa, setFichasEnMesa] = useState<FichaEnMesaParaLogica[]>([]);
  const [fichaSeleccionada, setFichaSeleccionada] = useState<string | undefined>();
  
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
    setFichasSobrantes(sobrantes);
    const manoJugadorActual = manos.find(m => m.idJugador === "jugador1");
    if (manoJugadorActual) {
      setFichasEnManoActual(manoJugadorActual.fichas);
    }
  }, []);

  const handleFichaClick = (id: string) => {
    setFichaSeleccionada(id === fichaSeleccionada ? undefined : id);
  };

  const determinarJugada = (
    ficha: FichaDomino,
    valorExtremo: number
  ): { puedeJugar: boolean; valorConexion?: number; valorNuevoExtremo?: number } => {
    // Ya no necesitamos rotacionDefecto aquí, se calculará en handleJugarFicha
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
    const fichaParaJugar = fichasEnManoActual.find(f => f.id === fichaSeleccionada);
    if (!fichaParaJugar) return;

    console.log(`[PAGE] ===== INICIO HANDLE JUGAR FICHA (${fichaParaJugar.id}) EN EXTREMO: ${extremoElegido} =====`);

    const esDoble = fichaParaJugar.valorSuperior === fichaParaJugar.valorInferior;
    let rotacionCalculada: number;
    let nuevaPosicion: { fila: number; columna: number };

    if (fichasEnMesa.length === 0) {
      nuevaPosicion = { fila: FILA_ANCLA_INICIAL, columna: COLUMNA_ANCLA_INICIAL };
      // CASO ESPECIAL: Primera ficha no doble se rota -90 para que valorSuperior quede a la izquierda visualmente.
      // Las fichas dobles siempre son 0.
      rotacionCalculada = esDoble ? 0 : -90; 
      console.log(`[PAGE] Primera ficha: nuevaPosicion=(${nuevaPosicion.fila},${nuevaPosicion.columna}), rotacionCalculada=${rotacionCalculada}`);
      const nuevaFichaEnMesa: FichaEnMesaParaLogica = {
        ...fichaParaJugar,
        posicionCuadricula: nuevaPosicion,
        rotacion: rotacionCalculada,
      };
      setFichasEnMesa([nuevaFichaEnMesa]);
      setExtremos(esDoble ? {
          izquierda: nuevaFichaEnMesa.valorSuperior,
          derecha: nuevaFichaEnMesa.valorSuperior
        } : {
          izquierda: nuevaFichaEnMesa.valorSuperior, 
          derecha: nuevaFichaEnMesa.valorInferior
        });
      setInfoExtremos({
        izquierda: { pos: nuevaPosicion, rot: rotacionCalculada },
        derecha: { pos: nuevaPosicion, rot: rotacionCalculada }
      });
    } else { // Fichas SUBSECUENTES
      const valorExtremoActual = extremoElegido === 'izquierda' ? extremos.izquierda : extremos.derecha;
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
      const uRot = infoExtremoActual.rot; // Rotación de la ficha de conexión
      console.log(`[PAGE] Conectando a: uPos=(${uPos.fila},${uPos.columna}), uRot=${uRot}. Ficha nueva ${esDoble ? 'DOBLE' : 'NO DOBLE'}`);

      // --- INICIO LÓGICA DE CAMINO Y ROTACIÓN ---
      // Primero, determinar la nuevaPosicion basándose en el crecimiento lineal
      if (extremoElegido === 'derecha') {
        if (uRot === 90 || uRot === -90) { // Conectando a HORIZONTAL
          nuevaPosicion = { fila: uPos.fila, columna: uPos.columna + 1 }; 
        } else { // uRot === 0 // Conectando a VERTICAL
          nuevaPosicion = { fila: uPos.fila, columna: uPos.columna + 1 }; // Por defecto, intentar crecer horizontalmente
          // Si la nueva ficha es doble, se ajustará para crecer verticalmente abajo
          if (esDoble) {
            nuevaPosicion = { fila: uPos.fila + 1, columna: uPos.columna };
          }
        }
      } else { // extremoElegido === 'izquierda'
        if (uRot === 90 || uRot === -90) { // Conectando a HORIZONTAL
          nuevaPosicion = { fila: uPos.fila, columna: uPos.columna - 1 }; 
        } else { // uRot === 0 // Conectando a VERTICAL
          nuevaPosicion = { fila: uPos.fila, columna: uPos.columna - 1 }; // Por defecto, intentar crecer horizontalmente
          // Si la nueva ficha es doble, se ajustará para crecer verticalmente arriba
          if (esDoble) {
            nuevaPosicion = { fila: uPos.fila - 1, columna: uPos.columna };
          }
        }
      }
      console.log(`[PAGE] Posición inicial calculada para nueva ficha: (${nuevaPosicion.fila},${nuevaPosicion.columna})`);

      // Ahora, determinar la rotacionCalculada
      if (esDoble) {
        rotacionCalculada = 0;
        console.log(`[PAGE]   Ficha es DOBLE. rotCalc=0`);
      } else { // No es doble
        // Caso 1: Giro en "T" (conectando a Horizontal, pero nueva ficha va Vertical)
        if ((uRot === 90 || uRot === -90) && nuevaPosicion.fila !== uPos.fila) {
          rotacionCalculada = 0;
          console.log(`[PAGE]   Giro T (H->V): uRot=${uRot}. rotCalc=0`);
        } 
        // Caso 2: Crecimiento lineal Vertical (conectando a Vertical, nueva ficha sigue Vertical)
        // Esto ocurre si la nuevaPosicion implica cambio de fila y uRot era 0 (y la nueva no es doble, pero se fuerza a vertical)
        // Esta condición es cubierta si la nuevaPosicion ya fue ajustada para ser vertical (ej. doble conectando a vertical)
        // Para una no-doble conectando a vertical y continuando vertical, es un giro.
        // Si una no-doble conecta a una vertical y la nuevaPosicion indica cambio de fila, es un giro.
        else if (uRot === 0 && nuevaPosicion.fila !== uPos.fila) {
             rotacionCalculada = 0; // Forzar vertical si es un giro V->V (no doble)
             console.log(`[PAGE]   Giro (V->V no-doble): uRot=${uRot}. rotCalc=0`);
        }
        // Caso 3: Colocación Horizontal (H->H o V->H)
        else {
          rotacionCalculada = calcularRotacionHorizontalNoDoble(
            fichaParaJugar,
            extremoElegido,
            jugadaDeterminada.valorConexion // Este es el valor de fichaParaJugar que hace match
          );
          console.log(`[PAGE]   Colocación Horizontal (H->H o V->H). rotCalc=${rotacionCalculada} (de calcularRotacionHorizontalNoDoble)`);
        }
      }
      console.log(`[PAGE] FINAL antes de crear ficha: nuevaPos=(${nuevaPosicion.fila},${nuevaPosicion.columna}), rotCalc=${rotacionCalculada}`);
      // --- FIN LÓGICA DE CAMINO Y ROTACIÓN ---

      const nuevaFichaEnMesa: FichaEnMesaParaLogica = {
        ...fichaParaJugar,
        posicionCuadricula: nuevaPosicion,
        rotacion: rotacionCalculada,
      };

      if (extremoElegido === 'izquierda') {
        setFichasEnMesa(prevMesa => [nuevaFichaEnMesa, ...prevMesa]);
        setExtremos(prev => ({ ...prev, izquierda: jugadaDeterminada.valorNuevoExtremo! }));
        setInfoExtremos(prev => ({ ...prev, izquierda: { pos: nuevaPosicion, rot: rotacionCalculada } }));
      } else {
        setFichasEnMesa(prevMesa => [...prevMesa, nuevaFichaEnMesa]);
        setExtremos(prev => ({ ...prev, derecha: jugadaDeterminada.valorNuevoExtremo! }));
        setInfoExtremos(prev => ({ ...prev, derecha: { pos: nuevaPosicion, rot: rotacionCalculada } }));
      }
    }

    setFichasEnManoActual(prevMano => prevMano.filter(f => f.id !== fichaSeleccionada));
    setManosJugadores(prevManos => prevManos.map(mano =>
        mano.idJugador === "jugador1"
            ? { ...mano, fichas: mano.fichas.filter(f => f.id !== fichaSeleccionada) }
            : mano
    ));
    setFichaSeleccionada(undefined);
    console.log(`[PAGE] ===== FIN HANDLE JUGAR FICHA =====`);
  };

  const fichaSeleccionadaActual = fichasEnManoActual.find(f => f.id === fichaSeleccionada);
  let puedeJugarIzquierda = false;
  let textoBotonIzquierda = "Punta Izquierda";
  let puedeJugarDerecha = false;
  let textoBotonDerecha = "Punta Derecha";
  let mostrarJuegoCerrado = false;

  if (fichaSeleccionadaActual) {
    if (fichasEnMesa.length === 0) {
      puedeJugarIzquierda = true; 
      textoBotonIzquierda = `Jugar ${fichaSeleccionadaActual.valorSuperior}-${fichaSeleccionadaActual.valorInferior}`;
      puedeJugarDerecha = false; 
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

  return (
    <div className="min-h-screen bg-table-wood flex flex-col">
      <header className="bg-domino-black text-domino-white p-2 sm:p-3">
        <h1 className="text-xl sm:text-2xl font-bold text-center">Dominando</h1>
      </header>
      <main className="flex-grow relative flex justify-center items-center p-4"> 
        <MesaDomino
          fichasEnMesa={fichasEnMesa}
          posicionAnclaFija={{ fila: FILA_ANCLA_INICIAL, columna: COLUMNA_ANCLA_INICIAL }}
          onFichaClick={(id) => console.log('[MESA] Ficha en mesa clickeada:', id)}
        />
        {fichaSeleccionadaActual && (
          <div className="absolute top-4 right-4 flex flex-col gap-2 items-end p-2 bg-black bg-opacity-75 rounded shadow-lg z-10">
            <p className="text-white text-sm font-semibold">Jugar: {fichaSeleccionadaActual.valorSuperior}-{fichaSeleccionadaActual.valorInferior}</p>
            {fichasEnMesa.length === 0 ? (
               <button
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-3 rounded text-sm w-full text-center"
                onClick={() => handleJugarFicha('derecha')} 
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
      <ManoJugadorComponent
        fichas={fichasEnManoActual}
        fichaSeleccionada={fichaSeleccionada}
        onFichaClick={handleFichaClick}
      />
    </div>
  );
}
