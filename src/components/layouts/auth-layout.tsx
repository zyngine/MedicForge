"use client";

import Link from "next/link";
import Image from "next/image";
import { useTenantBranding } from "@/lib/hooks/use-tenant";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

export function AuthLayout({ children, title, description }: AuthLayoutProps) {
  const { logoUrl, tenantName, isWhiteLabeled, hideVendorBranding } = useTenantBranding();

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-white blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <Link href="/" className="flex items-center gap-3">
            {isWhiteLabeled ? (
              <Image
                src={logoUrl}
                alt={tenantName}
                width={40}
                height={40}
                className="w-10 h-10 rounded-lg object-contain bg-white/20 p-1"
              />
            ) : (
              <Image
                src="/logo-icon.svg"
                alt="MedicForge"
                width={40}
                height={40}
                className="w-10 h-10"
              />
            )}
            <span className="text-2xl font-bold">{tenantName}</span>
          </Link>

          <div className="space-y-6">
            <h1 className="text-4xl font-bold leading-tight">
              Where First Responders
              <br />
              Are Forged
            </h1>
            <p className="text-lg text-white/80 max-w-md">
              The modern learning management system built specifically for EMS education.
              Train EMRs, EMTs, AEMTs, and Paramedics with confidence.
            </p>
            <div className="flex gap-8">
              <div>
                <div className="text-3xl font-bold">500+</div>
                <div className="text-sm text-white/70">Training Programs</div>
              </div>
              <div>
                <div className="text-3xl font-bold">50K+</div>
                <div className="text-sm text-white/70">Students Trained</div>
              </div>
              <div>
                <div className="text-3xl font-bold">98%</div>
                <div className="text-sm text-white/70">Pass Rate</div>
              </div>
            </div>
          </div>

          {!hideVendorBranding && (
            <div className="text-sm text-white/60">
              &copy; {new Date().getFullYear()} MedicForge. All rights reserved.
            </div>
          )}
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden p-6 border-b">
          <Link href="/" className="flex items-center gap-2">
            {isWhiteLabeled ? (
              <Image
                src={logoUrl}
                alt={tenantName}
                width={32}
                height={32}
                className="w-8 h-8 rounded-lg object-contain"
              />
            ) : (
              <Image
                src="/logo-icon.svg"
                alt="MedicForge"
                width={32}
                height={32}
                className="w-8 h-8"
              />
            )}
            <span className="text-xl font-bold">{tenantName}</span>
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center lg:text-left">
              <h2 className="text-2xl font-bold">{title}</h2>
              {description && (
                <p className="mt-2 text-muted-foreground">{description}</p>
              )}
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
