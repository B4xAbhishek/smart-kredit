export default function AdminSegmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-brand-lavender/35 lg:bg-zinc-100">
      <div className="mx-auto min-h-dvh w-full max-w-[1400px] px-4 pb-12 pt-6 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8 xl:max-w-[1600px] xl:px-10">
        {children}
      </div>
    </div>
  );
}
