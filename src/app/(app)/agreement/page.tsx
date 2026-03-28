import Link from "next/link";

export const metadata = {
  title: "Agreement · Smart Kredit",
};

export default function AgreementPage() {
  return (
    <main className="min-h-[calc(100dvh-5rem)] px-4 pb-8 pt-6">
      <h1 className="font-[family-name:var(--font-montserrat)] text-xl font-bold text-brand-plum">
        Agreement
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-brand-plum/75">
        Loan and privacy agreement content will be provided here. This is a
        placeholder screen linked from Account.
      </p>
      <Link
        href="/account"
        className="mt-8 inline-flex text-sm font-semibold text-brand-indigo underline-offset-2 hover:underline"
      >
        ← Back to account
      </Link>
    </main>
  );
}
