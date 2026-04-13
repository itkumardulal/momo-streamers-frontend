import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  /** Outer diameter in CSS pixels */
  size?: number;
  priority?: boolean;
};

export function BrandLogo({
  className,
  size = 112,
  priority = false,
}: BrandLogoProps) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full bg-white shadow-md ring-1 ring-border/50",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src="/logo.png"
        alt="Mo:Mo Steamers"
        fill
        className="object-contain p-1.5"
        sizes={`${size}px`}
        priority={priority}
      />
    </div>
  );
}
