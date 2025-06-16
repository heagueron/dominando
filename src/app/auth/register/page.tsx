// page.tsx
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Para la redirección después del registro
import { signIn } from 'next-auth/react'; // Importar signIn
import Navbar from '@/components/layout/Navbar'; // Importar el nuevo Navbar

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsLoading(true);
    console.log('Intento de Registro:', { username: formData.username, email: formData.email });

    try {
      // Llamada al endpoint de API para registrar
      const response = await fetch('/api/auth/register', { // Asume que tienes un endpoint de API para registrar
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al registrar la cuenta.');
      }

      // Si el registro es exitoso, proceder a enviar el correo de verificación
      console.log('Registro exitoso en BD:', data.user);
    
      // Enviar el correo de verificación (magic link)
      // El usuario NO inicia sesión aquí, solo se envía el correo.
      // NextAuth mostrará una página por defecto tipo "Revisa tu correo".
      const signInResponse = await signIn('email', {
        email: formData.email,
        redirect: false, // No redirigir, NextAuth maneja la UI de "revisa tu correo"
        // Esta es la URL a la que se redirigirá DESPUÉS de hacer clic en el magic link
        callbackUrl: `${window.location.origin}/auth/signin?message=Correo verificado. Ahora puedes iniciar sesión con tu contraseña.`,
      });

      if (signInResponse?.error) {
        // Si el registro en BD fue exitoso pero el envío del email falló,
        // es un caso un poco complicado. Podrías informar al usuario
        // que su cuenta fue creada pero que intente verificar más tarde o contacte soporte.
        // Por ahora, mostramos un error genérico.
        setError(`Cuenta creada, pero ocurrió un error al enviar el correo de verificación: ${signInResponse.error}. Intenta iniciar sesión y verifica tu correo desde allí si es posible.`);
        // O podrías redirigir a signin con un mensaje especial
        // router.push('/auth/signin?message=Cuenta creada. Error al enviar verificación, intenta de nuevo o contacta soporte.');
      } else {
        // Redirigir a una página que diga "Revisa tu correo para el enlace de verificación"
        // o directamente a la página de "Revisa tu correo" que NextAuth podría mostrar.
        // Por ahora, podemos redirigir a signin con un mensaje más específico.
        router.push('/auth/signin?message=Registro casi completo. Revisa tu correo para verificar tu cuenta.');
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado durante el registro.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-white text-gray-800 flex flex-col">
      <Navbar />

      {/* Main Content - Formulario de Registro */}
      <main className="flex-grow flex items-center justify-center py-8 sm:py-12 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative w-full max-w-md mx-auto"
        >
          {/* Ajustamos el padding y algunos márgenes para hacerlo más compacto */}
          <div className="bg-white rounded-xl p-6 sm:p-8 border border-gray-200 shadow-lg">
            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1">
                Crear Cuenta
              </h2>
              <p className="text-gray-600 text-sm">
                Únete a la comunidad de FullDomino
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de Usuario</label>
                <input type="text" name="username" value={formData.username} onChange={handleChange} required className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-300" placeholder="tu_usuario" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-300" placeholder="tu@email.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                <input type="password" name="password" value={formData.password} onChange={handleChange} required className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-300" placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Contraseña</label>
                <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-300" placeholder="••••••••" />
              </div>

              {error && (
                <p className="text-sm text-red-500 text-center">{error}</p>
              )}

              <motion.button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition-all duration-300 shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                whileHover={{ boxShadow: isLoading ? undefined : '0 6px 20px rgba(245, 158, 11, 0.3)' }} // Sombra amarilla
                whileTap={{ scale: isLoading ? 1 : 0.98 }}
              >
                {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
              </motion.button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                ¿Ya tienes una cuenta?{' '}
                <Link
                  href="/auth/signin"
                  className="text-yellow-600 hover:text-yellow-700 transition-colors duration-300 font-medium hover:underline"
                >
                  Inicia sesión aquí
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer Adaptado */}
      <footer className="w-full py-10 text-center text-gray-500 bg-gray-50">
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
