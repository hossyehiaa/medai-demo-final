import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

// ── SHA-256 helper ────────────────────────────────────────────────
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── Demo Users ────────────────────────────────────────────────────
// Passwords are hashed at startup
const DEMO_USERS_RAW = [
  {
    id: "1",
    email: "physician@medai.ai",
    password: "demo1234",
    role: "physician",
    name: "Dr. Sarah Chen",
  },
  {
    id: "2",
    email: "patient@medai.ai",
    password: "demo1234",
    role: "patient",
    name: "John Doe",
  },
];

let DEMO_USERS: {
  id: string;
  email: string;
  passwordHash: string;
  role: string;
  name: string;
}[] = [];

// Hash passwords at first call
let initialized = false;
async function ensureInitialized() {
  if (initialized) return;
  DEMO_USERS = await Promise.all(
    DEMO_USERS_RAW.map(async (u) => ({
      ...u,
      passwordHash: await sha256(u.password),
    }))
  );
  initialized = true;
}

// ── NextAuth v5 Configuration ────────────────────────────────────
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null;

        await ensureInitialized();

        const email = credentials.email as string;
        const password = credentials.password as string;
        const inputHash = await sha256(password);

        const user = DEMO_USERS.find(
          (u) => u.email === email && u.passwordHash === inputHash
        );

        if (!user) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.id = user.id;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { id?: string }).id = token.id as string;
      }
      return session;
    },
  },
});
