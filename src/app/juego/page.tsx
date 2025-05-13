// /home/heagueron/projects/dominando/src/app/juego/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import MesaDomino from '@/components/domino/MesaDomino';
import ManoJugadorComponent from '@/components/domino/ManoJugador'; // Renombrado para evitar colisión
import {
 FichaDomino,
 generarYRepartirFichas,
 ManoDeJugador as TipoManoDeJugador,
 // FichaDominoEnMesa ya no se importa directamente si page.tsx no la usa para x,y
} from '@/utils/dominoUtils';
// Importa FichaDominoEnMesa si la usas para tipar el estado,
// pero MesaDomino será quien le añada x,y internamente o reciba una versión extendida.

// Interfaz para las fichas en la mesa
interface FichaEnMesaParaLogica extends FichaDomino {
  posicionCuadricula: { fila: number; columna: number };
  rotacion: number;
}

export default function JuegoPage() {
  const [manosJugadores, setManosJugadores] = useState<TipoManoDeJugador[]>([]);
  const [fichasSobrantes, setFichasSobrantes] = useState<FichaDomino[]>([]);
  const [fichasEnManoActual, setFichasEnManoActual] = useState<FichaDomino[]>([]);
  const [fichasEnMesa, setFichasEnMesa] = useState<FichaEnMesaParaLogica[]>([]);
  const [fichaSeleccionada, setFichaSeleccionada] = useState<string | undefined>();
  
  // Extremos numéricos de la cadena de dominós
  const [extremos, setExtremos] = useState<{ izquierda: number | null, derecha: number | null }>({
    izquierda: null,
    derecha: null,
  });

  // Para ayudar a determinar la siguiente posicionCuadricula y rotación en los extremos
  const [infoExtremos, setInfoExtremos] = useState<{
    izquierda: { pos: { fila: number, columna: number }, rot: number } | null,
    derecha: { pos: { fila: number, columna: number }, rot: number } | null,
  }>({ izquierda: null, derecha: null });


  useEffect(() => {
    const { manos, sobrantes } = generarYRepartirFichas(4, 7); // 4 jugadores, 7 fichas cada uno
    setManosJugadores(manos);
    setFichasSobrantes(sobrantes);

    // Asumimos que el jugador actual es "jugador1" para este ejemplo
    const manoJugadorActual = manos.find(m => m.idJugador === "jugador1");
    if (manoJugadorActual) {
      setFichasEnManoActual(manoJugadorActual.fichas);
    }
    // Aquí podrías decidir quién empieza, etc.
  }, []);

  const handleFichaClick = (id: string) => {
    setFichaSeleccionada(id === fichaSeleccionada ? undefined : id);
  };

  // Determina si una ficha puede jugarse en un extremo, qué valor conecta y cuál será el nuevo extremo y rotación
  const determinarJugada = (
    ficha: FichaDomino,
    valorExtremo: number
  ): { puedeJugar: boolean; valorConexion?: number; valorNuevoExtremo?: number; rotacionDefecto?: number } => {
    const esDoble = ficha.valorSuperior === ficha.valorInferior;
    // Rotación por defecto: dobles vertical (0), no-dobles horizontal (90)
    // Esta rotación podría ajustarse más adelante según la lógica de camino.
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
    if (!fichaSeleccionada) {
      console.log("No hay ficha seleccionada");
      return;
    }

    const fichaParaJugar = fichasEnManoActual.find(f => f.id === fichaSeleccionada);
    if (!fichaParaJugar) {
      console.log("No se encontró la ficha seleccionada en la mano");
      return;
    }

    console.log("Ficha seleccionada para jugar:", fichaParaJugar);

    const esDoble = fichaParaJugar.valorSuperior === fichaParaJugar.valorInferior;
    let rotacionCalculada: number;
    let nuevaPosicion: { fila: number; columna: number };

    if (fichasEnMesa.length === 0) { // Condición para la PRIMERA ficha
      nuevaPosicion = { fila: 5, columna: 5 };
      rotacionCalculada = esDoble ? 0 : 90; // Dobles vertical, no-dobles horizontal

      const nuevaFichaEnMesa: FichaEnMesaParaLogica = {
        ...fichaParaJugar,
        posicionCuadricula: nuevaPosicion,
        rotacion: rotacionCalculada,
      };
      setFichasEnMesa([nuevaFichaEnMesa]);
      // Los extremos de una ficha horizontal [S,I] rotada 90 grados son S a la izquierda, I a la derecha.
      // Los extremos de una ficha vertical [S,I] rotada 0 grados son S arriba, I abajo.
      // Para simplificar, asumimos que la primera ficha horizontal expone S a la izquierda e I a la derecha.
      // Y una doble vertical expone S arriba e I abajo.
      // Esta lógica de "qué valor queda expuesto" es crucial.
      setExtremos({ 
        izquierda: rotacionCalculada === 90 ? nuevaFichaEnMesa.valorSuperior : nuevaFichaEnMesa.valorSuperior, // Ajustar si la semántica de S/I cambia con rotación 0
        derecha: rotacionCalculada === 90 ? nuevaFichaEnMesa.valorInferior : nuevaFichaEnMesa.valorInferior 
      });
      setInfoExtremos({
        izquierda: { pos: nuevaPosicion, rot: rotacionCalculada },
        derecha: { pos: nuevaPosicion, rot: rotacionCalculada }
      });

    } else { // Fichas SUBSECUENTES
      const valorExtremoActual = extremoElegido === 'izquierda' ? extremos.izquierda : extremos.derecha;
      const infoExtremoActual = extremoElegido === 'izquierda' ? infoExtremos.izquierda : infoExtremos.derecha;

      if (valorExtremoActual === null || !infoExtremoActual) {
        console.error("Error: Extremo no válido o información de extremo faltante.");
        return;
      }

      const jugadaDeterminada = determinarJugada(fichaParaJugar, valorExtremoActual);
      if (!jugadaDeterminada.puedeJugar || jugadaDeterminada.rotacionDefecto === undefined || jugadaDeterminada.valorNuevoExtremo === undefined) {
        alert(`Movimiento inválido. No se puede conectar ${fichaParaJugar.valorSuperior}-${fichaParaJugar.valorInferior} con ${valorExtremoActual}`);
        return;
      }

      rotacionCalculada = esDoble ? 0 : jugadaDeterminada.rotacionDefecto; // Dobles siempre vertical, sino la sugerida

      // Lógica de posicionamiento y rotación basada en el extremo y la ficha de conexión
      const uPos = infoExtremoActual.pos.fila === -1 ? {fila: 5, columna: 5} : infoExtremoActual.pos; // Posición de la ficha en el extremo
      const uRot = infoExtremoActual.rot; // Rotación de la ficha en el extremo

      // --- INICIO LÓGICA DE CAMINO (ADAPTAR Y EXPANDIR) ---
      // Esta es una simplificación y necesita ser robusta.
      // Deberías tener una función que, dada (uPos, uRot, extremoElegido, esDobleNuevaFicha),
      // devuelva { nuevaPosicion, nuevaRotacionCalculada, nuevoValorExtremoExpuesto }.

      if (extremoElegido === 'derecha') {
        // Lógica para colocar a la derecha (similar a tu lógica original de camino)
        // Ejemplo simple: crecer horizontalmente a la derecha
        if (uRot === 90) { // Ficha anterior horizontal
          nuevaPosicion = { fila: uPos.fila, columna: uPos.columna + 1 };
          rotacionCalculada = esDoble ? 0 : 90;
        } else { // Ficha anterior vertical (doble)
          nuevaPosicion = { fila: uPos.fila + 1, columna: uPos.columna }; // Crecer hacia abajo
          rotacionCalculada = esDoble ? 0 : 0; // Si es doble, vertical. Si no, también vertical para conectar.
        }
        // Aquí aplicarías tu lógica de camino más detallada si uPos está en un borde, etc.
        // Por ejemplo, si (uPos.fila === 5 && uPos.columna < 9) ... etc.
        // Esta parte necesita ser tan compleja como tu lógica de camino original.
        // TEMPORALMENTE, usamos una lógica de camino más simple para el ejemplo:
        if (uPos.fila === 5 && uPos.columna < 9) {
            nuevaPosicion = { fila: 5, columna: uPos.columna + 1 };
            rotacionCalculada = esDoble ? 0 : 90;
        } else if (uPos.fila === 5 && uPos.columna === 9) {
            nuevaPosicion = { fila: 6, columna: 9 };
            rotacionCalculada = esDoble ? 0 : 0; // Vertical al girar hacia abajo
        } else { // Fallback simple
            nuevaPosicion = { fila: uPos.fila, columna: uPos.columna + 1 };
            rotacionCalculada = esDoble ? 0 : 90;
        }

      } else { // extremoElegido === 'izquierda'
        // Lógica para colocar a la izquierda
        // Ejemplo simple: crecer horizontalmente a la izquierda
        if (uRot === 90) { // Ficha anterior horizontal
          nuevaPosicion = { fila: uPos.fila, columna: uPos.columna - 1 };
          rotacionCalculada = esDoble ? 0 : 90;
        } else { // Ficha anterior vertical (doble)
          nuevaPosicion = { fila: uPos.fila - 1, columna: uPos.columna }; // Crecer hacia arriba
          rotacionCalculada = esDoble ? 0 : 0;
        }
        // Aquí aplicarías tu lógica de camino más detallada si uPos está en un borde, etc.
        // TEMPORALMENTE, usamos una lógica de camino más simple para el ejemplo:
        if (uPos.fila === 5 && uPos.columna > 1) {
            nuevaPosicion = { fila: 5, columna: uPos.columna - 1 };
            rotacionCalculada = esDoble ? 0 : 90;
        } else if (uPos.fila === 5 && uPos.columna === 1) {
            nuevaPosicion = { fila: 4, columna: 1 };
            rotacionCalculada = esDoble ? 0 : 0; // Vertical al girar hacia arriba
        } else { // Fallback simple
            nuevaPosicion = { fila: uPos.fila, columna: uPos.columna - 1 };
            rotacionCalculada = esDoble ? 0 : 90;
        }
      }
      // --- FIN LÓGICA DE CAMINO ---

      // Asegurar que las fichas dobles siempre sean verticales (0 grados)
      // Y las no dobles que se colocan verticalmente (ej. al girar) también tengan rotación 0.
      if (esDoble) {
        rotacionCalculada = 0;
      } else {
        // Si la nueva posición implica un cambio de fila respecto a la ficha de conexión (uPos)
        // y la ficha de conexión era horizontal, la nueva ficha no doble debe ser vertical.
        if (nuevaPosicion.fila !== uPos.fila && uRot === 90) {
            rotacionCalculada = 0;
        }
        // Si la nueva posición implica un cambio de columna y la ficha de conexión era vertical,
        // la nueva ficha no doble debe ser horizontal.
        else if (nuevaPosicion.columna !== uPos.columna && uRot === 0) {
            rotacionCalculada = 90;
        }
        // Si no, mantiene la rotación por defecto para no dobles (90) o la calculada por el camino.
      }


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
        mano.idJugador === "jugador1" // Asumiendo que "jugador1" es el jugador actual
            ? { ...mano, fichas: mano.fichas.filter(f => f.id !== fichaSeleccionada) }
            : mano
    ));
    setFichaSeleccionada(undefined);
    // console.log("Ficha jugada y mesa actualizada:", fichasEnMesa); // fichasEnMesa no se actualiza inmediatamente aquí
  };

  const fichaSeleccionadaActual = fichasEnManoActual.find(f => f.id === fichaSeleccionada);
  let puedeJugarIzquierda = false;
  let textoBotonIzquierda = "Punta Izquierda";
  let puedeJugarDerecha = false;
  let textoBotonDerecha = "Punta Derecha";

  if (fichaSeleccionadaActual) {
    if (fichasEnMesa.length === 0) {
      puedeJugarIzquierda = true;
      textoBotonIzquierda = "Iniciar Mesa (Izquierda)";
      puedeJugarDerecha = true;
      textoBotonDerecha = "Iniciar Mesa (Derecha)";
    } else {
      if (extremos.izquierda !== null) {
        puedeJugarIzquierda = determinarJugada(fichaSeleccionadaActual, extremos.izquierda).puedeJugar;
        textoBotonIzquierda = `Punta Izquierda (${extremos.izquierda})`;
      }
      if (extremos.derecha !== null) {
        puedeJugarDerecha = determinarJugada(fichaSeleccionadaActual, extremos.derecha).puedeJugar;
        textoBotonDerecha = `Punta Derecha (${extremos.derecha})`;
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
          onFichaClick={(id) => console.log('Ficha en mesa clickeada:', id)}
        />

        {fichaSeleccionadaActual && (
          <div className="absolute top-4 right-4 flex flex-col gap-2 items-end p-2 bg-black bg-opacity-50 rounded">
            <p className="text-white text-sm">Jugar {fichaSeleccionadaActual.valorSuperior}-{fichaSeleccionadaActual.valorInferior}:</p>
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
