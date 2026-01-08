"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  Badge,
  Button,
  Input,
  Spinner,
} from "@/components/ui";
import {
  Building2,
  Search,
  MoreVertical,
  ExternalLink,
  Users,
  BookOpen,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  custom_domain: string | null;
  subscription_tier: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  created_at: string | null;
  _count?: {
    users: number;
    courses: number;
  };
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchTenants = async () => {
      const supabase = createClient();

      try {
        // Fetch tenants
        const { data: tenantsData, error } = await supabase
          .from("tenants")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Fetch counts for each tenant
        const tenantsWithCounts = await Promise.all(
          (tenantsData || []).map(async (tenant) => {
            const [usersCount, coursesCount] = await Promise.all([
              supabase
                .from("users")
                .select("id", { count: "exact", head: true })
                .eq("tenant_id", tenant.id),
              supabase
                .from("courses")
                .select("id", { count: "exact", head: true })
                .eq("tenant_id", tenant.id),
            ]);

            return {
              ...tenant,
              _count: {
                users: usersCount.count || 0,
                courses: coursesCount.count || 0,
              },
            };
          })
        );

        setTenants(tenantsWithCounts);
      } catch (error) {
        console.error("Error fetching tenants:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTenants();
  }, []);

  const filteredTenants = tenants.filter(
    (tenant) =>
      tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTierBadgeVariant = (tier: string) => {
    switch (tier) {
      case "enterprise":
        return "default";
      case "institution":
        return "secondary";
      case "pro":
        return "outline";
      default:
        return "outline";
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "success";
      case "trialing":
        return "warning";
      case "canceled":
      case "past_due":
        return "destructive";
      default:
        return "outline";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Institutions</h1>
          <p className="text-muted-foreground mt-1">
            Manage all registered institutions
          </p>
        </div>
        <Button>
          <Building2 className="h-4 w-4 mr-2" />
          Add Institution
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search institutions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="outline">{filteredTenants.length} institutions</Badge>
      </div>

      {/* Tenants List */}
      <div className="space-y-4">
        {filteredTenants.map((tenant) => (
          <Card key={tenant.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{tenant.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {tenant.custom_domain || `${tenant.slug}.medicforge.com`}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        {tenant._count?.users || 0} users
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <BookOpen className="h-4 w-4" />
                        {tenant._count?.courses || 0} courses
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        Joined {tenant.created_at ? format(new Date(tenant.created_at), "MMM d, yyyy") : "N/A"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={getTierBadgeVariant(tenant.subscription_tier || "free")}>
                      {tenant.subscription_tier || "free"}
                    </Badge>
                    <Badge variant={getStatusBadgeVariant(tenant.subscription_status || "trialing")}>
                      {tenant.subscription_status || "trialing"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {tenant.subscription_status === "trialing" && tenant.trial_ends_at && (
                <div className="mt-4 p-3 bg-warning/10 rounded-lg text-sm">
                  Trial ends {format(new Date(tenant.trial_ends_at), "MMM d, yyyy")}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {filteredTenants.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No institutions found</h3>
              <p className="text-muted-foreground">
                {searchQuery
                  ? "Try a different search term"
                  : "No institutions have registered yet"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
