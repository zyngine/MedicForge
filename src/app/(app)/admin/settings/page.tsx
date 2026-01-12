"use client";

import Link from "next/link";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui";
import {
  Globe,
  Building2,
  Bell,
  Shield,
  Palette,
  ChevronRight,
} from "lucide-react";

const settingsItems = [
  {
    title: "Custom Domain",
    description: "Configure a custom domain for your organization",
    href: "/admin/settings/domains",
    icon: Globe,
  },
  {
    title: "Organization Profile",
    description: "Update your organization name, logo, and branding",
    href: "/admin/settings/profile",
    icon: Building2,
  },
  {
    title: "Notifications",
    description: "Configure email notifications and alerts",
    href: "/admin/settings/notifications",
    icon: Bell,
  },
  {
    title: "Security",
    description: "Manage authentication and security settings",
    href: "/admin/settings/security",
    icon: Shield,
  },
  {
    title: "Appearance",
    description: "Customize colors and branding for your portal",
    href: "/admin/settings/appearance",
    icon: Palette,
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your organization settings
        </p>
      </div>

      <div className="grid gap-4">
        {settingsItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
