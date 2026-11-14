export const roles = ["COACH", "ATHLETE"] as const;

export type AppRole = (typeof roles)[number];

export function isAppRole(value: unknown): value is AppRole {
  return value === "COACH" || value === "ATHLETE";
}

export function homeForRole(role: AppRole) {
  return role === "COACH" ? "/lobby" : "/explore";
}
