// /home/heagueron/jmu/dominando/src/components/layout/Navbar.tsx
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiMenu, FiX } from 'react-icons/fi'; // Iconos para el menú hamburguesa
import { usePathname } from 'next/navigation'; // Para saber en qué página estamos

interface NavLink {
  href: string;
  label: string;
  primary?: boolean; // Para botones con estilo diferente (ej. Iniciar Sesión)
  secondary?: boolean; // Para botones con estilo diferente (ej. Registrarse)
  hideOnPaths?: string[]; // Opcional: para ocultar en ciertas páginas
}

interface NavbarProps {
  // Podríamos añadir props para personalizar los enlaces si fuera necesario,
  // pero por ahora definiremos los enlaces comunes aquí.
}

export default function Navbar(props: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navLinks: NavLink[] = [
    { href: '/como-jugar', label: 'Cómo Jugar' },
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


  return (
    <nav className="w-full py-5 px-6 md:px-10">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-3xl font-bold text-gray-900">
          Dominando
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex space-x-3 md:space-x-5 items-center">
          {navLinks.map(link => renderLink(link))}
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
            {navLinks.map(link => renderLink(link, true))}
          </div>
        </motion.div>
      )}
    </nav>
  );
}
