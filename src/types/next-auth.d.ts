// eslint-disable-next-line @typescript-eslint/no-unused-vars
import NextAuth from "next-auth"; 

declare module "next-auth" {
  /**
   * Extendiendo el tipo User de NextAuth
   */
  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  }

  /**
   * Extendiendo el tipo Session de NextAuth
   */
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
