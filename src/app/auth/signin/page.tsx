// /home/heagueron/jmu/dominando/src/app/auth/signin/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, getProviders, ClientSafeProvider } from 'next-auth/react';
import Navbar from '@/components/layout/Navbar';
import { FcGoogle } from 'react-icons/fc'; // Icono de Google

export default function SignInPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [providers, setProviders] = useState<Record<string, ClientSafeProvider> | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    (async () => {
      const res = await getProviders();
      setProviders(res);
    })();
  }, []);

  useEffect(() => {
    const callbackError = searchParams.get('error');
    if (callbackError) {
      if (callbackError === 'CredentialsSignin') {
        setError('Credenciales incorrectas. Por favor, inténtalo de nuevo.');
      } else {
        setError('Ocurrió un error durante el inicio de sesión.');
      }
      // Limpiar el error de la URL para que no persista si el usuario navega
      router.replace('/auth/signin', undefined);
    }
    const message = searchParams.get('message');
    if (message) {
      // Podrías mostrar este mensaje en un toast o alerta más visible
      console.log("Mensaje de redirección:", message);
      // alert(message); // Ejemplo simple
      router.replace('/auth/signin', undefined);
    }
  }, [searchParams, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const result = await signIn('credentials', {
      redirect: false, // Manejamos la redirección manualmente
      email: formData.email,
      password: formData.password,
      // callbackUrl: '/lobby' // NextAuth redirigirá a esto si es exitoso y no hay error
    });

    setIsLoading(false);

    if (result?.error) {
      if (result.error === 'CredentialsSignin') {
        setError('Credenciales incorrectas. Por favor, inténtalo de nuevo.');
      } else {
        setError(result.error || 'Ocurrió un error inesperado.');
      }
    } else if (result?.ok) {
      // Redirección exitosa, NextAuth se encarga si callbackUrl está bien configurado
      // o podemos forzarla aquí si es necesario.
      router.push(searchParams.get('callbackUrl') || '/lobby');
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

      <main className="flex-grow flex items-center justify-center py-8 sm:py-12 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative w-full max-w-md mx-auto"
        >
          <div className="bg-white rounded-xl p-6 sm:p-8 border border-gray-200 shadow-lg">
            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1">
                Iniciar Sesión
              </h2>
              <p className="text-gray-600 text-sm">
                Bienvenido de nuevo a Dominando
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-300" placeholder="tu@email.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                <input type="password" name="password" value={formData.password} onChange={handleChange} required className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-300" placeholder="••••••••" />
              </div>

              {error && (
                <p className="text-sm text-red-500 text-center">{error}</p>
              )}

              <motion.button type="submit" disabled={isLoading} className="w-full py-2.5 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition-all duration-300 shadow-md disabled:opacity-70 disabled:cursor-not-allowed" whileHover={{ boxShadow: isLoading ? undefined : '0 6px 20px rgba(245, 158, 11, 0.3)' }} whileTap={{ scale: isLoading ? 1 : 0.98 }}>
                {isLoading ? 'Iniciando...' : 'Iniciar Sesión'}
              </motion.button>
            </form>

            {providers && Object.values(providers).some(p => p.id !== 'credentials') && (
              <>
                <div className="my-6 flex items-center">
                  <div className="flex-grow border-t border-gray-300"></div>
                  <span className="flex-shrink mx-4 text-gray-500 text-sm">O continúa con</span>
                  <div className="flex-grow border-t border-gray-300"></div>
                </div>
                {Object.values(providers).map((provider) => {
                  if (provider.id === 'credentials') return null;
                  return (
                    <motion.button key={provider.name} onClick={() => signIn(provider.id, { callbackUrl: searchParams.get('callbackUrl') || '/lobby' })} className="w-full mb-3 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-all duration-300 shadow-sm flex items-center justify-center" whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                      {provider.id === 'google' && <FcGoogle className="mr-2" size={20} />}
                      {provider.name}
                    </motion.button>
                  );
                })}
              </>
            )}

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                ¿No tienes una cuenta?{' '}
                <Link href="/auth/register" className="text-yellow-600 hover:text-yellow-700 transition-colors duration-300 font-medium hover:underline">
                  Regístrate aquí
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </main>

      <footer className="w-full py-10 text-center text-gray-500 bg-gray-50">
        <div className="container mx-auto px-4">
          <p className="text-xl font-semibold text-gray-800 mb-2">Dominando</p>
          <p className="mb-4 text-sm">La mejor plataforma de dominó multijugador en línea</p>
          <div className="space-x-6 mb-4 text-sm">
            <Link href="/terminos" className="hover:text-yellow-600 transition-colors">Términos</Link>
            <Link href="/privacidad" className="hover:text-yellow-600 transition-colors">Privacidad</Link>
            <Link href="/contacto" className="hover:text-yellow-600 transition-colors">Contacto</Link>
          </div>
          <p className="text-xs text-gray-400">&copy; {new Date().getFullYear()} Dominando. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}