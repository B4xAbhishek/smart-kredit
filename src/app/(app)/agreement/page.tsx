import { redirect } from "next/navigation";

/** @deprecated Use /terms — kept for backward compatibility with old links. */
export default function AgreementPage() {
  redirect("/terms");
}
