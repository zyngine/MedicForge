"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "full" | "icon";
  size?: "sm" | "md" | "lg";
  href?: string;
  className?: string;
  showText?: boolean;
}

const sizes = {
  sm: { icon: 32, full: 120 },
  md: { icon: 40, full: 160 },
  lg: { icon: 56, full: 200 },
};

export function Logo({
  variant = "icon",
  size = "md",
  href = "/",
  className,
  showText = true,
}: LogoProps) {
  const dimensions = sizes[size];

  const logoContent = (
    <div className={cn("flex items-center gap-2", className)}>
      {variant === "full" ? (
        <Image
          src="/logo.svg"
          alt="MedicForge"
          width={dimensions.full}
          height={dimensions.full * 0.286}
          priority
        />
      ) : (
        <>
          <Image
            src="/logo-icon.svg"
            alt="MedicForge"
            width={dimensions.icon}
            height={dimensions.icon}
            priority
          />
          {showText && (
            <span className="font-bold text-lg">
              <span className="text-primary">Medic</span>
              <span className="text-secondary">Forge</span>
            </span>
          )}
        </>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{logoContent}</Link>;
  }

  return logoContent;
}

// Simple icon-only version for tight spaces
export function LogoIcon({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/logo-icon.svg"
      alt="MedicForge"
      width={size}
      height={size}
      className={className}
      priority
    />
  );
}
