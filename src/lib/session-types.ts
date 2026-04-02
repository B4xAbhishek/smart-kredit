/** Cookie session payload (HMAC-signed JSON). */

export interface SessionPayload {
  /** E.164 phone for OTP users */
  phone?: string;
  /** Email for Google sign-in users */
  email?: string;
  /** Firebase Auth UID */
  userId?: string;
  iat: number;
  exp: number;
}
