import { NextResponse } from "next/server";
import { signIn } from "@/lib/auth/auth.config";
import { loginRequestSchema } from "@/lib/auth/contracts";
import { problemJson, zodToProblemJson } from "@/lib/api/problem-json";
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

  const parsed = loginRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(zodToProblemJson(parsed.error), { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();

  try {
    const result = await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirect: false,
    });
    if (result && typeof result === "object" && "error" in result && result.error) {
      return NextResponse.json(problemJson("invalid_credentials", "Invalid email or password"), {
        status: 401,
      });
    }
  } catch {
    return NextResponse.json(problemJson("invalid_credentials", "Invalid email or password"), {
      status: 401,
    });
  }

  const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
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
