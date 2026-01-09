"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Card, CardContent, Spinner, Modal } from "@/components/ui";
import { SiteCard, SiteForm } from "@/components/clinical";
import { Plus, Building2, AlertCircle } from "lucide-react";
import type { ClinicalSite, ClinicalSiteForm } from "@/types";

// Mock data for demonstration - will be replaced with real API calls
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
      { name: "Mike Thompson", credentials: "Paramedic", phone: "(555) 111-2222" },
      { name: "Lisa Chen", credentials: "RN", phone: "(555) 333-4444" },
    ],
    notes: "Main ED entrance - check in at EMS desk",
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
      { name: "John Davis", credentials: "Captain/Paramedic", phone: "(555) 555-5555" },
    ],
    notes: "Station 4 - 24 hour shifts available",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "3",
    tenant_id: "t1",
    name: "Metro Ambulance Service",
    site_type: "ambulance_service",
    address: "789 Response Way",
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

export default function ClinicalSitesPage() {
  const [sites, setSites] = useState<ClinicalSite[]>(mockSites);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSite, setEditingSite] = useState<ClinicalSite | null>(null);
  const [deletingSite, setDeletingSite] = useState<ClinicalSite | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddSite = async (data: ClinicalSiteForm) => {
    setIsSubmitting(true);
    try {
      // TODO: Replace with actual API call
      const newSite: ClinicalSite = {
        id: Date.now().toString(),
        tenant_id: "t1",
        ...data,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zip: data.zip || null,
        phone: data.phone || null,
        contact_name: data.contact_name || null,
        contact_email: data.contact_email || null,
        preceptors: data.preceptors || [],
        notes: data.notes || null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setSites([...sites, newSite]);
      setShowAddModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSite = async (data: ClinicalSiteForm) => {
    if (!editingSite) return;
    setIsSubmitting(true);
    try {
      // TODO: Replace with actual API call
      const updatedSites = sites.map((site) =>
        site.id === editingSite.id
          ? {
              ...site,
              ...data,
              address: data.address || null,
              city: data.city || null,
              state: data.state || null,
              zip: data.zip || null,
              phone: data.phone || null,
              contact_name: data.contact_name || null,
              contact_email: data.contact_email || null,
              preceptors: data.preceptors || [],
              notes: data.notes || null,
              updated_at: new Date().toISOString(),
            }
          : site
      );
      setSites(updatedSites);
      setEditingSite(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSite = async () => {
    if (!deletingSite) return;
    setIsSubmitting(true);
    try {
      // TODO: Replace with actual API call
      setSites(sites.filter((site) => site.id !== deletingSite.id));
      setDeletingSite(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clinical Sites</h1>
          <p className="text-muted-foreground">
            Manage hospitals, ambulance services, and other clinical locations
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Site
        </Button>
      </div>

      {/* Sites List */}
      {sites.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Clinical Sites</h3>
              <p className="text-muted-foreground mb-4">
                Get started by adding your first clinical site.
              </p>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Site
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => (
            <SiteCard
              key={site.id}
              site={site}
              onEdit={() => setEditingSite(site)}
              onDelete={() => setDeletingSite(site)}
            />
          ))}
        </div>
      )}

      {/* Add Site Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Clinical Site"
        size="lg"
      >
        <SiteForm
          onSubmit={handleAddSite}
          onCancel={() => setShowAddModal(false)}
          isLoading={isSubmitting}
        />
      </Modal>

      {/* Edit Site Modal */}
      <Modal
        isOpen={!!editingSite}
        onClose={() => setEditingSite(null)}
        title="Edit Clinical Site"
        size="lg"
      >
        {editingSite && (
          <SiteForm
            defaultValues={{
              name: editingSite.name,
              site_type: editingSite.site_type,
              address: editingSite.address || "",
              city: editingSite.city || "",
              state: editingSite.state || "",
              zip: editingSite.zip || "",
              phone: editingSite.phone || "",
              contact_name: editingSite.contact_name || "",
              contact_email: editingSite.contact_email || "",
              preceptors: editingSite.preceptors,
              notes: editingSite.notes || "",
            }}
            onSubmit={handleEditSite}
            onCancel={() => setEditingSite(null)}
            isLoading={isSubmitting}
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingSite}
        onClose={() => setDeletingSite(null)}
        title="Delete Clinical Site"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">
                Are you sure you want to delete &quot;{deletingSite?.name}&quot;?
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                This action cannot be undone. All shifts and bookings associated
                with this site will also be deleted.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeletingSite(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSite}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Deleting..." : "Delete Site"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
