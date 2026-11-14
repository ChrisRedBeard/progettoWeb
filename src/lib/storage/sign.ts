import { createHmac, timingSafeEqual } from "node:crypto";

export type StorageClaims = {
  purpose: "upload" | "read";
  key: string;
  exp: number;
  mime?: string;
  max?: number;
};

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET mancante");
  return value;
}

export function signClaims(claims: StorageClaims) {
  const body = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const mac = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${mac}`;
}

export function verifyClaims(token: string): StorageClaims | null {
  const parts = token.split(".");
  const body = parts[0];
  const mac = parts[1];
  if (!body || !mac || parts.length !== 2) return null;
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const left = Buffer.from(mac);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const claims = JSON.parse(Buffer.from(body, "base64url").toString()) as StorageClaims;
    if ((claims.purpose !== "upload" && claims.purpose !== "read") || typeof claims.key !== "string") return null;
    if (typeof claims.exp !== "number" || claims.exp <= Date.now()) return null;
    return claims;
  } catch {
    return null;
  }
}
