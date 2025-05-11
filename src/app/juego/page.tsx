'use client';

import React, { useState } from 'react';
import MesaDomino from '@/components/domino/MesaDomino';
import ManoJugador from '@/components/domino/ManoJugador';

// Datos de ejemplo para demostración
const fichasEjemplo = [
  { id: '1', valorSuperior: 6, valorInferior: 6 },
  { id: '2', valorSuperior: 6, valorInferior: 5 },
  { id: '3', valorSuperior: 6, valorInferior: 4 },
  { id: '4', valorSuperior: 6, valorInferior: 3 },
  { id: '5', valorSuperior: 6, valorInferior: 2 },
  { id: '6', valorSuperior: 6, valorInferior: 1 },
  { id: '7', valorSuperior: 6, valorInferior: 0 },
];

// Comenzamos con una mesa vacía para que la primera ficha se coloque en (5,5)
const fichasEnMesaEjemplo: any[] = [];

export default function JuegoPage() {
  const [fichasEnMano, setFichasEnMano] = useState(fichasEjemplo);
  const [fichasEnMesa, setFichasEnMesa] = useState(fichasEnMesaEjemplo);
  const [fichaSeleccionada, setFichaSeleccionada] = useState<string | undefined>();

  const handleFichaClick = (id: string) => {
    setFichaSeleccionada(id === fichaSeleccionada ? undefined : id);
  };

  const handleJugarFicha = () => {
    console.log("Iniciando handleJugarFicha");
    if (!fichaSeleccionada) {
      console.log("No hay ficha seleccionada");
      return;
    }

    // Encontrar la ficha seleccionada
    const ficha = fichasEnMano.find(f => f.id === fichaSeleccionada);
    if (!ficha) {
      console.log("No se encontró la ficha seleccionada en la mano");
      return;
    }

    console.log("Ficha seleccionada:", ficha);

    // Determinar si la ficha es doble
    const esDoble = ficha.valorSuperior === ficha.valorInferior;

    // Determinar la rotación según la posición
    // Ahora todas las fichas tienen la misma forma base (vertical)
    // Y aplicamos la rotación según la dirección de movimiento
    let rotacion = 0; // Por defecto, sin rotación (vertical)

    // Ajustar la rotación según la dirección de movimiento
    if (fichasEnMesa.length > 0) {
      const ultimaFicha = fichasEnMesa[fichasEnMesa.length - 1];
      const ultimaPosicion = ultimaFicha.posicionCuadricula;

      // Si nos movemos hacia la derecha en la fila 5 (desde el centro)
      if (ultimaPosicion.fila === 5 && ultimaPosicion.columna >= 5 && ultimaPosicion.columna < 9) {
        rotacion = 90; // Girar 90 grados (horizontal)
      }
      // Si nos movemos hacia la izquierda en la fila 5 (desde el centro)
      else if (ultimaPosicion.fila === 5 && ultimaPosicion.columna <= 5 && ultimaPosicion.columna > 1) {
        rotacion = 90; // Girar 90 grados (horizontal)
      }
      // Si nos movemos hacia arriba en la columna 1
      else if (ultimaPosicion.columna === 1 && ultimaPosicion.fila > 3) {
        rotacion = 0; // Sin rotación (vertical)
      }
      // Si nos movemos hacia la derecha en la fila 3
      else if (ultimaPosicion.fila === 3) {
        rotacion = 90; // Girar 90 grados (horizontal)
      }
      // Si nos movemos hacia abajo en la columna 9
      else if (ultimaPosicion.columna === 9 && ultimaPosicion.fila < 7) {
        rotacion = 0; // Sin rotación (vertical)
      }
      // Si nos movemos hacia la izquierda en la fila 7
      else if (ultimaPosicion.fila === 7) {
        rotacion = 90; // Girar 90 grados (horizontal)
      }
    }

    // Las fichas dobles siempre van en posición vertical (0 grados)
    if (esDoble) {
      rotacion = 0;
    }

    console.log(`Ficha ${ficha.id} es doble: ${esDoble}, rotación: ${rotacion}°`);

    // Determinar la posición de la ficha según las reglas
    let nuevaPosicion;

    if (fichasEnMesa.length === 0) {
      // Primera ficha siempre en el centro (5,5)
      nuevaPosicion = { fila: 5, columna: 5 };
    } else {
      // Obtener la última ficha colocada
      const ultimaFicha = fichasEnMesa[fichasEnMesa.length - 1];
      const ultimaPosicion = ultimaFicha.posicionCuadricula;

      // Reglas de posicionamiento:
      // 1. Primero completamos la fila 5 (hacia derecha e izquierda)
      // 2. Al llegar al extremo derecho (5,9), bajamos (6,9, 7,9, etc.) y formamos fila por la 7
      // 3. Al llegar al extremo izquierdo (5,1), subimos (4,1, 3,1, etc.) y formamos fila por la 3

      // Verificar si estamos en la fila 5 y podemos seguir a la derecha
      if (ultimaPosicion.fila === 5 && ultimaPosicion.columna < 9) {
        // Seguimos a la derecha en la fila 5
        nuevaPosicion = { fila: 5, columna: ultimaPosicion.columna + 1 };
      }
      // Verificar si estamos en la fila 5 y podemos seguir a la izquierda
      else if (ultimaPosicion.fila === 5 && ultimaPosicion.columna > 1) {
        // Seguimos a la izquierda en la fila 5
        nuevaPosicion = { fila: 5, columna: ultimaPosicion.columna - 1 };
      }
      // Verificar si llegamos al extremo derecho (5,9)
      else if (ultimaPosicion.fila === 5 && ultimaPosicion.columna === 9) {
        // Bajamos a la fila 6
        nuevaPosicion = { fila: 6, columna: 9 };
      }
      // Verificar si estamos bajando por la columna 9
      else if (ultimaPosicion.columna === 9 && ultimaPosicion.fila < 7) {
        // Seguimos bajando
        nuevaPosicion = { fila: ultimaPosicion.fila + 1, columna: 9 };
      }
      // Verificar si llegamos a la posición (7,9)
      else if (ultimaPosicion.fila === 7 && ultimaPosicion.columna === 9) {
        // Comenzamos a movernos hacia la izquierda en la fila 7
        nuevaPosicion = { fila: 7, columna: 8 };
      }
      // Verificar si estamos en la fila 7 moviéndonos hacia la izquierda
      else if (ultimaPosicion.fila === 7 && ultimaPosicion.columna > 1) {
        // Seguimos hacia la izquierda
        nuevaPosicion = { fila: 7, columna: ultimaPosicion.columna - 1 };
      }
      // Verificar si llegamos al extremo izquierdo (5,1)
      else if (ultimaPosicion.fila === 5 && ultimaPosicion.columna === 1) {
        // Subimos a la fila 4
        nuevaPosicion = { fila: 4, columna: 1 };
      }
      // Verificar si estamos subiendo por la columna 1
      else if (ultimaPosicion.columna === 1 && ultimaPosicion.fila > 3) {
        // Seguimos subiendo
        nuevaPosicion = { fila: ultimaPosicion.fila - 1, columna: 1 };
      }
      // Verificar si llegamos a la posición (3,1)
      else if (ultimaPosicion.fila === 3 && ultimaPosicion.columna === 1) {
        // Comenzamos a movernos hacia la derecha en la fila 3
        nuevaPosicion = { fila: 3, columna: 2 };
      }
      // Verificar si estamos en la fila 3 moviéndonos hacia la derecha
      else if (ultimaPosicion.fila === 3 && ultimaPosicion.columna < 9) {
        // Seguimos hacia la derecha
        nuevaPosicion = { fila: 3, columna: ultimaPosicion.columna + 1 };
      }
      // Si no se cumple ninguna de las condiciones anteriores, colocamos la ficha en el centro
      else {
        nuevaPosicion = { fila: 5, columna: 5 };
        console.warn("No se pudo determinar la posición de la ficha, colocándola en el centro");
      }
    }

    // Crear la nueva ficha para la mesa
    const nuevaFichaEnMesa = {
      id: ficha.id,
      valorSuperior: ficha.valorSuperior,
      valorInferior: ficha.valorInferior,
      posicionCuadricula: nuevaPosicion,
      rotacion: rotacion
    };

    console.log("Nueva ficha a colocar en la mesa:", nuevaFichaEnMesa);

    // Actualizar el estado
    setFichasEnMesa([...fichasEnMesa, nuevaFichaEnMesa]);

    // Remover la ficha de la mano del jugador
    setFichasEnMano(fichasEnMano.filter(f => f.id !== fichaSeleccionada));
    setFichaSeleccionada(undefined);
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
      </main>

      <ManoJugador
        fichas={fichasEnMano}
        fichaSeleccionada={fichaSeleccionada}
        onFichaClick={handleFichaClick}
      />
    </div>
  );
}
