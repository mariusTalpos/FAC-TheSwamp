import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getOperationalRoleKeysForUser } from "@/lib/rbac/operational-role-keys";

/**
 * Credentials provider requires JWT sessions in Auth.js (not database sessions).
 * Role keys are reloaded from the DB on each session read so revocations apply without re-login.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  logger: {
    error(error) {
      const name = error instanceof Error ? error.name : String(error);
      // Wrong email/password is normal; UI shows a generic message — avoid stack traces in the terminal.
      if (name === "CredentialsSignin") return;
      console.error("[auth]", error);
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const emailRaw = credentials?.email;
        const passwordRaw = credentials?.password;
        if (!emailRaw || !passwordRaw) return null;

        const email = String(emailRaw).trim().toLowerCase();
        const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (!u?.passwordHash) return null;
        if (u.status !== "active") return null;

        const ok = await bcrypt.compare(String(passwordRaw), u.passwordHash);
        if (!ok) return null;

        return {
          id: u.id,
          email: u.email ?? undefined,
          name: u.name ?? undefined,
          image: u.image ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.roleKeys = await getOperationalRoleKeysForUser(token.sub);
      }
      return session;
    },
  },
});
