import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import prisma from "@/lib/prisma";
import MensajeEntradaList from "@/components/admin/MensajeEntradaList"; // Importamos el nuevo componente
import Link from "next/link";

export default async function AdminMensajesEntradaPage() {
  // Obtener la sesión en el servidor
  // NOTA: Para usar useSearchParams, este componente debe ser 'use client'.
  // Sin embargo, getServerSession es una función de servidor.
  // Para mantenerlo como Server Component y aún mostrar mensajes,
  // la lógica del mensaje se pasaría a un Client Component hijo.
  const session = await getServerSession(authOptions);

  // Verificar si el usuario está autenticado y si es administrador
  if (!session || !session.user || !session.user.is_admin) {
    console.warn(`Intento de acceso no autorizado a /admin/mensajes-entrada por userId: ${session?.user?.id || 'desconocido'}`);
    redirect("/auth/signin?callbackUrl=/admin/mensajes-entrada");
  }

  // Obtener todos los mensajes de entrada de la base de datos
  // Asegúrate de que tu modelo Prisma 'MensajeEntrada' esté definido.
  const mensajes = await prisma.entryMessage.findMany({
    select: {
      id: true,
      content: true,
      type: true,
      source: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12">        
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Gestión de Mensajes de Entrada</h1>
          <Link
            href="/admin/mensajes-entrada/create"
            className="bg-blue-500 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm transition duration-150 ease-in-out"
          >
            Crear Nuevo Mensaje
          </Link>
        </div>
        
        {/*} NOTA: Si necesitas mostrar mensajes de éxito/error directamente en esta página
            usando `useSearchParams`, deberías convertir este componente a un 'use client'
            y adaptar la lógica de `getServerSession` (ej. usar `useSession` de next-auth/react).
            Por ahora, se asume que el manejo de mensajes se hace en un componente superior o hijo.*/}
        <div className="mb-6">
            <Link href="/admin" className="text-blue-600 hover:text-blue-800 font-medium flex items-center">
                &larr; Volver al Dashboard
            </Link>
        </div>

        <MensajeEntradaList mensajes={mensajes} />

      </main>
      <Footer />
    </div>
  );
}
