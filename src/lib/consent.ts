export const CONSENT_VERSION = "2026-11-13";

export function consentIsCurrent(consentAt: Date | null | undefined, consentVersion: string | null | undefined) {
  return consentAt != null && consentVersion === CONSENT_VERSION;
}
