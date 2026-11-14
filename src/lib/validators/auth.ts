import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "Almeno 8 caratteri")
  .max(72, "Massimo 72 caratteri")
  .regex(/[A-Za-z]/, "Inserisci almeno una lettera")
  .regex(/[0-9]/, "Inserisci almeno un numero");

export const loginSchema = z.object({
  email: z.string().trim().email("Inserisci un'email valida").transform((value) => value.toLowerCase()),
  password: z.string().min(1, "Inserisci la password").max(72),
  callbackUrl: z.string().optional(),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Il nome è troppo corto").max(80, "Il nome è troppo lungo"),
  email: z.string().trim().email("Inserisci un'email valida").transform((value) => value.toLowerCase()),
  password: passwordSchema,
  callbackUrl: z.string().optional(),
  role: z.enum(["COACH", "ATHLETE"], { required_error: "Scegli un ruolo" }),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
