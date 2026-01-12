"use client";

import { Award, Download, Eye, ExternalLink, Calendar, GraduationCap } from "lucide-react";
import { Card, CardContent, Button, Badge } from "@/components/ui";
import { Certificate } from "@/lib/hooks/use-certificates";

interface CertificateCardProps {
  certificate: Certificate;
  onView?: () => void;
  onDownload?: () => void;
  showStudent?: boolean;
}

export function CertificateCard({
  certificate,
  onView,
  onDownload,
  showStudent = false,
}: CertificateCardProps) {
  const isExpired = certificate.expires_at && new Date(certificate.expires_at) < new Date();

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isExpired ? "bg-muted" : "bg-primary/10"
            }`}>
              <Award className={`h-6 w-6 ${isExpired ? "text-muted-foreground" : "text-primary"}`} />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-lg leading-tight">
                  {certificate.course?.title || "Certificate"}
                </h3>
                {showStudent && certificate.student && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {certificate.student.full_name}
                  </p>
                )}
              </div>
              <Badge variant={isExpired ? "secondary" : "default"} className="flex-shrink-0">
                {isExpired ? "Expired" : certificate.certificate_type}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>
                  {new Date(certificate.completion_date).toLocaleDateString()}
                </span>
              </div>
              {certificate.final_grade !== null && (
                <div className="flex items-center gap-1">
                  <GraduationCap className="h-4 w-4" />
                  <span>Grade: {certificate.final_grade.toFixed(1)}%</span>
                </div>
              )}
              {certificate.hours_completed !== null && (
                <span>{certificate.hours_completed} hours</span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-4">
              <p className="text-xs text-muted-foreground font-mono">
                #{certificate.certificate_number}
              </p>
              <span className="text-xs text-muted-foreground">|</span>
              <p className="text-xs text-muted-foreground font-mono">
                Verify: {certificate.verification_code}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" size="sm" className="flex-1" onClick={onView}>
            <Eye className="h-4 w-4 mr-2" />
            View
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={onDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <a
              href={`/verify/${certificate.verification_code}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
