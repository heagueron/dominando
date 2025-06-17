// /home/heagueron/jmu/dominando/src/app/terminos/page.tsx
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white text-gray-800 flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <article className="prose lg:prose-xl max-w-3xl mx-auto">
          <h1>Términos y Condiciones de FullDomino</h1>
          <p className="lead">Última actualización: 17 de junio de 2025</p>

          <p>
            Bienvenido a FullDomino. Estos términos y condiciones describen las reglas y regulaciones
            para el uso del sitio web y los servicios de FullDomino.
          </p>

          <h2>1. Aceptación de los Términos</h2>
          <p>
            Al acceder y utilizar nuestros Servicios, aceptas estar sujeto a estos Términos y Condiciones
            y a nuestra Política de Privacidad. Si no estás de acuerdo con alguna parte de los términos,
            no podrás acceder al Servicio.
          </p>

          <h2>2. Cuentas de Usuario</h2>
          <p>
            Cuando creas una cuenta con nosotros, debes proporcionarnos información que sea precisa,
            completa y actual en todo momento. El incumplimiento de esto constituye una violación de los
            Términos, lo que puede resultar en la terminación inmediata de tu cuenta en nuestro Servicio.
            Eres responsable de salvaguardar la contraseña que utilizas para acceder al Servicio y de
            cualquier actividad o acciones bajo tu contraseña.
          </p>

          <h2>3. Contenido</h2>
          <p>
            Nuestro Servicio te permite participar en juegos de dominó y interactuar con otros usuarios.
            Eres responsable de tu conducta y de cualquier contenido que publiques.
          </p>

          <h2>4. Propiedad Intelectual</h2>
          <p>
            El Servicio y su contenido original, características y funcionalidad son y seguirán siendo
            propiedad exclusiva de FullDomino y sus licenciantes.
          </p>

          <h2>5. Terminación</h2>
          <p>
            Podemos terminar o suspender tu cuenta inmediatamente, sin previo aviso ni responsabilidad,
            por cualquier motivo, incluido, entre otros, si incumples los Términos.
          </p>

          <h2>6. Limitación de Responsabilidad</h2>
          <p>
            En ningún caso FullDomino, ni sus directores, empleados, socios, agentes, proveedores o afiliados,
            serán responsables de daños indirectos, incidentales, especiales, consecuentes o punitivos derivados 
            de acciones impropias por parte del usuario.
          </p>

          <h2>7. Cambios a los Términos</h2>
          <p>
            Nos reservamos el derecho, a nuestra sola discreción, de modificar o reemplazar estos Términos en
            cualquier momento. Te notificaremos cualquier cambio publicando los nuevos Términos en esta página.
          </p>

          <h2>8. Contáctanos</h2>
          <p>
            Si tienes alguna pregunta sobre estos Términos, por favor contáctanos en: heagueron@gmail.com
          </p>
        </article>
        <div className="text-center mt-12">
          <Link href="/" className="text-yellow-600 hover:text-yellow-700 font-semibold">
            Volver al Inicio
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}