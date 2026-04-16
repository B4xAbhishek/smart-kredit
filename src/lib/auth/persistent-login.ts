"use client";

export const LAST_PHONE_STORAGE_KEY = "sk-last-phone-e164";

export function saveLastLoginPhone(phoneE164: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_PHONE_STORAGE_KEY, phoneE164);
}

export function getLastLoginPhone(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LAST_PHONE_STORAGE_KEY);
}

export function clearLastLoginPhone() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LAST_PHONE_STORAGE_KEY);
}
