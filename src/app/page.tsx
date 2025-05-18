// /home/heagueron/projects/dominando/src/app/page.tsx
'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <header className="p-4">
        <h1 className="text-4xl font-bold text-center text-gray-800">
          Bienvenido a Dominando
        </h1>
      </header>
      <main className="flex flex-col items-center justify-center flex-1 px-20 text-center">
        <p className="mt-3 text-xl text-gray-600">
          ¡Tu juego de dominó en línea favorito!
        </p>

        <Link href="/juego" legacyBehavior>
          <a className="mt-6 px-6 py-3 text-lg font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition duration-150 ease-in-out">
            Ir al Juego
          </a>
        </Link>
      </main>
      <footer className="flex items-center justify-center w-full h-24 border-t">
        <p className="text-gray-500">
          © {new Date().getFullYear()} Dominando
        </p>
      </footer>
    </div>
  );
}
