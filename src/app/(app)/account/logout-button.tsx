"use client";

import { clearLastLoginPhone } from "@/lib/auth/persistent-login";
import { getPersistentFirebaseAuth } from "@/lib/firebase/client";
import { LogOut, ChevronRight } from "lucide-react";
import { signOut } from "firebase/auth";

type LogoutButtonProps = {
  signOutAction: () => Promise<void>;
};

export function LogoutButton({ signOutAction }: LogoutButtonProps) {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        onClick={async () => {
          clearLastLoginPhone();
          try {
            const auth = await getPersistentFirebaseAuth();
            await signOut(auth);
          } catch {
            // Clearing the server cookie still logs the user out.
          }
        }}
        className="group flex w-full cursor-pointer items-center gap-3 rounded-xl bg-white px-3 py-3.5 text-left shadow-sm ring-1 ring-zinc-100 transition hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-indigo"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-indigo text-white shadow-sm">
          <LogOut className="size-5" strokeWidth={2} aria-hidden />
        </span>
        <span className="flex-1 text-[15px] font-medium text-zinc-900">Logout</span>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-indigo/12 text-brand-indigo transition group-hover:bg-brand-indigo/18">
          <ChevronRight className="size-4" strokeWidth={2.5} aria-hidden />
        </span>
      </button>
    </form>
  );
}
