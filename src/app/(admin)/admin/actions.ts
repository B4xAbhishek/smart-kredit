"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type LoanStatus = "active" | "settled" | "pending";

export async function createLoan(input: {
  userId: string;
  productName: string;
  amountRupees: number;
  status: LoanStatus;
  externalRef?: string | null;
}) {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase is not configured." };

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
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase is not configured." };

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
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase is not configured." };

  const { error } = await supabase.from("loans").delete().eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function updateProfile(input: {
  userId: string;
  displayName: string | null;
}) {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase is not configured." };

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
