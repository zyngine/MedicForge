"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  Button,
  Input,
  Spinner,
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
} from "lucide-react";
import { useClinicalSites } from "@/lib/hooks/use-clinical-sites";
import type { ClinicalSite, ClinicalSiteForm } from "@/types";

export default function InstructorSitesPage() {
  const { sites, isLoading, createSite, updateSite, deleteSite } = useClinicalSites();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSite, setEditingSite] = useState<ClinicalSite | null>(null);

  const filteredSites = sites.filter(
    (site) =>
      site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddSite = async (data: ClinicalSiteForm) => {
    await createSite(data);
    setShowAddForm(false);
  };

  const handleEditSite = async (data: ClinicalSiteForm) => {
    if (!editingSite) return;
    await updateSite(editingSite.id, data);
    setEditingSite(null);
  };

  const handleDeleteSite = async (siteId: string) => {
    if (confirm("Are you sure you want to delete this clinical site?")) {
      await deleteSite(siteId);
    }
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

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
              defaultValues={editingSite ? {
                name: editingSite.name,
                site_type: editingSite.site_type,
                address: editingSite.address ?? undefined,
                city: editingSite.city ?? undefined,
                state: editingSite.state ?? undefined,
                zip: editingSite.zip ?? undefined,
                phone: editingSite.phone ?? undefined,
                contact_name: editingSite.contact_name ?? undefined,
                contact_email: editingSite.contact_email ?? undefined,
                preceptors: editingSite.preceptors,
                notes: editingSite.notes ?? undefined,
              } : undefined}
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
