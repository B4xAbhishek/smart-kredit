/** Default support email (Account → Contact Us, home bell, legal footer). */
export const DEFAULT_CONTACT_EMAIL = "kreditsmart604@gmail.com";

/** `mailto:` href for support contact. */
export function contactMailtoHref(email = DEFAULT_CONTACT_EMAIL): string {
  return `mailto:${email}`;
}
