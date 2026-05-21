import { NextResponse } from "next/server";
import { passwordResetCompleteRequestSchema } from "@/lib/auth/contracts";
import { consumePasswordResetToken } from "@/lib/auth/password-reset";
import { problemJson, zodToProblemJson } from "@/lib/api/problem-json";
import { signIn } from "@/lib/auth/auth.config";
import { db } from "@/lib/db";
import { fighterProfiles, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(problemJson("invalid_json", "Invalid JSON body"), { status: 400 });
  }

  const parsed = passwordResetCompleteRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(zodToProblemJson(parsed.error), { status: 400 });
  }

  const consumed = await consumePasswordResetToken(parsed.data.token, parsed.data.newPassword);
  if (!consumed.ok) {
    return NextResponse.json(
      problemJson("invalid_token", "Reset link is invalid or has expired."),
      { status: 400 },
    );
  }

  try {
    await signIn("credentials", {
      email: consumed.email,
      password: parsed.data.newPassword,
      redirect: false,
    });
  } catch {
    // Session establishment is optional; password was still updated.
  }

  const [u] = await db.select().from(users).where(eq(users.email, consumed.email)).limit(1);
  const [fp] = u
    ? await db
        .select({ id: fighterProfiles.id })
        .from(fighterProfiles)
        .where(eq(fighterProfiles.userId, u.id))
        .limit(1)
    : [null];

  return NextResponse.json({
    userId: u?.id,
    fighterProfileId: fp?.id ?? null,
  });
}
