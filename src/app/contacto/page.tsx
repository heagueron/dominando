// /home/heagueron/jmu/dominando/src/app/contacto/page.tsx
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Link from 'next/link';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white text-gray-800 flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <article className="prose lg:prose-xl max-w-3xl mx-auto">
          <h1>Contáctanos</h1>
          <p className="lead">
            Nos encantaría saber de ti. Si tienes preguntas, comentarios o necesitas soporte,
            no dudes en ponerte en contacto.
          </p>

          <h2>Información de Contacto</h2>
          <p>
            Puedes contactarnos a través de los siguientes medios:
          </p>
          <ul>
            <li>
              <strong>Correo Electrónico:</strong> <a href="mailto:heagueron@gmail.com">heagueron@gmail.com</a>
            </li>
            <li>
              <strong>Redes Sociales:</strong> Próximamente enlazaremos nuestras redes.
            </li>
          </ul>

          <h2>Formulario de Contacto</h2>
          <p>
            Actualmente, la forma más directa de contactarnos es a través de nuestro correo electrónico.
            Estamos trabajando para implementar un formulario de contacto proximamente.
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