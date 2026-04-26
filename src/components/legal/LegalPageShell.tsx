import { contactMailtoHref, DEFAULT_CONTACT_EMAIL } from "@/lib/contact";
import Link from "next/link";

export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="font-[family-name:var(--font-montserrat)] text-lg font-bold text-zinc-900">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-zinc-700">
        {children}
      </div>
    </section>
  );
}

export function LegalPageShell({
  title,
  lastUpdated,
  lede,
  contactEmail = DEFAULT_CONTACT_EMAIL,
  children,
}: {
  title: string;
  lastUpdated: string;
  lede: React.ReactNode;
  contactEmail?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-zinc-50">
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-6 sm:px-6">
        <Link
          href="/"
          className="inline-flex text-sm font-semibold text-brand-indigo underline-offset-2 hover:underline"
        >
          ← Back to app
        </Link>

        <header className="mt-8 border-b border-zinc-200 pb-6">
          <h1 className="font-[family-name:var(--font-montserrat)] text-2xl font-bold tracking-tight text-brand-plum sm:text-[1.75rem]">
            {title}
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Last updated: {lastUpdated}
          </p>
          <div className="mt-4 text-sm leading-relaxed text-zinc-600">
            {lede}
          </div>
        </header>

        <article className="mt-8 space-y-10">{children}</article>

        <footer className="mt-12 border-t border-zinc-200 pt-8 text-sm text-zinc-600">
          <p>
            Questions? Use <strong>Contact Us</strong> in the app or email{" "}
            <a
              href={contactMailtoHref(contactEmail)}
              className="font-semibold text-brand-indigo underline-offset-2 hover:underline"
            >
              {contactEmail}
            </a>
            .
          </p>
        </footer>
      </div>
    </main>
  );
}
