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

// Comenzamos con una mesa vacía
const fichasEnMesaEjemplo: any[] = [];

export default function JuegoPage() {
  const [fichasEnMano, setFichasEnMano] = useState(fichasEjemplo);
  const [fichasEnMesa, setFichasEnMesa] = useState(fichasEnMesaEjemplo);
  const [fichaSeleccionada, setFichaSeleccionada] = useState<string | undefined>();

  const handleFichaClick = (id: string) => {
    setFichaSeleccionada(id === fichaSeleccionada ? undefined : id);
  };

  const handleJugarFicha = () => {
    if (!fichaSeleccionada) return;

    // Encontrar la ficha seleccionada
    const ficha = fichasEnMano.find(f => f.id === fichaSeleccionada);
    if (!ficha) return;

    // Si no hay fichas en la mesa, colocar la primera ficha en el centro (5,5)
    if (fichasEnMesa.length === 0) {
      // Para la primera ficha, decidimos si colocarla horizontal o vertical
      // Si es doble (mismos valores arriba y abajo), la colocamos vertical
      const esDoble = ficha.valorSuperior === ficha.valorInferior;
      const rotacion = esDoble ? 0 : 90; // 0 = vertical, 90 = horizontal

      const nuevaFichaEnMesa = {
        ...ficha,
        posicionCuadricula: { fila: 5, columna: 5 }, // Centro de la cuadrícula
        rotacion, // Rotación según si es doble o no
      };

      // Actualizar el estado
      setFichasEnMesa([...fichasEnMesa, nuevaFichaEnMesa]);
    } else {
      // Para este ejemplo, colocamos la ficha en posiciones alrededor del centro
      // para probar diferentes ubicaciones en la cuadrícula

      // Posiciones de prueba alrededor del centro
      const posicionesPrueba = [
        { fila: 4, columna: 5, rotacion: 0 },   // Arriba (vertical)
        { fila: 5, columna: 6, rotacion: 90 },  // Derecha (horizontal)
        { fila: 6, columna: 5, rotacion: 0 },   // Abajo (vertical)
        { fila: 5, columna: 4, rotacion: 90 },  // Izquierda (horizontal)
        { fila: 4, columna: 4, rotacion: 45 },  // Diagonal arriba-izquierda
        { fila: 4, columna: 6, rotacion: 135 }, // Diagonal arriba-derecha
        { fila: 6, columna: 6, rotacion: 225 }, // Diagonal abajo-derecha
        { fila: 6, columna: 4, rotacion: 315 }  // Diagonal abajo-izquierda
      ];

      // Seleccionar una posición basada en el número de fichas ya en la mesa
      const indice = (fichasEnMesa.length - 1) % posicionesPrueba.length;
      const posicionPrueba = posicionesPrueba[indice];

      const nuevaFichaEnMesa = {
        ...ficha,
        posicionCuadricula: {
          fila: posicionPrueba.fila,
          columna: posicionPrueba.columna
        },
        rotacion: posicionPrueba.rotacion,
      };

      // Actualizar el estado
      setFichasEnMesa([...fichasEnMesa, nuevaFichaEnMesa]);
    }

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
