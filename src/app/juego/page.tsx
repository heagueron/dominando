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
  ): { puedeJugar: boolean; valorConexion?: number; valorNuevoExtremo?: number; rotacionDefecto?: number } => {
    const esDoble = ficha.valorSuperior === ficha.valorInferior;
    let rotacionDefecto = esDoble ? 0 : 90;
    if (ficha.valorSuperior === valorExtremo) {
      return { puedeJugar: true, valorConexion: ficha.valorSuperior, valorNuevoExtremo: ficha.valorInferior, rotacionDefecto };
    }
    if (ficha.valorInferior === valorExtremo) {
      return { puedeJugar: true, valorConexion: ficha.valorInferior, valorNuevoExtremo: ficha.valorSuperior, rotacionDefecto };
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
      rotacionCalculada = esDoble ? 0 : 90;
      console.log(`[PAGE] Primera ficha: nuevaPosicion=(${nuevaPosicion.fila},${nuevaPosicion.columna}), rotacionCalculada=${rotacionCalculada}`);
      const nuevaFichaEnMesa: FichaEnMesaParaLogica = {
        ...fichaParaJugar,
        posicionCuadricula: nuevaPosicion,
        rotacion: rotacionCalculada,
      };
      setFichasEnMesa([nuevaFichaEnMesa]);
      setExtremos({ 
        izquierda: nuevaFichaEnMesa.valorSuperior,
        derecha: nuevaFichaEnMesa.valorInferior 
      });
      setInfoExtremos({
        izquierda: { pos: nuevaPosicion, rot: rotacionCalculada },
        derecha: { pos: nuevaPosicion, rot: rotacionCalculada }
      });
    } else {
      const valorExtremoActual = extremoElegido === 'izquierda' ? extremos.izquierda : extremos.derecha;
      const infoExtremoActual = extremoElegido === 'izquierda' ? infoExtremos.izquierda : infoExtremos.derecha;

      if (valorExtremoActual === null || !infoExtremoActual) {
        console.error("[PAGE] Error: Extremo no válido o información de extremo faltante.");
        return;
      }

      const jugadaDeterminada = determinarJugada(fichaParaJugar, valorExtremoActual);
      if (!jugadaDeterminada.puedeJugar || jugadaDeterminada.rotacionDefecto === undefined || jugadaDeterminada.valorNuevoExtremo === undefined) {
        console.warn(`[PAGE] Movimiento inválido intentado.`);
        return;
      }

      rotacionCalculada = esDoble ? 0 : jugadaDeterminada.rotacionDefecto;
      const uPos = infoExtremoActual.pos;
      const uRot = infoExtremoActual.rot;
      console.log(`[PAGE] Conectando a: uPos=(${uPos.fila},${uPos.columna}), uRot=${uRot}. Ficha nueva ${esDoble ? 'DOBLE' : 'NO DOBLE'}, rotSugerida=${rotacionCalculada}`);

      // --- INICIO LÓGICA DE CAMINO ---
      if (extremoElegido === 'derecha') {
        console.log("[PAGE] Extremo DERECHA seleccionado.");
        if (uRot === 90) { // Conectando a HORIZONTAL en extremo DERECHO
          nuevaPosicion = { fila: uPos.fila, columna: uPos.columna + 1 }; // Crece a la derecha
          rotacionCalculada = esDoble ? 0 : 90; // Nueva: Doble es V, No-Doble es H
          console.log(`[PAGE]   uRot=90 (H). nuevaPos=(${nuevaPosicion.fila},${nuevaPosicion.columna}), rotCalc=${rotacionCalculada}`);
        } else { // uRot === 0 // Conectando a VERTICAL en extremo DERECHO (crece hacia ABAJO)
          if (esDoble) { // Si la nueva ficha es DOBLE, continúa verticalmente hacia ABAJO
            nuevaPosicion = { fila: uPos.fila + 1, columna: uPos.columna };
            rotacionCalculada = 0;
          } else { // Si la nueva ficha NO ES DOBLE, se coloca HORIZONTALMENTE a la DERECHA de la vertical
            nuevaPosicion = { fila: uPos.fila, columna: uPos.columna + 1 };
            rotacionCalculada = 90;
          }
          console.log(`[PAGE]   uRot=0 (V). nuevaPos=(${nuevaPosicion.fila},${nuevaPosicion.columna}), rotCalc=${rotacionCalculada}`);
        }
      } else { // extremoElegido === 'izquierda'
        console.log("[PAGE] Extremo IZQUIERDA seleccionado.");
        if (uRot === 90) { // Conectando a HORIZONTAL en extremo IZQUIERDO
          nuevaPosicion = { fila: uPos.fila, columna: uPos.columna - 1 }; // Crece a la izquierda
          rotacionCalculada = esDoble ? 0 : 90; // Nueva: Doble es V, No-Doble es H
          console.log(`[PAGE]   uRot=90 (H). nuevaPos=(${nuevaPosicion.fila},${nuevaPosicion.columna}), rotCalc=${rotacionCalculada}`);
        } else { // uRot === 0 // Conectando a VERTICAL en extremo IZQUIERDO (crece hacia ARRIBA)
          if (esDoble) { // Si la nueva ficha es DOBLE, continúa verticalmente hacia ARRIBA
            nuevaPosicion = { fila: uPos.fila - 1, columna: uPos.columna };
            rotacionCalculada = 0;
          } else { // Si la nueva ficha NO ES DOBLE, se coloca HORIZONTALMENTE a la IZQUIERDA de la vertical
            nuevaPosicion = { fila: uPos.fila, columna: uPos.columna - 1 };
            rotacionCalculada = 90;
          }
          console.log(`[PAGE]   uRot=0 (V). nuevaPos=(${nuevaPosicion.fila},${nuevaPosicion.columna}), rotCalc=${rotacionCalculada}`);
        }
      }
      console.log(`[PAGE] Después de lógica de extremo: nuevaPos=(${nuevaPosicion.fila},${nuevaPosicion.columna}), rotCalc=${rotacionCalculada}`);
      
      // Ajuste final de rotación para fichas NO DOBLES (manejo de giros en "T")
      // Esta sección se ejecuta DESPUÉS de la lógica de extremo.
      if (!esDoble) {
        console.log("[PAGE] Ajuste para NO DOBLE:");
        if (uRot === 0 && nuevaPosicion.columna !== uPos.columna) { // Conexión a Vertical, moviéndose a un lado -> Nueva es Horizontal
          rotacionCalculada = 90;
          console.log(`[PAGE]   Conexión V->H: uRot=0, cambio columna. rotCalc FIJADA a 90.`);
        } else if (uRot === 90 && nuevaPosicion.fila !== uPos.fila) { // Conexión a Horizontal, moviéndose arriba/abajo -> Nueva es Vertical
          rotacionCalculada = 0;
          console.log(`[PAGE]   Conexión H->V (Giro T): uRot=90, cambio fila. rotCalc FIJADA a 0.`);
        } else if (uRot === 90 && nuevaPosicion.columna !== uPos.columna) { // Conexión H->H (crecimiento lineal)
            rotacionCalculada = 90; // Asegurar que siga horizontal
            console.log(`[PAGE]   Conexión H->H: uRot=90, cambio columna. rotCalc ASEGURADA a 90.`);
        }else {
          console.log(`[PAGE]   Sin ajuste H/V necesario para no doble (crecimiento lineal o ya correcto).`);
        }
      }
      // Asegurar que los dobles siempre sean verticales
      if (esDoble) {
          rotacionCalculada = 0;
          console.log(`[PAGE] Ficha es DOBLE. rotCalc FIJADA a 0.`);
      }
      console.log(`[PAGE] FINAL antes de crear ficha: nuevaPos=(${nuevaPosicion.fila},${nuevaPosicion.columna}), rotCalc=${rotacionCalculada}`);
      // --- FIN LÓGICA DE CAMINO ---

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
