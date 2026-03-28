import { BottomNav } from "@/components/layout/BottomNav";

export default function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-brand-lavender/35 pb-24">
      <div className="mx-auto min-h-dvh w-full max-w-md">{children}</div>
      <BottomNav />
    </div>
  );
}
