"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTenant, useTenantBranding } from "@/lib/hooks/use-tenant";
import { useUser } from "@/lib/hooks/use-user";
import { useAgencyRole } from "@/lib/hooks/use-agency-role";
import { cn } from "@/lib/utils";
import {
  Button,
  Avatar,
  Spinner,
} from "@/components/ui";
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  RefreshCw,
  Stethoscope,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Building2,
  ChevronDown,
} from "lucide-react";

// Logo component with error fallback
function AgencyLogo({ logoUrl, tenantName }: { logoUrl: string | null; tenantName: string }) {
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    setHasError(false);
  }, [logoUrl]);

  if (logoUrl && !hasError) {
    return (
      <img
        src={logoUrl}
        alt={tenantName}
        className="h-8 w-auto"
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
      <Building2 className="h-5 w-5 text-primary" />
    </div>
  );
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  mdOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/agency/dashboard", icon: LayoutDashboard },
  { label: "Employees", href: "/agency/employees", icon: Users },
  { label: "Skills Library", href: "/agency/skills", icon: ClipboardCheck, adminOnly: true },
  { label: "Verification Cycles", href: "/agency/cycles", icon: RefreshCw, adminOnly: true },
  { label: "Medical Directors", href: "/agency/medical-directors", icon: Stethoscope, adminOnly: true },
  { label: "Pending Verifications", href: "/agency/medical-directors/pending", icon: ClipboardCheck, mdOnly: true },
  { label: "Audit Log", href: "/agency/audit-log", icon: FileText, adminOnly: true },
  { label: "Settings", href: "/agency/settings", icon: Settings, adminOnly: true },
];

function AgencySidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { tenant, isLoading: tenantLoading } = useTenant();
  const { logoUrl, tenantName } = useTenantBranding();
  const { isAgencyAdmin, isMedicalDirector } = useAgencyRole();

  const filteredNavItems = NAV_ITEMS.filter((item) => {
    if (item.adminOnly && !isAgencyAdmin) return false;
    if (item.mdOnly && !isMedicalDirector) return false;
    return true;
  });

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b">
          <Link href="/agency/dashboard" className="flex items-center gap-3">
            {tenantLoading ? (
              <div className="w-8 h-8 bg-muted rounded animate-pulse" />
            ) : (
              <AgencyLogo logoUrl={tenant?.logo_url || null} tenantName={tenantName} />
            )}
            <span className="font-semibold text-lg truncate">{tenantName}</span>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-1 hover:bg-muted rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <div className="text-xs text-muted-foreground text-center">
            Agency Competency Portal
          </div>
        </div>
      </aside>
    </>
  );
}

function AgencyHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, profile, signOut } = useUser();
  const { isAgencyAdmin, isMedicalDirector, agencyRole } = useAgencyRole();
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);

  const roleLabel = isAgencyAdmin
    ? "Agency Admin"
    : isMedicalDirector
    ? "Medical Director"
    : "User";

  return (
    <header className="h-16 border-b bg-card px-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-muted rounded-lg"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden sm:block">
          <h1 className="font-semibold">Agency Portal</h1>
        </div>
      </div>

      {/* User Menu */}
      <div className="relative">
        <button
          onClick={() => setIsProfileOpen(!isProfileOpen)}
          className="flex items-center gap-3 p-2 hover:bg-muted rounded-lg"
        >
          <Avatar
            fallback={profile?.full_name || "User"}
            src={profile?.avatar_url || undefined}
            size="sm"
          />
          <div className="hidden sm:block text-left">
            <div className="text-sm font-medium">{profile?.full_name}</div>
            <div className="text-xs text-muted-foreground">{roleLabel}</div>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>

        {isProfileOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsProfileOpen(false)}
            />
            <div className="absolute right-0 top-full mt-2 w-56 bg-card border rounded-lg shadow-lg z-20 py-1">
              <div className="px-4 py-2 border-b">
                <div className="font-medium">{profile?.full_name}</div>
                <div className="text-sm text-muted-foreground">{profile?.email}</div>
              </div>
              <Link
                href="/agency/settings"
                className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted"
                onClick={() => setIsProfileOpen(false)}
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
              <button
                onClick={() => {
                  setIsProfileOpen(false);
                  signOut();
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted w-full text-left text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

export default function AgencyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const { tenant, isLoading: tenantLoading } = useTenant();
  const { profile, isLoading: userLoading } = useUser();
  const { hasAgencyAccess, isLoading: roleLoading } = useAgencyRole();

  // Show loading while checking access
  if (tenantLoading || userLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Redirect if not an agency tenant or no agency access
  if (tenant && tenant.tenant_type !== "agency") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Agency Portal</h1>
          <p className="text-muted-foreground mb-4">
            This portal is for agency accounts only.
          </p>
          <Button asChild>
            <Link href="/admin/dashboard">Go to Admin Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-2">Sign In Required</h1>
          <p className="text-muted-foreground mb-4">
            Please sign in to access the agency portal.
          </p>
          <Button asChild>
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <AgencySidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <AgencyHeader onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
