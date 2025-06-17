// /home/heagueron/jmu/dominando/src/app/privacidad/page.tsx
import Navbar from '@/components/layout/Navbar';
import Link from 'next/link'; 
import Footer from '@/components/layout/Footer'; 

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white text-gray-800 flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <article className="prose lg:prose-xl max-w-3xl mx-auto">
          <h1>Política de Privacidad de FullDomino</h1>
          <p className="lead">Última actualización: 17 de junio de 2025</p>

          <p>
            Bienvenido a FullDomino. Nos tomamos muy en serio tu privacidad. Esta Política de Privacidad
            describe cómo recopilamos, usamos, divulgamos y protegemos tu información personal cuando
            utilizas nuestro sitio web y nuestros servicios (colectivamente, &apos;Servicios&apos;).
          </p>

          <h2>1. Información que Recopilamos</h2>
          <p>
            Podemos recopilar los siguientes tipos de información:
          </p>
          <ul>
            <li>
              <strong>Información que nos proporcionas directamente:</strong>
              <ul>
                <li>Cuando te registras para una cuenta: tu nombre de usuario, dirección de correo electrónico y contraseña (hasheada).</li>
                <li>Cuando inicias sesión con proveedores de terceros (como Google): la información que el proveedor nos comparte, como tu nombre, correo electrónico y foto de perfil, según tus configuraciones de privacidad con ese proveedor.</li>
                <li>Información de contacto si te comunicas con nosotros para soporte.</li>
              </ul>
            </li>
            <li>
              <strong>Información que recopilamos automáticamente:</strong>
              <ul>
                <li>Información de uso del juego: como tus partidas jugadas, puntuaciones, y otra actividad dentro del juego.</li>
                <li>Información del dispositivo y de conexión: como tu dirección IP, tipo de navegador, sistema operativo, y otra información técnica cuando accedes a nuestros Servicios.</li>
                <li>Cookies y tecnologías similares: Usamos cookies para mantener tu sesión y mejorar tu experiencia. Puedes controlar las cookies a través de la configuración de tu navegador.</li>
              </ul>
            </li>
          </ul>

          <h2>2. Cómo Usamos Tu Información</h2>
          <p>
            Usamos la información que recopilamos para:
          </p>
          <ul>
            <li>Proporcionar, operar y mantener nuestros Servicios.</li>
            <li>Mejorar, personalizar y expandir nuestros Servicios.</li>
            <li>Entender y analizar cómo utilizas nuestros Servicios.</li>
            <li>Desarrollar nuevos productos, servicios, características y funcionalidades.</li>
            <li>Comunicarnos contigo, ya sea directamente o a través de uno de nuestros socios, incluso para servicio al cliente, para proporcionarte actualizaciones y otra información relacionada con el Servicio, y para fines de marketing y promoción (con tu consentimiento cuando sea necesario).</li>
            <li>Procesar tus transacciones (si aplica).</li>
            <li>Prevenir el fraude y asegurar la seguridad de nuestros Servicios.</li>
            <li>Cumplir con obligaciones legales.</li>
          </ul>

          <h2>3. Cómo Compartimos Tu Información</h2>
          <p>
            No vendemos tu información personal. Podemos compartir tu información en las siguientes situaciones:
          </p>
          <ul>
            <li>Con proveedores de servicios: Contratamos a otras compañías y personas para realizar servicios en nuestro nombre (por ejemplo, alojamiento de servidores, envío de correos electrónicos, análisis de datos).</li>
            <li>Para cumplimiento legal: Si es requerido por ley o en respuesta a solicitudes válidas por autoridades públicas.</li>
            <li>Transferencias de negocio: En conexión con, o durante negociaciones de, cualquier fusión, venta de activos de la compañía, financiación o adquisición de todo o una porción de nuestro negocio a otra compañía.</li>
            <li>Con tu consentimiento.</li>
          </ul>
          <p>
            Tu nombre de usuario y estadísticas de juego pueden ser visibles para otros usuarios dentro del juego.
          </p>

          <h2>4. Seguridad de Tu Información</h2>
          <p>
            Tomamos medidas razonables para proteger tu información personal. Sin embargo, ningún sistema de seguridad es impenetrable y no podemos garantizar la seguridad absoluta de tu información.
          </p>

          <h2>5. Tus Derechos de Privacidad</h2>
          <p>
            Dependiendo de tu ubicación, puedes tener ciertos derechos con respecto a tu información personal, como el derecho a acceder, corregir o eliminar tus datos. Por favor, contáctanos si deseas ejercer estos derechos.
          </p>

          <h2>6. Privacidad de los Niños</h2>
          <p>
            Nuestros Servicios no están dirigidos a niños menores de [indicar edad, ej. 13 o 16 años, según la jurisdicción]. No recopilamos intencionadamente información personal de niños. Si eres padre o tutor y sabes que tu hijo nos ha proporcionado información personal, por favor contáctanos.
          </p>

          <h2>7. Cambios a Esta Política de Privacidad</h2>
          <p>
            Podemos actualizar nuestra Política de Privacidad de vez en cuando. Te notificaremos cualquier cambio publicando la nueva Política de Privacidad en esta página y actualizando la fecha de &apos;Última actualización&apos;.
          </p>

          <h2>8. Contáctanos</h2>
          <p>
            Si tienes alguna pregunta sobre esta Política de Privacidad, por favor contáctanos en:
            heagueron@gmail.com

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
