import { NextResponse } from "next/server";
import { signOut } from "@/lib/auth/auth.config";

export async function POST() {
  await signOut({ redirect: false });
  return new NextResponse(null, { status: 204 });
}
