// route.ts
import NextAuth, { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email"; // Importar EmailProvider
import bcrypt from 'bcryptjs'; // Necesitarás instalar bcryptjs: npm install bcryptjs @types/bcryptjs
import nodemailer from 'nodemailer'; // Asegúrate de tener nodemailer instalado

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        email: { label: "Correo electrónico", type: "email", placeholder: "tu@email.com" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Por favor, introduce tu correo y contraseña.");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.passwordHash) { // Asumiendo que almacenas el hash en 'passwordHash'
          throw new Error("Usuario no encontrado o no tiene contraseña configurada.");
        }

        const isValidPassword = await bcrypt.compare(credentials.password, user.passwordHash);

        if (isValidPassword) {
          if (!user.emailVerified) {
            // Podrías tener una forma de reenviar el correo de verificación desde aquí o la UI de login
            throw new Error("Tu correo electrónico aún no ha sido verificado. Por favor, revisa tu bandeja de entrada.");
          }
          // Devuelve el objeto del usuario. Asegúrate de que los campos coincidan con tu modelo User.
          // Y que estos campos sean los que NextAuth espera o los que mapeas en los callbacks.
          return {
            id: user.id, // Asegúrate que tu modelo User tiene 'id'
            name: user.name, // Asegúrate que tu modelo User tiene 'name'
            email: user.email, // Asegúrate que tu modelo User tiene 'email'
            image: user.image, // Asegúrate que tu modelo User tiene 'image'
            is_admin: user.is_admin, // Añadimos is_admin
          };
        }
        // Si la contraseña no es válida
        throw new Error("Contraseña incorrecta.");
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!, // Usar '!' si estás seguro que estarán definidas
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true, // Mantener si es necesario para tu flujo de Google
    }),
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
      // maxAge: 24 * 60 * 60, // Cuánto tiempo es válido el token del magic link (en segundos)
      async sendVerificationRequest({ identifier: email, url, provider, theme }) {
        const { host } = new URL(url); // Extrae el host de la URL del magic link
        
        // Crear un transportador de nodemailer usando la configuración del provider
        const transport = nodemailer.createTransport(provider.server);
        
        // Enviar el correo
        const result = await transport.sendMail({
          to: email,
          from: provider.from,
          subject: `Dominando - Verifica tu correo electrónico`,
          text: text({ url, host, email }), // Cuerpo de texto plano
          html: html({ url, host, email }), // Cuerpo HTML
        });
        
        const failed = result.rejected.concat(result.pending).filter(Boolean);
        if (failed.length) {
          throw new Error(`Email(s) (${failed.join(", ")}) could not be sent`);
        }
        console.log(`Correo de verificación enviado a: ${email}, URL: ${url}`);
      }
    }),
  ],
  session: {
    strategy: "jwt", // JWT es una buena estrategia si no necesitas sesiones en BD para NextAuth
  },
  pages: {
    signIn: "/auth/signin", // Alineado con la página que creamos
    // signOut: "/auth/signout", // Puedes crear una página personalizada si lo deseas
    // error: "/auth/error", // Página para mostrar errores de autenticación (opcional)
    // verifyRequest: "/auth/verify-request", // Para email/magic link provider
    // newUser: null, // O una ruta si quieres una página especial para nuevos usuarios post-OAuth
  },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // El objeto 'user' solo está presente en el primer inicio de sesión.
      // En las siguientes llamadas, solo 'token' está disponible.
      if (user) {
        token.id = user.id;
        // El tipo de 'user' aquí puede ser el del AdapterUser o el del Provider.
        // Necesitamos asegurarnos de que 'is_admin' se propague.
        // Si 'user' viene del 'authorize' callback, ya tendrá 'is_admin'.
        // Si 'user' viene del PrismaAdapter después de un inicio de sesión OAuth,
        // el adapter debería mapear todos los campos del modelo User de Prisma.
        // Con los tipos actualizados, user.is_admin debería ser accesible directamente.
        if (user.is_admin !== undefined) {
          token.is_admin = user.is_admin;
        } 
          // Como fallback, si no está en el objeto user inicial (poco probable con PrismaAdapter),
          // podríamos hacer una consulta, pero es mejor asegurar que el adapter lo provea.
          // Por ahora, asumimos que el adapter o el authorize lo incluyen.
          // const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
          // token.is_admin = dbUser?.is_admin;
      }
      return token;
    },
    async session({ session, token }) {
      // Enviar propiedades del token JWT a la sesión del cliente
      if (session.user) {
        // Con los tipos actualizados, podemos asignar directamente.
        session.user.id = token.id; 
        if (token.is_admin !== undefined) {
          session.user.is_admin = token.is_admin;
        }
      }
      return session;
    },
  },
  // debug: process.env.NODE_ENV === 'development', // Descomentar para depuración
  secret: process.env.NEXTAUTH_SECRET, // ¡MUY IMPORTANTE EN PRODUCCIÓN!
};

const handler = NextAuth(authOptions);

// Función para generar el cuerpo HTML del correo
function html({ url, host, email }: { url: string; host: string; email: string }) {
  // Escapar caracteres especiales en el email para mostrarlo de forma segura
  const escapedEmail = `${email.replace(/</g, '&lt;').replace(/>/g, '&gt;')}`;

  return `
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
    <h1 style="color: #ffc107; text-align: center; margin-bottom: 25px;">Dominando - Verifica tu Correo Electrónico</h1>
    <p style="font-size: 16px; margin-bottom: 20px;">¡Hola!</p>
    <p style="font-size: 16px; margin-bottom: 20px;">
      Gracias por registrarte en Dominando. Para completar tu registro y verificar tu dirección de correo electrónico (${escapedEmail}), por favor haz clic en el siguiente botón:
    </p>
    <div style="text-align: center; margin-bottom: 30px;">
      <a href="${url}" target="_blank" style="background-color: #ffc107; color: #333; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; display: inline-block;">Verificar Correo y Acceder</a>
    </div>
    <p style="font-size: 16px; margin-bottom: 20px;">
      Si no puedes hacer clic en el botón, copia y pega la siguiente URL en tu navegador:
    </p>
    <p style="font-size: 14px; word-break: break-all; margin-bottom: 20px; background-color: #f0f0f0; padding: 10px; border-radius: 4px;">${url}</p>
    <p style="font-size: 16px; margin-bottom: 20px;">
      Este enlace es válido por 24 horas. Si no solicitaste esta verificación, puedes ignorar este correo de forma segura.
    </p>
    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
    <p style="font-size: 14px; color: #777; text-align: center;">
      Saludos,<br>
      El equipo de Dominando<br>
      <a href="${host}" style="color: #ffc107; text-decoration: none;">${host.replace(/^https?:\/\//, '')}</a>
    </p>
  </div>
</body>
  `;
}

// Función para generar el cuerpo de texto plano del correo (fallback)
function text({ url, host, email }: { url: string; host: string; email: string }) {
  return `
Dominando - Verifica tu Correo Electrónico

¡Hola!

Gracias por registrarte en Dominando. Para completar tu registro y verificar tu dirección de correo electrónico (${email}), por favor visita la siguiente URL:
${url}

Este enlace es válido por 24 horas. Si no solicitaste esta verificación, puedes ignorar este correo de forma segura.

Saludos,
El equipo de Dominando
${host}
  `;
}
export { handler as GET, handler as POST };
