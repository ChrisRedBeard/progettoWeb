import { createHash, randomBytes } from "node:crypto";

export const inviteExpiryChoices = [1, 7, 30] as const;

export type InviteExpiryDays = (typeof inviteExpiryChoices)[number];

export type StoredInvite = {
  status: "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";
  expiresAt: Date;
  email: string | null;
};

export type InviteView = "not_found" | "revoked" | "used" | "expired" | "email" | "valid";

export function newInviteToken() {
  return randomBytes(32).toString("base64url");
}

export function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function classifyInvite(invite: StoredInvite | null, athleteEmail: string | null, now: Date): InviteView {
  if (!invite) return "not_found";
  if (invite.status === "REVOKED") return "revoked";
  if (invite.status === "ACCEPTED") return "used";
  if (invite.status === "EXPIRED" || invite.expiresAt.getTime() <= now.getTime()) return "expired";
  if (invite.email && invite.email.toLowerCase() !== (athleteEmail ?? "").toLowerCase()) return "email";
  return "valid";
}

export function inviteExpiryDate(days: InviteExpiryDays, now = new Date()) {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}
