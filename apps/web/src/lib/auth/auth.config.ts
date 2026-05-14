import { DrizzleAdapter } from "@auth/drizzle-adapter";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db, getDb } from "@/lib/db";
import { accounts, sessions, users, verificationTokens } from "@/lib/db/schema";
import { getOperationalRoleKeysForUser } from "@/lib/rbac/operational-role-keys";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: DrizzleAdapter(getDb(), {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: {
    strategy: "database",
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
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.roleKeys = await getOperationalRoleKeysForUser(user.id);
      }
      return session;
    },
  },
});
