"use client";

import { useEffect, useState } from "react";
import { createCEClient } from "@/lib/supabase/client";
import { Button, Spinner } from "@/components/ui";
import { CreditCard, Download, CheckCircle, XCircle, Clock } from "lucide-react";

interface Purchase {
  id: string;
  purchased_at: string;
  amount: number;
  refunded: boolean;
  square_payment_id: string;
  ce_courses: { title: string } | null;
  ce_users: { first_name: string; last_name: string; email: string } | null;
}

interface Subscription {
  id: string;
  plan: string;
  price: number;
  starts_at: string;
  expires_at: string;
  status: string;
  ce_users: { first_name: string; last_name: string; email: string } | null;
}

type Tab = "purchases" | "subscriptions";

function downloadCSV(rows: string[][], filename: string) {
  const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CEAdminBillingPage() {
  const [tab, setTab] = useState<Tab>("purchases");
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createCEClient();
      const [purchRes, subRes] = await Promise.all([
        supabase
          .from("ce_purchases")
          .select("id, purchased_at, amount, refunded, square_payment_id, ce_courses(title), ce_users(first_name, last_name, email)")
          .order("purchased_at", { ascending: false }),
        supabase
          .from("ce_user_subscriptions")
          .select("id, plan, price, starts_at, expires_at, status, ce_users(first_name, last_name, email)")
          .order("starts_at", { ascending: false }),
      ]);
      setPurchases((purchRes.data || []) as Purchase[]);
      setSubscriptions((subRes.data || []) as Subscription[]);
      setIsLoading(false);
    };
    load();
  }, []);

  const purchaseRevenue = purchases.filter((p) => !p.refunded).reduce((s, p) => s + p.amount, 0);
  const subscriptionRevenue = subscriptions.filter((s) => s.status !== "cancelled").reduce((s, sub) => s + sub.price, 0);
  const activeSubscriptions = subscriptions.filter((s) => s.status === "active" && new Date(s.expires_at) > new Date()).length;

  const handleExport = () => {
    if (tab === "purchases") {
      downloadCSV(
        [
          ["Date", "User", "Email", "Course", "Amount", "Status", "Payment ID"],
          ...purchases.map((p) => [
            new Date(p.purchased_at).toLocaleDateString(),
            p.ce_users ? `${p.ce_users.first_name} ${p.ce_users.last_name}` : "—",
            p.ce_users?.email || "—",
            p.ce_courses?.title || "—",
            `$${p.amount.toFixed(2)}`,
            p.refunded ? "Refunded" : "Paid",
            p.square_payment_id,
          ]),
        ],
        "ce-purchases.csv"
      );
    } else {
      downloadCSV(
        [
          ["Started", "User", "Email", "Plan", "Amount", "Expires", "Status"],
          ...subscriptions.map((s) => [
            new Date(s.starts_at).toLocaleDateString(),
            s.ce_users ? `${s.ce_users.first_name} ${s.ce_users.last_name}` : "—",
            s.ce_users?.email || "—",
            s.plan,
            `$${s.price.toFixed(2)}`,
            new Date(s.expires_at).toLocaleDateString(),
            s.status,
          ]),
        ],
        "ce-subscriptions.csv"
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="h-6 w-6" />
          Billing & Payments
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Course purchases and annual subscriptions.
        </p>
      </div>

      {/* Revenue summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Course Sales</p>
          <p className="text-2xl font-bold">${purchaseRevenue.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {purchases.filter((p) => !p.refunded).length} paid ·{" "}
            {purchases.filter((p) => p.refunded).length} refunded
          </p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Subscription Revenue</p>
          <p className="text-2xl font-bold">${subscriptionRevenue.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {activeSubscriptions} active · {subscriptions.length} total
          </p>
        </div>
        <div className="bg-white border rounded-lg p-4 border-l-4 border-l-green-500">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-green-700">
            ${(purchaseRevenue + subscriptionRevenue).toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">All time</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="flex items-center border-b">
          {(["purchases", "subscriptions"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-3 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? "border-b-2 border-red-700 text-red-700"
                  : "text-muted-foreground hover:text-gray-900"
              }`}
            >
              {t === "purchases" ? `Purchases (${purchases.length})` : `Subscriptions (${subscriptions.length})`}
            </button>
          ))}
          <div className="ml-auto px-4 py-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1.5" />
              Export CSV
            </Button>
          </div>
        </div>

        {tab === "purchases" && (
          purchases.length === 0 ? (
            <p className="text-center text-muted-foreground py-12 text-sm">No purchases yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-left px-4 py-3">User</th>
                    <th className="text-left px-4 py-3">Course</th>
                    <th className="text-right px-4 py-3">Amount</th>
                    <th className="text-center px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Payment ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {purchases.map((p) => (
                    <tr key={p.id} className={p.refunded ? "opacity-50 bg-red-50" : ""}>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(p.purchased_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {p.ce_users ? (
                          <>
                            <p className="font-medium">
                              {p.ce_users.first_name} {p.ce_users.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">{p.ce_users.email}</p>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">{p.ce_courses?.title || "—"}</td>
                      <td className="px-4 py-3 text-right font-medium">${p.amount.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        {p.refunded ? (
                          <span className="inline-flex items-center gap-1 text-xs text-red-600">
                            <XCircle className="h-3.5 w-3.5" /> Refunded
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-green-700">
                            <CheckCircle className="h-3.5 w-3.5" /> Paid
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground max-w-[200px] truncate">
                        {p.square_payment_id}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {tab === "subscriptions" && (
          subscriptions.length === 0 ? (
            <p className="text-center text-muted-foreground py-12 text-sm">No subscriptions yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="text-left px-4 py-3">Started</th>
                    <th className="text-left px-4 py-3">User</th>
                    <th className="text-left px-4 py-3">Plan</th>
                    <th className="text-right px-4 py-3">Amount</th>
                    <th className="text-left px-4 py-3">Expires</th>
                    <th className="text-center px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {subscriptions.map((s) => {
                    const isActive = s.status === "active" && new Date(s.expires_at) > new Date();
                    const isExpired = new Date(s.expires_at) < new Date();
                    return (
                      <tr key={s.id}>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {new Date(s.starts_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          {s.ce_users ? (
                            <>
                              <p className="font-medium">
                                {s.ce_users.first_name} {s.ce_users.last_name}
                              </p>
                              <p className="text-xs text-muted-foreground">{s.ce_users.email}</p>
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 capitalize">{s.plan}</td>
                        <td className="px-4 py-3 text-right font-medium">${s.price.toFixed(2)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {new Date(s.expires_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                              <CheckCircle className="h-3 w-3" /> Active
                            </span>
                          ) : isExpired ? (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full">
                              <Clock className="h-3 w-3" /> Expired
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                              <XCircle className="h-3 w-3" /> Cancelled
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}
