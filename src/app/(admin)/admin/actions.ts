"use server";

import { isAdminForSession } from "@/lib/admin-auth";
import { getSession } from "@/lib/session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { revalidatePath } from "next/cache";

export type LoanStatus = "active" | "settled" | "pending";

async function requireAdminSupabase() {
  const session = await getSession();
  if (!session) {
    return { supabase: null as null, error: "Not signed in." as const };
  }
  if (!(await isAdminForSession(session))) {
    return { supabase: null as null, error: "Not allowed." as const };
  }
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return {
      supabase: null as null,
      error: "Server missing SUPABASE_SERVICE_ROLE_KEY." as const,
    };
  }
  return { supabase, error: null as null };
}

export async function createLoan(input: {
  userId: string;
  productName: string;
  amountRupees: number;
  status: LoanStatus;
  externalRef?: string | null;
}) {
  const { supabase, error: authError } = await requireAdminSupabase();
  if (!supabase) return { error: authError ?? "Supabase is not configured." };

  const { error } = await supabase.from("loans").insert({
    user_id: input.userId,
    product_name: input.productName.trim(),
    amount_rupees: input.amountRupees,
    status: input.status,
    external_ref: input.externalRef?.trim() || null,
  });

  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function updateLoan(input: {
  id: string;
  productName: string;
  amountRupees: number;
  status: LoanStatus;
  externalRef?: string | null;
}) {
  const { supabase, error: authError } = await requireAdminSupabase();
  if (!supabase) return { error: authError ?? "Supabase is not configured." };

  const { error } = await supabase
    .from("loans")
    .update({
      product_name: input.productName.trim(),
      amount_rupees: input.amountRupees,
      status: input.status,
      external_ref: input.externalRef?.trim() || null,
    })
    .eq("id", input.id);

  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function deleteLoan(id: string) {
  const { supabase, error: authError } = await requireAdminSupabase();
  if (!supabase) return { error: authError ?? "Supabase is not configured." };

  const { error } = await supabase.from("loans").delete().eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function createUser(input: {
  phone?: string;
  email?: string;
  displayName?: string;
}) {
  const { supabase, error: authError } = await requireAdminSupabase();
  if (!supabase) return { error: authError ?? "Supabase is not configured." };

  if (!input.phone && !input.email) {
    return { error: "Provide a phone number or email." };
  }

  let createPayload: Record<string, unknown> = {};
  if (input.phone) {
    const phone = input.phone.trim().replace(/\s/g, "");
    const e164 = phone.startsWith("+") ? phone : `+91${phone.replace(/\D/g, "").slice(-10)}`;
    createPayload = { phone: e164, phone_confirm: true };
  } else if (input.email) {
    createPayload = {
      email: input.email.trim().toLowerCase(),
      email_confirm: true,
    };
  }

  if (input.displayName?.trim()) {
    createPayload.user_metadata = { full_name: input.displayName.trim() };
  }

  const { data, error } = await supabase.auth.admin.createUser(
    createPayload as Parameters<typeof supabase.auth.admin.createUser>[0],
  );

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("already") || msg.includes("exists") || msg.includes("registered")) {
      return { error: "A user with that phone/email already exists." };
    }
    return { error: error.message };
  }

  // Ensure profile has display_name
  if (data.user && input.displayName?.trim()) {
    await supabase
      .from("profiles")
      .update({ display_name: input.displayName.trim() })
      .eq("id", data.user.id);
  }

  revalidatePath("/admin");
  return { ok: true as const, userId: data.user?.id };
}

export async function updateProfile(input: {
  userId: string;
  displayName: string | null;
}) {
  const { supabase, error: authError } = await requireAdminSupabase();
  if (!supabase) return { error: authError ?? "Supabase is not configured." };

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: input.displayName?.trim() || null,
    })
    .eq("id", input.userId);

  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { ok: true as const };
}
