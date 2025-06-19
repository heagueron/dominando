// route.ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/authOptions"; // Importar authOptions desde la nueva ubicación

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
