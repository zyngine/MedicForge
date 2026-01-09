"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Input,
} from "@/components/ui";
import { SiteCard, SiteForm } from "@/components/clinical";
import {
  ArrowLeft,
  Building2,
  Plus,
  Search,
  Hospital,
  Truck,
  Flame,
  HeartPulse,
  MapPin,
} from "lucide-react";
import type { ClinicalSite, ClinicalSiteForm } from "@/types";

// Mock data
const mockSites: ClinicalSite[] = [
  {
    id: "1",
    tenant_id: "t1",
    name: "Memorial Hospital",
    site_type: "hospital",
    address: "123 Medical Center Dr",
    city: "Springfield",
    state: "IL",
    zip: "62701",
    phone: "(555) 123-4567",
    contact_name: "Dr. Sarah Johnson",
    contact_email: "sjohnson@memorial.org",
    preceptors: [
      { name: "Dr. Sarah Johnson", credentials: "MD, FACEP", phone: "(555) 123-4568" },
      { name: "Mike Thompson", credentials: "Paramedic", phone: "(555) 123-4569" },
    ],
    notes: "Main teaching hospital. Park in lot C.",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "2",
    tenant_id: "t1",
    name: "County Fire & Rescue",
    site_type: "fire_department",
    address: "456 Station Road",
    city: "Springfield",
    state: "IL",
    zip: "62702",
    phone: "(555) 987-6543",
    contact_name: "Chief Williams",
    contact_email: "chief@countyfire.gov",
    preceptors: [
      { name: "Captain Rodriguez", credentials: "Paramedic/FF", phone: "(555) 987-6544" },
    ],
    notes: "24-hour shifts. Bring turnout gear.",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "3",
    tenant_id: "t1",
    name: "Metro Ambulance",
    site_type: "ambulance_service",
    address: "789 Commerce Blvd",
    city: "Springfield",
    state: "IL",
    zip: "62703",
    phone: "(555) 456-7890",
    contact_name: "Operations Manager",
    contact_email: "ops@metroambulance.com",
    preceptors: [],
    notes: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export default function InstructorSitesPage() {
  const [sites, setSites] = useState<ClinicalSite[]>(mockSites);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSite, setEditingSite] = useState<ClinicalSite | null>(null);

  const filteredSites = sites.filter(
    (site) =>
      site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddSite = (data: ClinicalSiteForm) => {
    const newSite: ClinicalSite = {
      id: Date.now().toString(),
      tenant_id: "t1",
      ...data,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setSites([...sites, newSite]);
    setShowAddForm(false);
  };

  const handleEditSite = (data: ClinicalSiteForm) => {
    if (!editingSite) return;
    setSites(
      sites.map((s) =>
        s.id === editingSite.id
          ? { ...s, ...data, updated_at: new Date().toISOString() }
          : s
      )
    );
    setEditingSite(null);
  };

  const handleDeleteSite = (siteId: string) => {
    setSites(sites.filter((s) => s.id !== siteId));
  };

  const getSiteTypeStats = () => {
    const stats = {
      hospital: 0,
      ambulance_service: 0,
      fire_department: 0,
      urgent_care: 0,
      other: 0,
    };
    sites.forEach((site) => {
      stats[site.site_type]++;
    });
    return stats;
  };

  const stats = getSiteTypeStats();

  if (showAddForm || editingSite) {
    return (
      <div className="space-y-6">
        <div>
          <button
            onClick={() => {
              setShowAddForm(false);
              setEditingSite(null);
            }}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sites
          </button>
          <h1 className="text-2xl font-bold">
            {editingSite ? "Edit Clinical Site" : "Add Clinical Site"}
          </h1>
          <p className="text-muted-foreground">
            {editingSite
              ? "Update the clinical site information"
              : "Add a new hospital, ambulance service, or other clinical site"}
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <SiteForm
              initialData={editingSite || undefined}
              onSubmit={editingSite ? handleEditSite : handleAddSite}
              onCancel={() => {
                setShowAddForm(false);
                setEditingSite(null);
              }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/instructor/clinical"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Clinical Management
          </Link>
          <h1 className="text-2xl font-bold">Clinical Sites</h1>
          <p className="text-muted-foreground">
            Manage hospitals, ambulance services, and clinical rotation sites
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Site
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{sites.length}</p>
              <p className="text-xs text-muted-foreground">Total Sites</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 text-red-600">
              <Hospital className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.hospital}</p>
              <p className="text-xs text-muted-foreground">Hospitals</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 text-green-600">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.ambulance_service}</p>
              <p className="text-xs text-muted-foreground">Ambulance</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.fire_department}</p>
              <p className="text-xs text-muted-foreground">Fire Depts</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.urgent_care + stats.other}</p>
              <p className="text-xs text-muted-foreground">Other</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sites..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Sites Grid */}
      {filteredSites.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Sites Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? "No sites match your search criteria."
                : "Get started by adding your first clinical site."}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Site
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSites.map((site) => (
            <SiteCard
              key={site.id}
              site={site}
              onEdit={() => setEditingSite(site)}
              onDelete={() => handleDeleteSite(site.id)}
              onManageShifts={() => {
                window.location.href = `/instructor/clinical/shifts?site=${site.id}`;
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
