import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import prisma from "@/lib/prisma";
import UserList from "@/components/admin/UserList"; // Importamos UserList desde su ubicación correcta
import Link from "next/link"; // Para el enlace de regreso

export default async function AdminUsersPage() {
  // Obtener la sesión en el servidor
  const session = await getServerSession(authOptions);

  // Verificar si el usuario está autenticado y si es administrador
  if (!session || !session.user || !session.user.is_admin) {
    console.warn(`Intento de acceso no autorizado a /admin/users por userId: ${session?.user?.id || 'desconocido'}`);
    redirect("/auth/signin?callbackUrl=/admin/users");
  }

  // Obtener todos los usuarios de la base de datos (lógica movida aquí)
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      emailVerified: true,
      image: true,
      is_admin: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Gestión de Usuarios</h1>
        
        <div className="mb-6">
            <Link href="/admin" className="text-blue-600 hover:text-blue-800 font-medium flex items-center">
                &larr; Volver al Dashboard
            </Link>
        </div>

        <UserList users={users} /> {/* Renderizamos la tabla aquí */}

      </main>
      <Footer />
    </div>
  );
}