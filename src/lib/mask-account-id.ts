/** Display like `Account 918***300` from E.164 phone. */
export function formatAccountId(
  phone: string | null | undefined,
  email: string | null | undefined,
): string {
  if (phone) {
    const d = phone.replace(/\D/g, "");
    if (d.length >= 6) {
      const start = d.slice(0, 3);
      const end = d.slice(-3);
      return `Account ${start}***${end}`;
    }
    return `Account ${phone}`;
  }
  if (email) {
    const [a, b] = email.split("@");
    if (a && b) {
      const vis = a.slice(0, 2);
      return `Account ${vis}***@${b}`;
    }
    return `Account ${email}`;
  }
  return "Account —";
}

/**
 * Prefer masked phone/email; if both missing (broken session) use profile display name.
 */
export function formatAccountHeader(
  phone: string | null | undefined,
  email: string | null | undefined,
  displayName: string | null | undefined,
): string {
  const fromId = formatAccountId(phone, email);
  if (fromId !== "Account —") return fromId;
  if (displayName?.trim()) {
    return `Account · ${displayName.trim()}`;
  }
  return "Account —";
}
