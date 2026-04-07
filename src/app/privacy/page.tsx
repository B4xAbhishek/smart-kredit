import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { PrivacyPolicyContent } from "@/components/legal/privacy-policy-content";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy · Smart Kredit",
  description:
    "How Smart Kredit collects, uses, and protects your personal information.",
};

const LAST_UPDATED = "8 April 2026";

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      lastUpdated={LAST_UPDATED}
      lede={
        <p>
          Smart Kredit (“<strong>we</strong>”, “<strong>us</strong>”, or “
          <strong>our</strong>”) respects your privacy. This Privacy Policy
          describes how we handle personal data when you use our website and
          related services (the “<strong>Platform</strong>”). Read it together
          with our{" "}
          <Link
            href="/terms"
            className="font-medium text-brand-indigo underline-offset-2 hover:underline"
          >
            Terms &amp; Conditions
          </Link>
          .
        </p>
      }
    >
      <PrivacyPolicyContent />
    </LegalPageShell>
  );
}
