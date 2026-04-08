"use server";

import { clearSession } from "@/lib/session";

export async function logoutAction() {
  await clearSession();
}
