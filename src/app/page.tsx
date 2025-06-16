// page.tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react'; // Necesario para el botón "Jugar Ahora"
import Navbar from '@/components/layout/Navbar'; // Importar el nuevo Navbar

export default function HomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const handleJugarAhoraClick = () => {
    if (status === 'authenticated') {
      router.push('/lobby');
    } else {
      // Redirige a la página de inicio de sesión de NextAuth,
      // y si el login es exitoso, redirige al lobby.
      // Si tienes una página de login personalizada en NextAuth (ej. /auth/signin),
      // NextAuth la usará.
      signIn(undefined, { callbackUrl: '/lobby' });
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-800 flex flex-col">
      <Navbar />

      {/* Main Content */}
      <main className="flex-grow flex flex-col justify-center items-center text-center px-4">
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-gray-900 mb-4">
          FullDomino
        </h1>
        <p className="text-xl sm:text-2xl text-gray-700 mb-6">
          Únete a la diversión del dominó entre amigos
        </p>
        <p className="max-w-xl lg:max-w-2xl text-gray-600 mb-10 text-base sm:text-lg">
          Experimenta la emoción del dominó tradicional en un entorno digital moderno. Conecta con amigos, desafía a jugadores de todas partes y disfruta de partidas épicas.
        </p>
        <button
          onClick={handleJugarAhoraClick}
          className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-10 rounded-lg text-lg transition-all duration-150 ease-in-out transform hover:scale-105 shadow-md hover:shadow-lg"
        >
          {status === 'loading' ? 'Cargando...' : 'Jugar Ahora'}
        </button>
      </main>

      {/* Footer */}
      <footer className="w-full py-10 text-center text-gray-500 bg-gray-50"> {/* Un fondo sutil para el footer */}
        <div className="container mx-auto px-4">
          <p className="text-xl font-semibold text-gray-800 mb-2">FullDomino</p>
          <p className="mb-4 text-sm">
            La mejor plataforma de dominó multijugador en línea
          </p>
          <div className="space-x-6 mb-4 text-sm">
            <Link href="/terminos" className="hover:text-yellow-600 transition-colors">
              Términos
            </Link>
            <Link href="/privacidad" className="hover:text-yellow-600 transition-colors">
              Privacidad
            </Link>
            <Link href="/contacto" className="hover:text-yellow-600 transition-colors">
              Contacto
            </Link>
          </div>
          <p className="text-xs text-gray-400">&copy; {new Date().getFullYear()} FullDomino. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
