"use client";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Spinner,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui";
import {
  Award,
  Download,
  Eye,
  Share2,
  Search,
  GraduationCap,
  BookOpen,
  CheckCircle,
  Shield,
} from "lucide-react";
import { useMyCertificates, Certificate } from "@/lib/hooks/use-certificates";
import { useTenant } from "@/lib/hooks/use-tenant";
import { CertificateViewer } from "@/components/certificates/certificate-viewer";
import { generateCertificateHTML, downloadCertificateHTML } from "@/lib/certificate-generator";
import { formatDate } from "@/lib/utils";

export default function StudentCertificatesPage() {
  const { data: certificates, isLoading } = useMyCertificates();
  const { tenant } = useTenant();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedCertificate, setSelectedCertificate] = React.useState<Certificate | null>(null);
  const [typeFilter, setTypeFilter] = React.useState<string>("all");

  const filteredCertificates = React.useMemo(() => {
    if (!certificates) return [];

    let result = certificates;

    if (typeFilter !== "all") {
      result = result.filter((cert) => cert.certificate_type === typeFilter);
    }

    if (searchTerm) {
      result = result.filter(
        (cert) =>
          cert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cert.course?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cert.certificate_number.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return result;
  }, [certificates, typeFilter, searchTerm]);

  const handleDownload = (certificate: Certificate) => {
    const html = generateCertificateHTML({
      certificate,
      tenant: tenant ? { name: tenant.name, logo_url: tenant.logo_url || undefined } : undefined,
    });
    downloadCertificateHTML(html, `certificate-${certificate.certificate_number}`);
  };

  const handleShare = async (certificate: Certificate) => {
    const verifyUrl = `${window.location.origin}/verify/${certificate.verification_code}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Certificate - ${certificate.course?.title}`,
          text: `View my certificate for ${certificate.course?.title}`,
          url: verifyUrl,
        });
      } catch {
        navigator.clipboard.writeText(verifyUrl);
      }
    } else {
      navigator.clipboard.writeText(verifyUrl);
      alert("Verification link copied to clipboard!");
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "completion":
        return <GraduationCap className="h-4 w-4" />;
      case "continuing_education":
        return <BookOpen className="h-4 w-4" />;
      case "skill_verification":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Award className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "completion":
        return <Badge variant="success">Completion</Badge>;
      case "continuing_education":
        return <Badge variant="info">Continuing Ed</Badge>;
      case "skill_verification":
        return <Badge variant="warning">Skills</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  // Stats
  const completionCerts = certificates?.filter((c) => c.certificate_type === "completion") || [];
  const ceCerts = certificates?.filter((c) => c.certificate_type === "continuing_education") || [];
  const skillCerts = certificates?.filter((c) => c.certificate_type === "skill_verification") || [];

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
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Award className="h-6 w-6" />
          My Certificates
        </h1>
        <p className="text-muted-foreground">
          View and download your earned certificates and credentials
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <Award className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{certificates?.length || 0}</div>
                <p className="text-sm text-muted-foreground">Total Certificates</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-success/10">
                <GraduationCap className="h-6 w-6 text-success" />
              </div>
              <div>
                <div className="text-2xl font-bold">{completionCerts.length}</div>
                <p className="text-sm text-muted-foreground">Completions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-info/10">
                <BookOpen className="h-6 w-6 text-info" />
              </div>
              <div>
                <div className="text-2xl font-bold">{ceCerts.length}</div>
                <p className="text-sm text-muted-foreground">Continuing Ed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-warning/10">
                <CheckCircle className="h-6 w-6 text-warning" />
              </div>
              <div>
                <div className="text-2xl font-bold">{skillCerts.length}</div>
                <p className="text-sm text-muted-foreground">Skills Verified</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search certificates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" value={typeFilter} onValueChange={setTypeFilter}>
        <TabsList>
          <TabsTrigger value="all">All ({certificates?.length || 0})</TabsTrigger>
          <TabsTrigger value="completion">Completion ({completionCerts.length})</TabsTrigger>
          <TabsTrigger value="continuing_education">CE ({ceCerts.length})</TabsTrigger>
          <TabsTrigger value="skill_verification">Skills ({skillCerts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value={typeFilter} className="mt-4">
          {filteredCertificates.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No certificates yet</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm
                    ? "No certificates match your search"
                    : "Complete courses to earn certificates"}
                </p>
                {!searchTerm && (
                  <Button variant="outline" asChild>
                    <Link href="/student/courses">View My Courses</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredCertificates.map((certificate) => (
                <CertificateCard
                  key={certificate.id}
                  certificate={certificate}
                  onView={() => setSelectedCertificate(certificate)}
                  onDownload={() => handleDownload(certificate)}
                  onShare={() => handleShare(certificate)}
                  getTypeIcon={getTypeIcon}
                  getTypeBadge={getTypeBadge}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Certificate Viewer Modal */}
      {selectedCertificate && (
        <CertificateViewer
          certificate={selectedCertificate}
          tenant={tenant ? { name: tenant.name, logo_url: tenant.logo_url || undefined } : undefined}
          open={!!selectedCertificate}
          onClose={() => setSelectedCertificate(null)}
        />
      )}
    </div>
  );
}

// Certificate Card Component
function CertificateCard({
  certificate,
  onView,
  onDownload,
  onShare,
  getTypeIcon,
  getTypeBadge,
}: {
  certificate: Certificate;
  onView: () => void;
  onDownload: () => void;
  onShare: () => void;
  getTypeIcon: (type: string) => React.ReactNode;
  getTypeBadge: (type: string) => React.ReactNode;
}) {
  /* eslint-disable react-hooks/purity -- Date.now() for display-only expiration check */
  const isExpiringSoon = certificate.expires_at
    ? new Date(certificate.expires_at) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    : false;

  const isExpired = certificate.expires_at
    ? new Date(certificate.expires_at) < new Date()
    : false;
  /* eslint-enable react-hooks/purity */

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 border-b">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-background shadow-sm">
              {getTypeIcon(certificate.certificate_type)}
            </div>
            <div>
              <h3 className="font-semibold line-clamp-1">{certificate.title}</h3>
              <p className="text-sm text-muted-foreground">
                {certificate.course?.title}
              </p>
            </div>
          </div>
          {getTypeBadge(certificate.certificate_type)}
        </div>
      </div>

      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Details */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Issued</p>
              <p className="font-medium">{formatDate(certificate.issued_at)}</p>
            </div>
            {certificate.final_grade !== null && (
              <div>
                <p className="text-muted-foreground">Grade</p>
                <p className="font-medium">{certificate.final_grade.toFixed(1)}%</p>
              </div>
            )}
            {certificate.hours_completed !== null && (
              <div>
                <p className="text-muted-foreground">Hours</p>
                <p className="font-medium">{certificate.hours_completed}</p>
              </div>
            )}
            {certificate.expires_at && (
              <div>
                <p className="text-muted-foreground">Expires</p>
                <p className={`font-medium ${isExpired ? "text-destructive" : isExpiringSoon ? "text-warning" : ""}`}>
                  {formatDate(certificate.expires_at)}
                  {isExpired && " (Expired)"}
                  {!isExpired && isExpiringSoon && " (Soon)"}
                </p>
              </div>
            )}
          </div>

          {/* Certificate Info */}
          <div className="flex items-center justify-between p-2 bg-muted rounded-lg text-xs">
            <div className="flex items-center gap-2">
              <Shield className="h-3 w-3 text-muted-foreground" />
              <span className="font-mono">{certificate.certificate_number}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <span>Verify:</span>
              <span className="font-mono">{certificate.verification_code}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={onView}>
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={onDownload}>
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
            <Button variant="ghost" size="sm" onClick={onShare}>
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
