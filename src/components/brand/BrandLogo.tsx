import Image from "next/image";
import logoAsset from "@/assets/Final Logo.png";

type BrandLogoProps = {
  className?: string;
  /** Outer box height — width follows container max-width */
  boxClassName?: string;
  priority?: boolean;
};

export function BrandLogo({
  className,
  boxClassName = "h-14 w-full max-w-[260px] sm:h-16",
  priority = false,
}: BrandLogoProps) {
  return (
    <div className={`relative ${boxClassName} ${className ?? ""}`}>
      <Image
        src={logoAsset}
        alt="Smart Kredit"
        fill
        className="object-contain object-left"
        priority={priority}
        sizes="(max-width: 480px) 85vw, 260px"
      />
    </div>
  );
}
