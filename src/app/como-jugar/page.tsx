import React from 'react';
import Link from 'next/link';

export default function ComoJugarPage() {
  return (
    <div className="min-h-screen bg-table-wood">
      <header className="bg-domino-black text-domino-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Dominando</h1>
          <Link href="/" className="text-yellow-400 hover:text-yellow-300">
            Volver al Inicio
          </Link>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        <div className="bg-domino-white bg-opacity-90 rounded-lg shadow-xl p-6 max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-domino-black">Cómo Jugar al Dominó</h1>
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-domino-black">Reglas Básicas</h2>
            <p className="mb-4 text-gray-800">
              El dominó es un juego de mesa para 2-4 jugadores que utiliza fichas rectangulares 
              divididas en dos cuadrados, cada uno con un número de puntos (o ninguno) de 0 a 6.
            </p>
            <p className="mb-4 text-gray-800">
              El objetivo del juego es ser el primero en colocar todas tus fichas en la mesa 
              o, si el juego se bloquea, tener el menor número de puntos en tu mano.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-domino-black">Preparación</h2>
            <ol className="list-decimal pl-6 space-y-2 text-gray-800">
              <li>Todas las fichas se colocan boca abajo y se mezclan.</li>
              <li>Cada jugador toma 7 fichas (en el juego de 2 o 4 jugadores).</li>
              <li>El jugador con la ficha más alta de dobles (6-6, 5-5, etc.) comienza.</li>
              <li>Si nadie tiene dobles, comienza el jugador con la ficha más alta.</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-domino-black">Jugando</h2>
            <ol className="list-decimal pl-6 space-y-2 text-gray-800">
              <li>El primer jugador coloca una ficha en el centro de la mesa.</li>
              <li>Los jugadores se turnan en el sentido de las agujas del reloj.</li>
              <li>Cada jugador debe colocar una ficha que coincida con uno de los extremos abiertos en la mesa.</li>
              <li>Si un jugador no puede jugar, debe "pasar" su turno.</li>
              <li>El juego continúa hasta que un jugador coloca todas sus fichas o hasta que el juego se bloquea (nadie puede jugar).</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-domino-black">Puntuación</h2>
            <p className="mb-4 text-gray-800">
              Existen diferentes sistemas de puntuación. En el más común:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-800">
              <li>El ganador recibe puntos igual a la suma de todos los puntos en las manos de los oponentes.</li>
              <li>Si el juego se bloquea, el jugador con menos puntos en su mano gana y recibe la diferencia de puntos.</li>
              <li>El juego continúa hasta que un jugador alcanza una puntuación predeterminada (generalmente 100 o 200 puntos).</li>
            </ul>
          </section>

          <div className="mt-8 text-center">
            <Link 
              href="/juego" 
              className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              ¡Jugar Ahora!
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
