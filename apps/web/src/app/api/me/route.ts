import { NextResponse } from "next/server";
import { requireAuthSession } from "@/lib/events/route-helpers";

export async function GET() {
  const gate = await requireAuthSession();
  if (!gate.ok) return gate.response;

  return NextResponse.json({
    userId: gate.session.user.id,
    email: gate.session.user.email,
    roleKeys: gate.roleKeys,
  });
}
