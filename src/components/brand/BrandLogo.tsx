import Image from "next/image";
import logoAsset from "@/assets/Final Logo.png";

type BrandLogoProps = {
  className?: string;
  /** Outer row: alignment and max width */
  boxClassName?: string;
  priority?: boolean;
  /** Tighter logo + type for dense headers (e.g. home) */
  compact?: boolean;
};

export function BrandLogo({
  className,
  boxClassName = "w-full max-w-[min(100%,22rem)]",
  priority = false,
  compact = false,
}: BrandLogoProps) {
  const logoBox = compact
    ? "relative h-9 w-9 shrink-0 sm:h-10 sm:w-10"
    : "relative h-11 w-11 shrink-0 sm:h-12 sm:w-12";
  const wordmark = compact
    ? "font-display text-base font-bold leading-tight tracking-tight text-brand-plum sm:text-lg"
    : "font-display text-lg font-bold leading-tight tracking-tight text-brand-plum sm:text-xl";

  return (
    <div
      className={`flex min-w-0 items-center gap-2.5 sm:gap-3 ${boxClassName} ${className ?? ""}`}
    >
      <div className={logoBox}>
        <Image
          src={logoAsset}
          alt=""
          fill
          className="object-contain object-left"
          priority={priority}
          sizes={compact ? "40px" : "48px"}
        />
      </div>
      <span className={wordmark}>Smart Kredit</span>
    </div>
  );
}
