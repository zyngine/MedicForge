"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button, ThemeToggle } from "@/components/ui";
import { useTenantBranding, useTenant } from "@/lib/hooks/use-tenant";
import { Menu, X } from "lucide-react";

const navItems = [
  { title: "Features", href: "/features" },
  { title: "Pricing", href: "/pricing" },
  { title: "About", href: "/about" },
  { title: "Contact", href: "/contact" },
];

export function MarketingLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const pathname = usePathname();
  const { logoUrl, tenantName, isWhiteLabeled } = useTenantBranding();
  const { isMainSite: _isMainSite } = useTenant();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              {isWhiteLabeled ? (
                <Image
                  src={logoUrl}
                  alt={tenantName}
                  width={36}
                  height={36}
                  className="w-9 h-9 rounded-lg object-contain"
                />
              ) : (
                <Image
                  src="/logo-icon.svg"
                  alt="MedicForge"
                  width={36}
                  height={36}
                  className="w-9 h-9"
                />
              )}
              <span className="text-xl font-bold">{tenantName}</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                    pathname === item.href
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {item.title}
                </Link>
              ))}
            </nav>

            {/* Auth buttons */}
            <div className="hidden md:flex items-center gap-3">
              <ThemeToggle variant="icon" />
              <Button variant="ghost" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Get Started</Link>
              </Button>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 hover:bg-muted rounded-md"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-background animate-slide-down">
            <nav className="container mx-auto px-4 py-4 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "block px-4 py-2 text-sm font-medium rounded-md transition-colors",
                    pathname === item.href
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.title}
                </Link>
              ))}
              <div className="pt-4 space-y-2 border-t mt-4">
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button className="w-full" asChild>
                  <Link href="/register">Get Started</Link>
                </Button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-muted/50 border-t">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
            {/* Brand */}
            <div className="col-span-2 md:col-span-4 lg:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4">
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
                <span className="font-bold">{tenantName}</span>
              </Link>
              <p className="text-sm text-muted-foreground mb-4">
                Where First Responders Are Forged. The modern LMS for EMS education.
              </p>
              <a
                href="mailto:admin@medicforge.net"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                admin@medicforge.net
              </a>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/features" className="hover:text-foreground">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-foreground">Pricing</Link></li>
                <li><Link href="/integrations" className="hover:text-foreground">Integrations</Link></li>
                <li><Link href="/changelog" className="hover:text-foreground">Changelog</Link></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="font-semibold mb-3">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/docs" className="hover:text-foreground">Documentation</Link></li>
                <li><Link href="/guides" className="hover:text-foreground">Guides</Link></li>
                <li><Link href="/blog" className="hover:text-foreground">Blog</Link></li>
                <li><Link href="/support" className="hover:text-foreground">Support</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground">About</Link></li>
                <li><Link href="/careers" className="hover:text-foreground">Careers</Link></li>
                <li><Link href="/contact" className="hover:text-foreground">Contact</Link></li>
                <li><Link href="/partners" className="hover:text-foreground">Partners</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-foreground">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-foreground">Terms</Link></li>
                <li><Link href="/security" className="hover:text-foreground">Security</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} MedicForge. All rights reserved.
            </p>
            <a
              href="mailto:admin@medicforge.net"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              admin@medicforge.net
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
