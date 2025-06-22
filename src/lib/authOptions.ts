
import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { DefaultSession } from "next-auth";
import prisma from '@/lib/prisma'; // Importar la instancia global de Prisma

// Función para generar el cuerpo HTML del correo
function html({ url, host, email }: { url: string; host: string; email: string }) {
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

        if (!user || !user.passwordHash) {
          throw new Error("Usuario no encontrado o no tiene contraseña configurada.");
        }

        const isValidPassword = await bcrypt.compare(credentials.password, user.passwordHash);

        if (isValidPassword) {
          if (!user.emailVerified) {
            throw new Error("Tu correo electrónico aún no ha sido verificado. Por favor, revisa tu bandeja de entrada.");
          }
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            is_admin: user.is_admin,
          };
        }
        throw new Error("Contraseña incorrecta.");
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
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
      async sendVerificationRequest({ identifier: email, url, provider }) {
        const { host } = new URL(url);
        const transport = nodemailer.createTransport(provider.server);
        const result = await transport.sendMail({
          to: email,
          from: provider.from,
          subject: `Dominando - Verifica tu correo electrónico`,
          text: text({ url, host, email }),
          html: html({ url, host, email }),
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
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: { // Definición de los callbacks
    async jwt({ token, user }) { // Callback JWT: se ejecuta después de la autenticación
      if (user) { // 'user' está disponible en la primera llamada después de la autenticación
        token.id = user.id; // Copiar el ID del usuario al token
        token.is_admin = user.is_admin; // Copiar el estado de admin al token
        token.image = user.image; // Copiar la URL de la imagen al token
      }
      return token;
    },
    async session({ session, token }) { // Callback de Sesión: se ejecuta cada vez que se accede a la sesión
      if (session.user) { // Asegurarse de que session.user existe
        session.user.id = token.id as string; // Asignar el ID del token a la sesión (asegurando el tipo)
        session.user.is_admin = token.is_admin as boolean; // Asignar el estado de admin del token a la sesión
        session.user.image = token.image as string | null | undefined; // Asignar la imagen del token a la sesión
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// --- Extensión de tipos para NextAuth.js ---
// Declarar módulos para extender las interfaces de NextAuth.js
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      is_admin?: boolean; // Ahora opcional
      image?: string | null | undefined; // Hacer la imagen opcional y permitir null
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    is_admin?: boolean; // Ahora opcional
    image?: string | null | undefined; // Hacer la imagen opcional y permitir null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    is_admin?: boolean; // Ahora opcional
    image?: string | null | undefined; // Hacer la imagen opcional y permitir null
  }
}
