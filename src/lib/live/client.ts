import { issuedLiveTokenSchema, liveDenialReasons, type IssuedLiveToken, type LiveDenialReason } from "@/lib/live/contract";

export type LiveTokenRequest = { scope: "lobby" } | { sessionId: string };

export type LiveTokenResponse =
  | { ok: true; ticket: IssuedLiveToken }
  | { ok: false; kind: "denied"; reason: LiveDenialReason; error: string }
  | { ok: false; kind: "error" };

export async function requestLiveToken(body: LiveTokenRequest): Promise<LiveTokenResponse> {
  try {
    const response = await fetch("/api/live/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      if (!payload || typeof payload !== "object") return { ok: false, kind: "error" };
      const reason = "reason" in payload ? payload.reason : null;
      const error = "error" in payload && typeof payload.error === "string" ? payload.error : "";
      if (typeof reason === "string" && liveDenialReasons.some((item) => item === reason)) {
        return { ok: false, kind: "denied", reason: reason as LiveDenialReason, error };
      }
      return { ok: false, kind: "error" };
    }
    const ticket = issuedLiveTokenSchema.safeParse(payload);
    if (!ticket.success) return { ok: false, kind: "error" };
    return { ok: true, ticket: ticket.data };
  } catch {
    return { ok: false, kind: "error" };
  }
}
