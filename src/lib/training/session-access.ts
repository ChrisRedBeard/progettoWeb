export type SessionAccess = {
  athleteId: string;
  status: "IN_PROGRESS" | "COMPLETED" | "ABANDONED";
};

export function sessionWriteAccess(session: SessionAccess | null, userId: string) {
  if (!session) return { ok: false as const, status: 404 };
  if (session.athleteId !== userId) return { ok: false as const, status: 403 };
  if (session.status !== "IN_PROGRESS") return { ok: false as const, status: 409 };
  return { ok: true as const };
}
