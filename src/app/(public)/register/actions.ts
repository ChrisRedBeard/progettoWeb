"use server";

import bcrypt from "bcryptjs";
import { signIn } from "@/auth";
import { isNextRedirect } from "@/lib/auth/redirect";
import { clientKey } from "@/lib/auth/request";
import { rateLimit } from "@/lib/auth/rate-limit";
import { safeCallback } from "@/lib/auth/routes";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators/auth";
import type { AuthFormState } from "../login/actions";

export async function registerAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const limit = rateLimit(await clientKey("register"), 5, 60 * 60 * 1000);
  if (!limit.ok) {
    return { error: `Troppe registrazioni da questa rete. Riprova tra ${limit.retryAfterSeconds} secondi.` };
  }

  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    callbackUrl: formData.get("callbackUrl") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Controlla i dati inseriti." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: parsed.data.name,
          email: parsed.data.email,
          passwordHash,
          role: parsed.data.role,
        },
      });

      if (parsed.data.role === "COACH") {
        const profile = await tx.coachProfile.create({ data: { userId: user.id } });
        await tx.lobby.create({
          data: { coachId: profile.id, name: `Lobby di ${parsed.data.name}` },
        });
      }
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return { error: "Questa email è già registrata." };
    }
    return { error: "Registrazione non riuscita. Riprova." };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: safeCallback(parsed.data.callbackUrl ?? null, parsed.data.role),
    });
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    return { error: "Account creato, ma l'accesso automatico non è riuscito. Entra dalla pagina di login." };
  }

  return {};
}
