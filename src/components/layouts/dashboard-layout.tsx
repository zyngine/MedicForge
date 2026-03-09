"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Avatar, Badge, Button, Dropdown, DropdownItem, DropdownSeparator, ThemeToggle } from "@/components/ui";
import { NotificationBell } from "@/components/notifications";
import { useTenantBranding } from "@/lib/hooks/use-tenant";
import {
  Menu,
  X,
  ChevronDown,
  LogOut,
  Settings,
  User,
  HelpCircle,
} from "lucide-react";
import { GlobalSearch } from "./global-search";

interface NavItem {
  title: string;
  href?: string;
  icon: React.ReactNode;
  badge?: string | number;
  children?: NavItem[];
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  user: {
    name: string;
    email: string;
    role: string;
    avatar?: string;
  };
  navigation: NavItem[];
  portalName: string;
  onSignOut?: () => void;
}

// Logo component with error fallback
function TenantLogo({ logoUrl, tenantName, isWhiteLabeled }: { logoUrl: string; tenantName: string; isWhiteLabeled: boolean }) {
  const [hasError, setHasError] = React.useState(false);

  // Reset error state when URL changes
  React.useEffect(() => {
    setHasError(false);
  }, [logoUrl]);

  if (isWhiteLabeled && !hasError) {
    return (
      <Image
        src={logoUrl}
        alt={tenantName}
        width={32}
        height={32}
        className="w-8 h-8 rounded-lg object-contain"
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <Image
      src="/logo-icon.svg"
      alt="MedicForge"
      width={32}
      height={32}
      className="w-8 h-8"
    />
  );
}

function NavItemRenderer({ item, pathname }: { item: NavItem; pathname: string }) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  // Check if this item or any child is active
  const isActive = item.href
    ? (pathname === item.href || pathname.startsWith(item.href + "/"))
    : false;
  const hasActiveChild = item.children?.some(
    (child) => child.href && (pathname === child.href || pathname.startsWith(child.href + "/"))
  );

  // Auto-expand if a child is active
  React.useEffect(() => {
    if (hasActiveChild) {
      setIsExpanded(true);
    }
  }, [hasActiveChild]);

  // Regular nav item with href
  if (item.href && !item.children) {
    return (
      <li>
        <Link
          href={item.href}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
            isActive
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {item.icon}
          <span className="flex-1">{item.title}</span>
          {item.badge && (
            <Badge
              variant={isActive ? "secondary" : "default"}
              className="ml-auto"
            >
              {item.badge}
            </Badge>
          )}
        </Link>
      </li>
    );
  }

  // Nav item with children (collapsible section)
  if (item.children) {
    return (
      <li>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
            hasActiveChild
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {item.icon}
          <span className="flex-1 text-left">{item.title}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              isExpanded && "rotate-180"
            )}
          />
        </button>
        {isExpanded && (
          <ul className="mt-1 ml-4 space-y-1 border-l pl-3">
            {item.children.map((child) => {
              const childActive = child.href && (pathname === child.href || pathname.startsWith(child.href + "/"));
              return (
                <li key={child.title}>
                  <Link
                    href={child.href || "#"}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                      childActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {child.icon}
                    <span>{child.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </li>
    );
  }

  return null;
}

export function DashboardLayout({
  children,
  user,
  navigation,
  portalName,
  onSignOut,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const pathname = usePathname();
  const { logoUrl, tenantName, isWhiteLabeled } = useTenantBranding();

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-card border-r transition-transform lg:translate-x-0 flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b shrink-0">
          <Link href="/" className="flex items-center gap-2">
            <TenantLogo logoUrl={logoUrl} tenantName={tenantName} isWhiteLabeled={isWhiteLabeled} />
            <span className="font-bold">{tenantName}</span>
          </Link>
          <button
            className="lg:hidden p-2 hover:bg-muted rounded-md"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Portal indicator */}
        <div className="px-4 py-3 border-b shrink-0">
          <Badge variant="secondary" className="w-full justify-center">
            {portalName}
          </Badge>
        </div>

        {/* Navigation - scrollable */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 min-h-0">
          <ul className="space-y-1">
            {navigation.map((item) => (
              <NavItemRenderer key={item.title} item={item} pathname={pathname} />
            ))}
          </ul>
        </nav>

        {/* Help section */}
        <div className="p-4 border-t shrink-0">
          <Link
            href="/support"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <HelpCircle className="h-4 w-4" />
            Help & Support
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-background border-b">
          <div className="flex items-center justify-between h-full px-4">
            {/* Left side */}
            <div className="flex items-center gap-4">
              <button
                className="lg:hidden p-2 hover:bg-muted rounded-md"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>

              {/* Search */}
              <GlobalSearch userRole={user.role} />
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {/* Theme toggle */}
              <ThemeToggle variant="icon" />

              {/* Notifications */}
              <NotificationBell />

              {/* User menu */}
              <Dropdown
                trigger={
                  <button className="flex items-center gap-2 p-1.5 hover:bg-muted rounded-md">
                    <Avatar
                      src={user.avatar}
                      fallback={user.name}
                      size="sm"
                    />
                    <div className="hidden md:block text-left">
                      <div className="text-sm font-medium">{user.name}</div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {user.role}
                      </div>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </button>
                }
                align="right"
              >
                <div className="px-3 py-2 border-b">
                  <div className="font-medium">{user.name}</div>
                  <div className="text-sm text-muted-foreground">{user.email}</div>
                </div>
                <DropdownItem icon={<User className="h-4 w-4" />}>
                  Profile
                </DropdownItem>
                <DropdownItem icon={<Settings className="h-4 w-4" />}>
                  Settings
                </DropdownItem>
                <DropdownSeparator />
                <DropdownItem icon={<LogOut className="h-4 w-4" />} destructive onClick={onSignOut}>
                  Sign out
                </DropdownItem>
              </Dropdown>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
