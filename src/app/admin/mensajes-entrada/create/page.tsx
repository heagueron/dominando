'use client';
import React, { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import { createEntryMessage } from "@/actions/entryMessageActions"; // Import the server action
import { EMType } from "@prisma/client"; // Import EMType enum from Prisma client

export default function CreateEntryMessagePage() {
  const { data: session, status } = useSession();

  const [content, setContent] = useState('');
  const [type, setType] = useState<EMType>(EMType.REFRAN); // Default to REFRAN
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Solo redirigir cuando el estado de la sesión ya no esté 'cargando'
    if (status !== 'loading' && (!session || !session.user || !session.user.is_admin)) {
      console.warn(`Intento de acceso no autorizado a /admin/mensajes-entrada/create por userId: ${session?.user?.id || 'desconocido'}`);
      redirect("/auth/signin?callbackUrl=/admin/mensajes-entrada/create");
    }
  }, [status, session]);

  // Muestra un estado de carga mientras se verifica la sesión para evitar un "flash" del contenido
  if (status === 'loading' || !session || !session.user.is_admin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-700 text-xl">Cargando...</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await createEntryMessage({
      content,
      type,
      source: source.trim() === '' ? undefined : source.trim(), // Pass undefined if empty
    });

    if (result.error) {
      setError(result.error);
    }
    // Redirection is handled by the server action on success
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6">
          <Link href="/admin/mensajes-entrada" className="text-blue-600 hover:text-blue-800 font-medium flex items-center">
            &larr; Volver a la Lista de Mensajes
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-800 mb-6">Crear Nuevo Mensaje de Entrada</h1>

        <div className="bg-white rounded-lg shadow p-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="content" className="block text-gray-700 text-sm font-bold mb-2">
                Contenido del Mensaje:
              </label>
              <textarea
                id="content"
                name="content"
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              ></textarea>
            </div>

            <div className="mb-4">
              <label htmlFor="type" className="block text-gray-700 text-sm font-bold mb-2">
                Tipo de Mensaje:
              </label>
              <select
                id="type"
                name="type"
                value={type}
                onChange={(e) => setType(e.target.value as EMType)} // Cast to EMType
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              >
                {Object.values(EMType).map((emType) => (
                  <option key={emType} value={emType}>
                    {emType.charAt(0).toUpperCase() + emType.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label htmlFor="source" className="block text-gray-700 text-sm font-bold mb-2">
                Fuente (Opcional):
              </label>
              <input
                type="text"
                id="source"
                name="source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
            </div>

            <div className="flex items-center justify-between">
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? 'Creando...' : 'Crear Mensaje'}
              </button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}