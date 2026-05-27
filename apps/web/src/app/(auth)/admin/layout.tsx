import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth.config";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (!session.user.roleKeys?.includes("fac_admin")) {
    redirect("/me");
  }
  return children;
}
