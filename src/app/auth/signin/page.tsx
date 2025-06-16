// page.tsx
'use client';

import React, { useState, useEffect, Suspense } from 'react'; // Importar Suspense
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, getProviders, ClientSafeProvider } from 'next-auth/react';
import Navbar from '@/components/layout/Navbar';
import { FcGoogle } from 'react-icons/fc'; // Icono de Google

// Componente interno para manejar los mensajes de los searchParams
function AuthMessages() {
  const searchParams = useSearchParams();
  const router = useRouter(); // Necesario para router.replace
  const [displayMessage, setDisplayMessage] = useState<string | null>(null);
  const [displayError, setDisplayError] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    const messageParam = searchParams.get('message');
    let hasChangedUrl = false;

    if (errorParam) {
      if (errorParam === 'CredentialsSignin') {
        setDisplayError('Credenciales incorrectas. Por favor, inténtalo de nuevo.');
      } else if (errorParam === 'OAuthAccountNotLinked') {
        setDisplayError('Este correo ya está registrado con otro método. Intenta iniciar sesión con ese método o contacta soporte.');
      } else {
        // Para errores que ya vienen con un mensaje específico desde NextAuth (como el de correo no verificado)
        // o si quieres un mensaje más genérico.
        // Podrías decodificar el errorParam si es una URL codificada.
        try {
            const decodedError = decodeURIComponent(errorParam);
            setDisplayError(decodedError);
        } catch { // Se omite la variable 'e' ya que no se usa
            setDisplayError(`Ocurrió un error durante el inicio de sesión.`);
        }
      }
      hasChangedUrl = true;
    } else if (messageParam) {
      setDisplayMessage(messageParam);
      hasChangedUrl = true;
    }

    if (hasChangedUrl) {
      // Limpiar los parámetros de la URL para que no persistan si el usuario navega o recarga
      router.replace('/auth/signin', undefined);
    }
  }, [searchParams, router]);

  if (!displayMessage && !displayError) return null;

  return (
    <div className="my-4 text-center">
      {displayMessage && <p className="text-sm text-green-600 bg-green-100 p-3 rounded-md shadow-sm">{displayMessage}</p>}
      {displayError && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-md shadow-sm">{displayError}</p>}
    </div>
  );
}

// Nuevo componente que contendrá la lógica y UI que usa useSearchParams
function SignInFormArea() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null); // Error específico del formulario de credenciales
  const [isLoading, setIsLoading] = useState(false);
  const [providers, setProviders] = useState<Record<string, ClientSafeProvider> | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams(); // useSearchParams está dentro de este componente

  useEffect(() => {
    (async () => {
      const res = await getProviders();
      setProviders(res);
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null); // Limpiar error del formulario antes de un nuevo intento
    setIsLoading(true);

    const result = await signIn('credentials', {
      redirect: false,
      email: formData.email,
      password: formData.password,
    });

    setIsLoading(false);

    if (result?.error) {
      if (result.error === 'CredentialsSignin') {
        setError('Credenciales incorrectas. Por favor, verifica tu correo y contraseña.');
      } else if (result.error.includes("Tu correo electrónico aún no ha sido verificado")) {
        setError(result.error);
      } else {
        setError('Ocurrió un error durante el inicio de sesión. Inténtalo de nuevo.');
      }
    } else if (result?.ok) {
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
    <>
      <Suspense fallback={<div className="text-center text-sm text-gray-500 my-4">Cargando mensajes...</div>}>
        <AuthMessages />
      </Suspense>

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

      {providers && Object.values(providers).some(p => p.id !== 'credentials' && p.id !== 'email') && (
        <>
          <div className="my-6 flex items-center">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink mx-4 text-gray-500 text-sm">O continúa con</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>
          {Object.values(providers).map((provider) => {
            if (provider.id === 'credentials' || provider.id === 'email') return null;
            return (
              <motion.button 
                key={provider.name} 
                onClick={() => signIn(provider.id, { callbackUrl: searchParams.get('callbackUrl') || '/lobby' })} 
                className="w-full mb-3 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-all duration-300 shadow-sm flex items-center justify-center" 
                whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                {provider.id === 'google' && <FcGoogle className="mr-2" size={20} />}
                {provider.name}
              </motion.button>
            );
          })}
        </>
      )}
    </>
  );
}

export default function SignInPage() {
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
                Bienvenido de nuevo a FullDomino
              </p>
            </div>

            <Suspense fallback={<div className="text-center text-lg font-semibold my-8">Cargando formulario...</div>}>
              <SignInFormArea />
            </Suspense>

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
          <p className="text-xl font-semibold text-gray-800 mb-2">FullDomino</p>
          <p className="mb-4 text-sm">La mejor plataforma de dominó multijugador en línea</p>
          <div className="space-x-6 mb-4 text-sm">
            <Link href="/terminos" className="hover:text-yellow-600 transition-colors">Términos</Link>
            <Link href="/privacidad" className="hover:text-yellow-600 transition-colors">Privacidad</Link>
            <Link href="/contacto" className="hover:text-yellow-600 transition-colors">Contacto</Link>
          </div>
          <p className="text-xs text-gray-400">&copy; {new Date().getFullYear()} FullDomino. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
