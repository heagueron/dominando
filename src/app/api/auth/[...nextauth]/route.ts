import NextAuth, { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from 'bcryptjs'; // Necesitarás instalar bcryptjs: npm install bcryptjs @types/bcryptjs

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

export { handler as GET, handler as POST };
