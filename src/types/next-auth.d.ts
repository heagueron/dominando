// eslint-disable-next-line @typescript-eslint/no-unused-vars
import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
// No necesitamos importar JWT y DefaultJWT aquí, ya están disponibles en el declare module "next-auth/jwt"

declare module "next-auth" {
  /**
   * Extendiendo el tipo User de NextAuth
   */
  interface User extends DefaultUser {
    // id ya está en DefaultUser
    // name, email, image también están en DefaultUser
    is_admin?: boolean;
  }

  /**
   * Extendiendo el tipo Session de NextAuth
   */
  interface Session {
    user: {
      id: string; // Es bueno mantener el id explícito aquí si lo usas mucho
      is_admin?: boolean;
    } & DefaultSession["user"]; // Esto asegura que los campos por defecto (name, email, image) se mantengan
  }
}

declare module "next-auth/jwt" {
  /**
   * Extendiendo el tipo JWT de NextAuth
   */
  interface JWT extends DefaultJWT {
    // sub (subject - user id) ya está en Defagit JWT
    // name, email, picture también están en DefaultJWT
    // Añadimos los campos personalizados que queremos en el token
    id: string; // El id que asignamos en el callback jwt
    is_admin?: boolean;
  }
}
