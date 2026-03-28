"use client";

import { FileText, Home, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/home", label: "Home", Icon: Home },
  { href: "/orders", label: "Order", Icon: FileText },
  { href: "/account", label: "Account", Icon: UserRound },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-brand-plum/10 bg-white/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_24px_rgba(60,21,91,0.06)] backdrop-blur-md"
      aria-label="Main"
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2">
        {items.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-w-[4.5rem] flex-col items-center gap-1 rounded-xl px-3 py-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-indigo ${
                active
                  ? "text-brand-indigo"
                  : "text-brand-plum/45 hover:text-brand-plum/70"
              }`}
            >
              <Icon
                className="size-6"
                strokeWidth={active ? 2.25 : 1.75}
                aria-hidden
              />
              <span className="text-[0.7rem] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
