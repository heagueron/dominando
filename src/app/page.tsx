import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-table-wood">
      <div className="z-10 max-w-5xl w-full items-center justify-center text-center">
        <h1 className="text-5xl font-bold text-domino-white mb-8">
          Bienvenido a <span className="text-yellow-400">Dominando</span>
        </h1>

        <p className="text-xl text-domino-white mb-12">
          El mejor juego de dominó en línea con gráficos realistas y experiencia multijugador
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <Link
            href="/juego"
            className="group rounded-lg border border-transparent px-5 py-4 bg-domino-black hover:bg-gray-800 transition-colors"
          >
            <h2 className="mb-3 text-2xl font-semibold text-domino-white">
              Jugar Ahora{' '}
              <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                →
              </span>
            </h2>
            <p className="m-0 text-sm opacity-70 text-domino-white">
              Comienza una partida de dominó con jugadores de todo el mundo.
            </p>
          </Link>

          <Link
            href="/como-jugar"
            className="group rounded-lg border border-transparent px-5 py-4 bg-domino-black hover:bg-gray-800 transition-colors"
          >
            <h2 className="mb-3 text-2xl font-semibold text-domino-white">
              Cómo Jugar{' '}
              <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                →
              </span>
            </h2>
            <p className="m-0 text-sm opacity-70 text-domino-white">
              Aprende las reglas y estrategias del juego de dominó.
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
