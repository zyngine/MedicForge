"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useRef } from "react";
import { Download, Printer, Share2 } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import { Certificate, CertificateTemplate } from "@/lib/hooks/use-certificates";
import {
  generateCertificateHTML,
  openCertificatePrintWindow,
  downloadCertificateHTML,
} from "@/lib/certificate-generator";

interface CertificateViewerProps {
  certificate: Certificate & { template?: CertificateTemplate | null };
  tenant?: { name: string; logo_url?: string };
  open: boolean;
  onClose: () => void;
}

export function CertificateViewer({
  certificate,
  tenant,
  open,
  onClose,
}: CertificateViewerProps) {
  const [html, setHtml] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (certificate && open) {
      const generatedHtml = generateCertificateHTML({
        certificate,
        template: certificate.template,
        tenant,
      });
      setHtml(generatedHtml);
    }
  }, [certificate, tenant, open]);

  const handlePrint = () => {
    openCertificatePrintWindow(html);
  };

  const handleDownload = () => {
    downloadCertificateHTML(
      html,
      `certificate-${certificate.certificate_number}`
    );
  };

  const handleShare = async () => {
    const verifyUrl = `${window.location.origin}/verify/${certificate.verification_code}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Certificate - ${certificate.course?.title}`,
          text: `View my certificate for ${certificate.course?.title}`,
          url: verifyUrl,
        });
      } catch {
        // User cancelled or share failed
        copyToClipboard(verifyUrl);
      }
    } else {
      copyToClipboard(verifyUrl);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert("Verification link copied to clipboard!");
    });
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Certificate Preview" size="full">
      <div className="space-y-4">
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="default" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>

        <div className="overflow-auto bg-muted/30 rounded-lg p-4 max-h-[60vh]">
          <div className="flex justify-center">
            <iframe
              ref={iframeRef}
              srcDoc={html}
              title="Certificate Preview"
              className="bg-white shadow-lg rounded"
              style={{
                width: "1040px",
                height: "740px",
                border: "none",
                transform: "scale(0.65)",
                transformOrigin: "top center",
              }}
            />
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Certificate #: {certificate.certificate_number}</span>
            <span>Verification Code: {certificate.verification_code}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
