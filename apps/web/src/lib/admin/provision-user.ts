import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { z } from "zod";
import type { adminProvisionUserRequestSchema } from "@/lib/auth/contracts";
import { issuePasswordResetToken } from "@/lib/auth/password-reset";

export type AdminProvisionInput = z.infer<typeof adminProvisionUserRequestSchema>;

export type ProvisionResult =
  | { provisionMode: "direct_active"; userId: string }
  | { provisionMode: "email_invitation"; userId: string };

export async function provisionUser(input: AdminProvisionInput): Promise<ProvisionResult> {
  const email = input.email.trim().toLowerCase();

  if (input.provisionMode === "direct_active") {
    const id = randomUUID();
    const passwordHash = await bcrypt.hash(input.initialPassword, 12);
    await db.insert(users).values({
      id,
      email,
      name: email.split("@")[0] ?? "User",
      emailVerified: new Date(),
      passwordHash,
      status: "active",
    });
    return { provisionMode: "direct_active", userId: id };
  }

  const id = randomUUID();
  await db.insert(users).values({
    id,
    email,
    name: email.split("@")[0] ?? "User",
    emailVerified: null,
    passwordHash: null,
    status: "active",
  });
  await issuePasswordResetToken(email);
  return { provisionMode: "email_invitation", userId: id };
}

export async function emailExists(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  const [u] = await db.select({ id: users.id }).from(users).where(eq(users.email, normalized)).limit(1);
  return Boolean(u);
}
