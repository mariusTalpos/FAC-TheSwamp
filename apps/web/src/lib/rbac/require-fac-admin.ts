import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import { problemJson } from "@/lib/api/problem-json";

export const FAC_ADMIN_ROLE_KEY = "fac_admin";

export async function requireFacAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      ok: false as const,
      response: NextResponse.json(problemJson("unauthorized", "Sign in required"), {
        status: 401,
      }),
    };
  }
  const keys = session.user.roleKeys ?? [];
  if (!keys.includes(FAC_ADMIN_ROLE_KEY)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        problemJson("forbidden", "FAC administrator access is required for this action."),
        { status: 403 },
      ),
    };
  }
  return { ok: true as const, session };
}
