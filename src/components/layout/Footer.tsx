// /home/heagueron/jmu/dominando/src/components/layout/Footer.tsx
import Link from 'next/link';
import React from 'react';

export default function Footer() {
  return (
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
  );
}