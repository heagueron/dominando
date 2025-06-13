// Navbar.tsx
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiMenu, FiX, FiLogOut } from 'react-icons/fi'; // Iconos para el menú hamburguesa y acciones
import { usePathname } from 'next/navigation'; // Para saber en qué página estamos
import { useSession, signOut } from 'next-auth/react'; // Importar useSession y signOut
import UserAvatar from '@/components/jugador/UserAvatar'; // Importar el componente UserAvatar

interface NavLink {
  href: string;
  label: string;
  primary?: boolean; // Para botones con estilo diferente (ej. Iniciar Sesión)
  secondary?: boolean; // Para botones con estilo diferente (ej. Registrarse)
  hideOnPaths?: string[]; // Opcional: para ocultar en ciertas páginas
}

// interface NavbarProps {
//   // Si en el futuro necesitas props, puedes descomentar esto.
// }

// export default function Navbar(props: NavbarProps) { // props ya no se usa
export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { status } = useSession(); // Solo 'status' es usado directamente aquí

  // Enlaces comunes, siempre visibles (a menos que tengan su propio hideOnPaths)
  const commonLinks: NavLink[] = [
    { href: '/como-jugar', label: 'Cómo Jugar' },
  ];

  // Enlaces para usuarios no autenticados
  const unauthenticatedNavLinks: NavLink[] = [
    {
      href: '/auth/signin',
      label: 'Iniciar Sesión',
      primary: true,
      hideOnPaths: ['/auth/signin', '/auth/register'], // Ocultar si ya estamos en login/register
    },
    {
      href: '/auth/register',
      label: 'Registrarse',
      secondary: true,
      hideOnPaths: ['/auth/signin', '/auth/register'], // Ocultar si ya estamos en login/register
    },
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const renderLink = (link: NavLink, isMobile: boolean = false) => {
    if (link.hideOnPaths?.includes(pathname)) {
      return null;
    }

    let className = `text-sm font-medium transition-colors duration-150 rounded-lg`;
    if (isMobile) {
      className += ' block px-3 py-3 hover:bg-gray-100 w-full text-left';
      if (link.primary) {
        className += ' bg-yellow-500 text-white hover:bg-yellow-600';
      } else if (link.secondary) {
        className += ' text-yellow-600 border border-yellow-500 hover:bg-yellow-500 hover:text-white';
      } else {
        className += ' text-gray-700 hover:text-yellow-600';
      }
    } else {
      // Estilos para desktop
      if (link.primary) {
        className += ' bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 transform hover:scale-105';
      } else if (link.secondary) {
        className += ' text-yellow-500 hover:text-yellow-600 font-semibold py-2 px-4 border border-yellow-500 hover:bg-yellow-500 hover:text-white transform hover:scale-105';
      } else {
        className += ' text-gray-700 hover:text-yellow-600 px-3 py-2';
      }
    }

    return (
      <Link key={link.href} href={link.href} className={className} onClick={isMobile ? toggleMobileMenu : undefined}>
        {link.label}
      </Link>
    );
  };

  const renderLogoutButton = (isMobile: boolean = false) => {
    let className = `text-sm font-medium transition-colors duration-150 rounded-lg cursor-pointer`;
    if (isMobile) {
      className += ' flex items-center space-x-2 block px-3 py-3 bg-red-500 text-white hover:bg-red-700 w-full text-left';
    } else {
      className += ' bg-red-500 hover:bg-red-700 text-white font-semibold py-2 px-4 transform hover:scale-105 flex items-center space-x-2';
    }
    return (
      <div className="flex items-center space-x-2">
        {!isMobile && <UserAvatar size={32} className="hidden sm:block" />} {/* Mostrar avatar en desktop */}
        <button
          key="logout"
          onClick={() => signOut({ callbackUrl: '/' })}
          className={className}
        >
          <FiLogOut className={isMobile ? "mr-2" : "mr-1"} />
          <span>Salir</span>
        </button>
      </div>
    );
  };


  return (
    <nav className="w-full py-5 px-6 md:px-10">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-3xl font-bold text-gray-900">
          Dominando
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex space-x-3 md:space-x-5 items-center">
          {commonLinks.map(link => renderLink(link))}
          {status === 'authenticated' && renderLogoutButton()}
          {status === 'unauthenticated' && unauthenticatedNavLinks.map(link => renderLink(link))}
          {/* Mientras status === 'loading', los enlaces de autenticación no se muestran, lo cual es aceptable */}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button
            onClick={toggleMobileMenu}
            className="text-gray-700 hover:text-yellow-600 focus:outline-none"
            aria-label="Abrir menú"
          >
            {isMobileMenuOpen ? <FiX size={28} /> : <FiMenu size={28} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="md:hidden mt-4 bg-white shadow-lg rounded-lg p-4 border border-gray-200"
        >
          <div className="flex flex-col space-y-3">
            {commonLinks.map(link => renderLink(link, true))}
            {status === 'authenticated' && renderLogoutButton(true)}
            {status === 'unauthenticated' && unauthenticatedNavLinks.map(link => renderLink(link, true))}
          </div>
        </motion.div>
      )}
    </nav>
  );
}
