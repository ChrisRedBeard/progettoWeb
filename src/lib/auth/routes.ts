import { homeForRole, isAppRole, type AppRole } from "@/lib/auth/roles";

const athletePrefixes = ["/explore", "/train", "/workout", "/history", "/settings"];
const coachPrefixes = ["/lobby", "/clients", "/invites", "/exercises", "/workouts"];

export type AccessDecision = { type: "allow" } | { type: "redirect"; to: string } | { type: "notFound" };

export function devRoutesAllowed(nodeEnv: string | undefined = process.env.NODE_ENV) {
  return nodeEnv !== "production";
}

export function accessStatus(decision: AccessDecision, pathname: string) {
  if (decision.type === "allow") return 200;
  if (decision.type === "notFound") return 404;
  if (pathname.startsWith("/api/")) return 401;
  return 307;
}

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isPublicPath(pathname: string) {
  if (pathname === "/" || pathname === "/login" || pathname === "/register") return true;
  if (pathname.startsWith("/invite/")) return true;
  if (pathname.startsWith("/api/auth")) return true;
  return false;
}

export function areaForPath(pathname: string): "athlete" | "coach" | "unknown" {
  if (coachPrefixes.some((prefix) => matchesPrefix(pathname, prefix))) return "coach";
  if (athletePrefixes.some((prefix) => matchesPrefix(pathname, prefix))) return "athlete";
  return "unknown";
}

export function safeCallback(value: string | null, role: AppRole) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return homeForRole(role);
  const path = value.split("?")[0] ?? value;
  if (path.startsWith("/invite/")) return path;
  const area = areaForPath(path);
  if (area === "coach" && role === "COACH") return path;
  if (area === "athlete" && role === "ATHLETE") return path;
  return homeForRole(role);
}

export function decideAccess(
  pathname: string,
  role: AppRole | null,
  options?: { allowDevRoutes?: boolean; callbackUrl?: string | null },
): AccessDecision {
  if (matchesPrefix(pathname, "/dev") || matchesPrefix(pathname, "/api/dev")) {
    return options?.allowDevRoutes ? { type: "allow" } : { type: "notFound" };
  }

  const loggedIn = role !== null;

  if (pathname.startsWith("/api/")) {
    if (pathname.startsWith("/api/storage/")) return { type: "allow" };
    if (pathname.startsWith("/api/auth") || loggedIn) return { type: "allow" };
    return { type: "redirect", to: "/login" };
  }

  if (isPublicPath(pathname)) {
    if (loggedIn && role && (pathname === "/login" || pathname === "/register")) {
      return { type: "redirect", to: safeCallback(options?.callbackUrl ?? null, role) };
    }
    return { type: "allow" };
  }

  if (!loggedIn || !role) {
    return { type: "redirect", to: `/login?callbackUrl=${encodeURIComponent(pathname)}` };
  }

  const area = areaForPath(pathname);
  if (area === "coach" && role !== "COACH") return { type: "redirect", to: "/explore" };
  if (area === "athlete" && role !== "ATHLETE") return { type: "redirect", to: "/lobby" };
  if (area === "unknown") return { type: "redirect", to: homeForRole(role) };
  return { type: "allow" };
}

export function roleFromSession(value: unknown): AppRole | null {
  return isAppRole(value) ? value : null;
}
