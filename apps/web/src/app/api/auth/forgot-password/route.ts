import { NextResponse } from "next/server";
import { forgotPasswordRequestSchema } from "@/lib/auth/contracts";
import { issuePasswordResetToken } from "@/lib/auth/password-reset";
import { problemJson, zodToProblemJson } from "@/lib/api/problem-json";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(problemJson("invalid_json", "Invalid JSON body"), { status: 400 });
  }

  const parsed = forgotPasswordRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(zodToProblemJson(parsed.error), { status: 400 });
  }

  await issuePasswordResetToken(parsed.data.email.trim().toLowerCase());

  return new NextResponse(null, { status: 202 });
}
