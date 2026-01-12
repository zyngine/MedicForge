"use client";

import { use } from "react";
import { Award, CheckCircle, XCircle, AlertTriangle, Calendar, GraduationCap, Clock, Shield } from "lucide-react";
import { Card, CardContent, Button, Badge } from "@/components/ui";
import { useVerifyCertificate } from "@/lib/hooks/use-certificates";
import Link from "next/link";

export default function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const { data: result, isLoading, error } = useVerifyCertificate(code);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="max-w-lg w-full mx-4">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Shield className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Verifying Certificate...</h2>
            <p className="text-muted-foreground">Please wait while we verify this certificate.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="max-w-lg w-full mx-4">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Verification Error</h2>
            <p className="text-muted-foreground mb-6">
              An error occurred while verifying this certificate. Please try again.
            </p>
            <Button asChild>
              <Link href="/">Return Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!result?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="max-w-lg w-full mx-4">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Invalid Certificate</h2>
            <p className="text-muted-foreground mb-2">{result?.message}</p>
            {result?.expiredAt && (
              <p className="text-sm text-muted-foreground">
                Expired on: {new Date(result.expiredAt).toLocaleDateString()}
              </p>
            )}
            {result?.revokedAt && (
              <div className="mt-4 p-4 bg-muted rounded-lg text-left">
                <p className="text-sm">
                  <strong>Revoked:</strong> {new Date(result.revokedAt).toLocaleDateString()}
                </p>
                {result?.reason && (
                  <p className="text-sm mt-1">
                    <strong>Reason:</strong> {result.reason}
                  </p>
                )}
              </div>
            )}
            <div className="mt-6">
              <Button asChild variant="outline">
                <Link href="/">Return Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const certificate = result.certificate;

  if (!certificate) {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/30 py-12">
      <div className="container max-w-2xl mx-auto px-4">
        {/* Verification Success Banner */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
          <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-green-800">Certificate Verified</h3>
            <p className="text-sm text-green-700">
              This is an authentic certificate issued by {certificate.tenant?.name || "MedicForge"}.
            </p>
          </div>
        </div>

        {/* Certificate Details Card */}
        <Card>
          <CardContent className="p-8">
            {/* Header with Logo */}
            <div className="text-center mb-8">
              {certificate.tenant?.logo_url ? (
                <img
                  src={certificate.tenant.logo_url}
                  alt={certificate.tenant.name}
                  className="h-12 mx-auto mb-4"
                />
              ) : (
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Award className="h-8 w-8 text-primary" />
                  <span className="text-2xl font-bold text-primary">
                    {certificate.tenant?.name || "MedicForge"}
                  </span>
                </div>
              )}
              <Badge variant="secondary" className="mb-4">
                {certificate.certificate_type.replace("_", " ").toUpperCase()}
              </Badge>
              <h1 className="text-2xl font-bold">{certificate.title}</h1>
            </div>

            {/* Certificate Info */}
            <div className="space-y-6">
              <div className="text-center py-4 border-y">
                <p className="text-sm text-muted-foreground">This certifies that</p>
                <h2 className="text-3xl font-bold text-primary my-2">
                  {certificate.student?.full_name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  has successfully completed the course
                </p>
                <h3 className="text-xl font-semibold mt-2">
                  {certificate.course?.title}
                </h3>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <Calendar className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Completion Date</p>
                  <p className="font-semibold">
                    {new Date(certificate.completion_date).toLocaleDateString()}
                  </p>
                </div>

                {certificate.final_grade !== null && (
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <GraduationCap className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Final Grade</p>
                    <p className="font-semibold">{certificate.final_grade.toFixed(1)}%</p>
                  </div>
                )}

                {certificate.hours_completed !== null && (
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <Clock className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Hours Completed</p>
                    <p className="font-semibold">{certificate.hours_completed}</p>
                  </div>
                )}

                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <Award className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Issued</p>
                  <p className="font-semibold">
                    {new Date(certificate.issued_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Certificate Numbers */}
              <div className="pt-6 border-t">
                <div className="flex justify-between text-sm">
                  <div>
                    <span className="text-muted-foreground">Certificate #: </span>
                    <span className="font-mono">{certificate.certificate_number}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Verification: </span>
                    <span className="font-mono">{certificate.verification_code}</span>
                  </div>
                </div>
              </div>

              {/* Expiration Warning */}
              {certificate.expires_at && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-amber-800">
                    This certificate expires on{" "}
                    {new Date(certificate.expires_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>
            Verified by{" "}
            <a href="/" className="text-primary hover:underline">
              MedicForge
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
