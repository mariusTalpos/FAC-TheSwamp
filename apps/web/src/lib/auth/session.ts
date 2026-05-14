import { auth } from "@/lib/auth/auth.config";

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }
  return session;
}

export async function requireUserId(): Promise<string | null> {
  const session = await requireSession();
  return session?.user?.id ?? null;
}
