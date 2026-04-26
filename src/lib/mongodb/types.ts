import type { ObjectId } from "mongodb";
import type { HomeProductId } from "@/lib/home-products";

/** Per-user toggles for Home “More recommendations” (omit key or `true` = shown). */
export type HomeProductEnabledMap = Partial<Record<HomeProductId, boolean>>;

/** Profile document — `_id` is the Firebase Auth UID (string). */
export type ProfileDoc = {
  _id: string;
  email?: string | null;
  display_name?: string | null;
  phone_e164?: string | null;
  phone?: string | null;
  /** User UPI VPA for payouts / reconciliation (set by admin). */
  upi_id?: string | null;
  is_admin?: boolean;
  /** When a key is `false`, that home recommendation is hidden for this user. */
  home_product_enabled?: HomeProductEnabledMap | null;
  /** After first visit to `/home`, next sign-in lands on `/orders`. */
  seen_home?: boolean;
  created_at?: Date;
  updated_at?: Date;
};

export type LoanDoc = {
  _id: ObjectId;
  userId: string;
  product_name: string;
  amount_rupees: number;
  status: string;
  external_ref?: string | null;
  /** Matches `HomeProductId` when this row is a seeded default product loan. */
  default_product_key?: string | null;
  /** Admin-set due date; when absent the user sees today's date as fallback. */
  due_date?: Date | null;
  created_at: Date;
};

/** Global app-level settings stored by known `_id` keys. */
export type AppSettingHomeProductsDoc = {
  _id: "home_products";
  /**
   * Legacy single kill-switch: when `false`, both home products are treated as off
   * unless migrated to `global_product_enabled`.
   */
  globally_enabled?: boolean;
  /** Per-product global visibility for Home; omit/`true` = shown, `false` = hidden. */
  global_product_enabled?: HomeProductEnabledMap | null;
  updated_at?: Date;
};

/** Merchant VPA shown on the repayment / manual transfer screen (set by admin). */
export type AppSettingPaymentUpiDoc = {
  _id: "payment_upi";
  /** UPI ID customers pay to (e.g. name@bankupi). */
  upi_id?: string | null;
  updated_at?: Date;
};

/** Admin-managed emergency 6-digit fallback login code. */
export type AppSettingFallbackLoginCodeDoc = {
  _id: "fallback_login_code";
  code?: string | null;
  updated_at?: Date;
};

/** Global Contact Us details shown in account/home/legal screens. */
export type AppSettingContactDoc = {
  _id: "contact_us";
  email?: string | null;
  phone?: string | null;
  updated_at?: Date;
};
