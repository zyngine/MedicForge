"use client";

import { useState } from "react";
import { Button, Card, CardContent, Spinner, Modal, Alert } from "@/components/ui";
import { SiteCard, SiteForm } from "@/components/clinical";
import { Plus, Building2, AlertCircle } from "lucide-react";
import { useClinicalSites } from "@/lib/hooks/use-clinical-sites";
import type { ClinicalSite, ClinicalSiteForm } from "@/types";

export default function ClinicalSitesPage() {
  const { sites, isLoading, error, createSite, updateSite, deleteSite } = useClinicalSites();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSite, setEditingSite] = useState<ClinicalSite | null>(null);
  const [deletingSite, setDeletingSite] = useState<ClinicalSite | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddSite = async (data: ClinicalSiteForm) => {
    setIsSubmitting(true);
    try {
      const result = await createSite(data);
      if (result) {
        setShowAddModal(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSite = async (data: ClinicalSiteForm) => {
    if (!editingSite) return;
    setIsSubmitting(true);
    try {
      const result = await updateSite(editingSite.id, data);
      if (result) {
        setEditingSite(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSite = async () => {
    if (!deletingSite) return;
    setIsSubmitting(true);
    try {
      const success = await deleteSite(deletingSite.id);
      if (success) {
        setDeletingSite(null);
      }
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

  if (error) {
    return (
      <Alert variant="error" title="Error loading clinical sites">
        {error.message}
      </Alert>
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
