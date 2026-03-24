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
  Spinner,
} from "@/components/ui";
import {
  CreditCard,
  Building2,
  TrendingUp,
  DollarSign,
  Calendar,
  CheckCircle,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";

interface Subscription {
  id: string;
  name: string;
  slug: string;
  subscription_tier: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  created_at: string | null;
}

const tierPrices: Record<string, number> = {
  free: 0,
  pro: 99,
  institution: 299,
  enterprise: 999,
};

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMRR: 0,
    activeCount: 0,
    trialingCount: 0,
    canceledCount: 0,
  });

  useEffect(() => {
    const fetchSubscriptions = async () => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, slug, subscription_tier, subscription_status, trial_ends_at, created_at")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setSubscriptions(data);

        // Calculate stats
        const active = data.filter(s => s.subscription_status === "active");
        const trialing = data.filter(s => s.subscription_status === "trialing");
        const canceled = data.filter(s => s.subscription_status === "canceled");

        const mrr = active.reduce((sum, s) => {
          return sum + (tierPrices[s.subscription_tier || "free"] || 0);
        }, 0);

        setStats({
          totalMRR: mrr,
          activeCount: active.length,
          trialingCount: trialing.length,
          canceledCount: canceled.length,
        });
      }

      setIsLoading(false);
    };

    fetchSubscriptions();
  }, []);

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "trialing":
        return <AlertCircle className="h-4 w-4 text-amber-600" />;
      case "canceled":
      case "past_due":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadgeVariant = (status: string | null) => {
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

  const getTierBadgeVariant = (tier: string | null) => {
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
      <div>
        <h1 className="text-3xl font-bold">Subscriptions</h1>
        <p className="text-muted-foreground mt-1">
          Manage billing and subscriptions across all institutions
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 text-green-600">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                <p className="text-2xl font-bold">${stats.totalMRR.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{stats.activeCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Trialing</p>
                <p className="text-2xl font-bold">{stats.trialingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 text-red-600">
                <XCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Canceled</p>
                <p className="text-2xl font-bold">{stats.canceledCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions List */}
      <Card>
        <CardHeader>
          <CardTitle>All Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{sub.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {sub.slug}.medicforge.net
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Monthly</p>
                    <p className="font-semibold">
                      ${tierPrices[sub.subscription_tier || "free"]}/mo
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={getTierBadgeVariant(sub.subscription_tier)}>
                      {sub.subscription_tier || "free"}
                    </Badge>
                    <Badge variant={getStatusBadgeVariant(sub.subscription_status)}>
                      {getStatusIcon(sub.subscription_status)}
                      <span className="ml-1">{sub.subscription_status || "unknown"}</span>
                    </Badge>
                  </div>

                  {sub.trial_ends_at && sub.subscription_status === "trialing" && (
                    <div className="flex items-center gap-1 text-sm text-amber-600">
                      <Calendar className="h-4 w-4" />
                      Ends {format(new Date(sub.trial_ends_at), "MMM d")}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {subscriptions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No subscriptions found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
