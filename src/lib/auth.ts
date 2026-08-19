// NextAuth v5 Configuration with Credentials provider + JWT sessions
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import crypto from "crypto";
import { db } from "./db";

// SHA-256 hash helper (matches seed script)
export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: (credentials.email as string).toLowerCase().trim() },
        });
        if (!user) return null;

        const hashed = hashPassword(credentials.password as string);
        if (hashed !== user.password) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name || undefined,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = (token.role as string) || "user";
        session.user.id = (token.id as string) || "";
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET || "medai-dev-secret-2026",
});
