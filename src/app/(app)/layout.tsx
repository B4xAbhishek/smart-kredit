import { BottomNav } from "@/components/layout/BottomNav";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-dvh bg-brand-lavender/35 pb-24">
      <div className="mx-auto min-h-dvh w-full max-w-md">{children}</div>
      <BottomNav />
    </div>
  );
}
