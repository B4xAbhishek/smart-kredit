import crypto from "crypto";

export function normalizeFallbackAccessCode(code: string): string {
  return code.replace(/\D/g, "").slice(0, 6);
}

export function isFallbackAccessCodeShapeValid(code: string): boolean {
  return /^\d{6}$/.test(normalizeFallbackAccessCode(code));
}

export function generateFallbackAccessCode(): string {
  const num = crypto.randomInt(0, 1_000_000);
  return String(num).padStart(6, "0");
}
