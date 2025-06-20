import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import Navbar from "@/components/layout/Navbar"; // Asumiendo que tienes un Navbar
import Footer from "@/components/layout/Footer";
import prisma from "@/lib/prisma"; // Importar la instancia de Prisma
import Link from "next/link"; // Necesario para los enlaces

export default async function AdminDashboardPage() {
  // Obtener la sesión en el servidor
  const session = await getServerSession(authOptions);

  // Verificar si el usuario está autenticado y si es administrador
  if (!session || !session.user || !session.user.is_admin) {
    console.warn(`Intento de acceso no autorizado a /admin por userId: ${session?.user?.id || 'desconocido'}`);
    // Redirigir a la página de inicio de sesión, incluyendo la URL actual
    // como callbackUrl para que NextAuth redirija de vuelta aquí después del login exitoso.
    redirect("/auth/signin?callbackUrl=/admin");
  }

  // Obtener solo el conteo total de usuarios para la tarjeta de resumen
  const totalUsersCount = await prisma.user.count();

  // TODO: Implementar lógica para contar usuarios en línea si es posible (requiere estado del servidor de sockets)
  // const onlineUsersCount = 0; // Placeholder por ahora

  // TODO: Obtener datos de resumen para transacciones (ej. total de depósitos/retiros hoy/semana)
  // const totalTransactionsCount = 0; // Placeholder por ahora


  // Si el usuario está autenticado y es administrador, renderizar el contenido del dashboard
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Admin Dashboard</h1>
        <p className="text-gray-700">Bienvenido, Administrador {session.user.name || session.user.email}.</p>
        
        {/* Tarjetas de Resumen */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tarjeta de Gestión de Usuarios */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Gestión de Usuarios</h2>
            <p className="text-gray-600 mb-2">Total de usuarios registrados: <span className="font-bold text-gray-800">{totalUsersCount}</span></p>
            {/* <p className="text-gray-600 mb-4">Usuarios en línea: <span className="font-bold text-gray-800">{onlineUsersCount}</span></p> */}
            <Link href="/admin/users" className="text-blue-600 hover:text-blue-800 font-medium">
              Ver todos los usuarios &rarr;
            </Link>
          </div>

          {/* Tarjeta de Gestión de Mensajes de Entrada */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Gestión de Mensajes de Entrada</h2>
            <p className="text-gray-600 mb-4">Revisa y gestiona los mensajes recibidos.</p>
            <Link href="/admin/mensajes-entrada" className="text-blue-600 hover:text-blue-800 font-medium">
              Ver Mensajes &rarr;
            </Link>
          </div>

          {/* Tarjeta de Gestión de Transacciones */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Gestión de Transacciones</h2>
            {/* <p className="text-gray-600 mb-2">Total de transacciones hoy: <span className="font-bold text-gray-800">{totalTransactionsCount}</span></p> */}
            <p className="text-gray-600 mb-4">Gestiona depósitos, retiros y revisa el historial.</p>
            <Link href="/admin/transactions" className="text-blue-600 hover:text-blue-800 font-medium">
              Ir a Gestión de Transacciones &rarr;
            </Link>
          </div>

          {/* Puedes añadir más tarjetas aquí para otras áreas de administración */}
          {/* Ejemplo: Tarjeta de Mesas Activas */}
          {/* <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Mesas Activas</h2>
            <p className="text-gray-600 mb-4">Ver y monitorear las partidas en curso.</p>
            <Link href="/admin/games" className="text-blue-600 hover:text-blue-800 font-medium">
              Ver mesas activas &rarr;
            </Link>
          </div> */}
        </div>
        {/* Sección de Información de Sesión (opcional, para depuración) */}
        <div className="mt-8 p-4 bg-white rounded-md shadow">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Tu Información de Sesión (Admin)</h2>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                {JSON.stringify(session, null, 2)}
            </pre>
        </div>
      </main>
      <Footer />
    </div>
  );
}
