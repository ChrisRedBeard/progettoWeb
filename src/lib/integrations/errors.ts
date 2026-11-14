export const integrationErrorCodes = [
  "NOT_IMPLEMENTED",
  "INVALID_STATE",
  "CAMERA_UNAVAILABLE",
  "MIC_UNAVAILABLE",
  "CONNECTION_LOST",
  "TOKEN_EXPIRED",
  "NOT_ALLOWED",
] as const;

export type IntegrationErrorCode = (typeof integrationErrorCodes)[number];

export class IntegrationError extends Error {
  readonly code: IntegrationErrorCode;

  constructor(code: IntegrationErrorCode, message: string) {
    super(message);
    this.name = "IntegrationError";
    this.code = code;
  }
}
