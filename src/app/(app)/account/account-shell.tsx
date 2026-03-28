import { AccountPromoIllustration } from "@/components/account/AccountPromoIllustration";
import { formatAccountId } from "@/lib/mask-account-id";
import {
  ChevronRight,
  LogOut,
  Pencil,
  Phone,
  UserRound,
} from "lucide-react";
import Link from "next/link";

type AccountShellProps = {
  accountLabel: string;
  signOut: () => Promise<void>;
  contactTel?: string;
};

export function AccountShell({
  accountLabel,
  signOut,
  contactTel = "+911800000000",
}: AccountShellProps) {
  return (
    <div className="flex min-h-[calc(100dvh-5rem)] flex-col bg-zinc-100/90">
      <section className="relative overflow-hidden bg-gradient-to-br from-[#3b5bdb] via-[#4f6ef7] to-brand-indigo px-4 pb-16 pt-10">
        <div
          className="pointer-events-none absolute -right-16 top-0 size-56 rounded-full bg-white/10"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-10 bottom-0 size-40 rounded-full bg-white/10"
          aria-hidden
        />

        <div className="relative mx-auto flex size-[4.5rem] items-center justify-center rounded-full bg-white/20 ring-2 ring-white/35 shadow-lg backdrop-blur-sm">
          <UserRound className="size-10 text-white" strokeWidth={1.75} aria-hidden />
        </div>
        <p className="relative mt-5 text-center text-base font-medium tracking-wide text-white">
          {accountLabel}
        </p>
      </section>

      <div className="relative z-[1] -mt-10 px-4">
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-sky-400 to-sky-500 px-4 py-4 shadow-lg ring-1 ring-white/25">
          <p className="max-w-[58%] font-[family-name:var(--font-montserrat)] text-base font-bold leading-snug text-white">
            Loans That Keep You Moving
          </p>
          <AccountPromoIllustration />
        </div>
      </div>

      <div className="flex-1 px-4 pb-8 pt-8">
        <h2 className="font-[family-name:var(--font-montserrat)] text-base font-bold text-zinc-900">
          Common functions
        </h2>

        <nav className="mt-4 flex flex-col gap-2" aria-label="Account actions">
          <Link
            href={`tel:${contactTel}`}
            className="group flex cursor-pointer items-center gap-3 rounded-xl bg-white px-3 py-3.5 shadow-sm ring-1 ring-zinc-100 transition hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-indigo"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-indigo text-white shadow-sm">
              <Phone className="size-5" strokeWidth={2} aria-hidden />
            </span>
            <span className="flex-1 text-[15px] font-medium text-zinc-900">
              Contact Us
            </span>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-indigo/12 text-brand-indigo transition group-hover:bg-brand-indigo/18">
              <ChevronRight className="size-4" strokeWidth={2.5} aria-hidden />
            </span>
          </Link>

          <Link
            href="/agreement"
            className="group flex cursor-pointer items-center gap-3 rounded-xl bg-white px-3 py-3.5 shadow-sm ring-1 ring-zinc-100 transition hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-indigo"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-indigo text-white shadow-sm">
              <Pencil className="size-5" strokeWidth={2} aria-hidden />
            </span>
            <span className="flex-1 text-[15px] font-medium text-zinc-900">
              Agreement
            </span>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-indigo/12 text-brand-indigo transition group-hover:bg-brand-indigo/18">
              <ChevronRight className="size-4" strokeWidth={2.5} aria-hidden />
            </span>
          </Link>

          <form action={signOut}>
            <button
              type="submit"
              className="group flex w-full cursor-pointer items-center gap-3 rounded-xl bg-white px-3 py-3.5 text-left shadow-sm ring-1 ring-zinc-100 transition hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-indigo"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-indigo text-white shadow-sm">
                <LogOut className="size-5" strokeWidth={2} aria-hidden />
              </span>
              <span className="flex-1 text-[15px] font-medium text-zinc-900">
                Logout
              </span>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-indigo/12 text-brand-indigo transition group-hover:bg-brand-indigo/18">
                <ChevronRight className="size-4" strokeWidth={2.5} aria-hidden />
              </span>
            </button>
          </form>
        </nav>
      </div>
    </div>
  );
}
