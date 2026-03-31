/** In-memory OTP store with expiry and rate limiting. */

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;

interface OtpEntry {
  otp: string;
  expires: number;
  attempts: number;
}

const store = new Map<string, OtpEntry>();

/** Generate a 6-digit numeric OTP. */
export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/** Store an OTP for a phone number (replaces any existing). */
export function storeOtp(phone: string, otp: string) {
  store.set(phone, { otp, expires: Date.now() + OTP_EXPIRY_MS, attempts: 0 });
}

/** Verify OTP. Returns true once on match, then deletes it. */
export function verifyStoredOtp(phone: string, otp: string): boolean {
  const entry = store.get(phone);
  if (!entry) return false;

  if (Date.now() > entry.expires) {
    store.delete(phone);
    return false;
  }

  entry.attempts++;
  if (entry.attempts > MAX_ATTEMPTS) {
    store.delete(phone);
    return false;
  }

  if (entry.otp === otp) {
    store.delete(phone);
    return true;
  }

  return false;
}
