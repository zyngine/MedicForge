"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Label,
  Alert,
  Spinner,
  Badge,
} from "@/components/ui";
import {
  Globe,
  CheckCircle,
  AlertCircle,
  Copy,
  ExternalLink,
  Trash2,
  RefreshCw,
} from "lucide-react";

interface DomainStatus {
  domain: string | null;
  verified: boolean;
  subdomain: string;
  verification?: Array<{
    type: string;
    domain: string;
    value: string;
    reason: string;
  }>;
  error?: string;
}

export default function DomainSettingsPage() {
  const [domainStatus, setDomainStatus] = useState<DomainStatus | null>(null);
  const [newDomain, setNewDomain] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchDomainStatus = async () => {
    try {
      const response = await fetch("/api/domains");
      const data = await response.json();
      setDomainStatus(data);
    } catch (err) {
      console.error("Error fetching domain status:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDomainStatus();
  }, []);

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: newDomain.toLowerCase().trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to add domain");
        return;
      }

      setSuccess(data.message || "Domain added successfully!");
      setNewDomain("");
      await fetchDomainStatus();
    } catch (_err) {
      setError("Failed to add domain. Please try again.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveDomain = async () => {
    if (!confirm("Are you sure you want to remove your custom domain?")) {
      return;
    }

    setIsRemoving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/domains", { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to remove domain");
        return;
      }

      setSuccess("Domain removed successfully");
      await fetchDomainStatus();
    } catch (_err) {
      setError("Failed to remove domain. Please try again.");
    } finally {
      setIsRemoving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Custom Domain</h1>
        <p className="text-muted-foreground">
          Configure a custom domain for your organization
        </p>
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

      {/* Current Domain Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Domain Status
          </CardTitle>
          <CardDescription>
            Your current domain configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Subdomain (always available) */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div>
              <p className="font-medium">Default Subdomain</p>
              <p className="text-sm text-muted-foreground">
                Always available as a fallback
              </p>
            </div>
            <div className="flex items-center gap-2">
              <code className="px-2 py-1 bg-background rounded text-sm">
                {domainStatus?.subdomain}
              </code>
              <Badge variant="success">Active</Badge>
            </div>
          </div>

          {/* Custom Domain */}
          {domainStatus?.domain ? (
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <p className="font-medium">Custom Domain</p>
                <code className="text-sm">{domainStatus.domain}</code>
              </div>
              <div className="flex items-center gap-2">
                {domainStatus.verified ? (
                  <Badge variant="success" className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="warning" className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Pending DNS
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchDomainStatus}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveDomain}
                  disabled={isRemoving}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg border border-dashed text-center text-muted-foreground">
              No custom domain configured
            </div>
          )}
        </CardContent>
      </Card>

      {/* DNS Configuration (if domain pending) */}
      {domainStatus?.domain && !domainStatus.verified && (
        <Card>
          <CardHeader>
            <CardTitle className="text-warning flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              DNS Configuration Required
            </CardTitle>
            <CardDescription>
              Add the following DNS record to verify your domain
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">Type</th>
                    <th className="text-left py-2 px-4">Name</th>
                    <th className="text-left py-2 px-4">Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 px-4 font-mono">CNAME</td>
                    <td className="py-2 px-4 font-mono">
                      {domainStatus.domain.split(".")[0]}
                    </td>
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-2">
                        <code>cname.vercel-dns.com</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard("cname.vercel-dns.com")}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {domainStatus.verification?.map((v, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-2 px-4 font-mono">{v.type}</td>
                      <td className="py-2 px-4 font-mono">{v.domain}</td>
                      <td className="py-2 px-4">
                        <div className="flex items-center gap-2">
                          <code className="break-all">{v.value}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(v.value)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {copied && (
              <p className="text-sm text-success">Copied to clipboard!</p>
            )}

            <div className="text-sm text-muted-foreground space-y-2">
              <p>DNS changes can take up to 48 hours to propagate.</p>
              <p>
                <a
                  href="https://vercel.com/docs/projects/domains/working-with-dns"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  Learn more about DNS configuration
                  <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add New Domain */}
      {!domainStatus?.domain && (
        <Card>
          <CardHeader>
            <CardTitle>Add Custom Domain</CardTitle>
            <CardDescription>
              Use your own domain for your organization portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddDomain} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="domain">Domain Name</Label>
                <Input
                  id="domain"
                  type="text"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="training.yourcompany.com"
                  disabled={isAdding}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the full domain (e.g., training.firestation99.com)
                </p>
              </div>

              <Button type="submit" isLoading={isAdding} disabled={!newDomain.trim()}>
                Add Domain
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong>1. Add your domain</strong> - Enter the domain you want to use
          </p>
          <p>
            <strong>2. Configure DNS</strong> - Add the CNAME record to your domain&apos;s DNS settings
          </p>
          <p>
            <strong>3. Wait for verification</strong> - DNS changes can take up to 48 hours
          </p>
          <p>
            <strong>4. Start using</strong> - Once verified, your custom domain will be active
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
