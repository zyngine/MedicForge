"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Input,
  Textarea,
  Label,
  Modal,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Spinner,
  Select,
} from "@/components/ui";
import {
  Briefcase,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Share2,
  Link as LinkIcon,
  Copy,
  FileText,
  Image,
  Video,
  GripVertical,
  Star,
  Clock,
  Check,
  Globe,
} from "lucide-react";
import { usePortfolios, usePortfolioBuilder, usePortfolioSharing } from "@/lib/hooks/use-portfolios";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function StudentPortfolioPage() {
  const {
    portfolios,
    isLoading,
    createPortfolio,
    updatePortfolio,
    deletePortfolio,
    publishPortfolio,
    unpublishPortfolio,
  } = usePortfolios();

  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [editingPortfolio, setEditingPortfolio] = React.useState<string | null>(null);
  const [newTitle, setNewTitle] = React.useState("");
  const [newDescription, setNewDescription] = React.useState("");

  const handleCreatePortfolio = async () => {
    if (!newTitle.trim()) return;

    const portfolio = await createPortfolio({
      title: newTitle,
      description: newDescription || undefined,
    });

    if (portfolio) {
      setShowCreateModal(false);
      setNewTitle("");
      setNewDescription("");
      setEditingPortfolio(portfolio.id);
    }
  };

  const handleTogglePublish = async (portfolioId: string, isPublished: boolean) => {
    if (isPublished) {
      await unpublishPortfolio(portfolioId);
    } else {
      await publishPortfolio(portfolioId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  // If editing a portfolio, show the builder
  if (editingPortfolio) {
    return (
      <PortfolioBuilder
        portfolioId={editingPortfolio}
        onBack={() => setEditingPortfolio(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="h-6 w-6" />
            My Portfolio
          </h1>
          <p className="text-muted-foreground">
            Showcase your best work and achievements
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Portfolio
        </Button>
      </div>

      {/* Portfolios Grid */}
      {portfolios.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No portfolios yet</h3>
            <p className="text-muted-foreground mb-4">
              Create a portfolio to showcase your work and share with others
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Portfolio
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {portfolios.map((portfolio) => (
            <Card key={portfolio.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Briefcase className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={portfolio.is_published ? "success" : "secondary"}>
                      {portfolio.is_published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                </div>

                <h3 className="font-semibold text-lg mb-2">{portfolio.title}</h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {portfolio.description || "No description"}
                </p>

                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    {portfolio.sections?.length || 0} sections
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatDate(portfolio.updated_at)}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setEditingPortfolio(portfolio.id)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTogglePublish(portfolio.id, portfolio.is_published)}
                  >
                    {portfolio.is_published ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  {portfolio.is_published && (
                    <Button variant="outline" size="sm">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Portfolio"
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              placeholder="My Professional Portfolio"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              placeholder="A showcase of my best work and achievements..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePortfolio} disabled={!newTitle.trim()}>
              Create Portfolio
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Portfolio Builder Component
function PortfolioBuilder({
  portfolioId,
  onBack,
}: {
  portfolioId: string;
  onBack: () => void;
}) {
  const {
    portfolio,
    isLoading,
    addSection,
    updateSection,
    deleteSection,
    addArtifact,
    deleteArtifact,
    toggleFeatured,
  } = usePortfolioBuilder(portfolioId);

  const sections = portfolio?.sections || [];

  const { shares, createShareLink, revokeShare } = usePortfolioSharing(portfolioId);

  const [showAddSection, setShowAddSection] = React.useState(false);
  const [newSectionTitle, setNewSectionTitle] = React.useState("");
  const [newSectionDescription, setNewSectionDescription] = React.useState("");
  const [showShareModal, setShowShareModal] = React.useState(false);
  const [shareExpiry, setShareExpiry] = React.useState("7");

  const handleAddSection = async () => {
    if (!newSectionTitle.trim()) return;

    await addSection({
      title: newSectionTitle,
      description: newSectionDescription || undefined,
    });

    setShowAddSection(false);
    setNewSectionTitle("");
    setNewSectionDescription("");
  };

  const handleCreateShare = async () => {
    await createShareLink(parseInt(shareExpiry));
    setShowShareModal(false);
  };

  const copyShareLink = (_token: string) => {
    toast.info("Portfolio sharing is coming soon");
  };

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            ← Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{portfolio?.title}</h1>
            <p className="text-muted-foreground">
              {portfolio?.description || "No description"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled title="Coming soon">
            <Share2 className="h-4 w-4 mr-2" />
            Share (Coming Soon)
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="sections">
        <TabsList>
          <TabsTrigger value="sections">Sections</TabsTrigger>
          <TabsTrigger value="sharing">Sharing ({shares.length})</TabsTrigger>
        </TabsList>

        {/* Sections Tab */}
        <TabsContent value="sections">
          <div className="space-y-4">
            {sections.length === 0 && !showAddSection ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No sections yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Add sections to organize your portfolio content
                  </p>
                  <Button onClick={() => setShowAddSection(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Section
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {sections.map((section) => (
                  <Card key={section.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                          <div>
                            <CardTitle className="text-lg">{section.title}</CardTitle>
                            {section.description && (
                              <CardDescription>{section.description}</CardDescription>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteSection(section.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {section.artifacts && section.artifacts.length > 0 ? (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {section.artifacts.map((artifact) => (
                            <div
                              key={artifact.id}
                              className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="p-2 rounded bg-muted">
                                  {artifact.artifact_type === "image" ? (
                                    <Image className="h-4 w-4" />
                                  ) : artifact.artifact_type === "video" ? (
                                    <Video className="h-4 w-4" />
                                  ) : (
                                    <FileText className="h-4 w-4" />
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      toggleFeatured(artifact.id)
                                    }
                                  >
                                    <Star
                                      className={`h-4 w-4 ${
                                        artifact.is_featured
                                          ? "text-warning fill-warning"
                                          : ""
                                      }`}
                                    />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteArtifact(artifact.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              <h4 className="font-medium text-sm mb-1">
                                {artifact.title}
                              </h4>
                              {artifact.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {artifact.description}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No artifacts in this section yet
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {/* Add Section Form */}
                {showAddSection ? (
                  <Card>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Section Title</Label>
                          <Input
                            placeholder="e.g., Clinical Experience"
                            value={newSectionTitle}
                            onChange={(e) => setNewSectionTitle(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Description (optional)</Label>
                          <Textarea
                            placeholder="Describe this section..."
                            value={newSectionDescription}
                            onChange={(e) => setNewSectionDescription(e.target.value)}
                            rows={2}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleAddSection} disabled={!newSectionTitle.trim()}>
                            Add Section
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowAddSection(false);
                              setNewSectionTitle("");
                              setNewSectionDescription("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowAddSection(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Section
                  </Button>
                )}
              </>
            )}
          </div>
        </TabsContent>

        {/* Sharing Tab */}
        <TabsContent value="sharing">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Share Links</CardTitle>
                  <CardDescription>
                    Create private links to share your portfolio
                  </CardDescription>
                </div>
                <Button onClick={() => setShowShareModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Link
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {shares.length === 0 ? (
                <div className="text-center py-8">
                  <LinkIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No share links created yet
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {shares.map((share) => (
                    <div
                      key={share.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded bg-muted">
                          <LinkIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            Share Link
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {share.expires_at
                              ? `Expires ${formatDate(share.expires_at)}`
                              : "Never expires"}
                            {share.view_count !== undefined && (
                              <> · {share.view_count} views</>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => share.share_token && copyShareLink(share.share_token)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => revokeShare(share.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Share Modal */}
      <Modal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title="Create Share Link"
        size="sm"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Link Expiration</Label>
            <Select
              value={shareExpiry}
              onChange={setShareExpiry}
              options={[
                { value: "1", label: "1 day" },
                { value: "7", label: "7 days" },
                { value: "30", label: "30 days" },
                { value: "90", label: "90 days" },
                { value: "365", label: "1 year" },
              ]}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowShareModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateShare}>
              <LinkIcon className="h-4 w-4 mr-2" />
              Create Link
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
