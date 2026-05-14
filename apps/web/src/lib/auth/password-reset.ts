import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, verificationTokens } from "@/lib/db/schema";
import { randomOpaqueToken, sha256Hex } from "@/lib/crypto/token";
import { sendMail } from "@/lib/email/mailer";

const RESET_PREFIX = "reset:";

export function resetIdentifierForEmail(email: string): string {
  return `${RESET_PREFIX}${email.trim().toLowerCase()}`;
}

export async function issuePasswordResetToken(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const [u] = await db.select().from(users).where(eq(users.email, normalized)).limit(1);
  if (!u) return;

  const raw = randomOpaqueToken();
  const tokenHash = sha256Hex(raw);
  const identifier = resetIdentifierForEmail(normalized);
  const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  await db.delete(verificationTokens).where(eq(verificationTokens.identifier, identifier));
  await db.insert(verificationTokens).values({ identifier, token: tokenHash, expires });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const link = `${baseUrl}/reset-password?token=${encodeURIComponent(raw)}`;

  await sendMail({
    to: normalized,
    subject: "Reset your FAC password",
    text: `Use this link to set a new password (valid for one hour):\n\n${link}\n`,
  });
}

export async function consumePasswordResetToken(
  rawToken: string,
  newPassword: string,
): Promise<{ ok: true; email: string } | { ok: false }> {
  const tokenHash = sha256Hex(rawToken);
  const rows = await db
    .select()
    .from(verificationTokens)
    .where(eq(verificationTokens.token, tokenHash))
    .limit(2);
  const row = rows[0];
  if (!row || !row.identifier.startsWith(RESET_PREFIX)) return { ok: false };
  if (row.expires.getTime() < Date.now()) return { ok: false };

  const email = row.identifier.slice(RESET_PREFIX.length);
  const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!u) return { ok: false };

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, u.id));

  await db
    .delete(verificationTokens)
    .where(
      and(
        eq(verificationTokens.identifier, row.identifier),
        eq(verificationTokens.token, tokenHash),
      ),
    );

  return { ok: true, email };
}
