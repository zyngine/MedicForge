"use client";

import { useEffect, useState } from "react";
import { createCEClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/ui";
import { Users, Search } from "lucide-react";
import { Input } from "@/components/ui";

interface CEUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  certification_level: string | null;
  state: string | null;
  nremt_id: string | null;
  terms_accepted_at: string | null;
  created_at: string;
  enrollment_count?: number;
}

const ROLE_STYLES: Record<string, string> = {
  user: "bg-gray-100 text-gray-700",
  admin: "bg-red-100 text-red-700",
  agency_admin: "bg-blue-100 text-blue-700",
  committee_member: "bg-purple-100 text-purple-700",
  medical_director: "bg-green-100 text-green-700",
  instructor: "bg-yellow-100 text-yellow-800",
};

const ROLE_LABELS: Record<string, string> = {
  user: "User",
  admin: "Admin",
  agency_admin: "Agency Admin",
  committee_member: "Committee",
  medical_director: "Medical Director",
  instructor: "Instructor",
};

const FILTERS = [
  { value: "all", label: "All" },
  { value: "user", label: "Users" },
  { value: "admin", label: "Admins" },
  { value: "agency_admin", label: "Agency Admins" },
  { value: "committee_member", label: "Committee" },
];

export default function CEAdminUsersPage() {
  const [users, setUsers] = useState<CEUser[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const supabase = createCEClient();

      let q = supabase
        .from("ce_users")
        .select("id, email, first_name, last_name, role, certification_level, state, nremt_id, terms_accepted_at, created_at")
        .order("created_at", { ascending: false });

      if (filter !== "all") q = q.eq("role", filter);

      const { data } = await q;
      setUsers(data || []);
      setIsLoading(false);
    };
    load();
  }, [filter]);

  const filtered = users.filter((u) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      u.email.toLowerCase().includes(s) ||
      u.first_name.toLowerCase().includes(s) ||
      u.last_name.toLowerCase().includes(s) ||
      (u.nremt_id && u.nremt_id.toLowerCase().includes(s))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-muted-foreground text-sm mt-1">All CE platform users</p>
        </div>
        <div className="text-sm text-muted-foreground">{users.length} total</div>
      </div>

      {/* Search + filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, email, NREMT ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                filter === f.value
                  ? "bg-gray-900 text-white"
                  : "bg-white border text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Spinner size="lg" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <Users className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">No users found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cert Level</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">State</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">NREMT ID</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Joined</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Terms</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{user.first_name} {user.last_name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_STYLES[user.role] || "bg-gray-100 text-gray-700"}`}>
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{user.certification_level || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{user.state || "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{user.nremt_id || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {user.terms_accepted_at ? (
                      <span className="text-xs text-green-700 font-medium">Accepted</span>
                    ) : (
                      <span className="text-xs text-yellow-700">Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
