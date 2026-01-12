"use client";

import { useState } from "react";
import { Award, Search, Download, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Input, Button } from "@/components/ui";
import { useMyCertificates, Certificate } from "@/lib/hooks/use-certificates";
import { useTenant } from "@/lib/hooks/use-tenant";
import { CertificateCard } from "@/components/certificates/certificate-card";
import { CertificateViewer } from "@/components/certificates/certificate-viewer";
import { generateCertificateHTML, downloadCertificateHTML } from "@/lib/certificate-generator";

export default function StudentCertificatesPage() {
  const { tenant } = useTenant();
  const { data: certificates, isLoading } = useMyCertificates();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);

  const filteredCertificates = certificates?.filter((cert) =>
    cert.course?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cert.certificate_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDownload = (certificate: Certificate) => {
    const html = generateCertificateHTML({
      certificate,
      tenant: tenant ? { name: tenant.name, logo_url: tenant.logo_url || undefined } : undefined,
    });
    downloadCertificateHTML(html, `certificate-${certificate.certificate_number}`);
  };

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Certificates</h1>
          <p className="text-muted-foreground mt-1">
            View and download your earned certificates
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search certificates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 h-48" />
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && (!certificates || certificates.length === 0) && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Award className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Certificates Yet</h3>
            <p className="text-muted-foreground mb-4">
              Complete courses to earn certificates that will appear here.
            </p>
            <Button asChild variant="outline">
              <a href="/student/courses">View My Courses</a>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Certificates Grid */}
      {!isLoading && filteredCertificates && filteredCertificates.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredCertificates.map((certificate) => (
            <CertificateCard
              key={certificate.id}
              certificate={certificate}
              onView={() => setSelectedCertificate(certificate)}
              onDownload={() => handleDownload(certificate)}
            />
          ))}
        </div>
      )}

      {/* No Search Results */}
      {!isLoading &&
        filteredCertificates &&
        filteredCertificates.length === 0 &&
        certificates &&
        certificates.length > 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
              <p className="text-muted-foreground">
                No certificates match your search query.
              </p>
            </CardContent>
          </Card>
        )}

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
