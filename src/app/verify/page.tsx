"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Award, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from "@/components/ui";

export default function VerifyPage() {
  const router = useRouter();
  const [code, setCode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed) {
      router.push(`/verify/${trimmed}`);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Award className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold">MedicForge</span>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Verify a Certificate</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Enter the verification code found on the certificate to confirm its authenticity.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter verification code"
                  className="text-center text-lg tracking-wider uppercase"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={!code.trim()}>
                <Search className="h-4 w-4 mr-2" />
                Verify Certificate
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          The verification code is printed on the bottom of your certificate.
        </p>
      </div>
    </div>
  );
}
