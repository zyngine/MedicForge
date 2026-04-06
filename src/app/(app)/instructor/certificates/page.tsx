"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Award,
  Search,
  Download,
  MoreHorizontal,
  XCircle,
  Eye,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  Input,
  Button,
  Badge,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Dropdown,
  DropdownItem,
  Modal,
  ModalFooter,
  Textarea,
  Label,
} from "@/components/ui";
import {
  useCertificates,
  useRevokeCertificate,
  Certificate,
} from "@/lib/hooks/use-certificates";
import { useTenant } from "@/lib/hooks/use-tenant";
import { CertificateViewer } from "@/components/certificates/certificate-viewer";
import { generateCertificateHTML, downloadCertificateHTML } from "@/lib/certificate-generator";

export default function InstructorCertificatesPage() {
  const { tenant } = useTenant();
  const { data: certificates, isLoading } = useCertificates();
  const revokeCertificate = useRevokeCertificate();

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState("");
  const [certificateToRevoke, setCertificateToRevoke] = useState<Certificate | null>(null);

  const filteredCertificates = certificates?.filter((cert) => {
    const matchesSearch =
      cert.student?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.course?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.certificate_number.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === "all" || cert.certificate_type === typeFilter;

    return matchesSearch && matchesType;
  });

  const handleDownload = (certificate: Certificate) => {
    const html = generateCertificateHTML({
      certificate,
      tenant: tenant ? { name: tenant.name, logo_url: tenant.logo_url || undefined } : undefined,
    });
    downloadCertificateHTML(html, `certificate-${certificate.certificate_number}`);
  };

  const handleRevoke = async () => {
    if (!certificateToRevoke || !revokeReason) return;

    try {
      await revokeCertificate.mutateAsync({
        certificateId: certificateToRevoke.id,
        reason: revokeReason,
      });
      setRevokeModalOpen(false);
      setCertificateToRevoke(null);
      setRevokeReason("");
    } catch (error) {
      console.error("Failed to revoke certificate:", error);
    }
  };

  const stats = {
    total: certificates?.length || 0,
    completion: certificates?.filter((c) => c.certificate_type === "completion").length || 0,
    ce: certificates?.filter((c) => c.certificate_type === "continuing_education").length || 0,
    skills: certificates?.filter((c) => c.certificate_type === "skill_verification").length || 0,
  };

  const typeOptions = [
    { value: "all", label: "All Types" },
    { value: "completion", label: "Completion" },
    { value: "continuing_education", label: "Continuing Ed" },
    { value: "skill_verification", label: "Skills" },
  ];

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Certificates</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track all issued certificates
          </p>
        </div>
        <Button asChild>
          <Link href="/instructor/courses">
            <Users className="h-4 w-4 mr-2" />
            Issue from Course
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Award className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Issued</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Award className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completion}</p>
                <p className="text-sm text-muted-foreground">Completion</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Award className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.ce}</p>
                <p className="text-sm text-muted-foreground">Continuing Ed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Award className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.skills}</p>
                <p className="text-sm text-muted-foreground">Skills</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by student, course, or certificate #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="w-[180px]">
          <Select
            options={typeOptions}
            value={typeFilter}
            onChange={setTypeFilter}
          />
        </div>
      </div>

      {/* Certificates Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Certificate #</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading certificates...
                  </TableCell>
                </TableRow>
              ) : filteredCertificates?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No certificates found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCertificates?.map((cert) => (
                  <TableRow key={cert.id}>
                    <TableCell>
                      <div className="font-medium">{cert.student?.full_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {cert.student?.email}
                      </div>
                    </TableCell>
                    <TableCell>{cert.course?.title}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {cert.certificate_type.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {cert.certificate_number}
                    </TableCell>
                    <TableCell>
                      {new Date(cert.issued_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {cert.final_grade !== null ? `${cert.final_grade.toFixed(1)}%` : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Dropdown
                        trigger={
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        }
                        align="right"
                      >
                        <DropdownItem
                          icon={<Eye className="h-4 w-4" />}
                          onClick={() => setSelectedCertificate(cert)}
                        >
                          View
                        </DropdownItem>
                        <DropdownItem
                          icon={<Download className="h-4 w-4" />}
                          onClick={() => handleDownload(cert)}
                        >
                          Download
                        </DropdownItem>
                        <DropdownItem
                          icon={<XCircle className="h-4 w-4" />}
                          destructive
                          onClick={() => {
                            setCertificateToRevoke(cert);
                            setRevokeModalOpen(true);
                          }}
                        >
                          Revoke
                        </DropdownItem>
                      </Dropdown>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Certificate Viewer */}
      {selectedCertificate && (
        <CertificateViewer
          certificate={selectedCertificate}
          tenant={tenant ? { name: tenant.name, logo_url: tenant.logo_url || undefined } : undefined}
          open={!!selectedCertificate}
          onClose={() => setSelectedCertificate(null)}
        />
      )}

      {/* Revoke Modal */}
      <Modal
        isOpen={revokeModalOpen}
        onClose={() => setRevokeModalOpen(false)}
        title="Revoke Certificate"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to revoke this certificate? This action cannot be undone.
          </p>
          {certificateToRevoke && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p>
                <strong>Student:</strong> {certificateToRevoke.student?.full_name}
              </p>
              <p>
                <strong>Course:</strong> {certificateToRevoke.course?.title}
              </p>
              <p>
                <strong>Certificate #:</strong> {certificateToRevoke.certificate_number}
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Revocation *</Label>
            <Textarea
              id="reason"
              placeholder="Enter the reason for revoking this certificate..."
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
            />
          </div>
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setRevokeModalOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleRevoke}
            disabled={!revokeReason || revokeCertificate.isPending}
          >
            {revokeCertificate.isPending ? "Revoking..." : "Revoke Certificate"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
