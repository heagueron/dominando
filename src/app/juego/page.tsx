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

  const handleJugarFicha = () => {
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

    //const esDoble = fichaParaJugar.valorSuperior === fichaParaJugar.valorInferior;
    let rotacionCalculada = 0; // Por defecto vertical
    const esDoble = fichaParaJugar.valorSuperior === fichaParaJugar.valorInferior;

    let nuevaPosicion: { fila: number; columna: number };

    if (fichasEnMesa.length === 0) { // Condición para la PRIMERA ficha
      // Primera ficha siempre en el centro (5,5)
      nuevaPosicion = { fila: 5, columna: 5 };
      if (esDoble) {
        rotacionCalculada = 0;
      } else {
        rotacionCalculada = 90;  // Primera ficha no doble horizontal
      }
    } else { // Fichas SUBSECUENTES
      
      const ultimaFicha = fichasEnMesa[fichasEnMesa.length - 1];
      
      
      if (!ultimaFicha) { // Si ultimaFicha es undefined (no debería pasar si length > 0, pero es una buena guarda)
        console.error("ERROR CRITICO: No se pudo obtener la última ficha de la mesa. Estado de fichasEnMesa:", fichasEnMesa);
        return; // Detener ejecución para evitar el crash
      }
      
      const uPos = ultimaFicha.posicionCuadricula;

      // Lógica de posicionamiento (basada en tu versión anterior)
      // Esta lógica define un camino secuencial específico.
      if (uPos.fila === 5 && uPos.columna < 9 && uPos.columna >= 5) { // Moviéndose a la derecha en la fila 5 desde el centro
        nuevaPosicion = { fila: 5, columna: uPos.columna + 1 };
        if (!esDoble) rotacionCalculada = 90;
      } else if (uPos.fila === 5 && uPos.columna > 1 && uPos.columna <= 5) { // Moviéndose a la izquierda en la fila 5 desde el centro
        nuevaPosicion = { fila: 5, columna: uPos.columna - 1 };
        if (!esDoble) rotacionCalculada = 90;
      } else if (uPos.fila === 5 && uPos.columna === 9) { // Llegó a (5,9), baja
        nuevaPosicion = { fila: 6, columna: 9 };
        if (!esDoble) rotacionCalculada = 0; // Movimiento vertical
      } else if (uPos.columna === 9 && uPos.fila >= 6 && uPos.fila < 7) { // Bajando por la columna 9 (de 6,9 a 7,9)
        nuevaPosicion = { fila: uPos.fila + 1, columna: 9 };
        if (!esDoble) rotacionCalculada = 0; // Movimiento vertical
      } else if (uPos.fila === 7 && uPos.columna === 9) { // Llegó a (7,9), va a la izquierda
        nuevaPosicion = { fila: 7, columna: 8 };
        if (!esDoble) rotacionCalculada = 90;
      } else if (uPos.fila === 7 && uPos.columna > 1 && uPos.columna <= 8) { // Moviéndose a la izquierda en la fila 7
        nuevaPosicion = { fila: 7, columna: uPos.columna - 1 };
        if (!esDoble) rotacionCalculada = 90;
      } else if (uPos.fila === 5 && uPos.columna === 1) { // Llegó a (5,1), sube
        nuevaPosicion = { fila: 4, columna: 1 };
        if (!esDoble) rotacionCalculada = 0; // Movimiento vertical
      } else if (uPos.columna === 1 && uPos.fila > 3 && uPos.fila <= 4) { // Subiendo por la columna 1 (de 4,1 a 3,1)
        nuevaPosicion = { fila: uPos.fila - 1, columna: 1 };
        if (!esDoble) rotacionCalculada = 0; // Movimiento vertical
      } else if (uPos.fila === 3 && uPos.columna === 1) { // Llegó a (3,1), va a la derecha
        nuevaPosicion = { fila: 3, columna: 2 };
        if (!esDoble) rotacionCalculada = 90;
      } else if (uPos.fila === 3 && uPos.columna > 1 && uPos.columna < 9) { // Moviéndose a la derecha en la fila 3
        nuevaPosicion = { fila: 3, columna: uPos.columna + 1 };
        if (!esDoble) rotacionCalculada = 90;
      }
      else {
        // Fallback si ninguna regla coincide (debería evitarse con una lógica de camino completa)
        // O si la mesa está "llena" según este camino.
        // Por ahora, si no hay regla, no se puede jugar en esta implementación simple.
        console.warn("No se pudo determinar la siguiente posición válida para la ficha según el camino actual.", uPos);
        // Podrías intentar colocarla al otro "extremo" si tuvieras esa lógica,
        // o simplemente no permitir el movimiento.
        // Para este ejemplo, si no hay un camino claro, no la colocamos.
        // nuevaPosicion = { fila: uPos.fila, columna: uPos.columna }; // No mover
        // rotacionCalculada = ultimaFicha.rotacion;
        alert("No se puede colocar la ficha aquí según las reglas de camino actuales.");
        return; // Detener el intento de jugar la ficha
      }

      // Las fichas dobles siempre son verticales (0 grados)
      if (esDoble) {
        rotacionCalculada = 0;
      }
    }

    const nuevaFichaEnMesa = {
      ...fichaParaJugar,
      posicionCuadricula: nuevaPosicion,
      rotacion: rotacionCalculada,
    };

    setFichasEnMesa(prevMesa => [...prevMesa, nuevaFichaEnMesa]);
    setFichasEnManoActual(prevMano => prevMano.filter(f => f.id !== fichaSeleccionada));

    // Actualizar el estado general de manosJugadores
    setManosJugadores(prevManos => prevManos.map(mano =>
        mano.idJugador === "jugador1" // Asumiendo que "jugador1" es el jugador actual
            ? { ...mano, fichas: mano.fichas.filter(f => f.id !== fichaSeleccionada) }
            : mano
    ));
    setFichaSeleccionada(undefined);
    console.log("Ficha jugada y mesa actualizada:", nuevaFichaEnMesa, fichasEnMesa);
  };

  return (
    <div className="min-h-screen bg-table-wood flex flex-col">
      <header className="bg-domino-black text-domino-white p-2 sm:p-3">
        <h1 className="text-xl sm:text-2xl font-bold text-center">Dominando</h1>
      </header>

      <main className="flex-grow relative pt-1">
        <MesaDomino
          fichasEnMesa={fichasEnMesa}
          onFichaClick={(id) => console.log('Ficha en mesa clickeada:', id)}
        />

        {fichaSeleccionada && (
          <button
            className="absolute top-4 right-4 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded"
            onClick={handleJugarFicha}
          >
            Jugar Ficha
          </button>
        )}
        {/* Aquí podrías mostrar información de otros jugadores o fichas sobrantes si es relevante */}
        {/* <p>Fichas sobrantes: {fichasSobrantes.length}</p> */}
      </main>

      <ManoJugadorComponent
        fichas={fichasEnManoActual}
        fichaSeleccionada={fichaSeleccionada}
        onFichaClick={handleFichaClick}
      />
    </div>
  );
}
