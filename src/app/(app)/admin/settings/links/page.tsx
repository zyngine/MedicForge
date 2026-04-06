"use client";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  Button,
  Alert,
  Spinner,
  Input,
  Label,
  Select,
  Modal,
  Badge,
} from "@/components/ui";
import {
  ArrowLeft,
  Link2,
  Plus,
  ExternalLink,
  Edit,
  Trash2,
} from "lucide-react";
import {
  useTenantLinks,
  useCreateTenantLink,
  useUpdateTenantLink,
  useDeleteTenantLink,
  LINK_CATEGORIES,
  TenantLink,
  getCategoryLabel,
} from "@/lib/hooks/use-program-links";

export default function TenantLinksPage() {
  const { data: links = [], isLoading } = useTenantLinks();
  const createMutation = useCreateTenantLink();
  const updateMutation = useUpdateTenantLink();
  const deleteMutation = useDeleteTenantLink();

  const [showModal, setShowModal] = React.useState(false);
  const [editingLink, setEditingLink] = React.useState<TenantLink | null>(null);
  const [form, setForm] = React.useState({
    title: "",
    url: "",
    description: "",
    category: "other",
  });
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const handleOpenModal = (link?: TenantLink) => {
    if (link) {
      setEditingLink(link);
      setForm({
        title: link.title,
        url: link.url,
        description: link.description || "",
        category: link.category,
      });
    } else {
      setEditingLink(null);
      setForm({
        title: "",
        url: "",
        description: "",
        category: "other",
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.url.trim()) {
      setError("Title and URL are required");
      return;
    }

    try {
      if (editingLink) {
        await updateMutation.mutateAsync({
          id: editingLink.id,
          title: form.title,
          url: form.url,
          description: form.description || undefined,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          category: form.category as any,
        });
        setSuccess("Link updated successfully");
      } else {
        await createMutation.mutateAsync({
          title: form.title,
          url: form.url,
          description: form.description || undefined,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          category: form.category as any,
        });
        setSuccess("Link added successfully");
      }
      setShowModal(false);
      setEditingLink(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save link");
    }
  };

  const handleDelete = async (linkId: string, linkTitle: string) => {
    if (!confirm(`Delete "${linkTitle}"?`)) return;

    try {
      await deleteMutation.mutateAsync(linkId);
      setSuccess("Link deleted successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete link");
    }
  };

  const handleToggleActive = async (link: TenantLink) => {
    try {
      await updateMutation.mutateAsync({
        id: link.id,
        is_active: !link.is_active,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update link");
    }
  };

  // Group links by category
  const _linksByCategory = React.useMemo(() => {
    const grouped = new Map<string, TenantLink[]>();
    links.forEach((link) => {
      const cat = link.category || "other";
      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat)!.push(link);
    });
    return grouped;
  }, [links]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/settings">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Settings
          </Button>
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Link2 className="h-6 w-6" />
            Quick Links
          </h1>
          <p className="text-muted-foreground">
            Manage organization-wide links visible to all students
          </p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Link
        </Button>
      </div>

      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Info Card */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            These links will be shown to all students in your organization. For program-specific links,
            go to <Link href="/admin/cohorts" className="text-primary hover:underline">Cohorts</Link> and add links to individual programs.
          </p>
        </CardContent>
      </Card>

      {/* Links List */}
      {links.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Link2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No links yet</h3>
            <p className="text-muted-foreground mb-4">
              Add helpful resources and links for your students
            </p>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Link
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 font-medium">Title</th>
                    <th className="text-left py-3 px-4 font-medium">Category</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-right py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {links.map((link) => (
                    <tr key={link.id} className="border-b last:border-0">
                      <td className="py-3 px-4">
                        <div>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium hover:text-primary inline-flex items-center gap-1"
                          >
                            {link.title}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                          {link.description && (
                            <p className="text-sm text-muted-foreground">
                              {link.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">{getCategoryLabel(link.category)}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={link.is_active ? "success" : "secondary"}
                          className="cursor-pointer"
                          onClick={() => handleToggleActive(link)}
                        >
                          {link.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenModal(link)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(link.id, link.title)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingLink(null);
        }}
        title={editingLink ? "Edit Link" : "Add Link"}
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., Student Handbook"
            />
          </div>

          <div className="space-y-2">
            <Label>URL *</Label>
            <Input
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Brief description of this resource"
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              options={LINK_CATEGORIES.map((c) => ({
                value: c.value,
                label: c.label,
              }))}
              value={form.category}
              onChange={(v) => setForm({ ...form, category: v })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowModal(false);
                setEditingLink(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) ? (
                <Spinner size="sm" className="mr-2" />
              ) : null}
              {editingLink ? "Save Changes" : "Add Link"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
