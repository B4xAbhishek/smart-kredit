import { BrandLogo } from "@/components/brand/BrandLogo";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-dvh flex-col bg-white">
      <header className="relative overflow-hidden bg-gradient-to-br from-brand-indigo via-[#5a4fd4] to-brand-plum px-6 pb-28 pt-8 sm:px-8">
        <div
          className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-white/10 blur-2xl"
          aria-hidden
        />
        <div className="relative z-[1] flex flex-col gap-5">
          <div className="rounded-2xl bg-white/95 px-4 py-3 shadow-md ring-1 ring-white/40">
            <BrandLogo priority />
          </div>
          <p className="max-w-md text-sm leading-relaxed text-white/95 sm:text-[0.95rem]">
            Your instant loan solution. Loans that keep you moving.
          </p>
        </div>
      </header>

      <section
        className="relative z-[2] -mt-16 flex flex-1 flex-col rounded-t-[2rem] bg-white px-6 pb-10 pt-8 shadow-[0_-12px_40px_rgba(60,21,91,0.08)] sm:px-8"
      >
        <div className="mx-auto w-full max-w-md">
          <Suspense
            fallback={
              <div className="h-40 animate-pulse rounded-2xl bg-brand-lavender/50" />
            }
          >
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
