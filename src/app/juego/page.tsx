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

const fichasEnMesaEjemplo = [
  { 
    id: '8', 
    valorSuperior: 5, 
    valorInferior: 5, 
    posicionX: 300, 
    posicionY: 250, 
    rotacion: 0 
  },
];

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

    // Añadir la ficha a la mesa (en una posición aleatoria para este ejemplo)
    const nuevaFichaEnMesa = {
      ...ficha,
      posicionX: Math.random() * 400 + 100,
      posicionY: Math.random() * 200 + 150,
      rotacion: Math.random() * 360,
    };

    // Actualizar el estado
    setFichasEnMesa([...fichasEnMesa, nuevaFichaEnMesa]);
    setFichasEnMano(fichasEnMano.filter(f => f.id !== fichaSeleccionada));
    setFichaSeleccionada(undefined);
  };

  return (
    <div className="min-h-screen bg-table-wood flex flex-col">
      <header className="bg-domino-black text-domino-white p-4">
        <h1 className="text-2xl font-bold text-center">Dominando</h1>
      </header>

      <main className="flex-grow relative">
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
