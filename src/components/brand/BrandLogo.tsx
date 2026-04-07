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
    ? "relative h-[4.5rem] w-[4.5rem] shrink-0 origin-left scale-120 sm:h-20 sm:w-20"
    : "relative h-[5.5rem] w-[5.5rem] shrink-0 origin-left scale-120 sm:h-24 sm:w-24";
  const wordmark = compact
    ? "font-display text-base font-bold leading-tight tracking-tight text-brand-plum sm:text-lg"
    : "font-display text-lg font-bold leading-tight tracking-tight text-brand-plum sm:text-xl";

  const gapClass = compact
    ? "gap-3 sm:gap-3.5"
    : "gap-2.5 sm:gap-3";

  return (
    <div
      className={`flex min-w-0 items-center ${gapClass} ${boxClassName} ${className ?? ""}`}
    >
      <div className={logoBox}>
        <Image
          src={logoAsset}
          alt=""
          fill
          className="object-contain object-left"
          priority={priority}
          sizes={compact ? "(max-width:639px) 72px, 80px" : "(max-width:639px) 88px, 96px"}
        />
      </div>
      <span className={wordmark}>Smart Kredit</span>
    </div>
  );
}
