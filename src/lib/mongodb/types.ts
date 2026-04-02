import type { ObjectId } from "mongodb";

/** Profile document — `_id` is the Firebase Auth UID (string). */
export type ProfileDoc = {
  _id: string;
  email?: string | null;
  display_name?: string | null;
  phone_e164?: string | null;
  phone?: string | null;
  is_admin?: boolean;
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
  created_at: Date;
};
