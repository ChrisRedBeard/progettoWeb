"use server";

import bcrypt from "bcryptjs";
import { signIn } from "@/auth";
import { isNextRedirect } from "@/lib/auth/redirect";
import { clientKey } from "@/lib/auth/request";
import { rateLimit } from "@/lib/auth/rate-limit";
import { isAppRole } from "@/lib/auth/roles";
import { safeCallback } from "@/lib/auth/routes";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validators/auth";

export type AuthFormState = { error?: string };

export async function loginAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const limit = rateLimit(await clientKey("login"), 5, 15 * 60 * 1000);
  if (!limit.ok) {
    return { error: `Troppi tentativi. Riprova tra ${limit.retryAfterSeconds} secondi.` };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    callbackUrl: formData.get("callbackUrl") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Controlla i dati inseriti." };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  const valid = user && isAppRole(user.role) ? await bcrypt.compare(parsed.data.password, user.passwordHash) : false;
  if (!user || !valid || !isAppRole(user.role)) {
    return { error: "Email o password non corretti." };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: safeCallback(parsed.data.callbackUrl ?? null, user.role),
    });
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    return { error: "Accesso non riuscito. Riprova." };
  }

  return {};
}
