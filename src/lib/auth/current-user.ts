import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { homeForRole, isAppRole, type AppRole } from "@/lib/auth/roles";

export async function requireRole(expected: AppRole) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || !isAppRole(role)) redirect("/login");
  if (role !== expected) redirect(homeForRole(role));
  return session.user;
}
